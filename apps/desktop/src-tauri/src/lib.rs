//! The desktop app: Tauri commands over `my-app-core`, and the main window. The front end shows
//! what the core reports and holds no logic of its own; a run reports its progress on the
//! `Channel<RunEvent>` passed to `start_run`.

use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicU32, Ordering},
        Mutex,
    },
    time::Duration,
};

use my_app_core::{
    engine::{self, RunEvent},
    http::USER_AGENT,
    settings::{default_settings_path, Settings},
};
use tauri::{ipc::Channel, AppHandle, Manager, State};
use tokio_util::sync::CancellationToken;

/// How long each of the example run's jobs takes, so its progress shows. Drop it once the jobs
/// do real work.
const EXAMPLE_PACE: Duration = Duration::from_millis(150);

struct AppState {
    settings_path: PathBuf,
    runs: Mutex<HashMap<u32, CancellationToken>>,
    next_run: AtomicU32,
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|p| p.into_inner())
}

/// A command's error, as the text the front end shows (`showError`).
type CommandResult<T> = Result<T, String>;

/// The saved settings. A file that can't be read gives the defaults, which the next save
/// replaces it with, rather than an app that can't start.
#[tauri::command]
fn get_settings(state: State<AppState>) -> Settings {
    Settings::load(&state.settings_path).unwrap_or_default()
}

#[tauri::command]
fn save_settings(state: State<AppState>, settings: Settings) -> CommandResult<()> {
    settings.save(&state.settings_path).map_err(|e| e.to_string())
}

/// Starts a run of `lines` and returns its id, for `cancel_run`. Its progress comes on
/// `on_event`, ending with `finished`.
#[tauri::command]
fn start_run(
    app: AppHandle,
    state: State<AppState>,
    lines: Vec<String>,
    settings: Settings,
    on_event: Channel<RunEvent>,
) -> u32 {
    let id = state.next_run.fetch_add(1, Ordering::Relaxed);
    let cancel = CancellationToken::new();
    lock(&state.runs).insert(id, cancel.clone());
    tauri::async_runtime::spawn(async move {
        let emit = |event: RunEvent| {
            let _ = on_event.send(event);
        };
        engine::run(&lines, &settings, EXAMPLE_PACE, &cancel, &emit).await;
        lock(&app.state::<AppState>().runs).remove(&id);
    });
    id
}

#[tauri::command]
fn cancel_run(state: State<AppState>, id: u32) {
    if let Some(cancel) = lock(&state.runs).remove(&id) {
        cancel.cancel();
    }
}

/// What frames the main window, as `appWindow.ts` reads it: the app's own title bar on Windows
/// and Linux, or macOS's traffic lights over the app's header.
const WINDOW_FRAME: &str = if cfg!(target_os = "macos") { "mac" } else { "custom" };

/// Opens the main window from its entry in `tauri.conf.json`, which leaves that to this
/// (`create: false`) so one entry serves every system. On Windows and Linux the native title bar
/// is turned off, the app's header drawing its own; on macOS it stays, under the header, as the
/// entry's `titleBarStyle` and `hiddenTitle` say, which only macOS reads. The page learns which
/// before it loads, rather than guessing from the user agent.
fn open_main_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .ok_or("tauri.conf.json has no main window")?;
    tauri::WebviewWindowBuilder::from_config(app.handle(), config)?
        .decorations(cfg!(target_os = "macos"))
        .initialization_script(format!(
            "Object.defineProperty(window, \"__APP_WINDOW_FRAME__\", {{ value: \"{WINDOW_FRAME}\" }});"
        ))
        .build()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                // Its requests to GitHub name this app and its version, as the core's do,
                // rather than the plugin's own.
                app.handle().plugin(
                    tauri_plugin_updater::Builder::new()
                        .header("User-Agent", USER_AGENT)?
                        .build(),
                )?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            // The command line tool reads the same file.
            let settings_path = default_settings_path()
                .or_else(|| app.path().app_config_dir().ok().map(|dir| dir.join("settings.json")))
                .ok_or("no config folder to keep settings in")?;
            app.manage(AppState {
                settings_path,
                runs: Mutex::new(HashMap::new()),
                next_run: AtomicU32::new(1),
            });
            open_main_window(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            start_run,
            cancel_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
