use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{popup::show_translation_popup, selection::get_current_selection};

pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+T";

#[tauri::command]
pub fn register_translate_hotkey(app: AppHandle, shortcut: String) -> Result<(), String> {
    register_hotkey(&app, &shortcut)
}

pub fn register_hotkey(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let manager = app.global_shortcut();
    manager.unregister_all().map_err(|err| err.to_string())?;
    manager
        .on_shortcut(shortcut, move |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                trigger_translation(app.clone());
            }
        })
        .map_err(|err| err.to_string())
}

pub fn trigger_translation(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        match get_current_selection() {
            Ok(payload) => {
                if let Err(err) = show_translation_popup(app.clone(), payload) {
                    let _ = app.emit("translate-trigger-error", err);
                }
            }
            Err(err) => {
                let _ = app.emit("translate-trigger-error", err);
            }
        }
    });
}
