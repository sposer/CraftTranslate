import { ProviderConfig, ProviderKind, ProviderTemplate } from './types';

export const providerTemplates: Record<ProviderKind, ProviderTemplate> = {
  'baidu-general': {
    kind: 'baidu-general',
    label: '百度通用文本翻译',
    endpoint: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
    apiKey: '',
    appId: '',
    secretKey: '',
    model: ''
  },
  'openai-compatible': {
    kind: 'openai-compatible',
    label: 'OpenAI 兼容接口',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    appId: '',
    secretKey: '',
    model: 'gpt-4o-mini'
  }
};

export function createProvider(kind: ProviderKind, existingProviders: ProviderConfig[] = []): ProviderConfig {
  const template = providerTemplates[kind];
  const sameKindCount = existingProviders.filter((provider) => provider.kind === kind).length;
  const id = `${kind}-${Date.now()}-${sameKindCount + 1}`;
  return {
    ...template,
    id,
    label: sameKindCount === 0 ? template.label : `${template.label} ${sameKindCount + 1}`,
    enabled: existingProviders.length === 0
  };
}

export function normalizeProvider(provider: Partial<ProviderConfig>, existingProviders: ProviderConfig[] = []): ProviderConfig {
  const kind = provider.kind ?? (provider.id as ProviderKind) ?? 'baidu-general';
  const template = providerTemplates[kind];
  return {
    ...template,
    ...provider,
    id: provider.id ?? `${kind}-${existingProviders.length + 1}`,
    kind,
    label: provider.label?.trim() || template.label,
    enabled: Boolean(provider.enabled)
  };
}

export function normalizeProviders(providers: Partial<ProviderConfig>[] | undefined): ProviderConfig[] {
  return (providers ?? []).map((provider, index, allProviders) => normalizeProvider(provider, allProviders.slice(0, index) as ProviderConfig[]));
}

export function enabledProvider(providers: ProviderConfig[]): ProviderConfig | undefined {
  return providers.find((provider) => provider.enabled);
}
