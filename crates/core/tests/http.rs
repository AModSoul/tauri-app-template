//! `Http` against a local `wiremock` server: tests never touch the network.

use std::time::Duration;

use my_app_core::http::{Endpoints, Http, HttpConfig, USER_AGENT};
use wiremock::{
    matchers::{header, method, path},
    Mock, MockServer, ResponseTemplate,
};

/// A client for `server`, with retries that don't wait.
fn client(server: &MockServer) -> Http {
    Http::new(HttpConfig {
        endpoints: Endpoints { api: server.uri() },
        retry_delay: Duration::ZERO,
        rate_limited_wait: Duration::ZERO,
        api_spacing: Duration::ZERO,
        ..HttpConfig::default()
    })
    .unwrap()
}

#[tokio::test]
async fn names_itself_and_decodes_json() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/thing"))
        .and(header("user-agent", USER_AGENT))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({ "name": "thing" })))
        .expect(1)
        .mount(&server)
        .await;
    let body: Option<serde_json::Value> = client(&server)
        .get_json(&format!("{}/thing", server.uri()))
        .await
        .unwrap();
    assert_eq!(body.unwrap()["name"], "thing");
}

#[tokio::test]
async fn retries_a_server_error() {
    let server = MockServer::start().await;
    Mock::given(path("/flaky"))
        .respond_with(ResponseTemplate::new(503))
        .up_to_n_times(1)
        .mount(&server)
        .await;
    Mock::given(path("/flaky"))
        .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
        .mount(&server)
        .await;
    let text = client(&server)
        .get_text(&format!("{}/flaky", server.uri()))
        .await
        .unwrap();
    assert_eq!(text.as_deref(), Some("ok"));
}

#[tokio::test]
async fn waits_out_a_429_and_tries_again() {
    let server = MockServer::start().await;
    Mock::given(path("/busy"))
        .respond_with(ResponseTemplate::new(429).insert_header("retry-after", "0"))
        .up_to_n_times(1)
        .mount(&server)
        .await;
    Mock::given(path("/busy"))
        .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
        .mount(&server)
        .await;
    let text = client(&server)
        .get_text(&format!("{}/busy", server.uri()))
        .await
        .unwrap();
    assert_eq!(text.as_deref(), Some("ok"));
}

#[tokio::test]
async fn a_404_is_nothing_and_other_errors_carry_the_services_message() {
    let server = MockServer::start().await;
    Mock::given(path("/missing"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;
    Mock::given(path("/bad"))
        .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({ "message": "No such query" })))
        .mount(&server)
        .await;
    let http = client(&server);
    let missing = http.get_text(&format!("{}/missing", server.uri())).await.unwrap();
    assert_eq!(missing, None);
    let error = http.get_text(&format!("{}/bad", server.uri())).await.unwrap_err();
    assert_eq!(error.to_string(), "No such query (HTTP 400)");
}
