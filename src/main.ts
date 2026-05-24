import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { allProviders, mergeProviderConfig } from './providers/catalog';
import { translateText } from './providers/translator';
import { ProviderKind } from './providers/types';
import { loadSettings, saveSettings } from './settings';
import { escapeAttribute, escapeHtml } from './ui/html';
import { AppSettings, SelectionPayload } from './types';
import './styles.css';

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (!rootElement) {
  throw new Error('Missing #app root');
}
const root: HTMLDivElement = rootElement;

let settings: AppSettings;
let selectionPayload: SelectionPayload | null = null;
let statusMessage = '';
let isSaving = false;
let isTranslating = false;
let translation = '';
let errorMessage = '';

init().catch((error) => {
  root.innerHTML = `<main class="fatal">启动失败：${escapeHtml(String(error))}</main>`;
});

async function init() {
  settings = await loadSettings();
  if (location.hash === '#/popup') {
    renderPopup();
    await listen<SelectionPayload>('selection-ready', async (event) => {
      selectionPayload = event.payload;
      await runTranslation(event.payload.text);
    });
  } else {
    await syncAutostartState();
    renderSettings();
    await invoke('register_translate_hotkey', { shortcut: settings.hotkey });
    await listen<string>('translate-trigger-error', (event) => {
      statusMessage = event.payload;
      renderSettings();
    });
  }
}

async function syncAutostartState() {
  try {
    settings.launchOnStartup = await invoke<boolean>('get_autostart_enabled');
  } catch {
    settings.launchOnStartup = false;
  }
}

function renderSettings() {
  const providerOptions = allProviders()
    .map((provider) => `<option value="${provider.id}" ${settings.provider.id === provider.id ? 'selected' : ''}>${escapeHtml(provider.label)}</option>`)
    .join('');

  root.innerHTML = `
    <main class="shell settings-shell">
      <section class="hero-card">
        <div>
          <p class="eyebrow">CraftTranslate</p>
          <h1>Windows 划词翻译</h1>
          <p class="lede">选中文字，按热键，在鼠标附近弹出译文。托盘常驻，设置尽量少打扰。</p>
        </div>
        <div class="hotkey-preview">${escapeHtml(settings.hotkey)}</div>
      </section>

      <form class="panel settings-grid" id="settings-form">
        <label>
          <span>触发热键</span>
          <input name="hotkey" value="${escapeAttribute(settings.hotkey)}" placeholder="CommandOrControl+Shift+T" />
          <small>例如 CommandOrControl+Shift+T、Alt+Q。</small>
        </label>

        <label>
          <span>翻译提供者</span>
          <select name="providerId">${providerOptions}</select>
        </label>

        <label class="wide checkbox-row">
          <input name="launchOnStartup" type="checkbox" ${settings.launchOnStartup ? 'checked' : ''} />
          <span>开机后自动启动 CraftTranslate</span>
        </label>

        <label class="wide">
          <span>接口地址</span>
          <input name="endpoint" value="${escapeAttribute(settings.provider.endpoint)}" placeholder="https://api.openai.com/v1/chat/completions" />
        </label>

        <label>
          <span>API Key</span>
          <input name="apiKey" type="password" value="${escapeAttribute(settings.provider.apiKey)}" autocomplete="off" />
        </label>

        <label>
          <span>百度 APP ID</span>
          <input name="appId" value="${escapeAttribute(settings.provider.appId)}" autocomplete="off" />
        </label>

        <label>
          <span>百度密钥</span>
          <input name="secretKey" type="password" value="${escapeAttribute(settings.provider.secretKey)}" autocomplete="off" />
        </label>

        <label>
          <span>模型</span>
          <input name="model" value="${escapeAttribute(settings.provider.model)}" placeholder="gpt-4o-mini" />
        </label>

        <label>
          <span>源语言</span>
          <input name="sourceLanguage" value="${escapeAttribute(settings.sourceLanguage)}" />
        </label>

        <label>
          <span>目标语言</span>
          <input name="targetLanguage" value="${escapeAttribute(settings.targetLanguage)}" />
        </label>

        <div class="actions wide">
          <button type="submit" ${isSaving ? 'disabled' : ''}>${isSaving ? '保存中…' : '保存设置'}</button>
          <button type="button" id="test-selection">测试当前选区</button>
          <span class="status">${escapeHtml(statusMessage)}</span>
        </div>
      </form>
    </main>
  `;

  document.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', handleSettingsSubmit);
  document.querySelector<HTMLButtonElement>('#test-selection')?.addEventListener('click', testCurrentSelection);
}

async function handleSettingsSubmit(event: SubmitEvent) {
  event.preventDefault();
  const formElement = event.currentTarget;
  if (!(formElement instanceof HTMLFormElement)) {
    return;
  }

  const form = new FormData(formElement);
  const provider = mergeProviderConfig({
    id: getFormValue(form, 'providerId') as ProviderKind,
    endpoint: getFormValue(form, 'endpoint'),
    apiKey: getFormValue(form, 'apiKey'),
    appId: getFormValue(form, 'appId'),
    secretKey: getFormValue(form, 'secretKey'),
    model: getFormValue(form, 'model')
  });
  const nextSettings: AppSettings = {
    hotkey: getFormValue(form, 'hotkey'),
    launchOnStartup: form.get('launchOnStartup') === 'on',
    sourceLanguage: getFormValue(form, 'sourceLanguage'),
    targetLanguage: getFormValue(form, 'targetLanguage'),
    provider
  };

  isSaving = true;
  statusMessage = '';
  renderSettings();
  try {
    await saveSettings(nextSettings);
    await invoke('register_translate_hotkey', { shortcut: nextSettings.hotkey });
    await invoke('set_autostart', { enabled: nextSettings.launchOnStartup });
    settings = nextSettings;
    statusMessage = '已保存';
  } catch (error) {
    statusMessage = `保存失败：${String(error)}`;
  } finally {
    isSaving = false;
    renderSettings();
  }
}

async function testCurrentSelection() {
  try {
    const payload = await invoke<SelectionPayload>('get_current_selection');
    await invoke('show_translation_popup', { payload });
    statusMessage = '已打开测试弹窗';
  } catch (error) {
    statusMessage = String(error);
  }
  renderSettings();
}

function renderPopup() {
  const sourceText = selectionPayload?.text ?? '等待划词…';
  root.innerHTML = `
    <main class="popup-card">
      <header>
        <div>
          <p class="eyebrow">CraftTranslate</p>
          <strong>${escapeHtml(settings.targetLanguage)}</strong>
        </div>
        <button class="icon-button" id="close-popup" aria-label="关闭">×</button>
      </header>
      <section class="source-text">${escapeHtml(sourceText)}</section>
      <section class="translation ${isTranslating ? 'loading' : ''}">
        ${isTranslating ? '翻译中…' : escapeHtml(errorMessage || translation || '选中文本后按热键开始翻译')}
      </section>
    </main>
  `;

  document.querySelector<HTMLButtonElement>('#close-popup')?.addEventListener('click', () => {
    invoke('hide_translation_popup');
  });
}

async function runTranslation(text: string) {
  settings = await loadSettings();
  isTranslating = true;
  translation = '';
  errorMessage = '';
  renderPopup();
  try {
    translation = await translateText({
      text,
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage,
      provider: settings.provider
    });
  } catch (error) {
    errorMessage = String(error);
  } finally {
    isTranslating = false;
    renderPopup();
  }
}

function getFormValue(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}
