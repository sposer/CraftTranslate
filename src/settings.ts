import { Store } from '@tauri-apps/plugin-store';
import { createProvider, enabledProvider, normalizeProvider, normalizeProviders } from './providers/catalog';
import { ProviderConfig } from './providers/types';
import { AppSettings } from './types';

const settingsKey = 'settings';
let storePromise: Promise<Store> | null = null;

type LegacySettings = Partial<Omit<AppSettings, 'providers'>> & {
  providers?: Partial<ProviderConfig>[] | Record<string, Partial<ProviderConfig>>;
  provider?: Partial<ProviderConfig>;
};

export const defaultSettings: AppSettings = {
  hotkey: 'CommandOrControl+Shift+T',
  launchOnStartup: false,
  sourceLanguage: 'auto',
  targetLanguage: '中文',
  theme: 'auto',
  activeProviderId: '',
  providers: []
};

function getStore(): Promise<Store> {
  storePromise ??= Store.load('settings.json');
  return storePromise;
}

export function normalizeSettings(saved: LegacySettings | undefined): AppSettings {
  const providers = normalizeSavedProviders(saved);
  const activeProviderId = saved?.activeProviderId && providers.some((provider) => provider.id === saved.activeProviderId)
    ? saved.activeProviderId
    : enabledProvider(providers)?.id ?? providers[0]?.id ?? '';

  return {
    ...defaultSettings,
    ...saved,
    activeProviderId,
    providers
  };
}

function normalizeSavedProviders(saved: LegacySettings | undefined): ProviderConfig[] {
  if (Array.isArray(saved?.providers)) {
    return normalizeProviders(saved.providers);
  }

  if (saved?.providers && !Array.isArray(saved.providers)) {
    return normalizeProviders(Object.entries(saved.providers).map(([id, provider]) => ({
      ...provider,
      id: provider.id ?? id,
      kind: provider.kind ?? (id as ProviderConfig['kind'])
    })));
  }

  if (saved?.provider) {
    return [normalizeProvider({
      ...saved.provider,
      kind: saved.provider.kind ?? (saved.provider.id as ProviderConfig['kind']) ?? 'baidu-general',
      enabled: true
    })];
  }

  return [];
}

export function ensureProvider(settings: AppSettings): AppSettings {
  if (settings.providers.length > 0) {
    return settings;
  }
  const provider = createProvider('baidu-general');
  return {
    ...settings,
    activeProviderId: provider.id,
    providers: [provider]
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const store = await getStore();
  const saved = await store.get<LegacySettings>(settingsKey);
  return normalizeSettings(saved);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore();
  await store.set(settingsKey, normalizeSettings(settings));
  await store.save();
}
