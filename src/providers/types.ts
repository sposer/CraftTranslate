export type ProviderKind = 'baidu-general' | 'openai-compatible';

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  label: string;
  endpoint: string;
  apiKey: string;
  appId: string;
  secretKey: string;
  model: string;
  enabled: boolean;
}

export interface ProviderTemplate {
  kind: ProviderKind;
  label: string;
  endpoint: string;
  apiKey: string;
  appId: string;
  secretKey: string;
  model: string;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: ProviderConfig;
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}
