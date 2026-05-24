export type ProviderKind = 'mock' | 'openai-compatible' | 'baidu-general';

export interface ProviderConfig {
  id: ProviderKind;
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
