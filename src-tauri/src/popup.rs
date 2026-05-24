use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};

use crate::models::SelectionPayload;

const POPUP_OFFSET_X: i32 = 14;
const POPUP_OFFSET_Y: i32 = 18;
const DEFAULT_MONITOR_SIZE: PhysicalSize<u32> = PhysicalSize::new(1920, 1080);
const DEFAULT_POPUP_SIZE: PhysicalSize<u32> = PhysicalSize::new(420, 260);

#[tauri::command]
pub fn show_translation_popup(app: AppHandle, payload: SelectionPayload) -> Result<(), String> {
    let popup = app
        .get_webview_window("popup")
        .ok_or_else(|| "找不到弹窗窗口".to_string())?;

    let monitor_size = popup
        .current_monitor()
        .map_err(|err| err.to_string())?
        .map(|monitor| monitor.size().to_owned())
        .unwrap_or(DEFAULT_MONITOR_SIZE);

    let size = popup.outer_size().unwrap_or(DEFAULT_POPUP_SIZE);
    let position = popup_position(payload.x, payload.y, monitor_size, size);

    popup.set_position(position).map_err(|err| err.to_string())?;
    popup.emit("selection-ready", payload).map_err(|err| err.to_string())?;
    popup.show().map_err(|err| err.to_string())?;
    popup.set_focus().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hide_translation_popup(app: AppHandle) -> Result<(), String> {
    if let Some(popup) = app.get_webview_window("popup") {
        popup.hide().map_err(|err| err.to_string())?;
    }
    Ok(())
}

pub fn popup_position(
    pointer_x: i32,
    pointer_y: i32,
    monitor_size: PhysicalSize<u32>,
    popup_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let max_x = monitor_size.width.saturating_sub(popup_size.width) as i32;
    let max_y = monitor_size.height.saturating_sub(popup_size.height) as i32;
    PhysicalPosition::new(
        (pointer_x + POPUP_OFFSET_X).clamp(0, max_x),
        (pointer_y + POPUP_OFFSET_Y).clamp(0, max_y),
    )
}

#[cfg(test)]
mod tests {
    use tauri::{PhysicalPosition, PhysicalSize};

    use super::popup_position;

    #[test]
    fn offsets_popup_from_pointer() {
        assert_eq!(
            popup_position(100, 120, PhysicalSize::new(1000, 800), PhysicalSize::new(400, 260)),
            PhysicalPosition::new(114, 138)
        );
    }

    #[test]
    fn keeps_popup_inside_monitor() {
        assert_eq!(
            popup_position(950, 760, PhysicalSize::new(1000, 800), PhysicalSize::new(400, 260)),
            PhysicalPosition::new(600, 540)
        );
    }
}
