export interface HotkeyEvent {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
}

export function formatHotkey(event: HotkeyEvent): string {
  const key = normalizeHotkeyKey(event.key);
  if (!key || ['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
    return '';
  }

  const modifiers: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    modifiers.push('CommandOrControl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (modifiers.length === 0) {
    return '';
  }
  return [...modifiers, key].join('+');
}

function normalizeHotkeyKey(key: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    Escape: 'Esc',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right'
  };
  if (keyMap[key]) {
    return keyMap[key];
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}
