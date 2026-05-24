use mouse_position::mouse_position::Mouse;

use crate::models::SelectionPayload;

const FALLBACK_MOUSE_POSITION: (i32, i32) = (240, 240);

#[tauri::command]
pub fn get_current_selection() -> Result<SelectionPayload, String> {
    let text = normalize_selection_text(
        &get_selected_text::get_selected_text().map_err(|err| err.to_string())?,
    )?;
    let (x, y) = current_mouse_position();
    Ok(SelectionPayload { text, x, y })
}

fn current_mouse_position() -> (i32, i32) {
    match Mouse::get_mouse_position() {
        Mouse::Position { x, y } => (x, y),
        Mouse::Error => FALLBACK_MOUSE_POSITION,
    }
}

pub fn normalize_selection_text(text: &str) -> Result<String, String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("没有检测到选中文字".to_string());
    }
    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::normalize_selection_text;

    #[test]
    fn trims_selected_text() {
        assert_eq!(normalize_selection_text("  hello  ").unwrap(), "hello");
    }

    #[test]
    fn rejects_blank_selection() {
        assert_eq!(normalize_selection_text(" \n\t ").unwrap_err(), "没有检测到选中文字");
    }
}
