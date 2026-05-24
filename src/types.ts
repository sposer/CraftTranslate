import { ProviderConfig } from './providers/types';

export interface AppSettings {
  hotkey: string;
  launchOnStartup: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  theme: Theme;
  activeProviderId: string;
  providers: ProviderConfig[];
}

export type Theme = 'auto' | 'light' | 'dark';

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
}
