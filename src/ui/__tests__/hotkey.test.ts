import { describe, expect, it } from 'vitest';
import { formatHotkey } from '../hotkey';

describe('formatHotkey', () => {
  it('formats control shift letter shortcuts for Tauri', () => {
    expect(formatHotkey({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: true, key: 't' })).toBe('CommandOrControl+Shift+T');
  });

  it('formats alt shortcuts', () => {
    expect(formatHotkey({ ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, key: 'q' })).toBe('Alt+Q');
  });

  it('formats function keys', () => {
    expect(formatHotkey({ ctrlKey: true, metaKey: false, altKey: true, shiftKey: false, key: 'F9' })).toBe('CommandOrControl+Alt+F9');
  });

  it('rejects bare keys', () => {
    expect(formatHotkey({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: 'q' })).toBe('');
  });
});
