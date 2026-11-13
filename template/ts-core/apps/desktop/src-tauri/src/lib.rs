//! The desktop shell. The app's logic is TypeScript (`packages/core`) and runs in the window with
//! the interface; this crate does only what a window can't: it opens the window, installs
//! updates, and is where commands for files on disk or other processes go when the app needs
//! them.

/// Names the app, its version and where it lives on the updater's requests to GitHub.
const USER_AGENT: &str = concat!(
    env!("CARGO_PKG_NAME"),
    "/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/your-github-user/my-app)"
);

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
                app.handle().plugin(
                    tauri_plugin_updater::Builder::new()
                        .header("User-Agent", USER_AGENT)?
                        .build(),
                )?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            open_main_window(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
