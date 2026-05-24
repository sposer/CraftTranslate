import { describe, expect, it } from 'vitest';
import { ensureProvider, normalizeSettings } from '../../settings';

describe('normalizeSettings', () => {
  it('does not create preset providers during normalization', () => {
    expect(normalizeSettings({ hotkey: 'Alt+Q' })).toMatchObject({
      hotkey: 'Alt+Q',
      launchOnStartup: false,
      sourceLanguage: 'auto',
      targetLanguage: '中文',
      activeProviderId: '',
      providers: []
    });
  });

  it('preserves provider list configuration', () => {
    expect(normalizeSettings({
      activeProviderId: 'openai-1',
      providers: [
        {
          id: 'openai-1',
          kind: 'openai-compatible',
          label: 'OpenAI 兼容接口',
          endpoint: 'https://example.com/chat',
          apiKey: 'test-api-key',
          appId: '',
          secretKey: '',
          model: 'qwen-plus',
          enabled: true
        }
      ]
    })).toMatchObject({
      activeProviderId: 'openai-1',
      providers: [
        {
          id: 'openai-1',
          kind: 'openai-compatible',
          endpoint: 'https://example.com/chat',
          apiKey: 'test-api-key',
          model: 'qwen-plus',
          enabled: true
        }
      ]
    });
  });

  it('migrates the previous single-provider setting', () => {
    expect(normalizeSettings({
      provider: {
        id: 'openai-compatible',
        kind: 'openai-compatible',
        label: 'OpenAI 兼容接口',
        endpoint: 'https://example.com/chat',
        apiKey: 'test-api-key',
        appId: '',
        secretKey: '',
        model: 'qwen-plus',
        enabled: true
      }
    })).toMatchObject({
      activeProviderId: 'openai-compatible',
      providers: [
        {
          endpoint: 'https://example.com/chat',
          apiKey: 'test-api-key',
          model: 'qwen-plus',
          enabled: true
        }
      ]
    });
  });
});

describe('ensureProvider', () => {
  it('creates one Baidu provider for first-run editing', () => {
    const settings = ensureProvider(normalizeSettings(undefined));

    expect(settings.providers).toHaveLength(1);
    expect(settings.providers[0]).toMatchObject({ kind: 'baidu-general', enabled: true });
    expect(settings.activeProviderId).toBe(settings.providers[0].id);
  });

  it('does not add another provider when user already has a list', () => {
    const settings = ensureProvider(normalizeSettings({
      activeProviderId: 'baidu-1',
      providers: [{ id: 'baidu-1', kind: 'baidu-general', enabled: true }]
    }));

    expect(settings.providers).toHaveLength(1);
    expect(settings.activeProviderId).toBe('baidu-1');
  });
});
