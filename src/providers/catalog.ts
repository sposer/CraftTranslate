import { ProviderConfig, ProviderKind } from './types';

export const providerCatalog: Record<ProviderKind, ProviderConfig> = {
  mock: {
    id: 'mock',
    label: '本地演示',
    endpoint: '',
    apiKey: '',
    appId: '',
    secretKey: '',
    model: ''
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI 兼容接口',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    appId: '',
    secretKey: '',
    model: 'gpt-4o-mini'
  },
  'baidu-general': {
    id: 'baidu-general',
    label: '百度通用文本翻译',
    endpoint: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
    apiKey: '',
    appId: '',
    secretKey: '',
    model: ''
  }
};

export function mergeProviderConfig(provider: Partial<ProviderConfig> | undefined): ProviderConfig {
  const providerId = provider?.id ?? 'mock';
  return {
    ...providerCatalog[providerId],
    ...provider,
    id: providerId
  };
}

export function allProviders(): ProviderConfig[] {
  return Object.values(providerCatalog);
}
