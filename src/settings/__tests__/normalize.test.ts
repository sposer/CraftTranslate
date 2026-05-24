import { describe, expect, it } from 'vitest';
import { normalizeSettings } from '../../settings';

describe('normalizeSettings', () => {
  it('fills missing settings with defaults', () => {
    expect(normalizeSettings({ hotkey: 'Alt+Q' })).toMatchObject({
      hotkey: 'Alt+Q',
      launchOnStartup: false,
      sourceLanguage: 'auto',
      targetLanguage: '中文',
      provider: { id: 'mock' }
    });
  });

  it('preserves structured provider configuration', () => {
    expect(normalizeSettings({
      provider: {
        id: 'openai-compatible',
        label: 'OpenAI 兼容接口',
        endpoint: 'https://example.com/chat',
        apiKey: 'secret',
        model: 'qwen-plus'
      }
    })).toMatchObject({
      provider: {
        id: 'openai-compatible',
        endpoint: 'https://example.com/chat',
        apiKey: 'secret',
        model: 'qwen-plus'
      }
    });
  });
});
