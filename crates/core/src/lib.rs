//! Everything the app does. The desktop app and the `my-app` command line tool are both thin
//! shells over this crate: [`engine::run`] takes the user's input and [`settings::Settings`],
//! and reports its progress through a callback, which the desktop app forwards to its window
//! and the command line tool prints.
//!
//! Nothing here knows about Tauri. Types the front end reads derive `TS` with `#[ts(export)]`;
//! `pnpm bindings` writes them to `apps/desktop/src/bindings`.

pub mod engine;
pub mod error;
pub mod http;
pub mod naming;
pub mod settings;

pub use error::{Error, Result};

/// The app's identifier: the desktop app's bundle identifier, and the name of the folder its
/// settings live in, so the app and the command line tool share them.
pub const APP_ID: &str = "com.example.my-app";
