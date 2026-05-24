import { ProviderConfig } from './providers/types';

export interface AppSettings {
  hotkey: string;
  launchOnStartup: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  provider: ProviderConfig;
}

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
}
