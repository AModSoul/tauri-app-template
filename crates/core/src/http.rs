//! The one HTTP client every request goes through: rate limits, retries, 429 handling and the
//! User-Agent all live here, so no caller can skip them. One `Http` is shared by a whole run, and
//! by the whole app, so concurrent jobs share one limit. Never call `reqwest` directly.
//!
//! The example run doesn't use the network. When the app's first real request arrives, give the
//! service an entry in [`Endpoints`] (so tests can point it at a `wiremock` server) and, if it
//! publishes a rate limit, a [`Limiter`] gate in [`Http::gate`].

use std::{collections::HashMap, time::Duration};

use reqwest::{header, Client, RequestBuilder, Response, StatusCode, Url};
use serde::{de::DeserializeOwned, Serialize};
use tokio::{
    sync::Mutex,
    time::{sleep, sleep_until, Instant},
};

use crate::{Error, Result};

/// Names the app, its version and where it lives on every request, as services ask clients to.
pub const USER_AGENT: &str = concat!(
    env!("CARGO_PKG_NAME"),
    "/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/your-github-user/my-app)"
);

/// Where each service lives. Tests point these at a local mock server.
#[derive(Debug, Clone)]
pub struct Endpoints {
    /// An example service, rate limited by [`Http`]. Rename it for the app's first real one.
    pub api: String,
}

