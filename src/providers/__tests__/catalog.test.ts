import { describe, expect, it } from 'vitest';
import { mergeProviderConfig } from '../catalog';

import type { ProviderConfig } from '../types';

describe('mergeProviderConfig', () => {
  it('uses mock provider as the default', () => {
    expect(mergeProviderConfig(undefined)).toMatchObject({
      id: 'mock',
      label: '本地演示'
    });
  });

  it('keeps provider-specific user settings', () => {
    const provider: Partial<ProviderConfig> = {
      id: 'openai-compatible',
      apiKey: 'secret',
      model: 'qwen-plus'
    };

    expect(mergeProviderConfig(provider)).toMatchObject({
      id: 'openai-compatible',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'secret',
      model: 'qwen-plus'
    });
  });
});
