//! The `my-app` command line tool: a run with no window, printing the core's events. It reads
//! the desktop app's settings, so both behave the same.
//!
//!   cargo run -p my-app-cli -- names.txt
//!   echo "Quarterly Report" | cargo run -p my-app-cli -- -

use std::{io::Read, path::PathBuf, process::ExitCode, time::Duration};

use clap::Parser;
use my_app_core::{
    engine::{self, JobStatus, RunEvent},
    settings::{default_settings_path, Settings},
};
use tokio_util::sync::CancellationToken;

#[derive(Parser)]
#[command(version, about = "Turns each line of a file into a safe file name")]
struct Args {
    /// A text file, one name a line; `-` reads standard input.
    input: PathBuf,
}

#[tokio::main]
async fn main() -> ExitCode {
    let args = Args::parse();
    let text = if args.input.as_os_str() == "-" {
        let mut text = String::new();
        if let Err(error) = std::io::stdin().read_to_string(&mut text) {
            eprintln!("can't read standard input: {error}");
            return ExitCode::FAILURE;
        }
        text
    } else {
        match std::fs::read_to_string(&args.input) {
            Ok(text) => text,
            Err(error) => {
                eprintln!("can't read {}: {error}", args.input.display());
                return ExitCode::FAILURE;
            }
        }
    };
    let settings = default_settings_path()
        .and_then(|path| Settings::load(&path).ok())
        .unwrap_or_default();

    // Ctrl+C stops the run between jobs, and it still reports what it did.
    let cancel = CancellationToken::new();
    let on_ctrl_c = cancel.clone();
    tokio::spawn(async move {
        if tokio::signal::ctrl_c().await.is_ok() {
            on_ctrl_c.cancel();
        }
    });

    let lines: Vec<String> = text.lines().map(str::to_owned).collect();
    let summary = engine::run(&lines, &settings, Duration::ZERO, &cancel, &|event| match event {
        RunEvent::Job {
            status: JobStatus::Done { name },
            ..
        } => println!("{name}"),
        RunEvent::Job {
            id,
            status: JobStatus::Failed { error },
        } => eprintln!("line {id}: {error}"),
        _ => {}
    })
    .await;

    eprintln!(
        "{} named, {} failed{}",
        summary.done,
        summary.failed,
        if summary.cancelled { ", cancelled" } else { "" }
    );
    if summary.failed > 0 || summary.cancelled {
        ExitCode::FAILURE
    } else {
        ExitCode::SUCCESS
    }
}
