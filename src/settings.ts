import { Store } from '@tauri-apps/plugin-store';
import { mergeProviderConfig } from './providers/catalog';
import { AppSettings } from './types';

const settingsKey = 'settings';
let storePromise: Promise<Store> | null = null;

export const defaultSettings: AppSettings = {
  hotkey: 'CommandOrControl+Shift+T',
  launchOnStartup: false,
  sourceLanguage: 'auto',
  targetLanguage: '中文',
  provider: mergeProviderConfig(undefined)
};

function getStore(): Promise<Store> {
  storePromise ??= Store.load('settings.json');
  return storePromise;
}

export function normalizeSettings(saved: Partial<AppSettings> | undefined): AppSettings {
  return {
    ...defaultSettings,
    ...saved,
    provider: mergeProviderConfig(saved?.provider)
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const store = await getStore();
  const saved = await store.get<Partial<AppSettings>>(settingsKey);
  return normalizeSettings(saved);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore();
  await store.set(settingsKey, normalizeSettings(settings));
  await store.save();
}