impl Default for Endpoints {
    fn default() -> Self {
        Self {
            api: "https://api.example.com".into(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct HttpConfig {
    pub endpoints: Endpoints,
    /// Tries per request, the first included, for timeouts, dropped connections, 5xx responses
    /// and 429s.
    pub max_attempts: u32,
    /// The wait before the first retry; it doubles each time after that.
    pub retry_delay: Duration,
    /// How long to hold back after a 429 that doesn't say how long.
    pub rate_limited_wait: Duration,
    /// The gap between two requests to [`Endpoints::api`].
    pub api_spacing: Duration,
}

impl Default for HttpConfig {
    fn default() -> Self {
        Self {
            endpoints: Endpoints::default(),
            max_attempts: 3,
            retry_delay: Duration::from_secs(1),
            rate_limited_wait: Duration::from_secs(30),
            api_spacing: Duration::from_millis(100),
        }
    }
}

/// The longest `Retry-After` honoured, so a bad header can't stall a run.
const MAX_RETRY_AFTER: Duration = Duration::from_secs(120);

pub struct Http {
    client: Client,
    config: HttpConfig,
    api_authority: Option<String>,
    api: Limiter,
}

/// Which limiter, if any, a request waits on.
enum Gate {
    Api,
    Open,
}

impl Http {
    pub fn new(config: HttpConfig) -> Result<Self> {
        let client = Client::builder()
            .user_agent(USER_AGENT)
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(90))
            .build()?;
        Ok(Self {
            client,
            api_authority: authority(&config.endpoints.api),
            api: Limiter::new(config.api_spacing),
            config,
        })
    }

    pub fn endpoints(&self) -> &Endpoints {
        &self.config.endpoints
    }

    /// GETs a URL. The response is returned whatever its status.
    pub async fn get(&self, url: &str) -> Result<Response> {
        self.send(url, |client| client.get(url)).await
    }

    /// POSTs a JSON body. The response is returned whatever its status.
    pub async fn post_json<T: Serialize + ?Sized>(&self, url: &str, body: &T) -> Result<Response> {
        self.send(url, |client| client.post(url).json(body)).await
    }

    /// GETs and decodes JSON; `None` for a 404.
    pub async fn get_json<T: DeserializeOwned>(&self, url: &str) -> Result<Option<T>> {
        match ok_or_missing(url, self.get(url).await?).await? {
            Some(response) => Ok(Some(response.json().await?)),
            None => Ok(None),
        }
    }

    /// GETs a page as text, decoded with the charset it declares; `None` for a 404.
    pub async fn get_text(&self, url: &str) -> Result<Option<String>> {
        match ok_or_missing(url, self.get(url).await?).await? {
            Some(response) => Ok(Some(response.text().await?)),
            None => Ok(None),
        }
    }

    async fn send(&self, url: &str, build: impl Fn(&Client) -> RequestBuilder) -> Result<Response> {
        let gate = self.gate(url)?;
        let mut attempt = 1;
        loop {
            if let Gate::Api = gate {
                self.api.wait("", self.config.api_spacing).await;
            }
            let outcome = build(&self.client).send().await;
            let retry_in = match &outcome {
                Ok(response) if response.status() == StatusCode::TOO_MANY_REQUESTS => {
                    let wait = retry_after(response).unwrap_or(self.config.rate_limited_wait);
                    match gate {
                        // A limited host holds every queued call back, not just this one; the
                        // next `wait` above then sleeps it out.
                        Gate::Api => {
                            self.api.pause_for(wait).await;
                            Some(Duration::ZERO)
                        }
                        Gate::Open => Some(wait),
                    }
                }
                Ok(response) if response.status().is_server_error() => Some(self.backoff(attempt)),
                Ok(_) => None,
                Err(error) if error.is_timeout() || error.is_connect() || error.is_request() => {
                    Some(self.backoff(attempt))
                }
                Err(_) => None,
            };
            match retry_in {
                Some(delay) if attempt < self.config.max_attempts => {
                    sleep(delay).await;
                    attempt += 1;
                }
                _ => return Ok(outcome?),
            }
        }
    }

    fn gate(&self, url: &str) -> Result<Gate> {
        let parsed = Url::parse(url).map_err(|e| Error::Invalid {
            url: url.to_owned(),
            reason: e.to_string(),
        })?;
        let host = url_authority(&parsed);
        if host.is_some() && host == self.api_authority {
            return Ok(Gate::Api);
        }
        Ok(Gate::Open)
    }

    fn backoff(&self, attempt: u32) -> Duration {
        self.config.retry_delay * 2u32.saturating_pow(attempt - 1)
    }
}

/// The response if it succeeded, `None` for a 404 or a 410, otherwise an error carrying the
/// service's explanation when it gave one (a JSON body's `details` or `message`).
async fn ok_or_missing(url: &str, response: Response) -> Result<Option<Response>> {
    let status = response.status();
    if status == StatusCode::NOT_FOUND || status == StatusCode::GONE {
        return Ok(None);
    }
    if status.is_success() {
        return Ok(Some(response));
    }
    let detail = response.json::<serde_json::Value>().await.ok().and_then(|body| {
        ["details", "message"]
            .iter()
            .find_map(|key| body.get(key)?.as_str().map(str::to_owned))
    });
    Err(Error::Status {
        status: status.as_u16(),
        url: url.to_owned(),
        detail,
    })
}

fn retry_after(response: &Response) -> Option<Duration> {
    let secs: u64 = response
        .headers()
        .get(header::RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse()
        .ok()?;
    Some(Duration::from_secs(secs).min(MAX_RETRY_AFTER))
}

fn authority(base: &str) -> Option<String> {
    Url::parse(base).ok().as_ref().and_then(url_authority)
}

fn url_authority(url: &Url) -> Option<String> {
    let host = url.host_str()?;
    Some(match url.port() {
        Some(port) => format!("{host}:{port}"),
        None => host.to_owned(),
    })
}

/// Spaces calls out: each key has its own gap, and no two calls on any keys go out closer than
/// `floor`.
///
/// A call books its slot before it waits. Reading the time of the last call and sleeping the
/// remainder would hand every caller that arrives together the same slot.
pub struct Limiter {
    floor: Duration,
    state: Mutex<LimiterState>,
}

#[derive(Default)]
struct LimiterState {
    /// When each key's next call may go out.
    next_by_key: HashMap<String, Instant>,
    /// Every booked send time not yet long past, ascending.
    booked: Vec<Instant>,
    /// Set by a 429: nothing goes out before this.
    paused_until: Option<Instant>,
}

impl Limiter {
    pub fn new(floor: Duration) -> Self {
        Self {
            floor,
            state: Mutex::new(LimiterState::default()),
        }
    }

    /// Books the next slot for `key`, at least `spacing` after its last one, and waits for it.
    pub async fn wait(&self, key: &str, spacing: Duration) {
        let at = {
            let mut state = self.state.lock().await;
            let now = Instant::now();
            let floor = self.floor;
            state.booked.retain(|t| *t + floor > now);
            let mut at = now.max(state.next_by_key.get(key).copied().unwrap_or(now));
            if let Some(paused) = state.paused_until {
                at = at.max(paused);
            }
            // The first gap at least `floor` clear of every other booked call.
            for t in &state.booked {
                if *t >= at + floor {
                    break;
                }
                if *t + floor > at {
                    at = *t + floor;
                }
            }
            state.next_by_key.insert(key.to_owned(), at + spacing);
            let position = state.booked.partition_point(|t| *t <= at);
            state.booked.insert(position, at);
            at
        };
        sleep_until(at).await;
    }

    /// Holds every call booked from now on back for `wait`.
    pub async fn pause_for(&self, wait: Duration) {
        let mut state = self.state.lock().await;
        let until = Instant::now() + wait;
        state.paused_until = Some(state.paused_until.map_or(until, |p| p.max(until)));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(start_paused = true)]
    async fn spaces_one_key() {
        let limiter = Limiter::new(Duration::from_millis(100));
        let start = Instant::now();
        let mut sent = Vec::new();
        for _ in 0..3 {
            limiter.wait("/search", Duration::from_millis(500)).await;
            sent.push(start.elapsed().as_millis());
        }
        assert_eq!(sent, [0, 500, 1000]);
    }

    #[tokio::test(start_paused = true)]
    async fn concurrent_callers_get_their_own_slots() {
        let limiter = Limiter::new(Duration::from_millis(100));
        let start = Instant::now();
        let waits = (0..3).map(|_| async {
            limiter.wait("", Duration::from_millis(100)).await;
            start.elapsed().as_millis()
        });
        let mut sent = futures::future::join_all(waits).await;
        sent.sort_unstable();
        assert_eq!(sent, [0, 100, 200]);
    }

    #[tokio::test(start_paused = true)]
    async fn keys_share_the_floor_but_not_each_others_queue() {
        let limiter = Limiter::new(Duration::from_millis(100));
        let start = Instant::now();
        let call = |key: &'static str, spacing: u64| {
            let limiter = &limiter;
            async move {
                limiter.wait(key, Duration::from_millis(spacing)).await;
                (key, start.elapsed().as_millis())
            }
        };
        // A burst on a slow key books seconds ahead, but a call on another key isn't queued
        // behind it: it only keeps `floor` clear of the burst's first call.
        let sent = futures::future::join_all([call("/search", 500), call("/search", 500), call("", 100)]).await;
        assert_eq!(sent, [("/search", 0), ("/search", 500), ("", 100)]);
    }

    #[tokio::test(start_paused = true)]
    async fn pause_holds_everything_back() {
        let limiter = Limiter::new(Duration::from_millis(100));
        let start = Instant::now();
        limiter.pause_for(Duration::from_secs(30)).await;
        limiter.wait("", Duration::from_millis(100)).await;
        assert_eq!(start.elapsed().as_secs(), 30);
    }
}
