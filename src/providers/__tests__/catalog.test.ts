import { describe, expect, it } from 'vitest';
import { createProvider, enabledProvider, normalizeProvider, normalizeProviders } from '../catalog';

import type { ProviderConfig } from '../types';

describe('createProvider', () => {
  it('creates the first provider enabled by default', () => {
    expect(createProvider('baidu-general')).toMatchObject({
      kind: 'baidu-general',
      label: '百度通用文本翻译',
      enabled: true
    });
  });

  it('creates later providers disabled with unique labels', () => {
    const firstProvider = createProvider('baidu-general');
    const secondProvider = createProvider('baidu-general', [firstProvider]);

    expect(secondProvider).toMatchObject({
      kind: 'baidu-general',
      label: '百度通用文本翻译 2',
      enabled: false
    });
    expect(secondProvider.id).not.toBe(firstProvider.id);
  });
});

describe('normalizeProvider', () => {
  it('keeps provider-specific user settings', () => {
    const provider: Partial<ProviderConfig> = {
      id: 'provider-1',
      kind: 'openai-compatible',
      apiKey: 'test-api-key',
      model: 'qwen-plus',
      enabled: true
    };

    expect(normalizeProvider(provider)).toMatchObject({
      id: 'provider-1',
      kind: 'openai-compatible',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'test-api-key',
      model: 'qwen-plus',
      enabled: true
    });
  });
});

describe('normalizeProviders', () => {
  it('preserves a user-managed provider list without adding presets', () => {
    const providers = normalizeProviders([
      { id: 'baidu-1', kind: 'baidu-general', appId: 'demo-app-id', secretKey: 'demo-secret', enabled: true }
    ]);

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      id: 'baidu-1',
      kind: 'baidu-general',
      appId: 'demo-app-id',
      secretKey: 'demo-secret',
      enabled: true
    });
  });
});

describe('enabledProvider', () => {
  it('returns the enabled provider', () => {
    const providers = [
      normalizeProvider({ id: 'one', kind: 'baidu-general', enabled: false }),
      normalizeProvider({ id: 'two', kind: 'openai-compatible', enabled: true })
    ];

    expect(enabledProvider(providers)?.id).toBe('two');
  });
});
