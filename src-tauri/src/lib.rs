mod autostart;
mod hotkey;
mod models;
mod popup;
mod selection;
mod tray;
mod window;

use tauri_plugin_autostart::MacosLauncher;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            autostart::get_autostart_enabled,
            autostart::set_autostart,
            hotkey::register_translate_hotkey,
            popup::hide_translation_popup,
            popup::show_translation_popup,
            selection::get_current_selection,
            window::show_settings_window
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            if let Err(err) = hotkey::register_hotkey(&handle, hotkey::DEFAULT_HOTKEY) {
                eprintln!("failed to register default shortcut: {err}");
            }
            if let Err(err) = tray::create_tray(&handle) {
                eprintln!("failed to create tray: {err}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
