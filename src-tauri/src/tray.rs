use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

use crate::{hotkey::trigger_translation, window::show_settings};

const SHOW_SETTINGS_ID: &str = "show-settings";
const TRANSLATE_SELECTION_ID: &str = "translate-selection";
const QUIT_ID: &str = "quit";

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_settings_item = MenuItem::with_id(app, SHOW_SETTINGS_ID, "打开设置", true, None::<&str>)?;
    let translate_selection =
        MenuItem::with_id(app, TRANSLATE_SELECTION_ID, "翻译当前选区", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "退出 CraftTranslate", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_settings_item, &translate_selection, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .tooltip("CraftTranslate")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_SETTINGS_ID => {
                let _ = show_settings(app);
            }
            TRANSLATE_SELECTION_ID => trigger_translation(app.clone()),
            QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if should_open_settings(&event) {
                let _ = show_settings(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn should_open_settings(event: &TrayIconEvent) -> bool {
    matches!(
        event,
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
    )
}

#[cfg(test)]
mod tests {
    use tauri::{
        tray::{MouseButton, MouseButtonState, TrayIconEvent, TrayIconId},
        PhysicalPosition, Rect,
    };

    use super::should_open_settings;

    #[test]
    fn opens_settings_on_left_click_release() {
        let event = TrayIconEvent::Click {
            id: TrayIconId::new("main-tray"),
            position: PhysicalPosition::new(0.0, 0.0),
            rect: Rect::default(),
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
        };
        assert!(should_open_settings(&event));
    }
}
