import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { createProvider, enabledProvider, providerTemplates } from './providers/catalog';
import { translateText } from './providers/translator';
import { ProviderConfig, ProviderKind } from './providers/types';
import { ensureProvider, loadSettings, saveSettings } from './settings';
import { AppSettings, SelectionPayload } from './types';
import { escapeAttribute, escapeHtml } from './ui/html';
import { formatHotkey } from './ui/hotkey';
import './styles.css';

const LANGUAGES = [
  { value: 'auto', label: '自动检测' },
  { value: '中文', label: '中文' },
  { value: '英语', label: 'English' },
  { value: '日语', label: '日本語' },
  { value: '韩语', label: '한국어' },
  { value: '法语', label: 'Français' },
  { value: '德语', label: 'Deutsch' },
  { value: '西班牙语', label: 'Español' },
  { value: '俄语', label: 'Русский' },
];

function languageOptions(selected: string): string {
  return LANGUAGES.map((lang) =>
    `<option value="${lang.value}" ${lang.value === selected ? 'selected' : ''}>${escapeHtml(lang.label)}</option>`
  ).join('');
}

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (!rootElement) {
  throw new Error('Missing #app root');
}
const root: HTMLDivElement = rootElement;

let settings: AppSettings;
let selectionPayload: SelectionPayload | null = null;
let isSaving = false;
let isTranslating = false;
let translation = '';
let errorMessage = '';
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastQueue: string[] = [];

init().catch((error) => {
  root.innerHTML = `<main class="fatal">启动失败：${escapeHtml(String(error))}</main>`;
});

async function init() {
  settings = ensureProvider(await loadSettings());
  await applyTheme();
  if (location.hash === '#/popup') {
    await listen<SelectionPayload>('selection-ready', async (event) => {
      selectionPayload = event.payload;
      await runTranslation(event.payload.text);
    });
  } else {
    await syncAutostartState();
    renderSettings();
    await invoke('register_translate_hotkey', { shortcut: settings.hotkey });
    await listen<string>('translate-trigger-error', (event) => {
      pushToast(event.payload, true);
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

// ─── Toast ────────────────────────────────────────────────────

function pushToast(message: string, isError = false) {
  toastQueue.push(message);
  renderToasts();
  if (toastTimer) {
    return;
  }
  toastTimer = setTimeout(() => {
    toastQueue.shift();
    renderToasts();
    autoDismissToasts();
  }, 2800);
}

function autoDismissToasts() {
  toastTimer = null;
  if (toastQueue.length === 0) {
    return;
  }
  toastTimer = setTimeout(() => {
    toastQueue.shift();
    renderToasts();
    autoDismissToasts();
  }, 2800);
}

function renderToasts() {
  const container = document.querySelector<HTMLDivElement>('#toast-container');
  if (!container) {
    return;
  }
  container.innerHTML = toastQueue.map((msg) => `
    <div class="toast">${escapeHtml(msg)}</div>
  `).join('');
}

// ─── Auto-save ────────────────────────────────────────────────

async function autoSave(displayMessage: string) {
  isSaving = true;
  try {
    await saveSettings(settings);
    await invoke('register_translate_hotkey', { shortcut: settings.hotkey });
    pushToast(displayMessage);
  } catch (error) {
    pushToast(`保存失败：${String(error)}`, true);
  } finally {
    isSaving = false;
  }
}

// ─── Render ───────────────────────────────────────────────────

function renderSettings() {
  root.innerHTML = `
    <div class="toast-container" id="toast-container"></div>
    <main class="page">
      <form class="form" id="settings-form">
        <header class="topbar">
          <span class="brand">CraftTranslate</span>
        </header>

        <div class="sections">
          ${renderHotkeyRow()}
          ${renderLanguageRow()}
          ${renderThemeRow()}
          ${renderProviderSection()}
        </div>
      </form>
      ${renderModal()}
    </main>
  `;

  bindSettingsEvents();
}

function renderHotkeyRow(): string {
  return `
    <section class="section">
      <div class="row">
        <div class="row-main">
          <div class="title">划词热键</div>
          <div class="sub">选中文字后按下此键组合触发翻译</div>
        </div>
        <div class="row-ctl hotkey-ctl">
          <span class="hotkey-display">${escapeHtml(settings.hotkey)}</span>
          <button class="pill" id="record-hotkey" type="button">录入</button>
        </div>
      </div>
    </section>`;
}

function renderLanguageRow(): string {
  return `
    <section class="section cols">
      <div class="row">
        <div class="row-main">
          <div class="title">源语言</div>
          <div class="sub">选中文本的原始语言</div>
        </div>
        <div class="row-ctl">
          <select class="text-in" name="sourceLanguage" style="width:160px">
            ${languageOptions(settings.sourceLanguage)}
          </select>
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <div class="title">目标语言</div>
          <div class="sub">翻译结果的语言</div>
        </div>
        <div class="row-ctl">
          <select class="text-in" name="targetLanguage" style="width:160px">
            ${LANGUAGES.filter((lang) => lang.value !== 'auto').map((lang) =>
              `<option value="${lang.value}" ${lang.value === settings.targetLanguage ? 'selected' : ''}>${escapeHtml(lang.label)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <div class="title">开机自启</div>
          <div class="sub">登录后自动在托盘运行</div>
        </div>
        <div class="row-ctl">
          <label class="toggle">
            <input name="launchOnStartup" type="checkbox" ${settings.launchOnStartup ? 'checked' : ''} />
            <span class="toggle-knob"></span>
          </label>
        </div>
      </div>
    </section>`;
}

function renderThemeRow(): string {
  return `
    <section class="section">
      <div class="row">
        <div class="row-main">
          <div class="title">主题</div>
          <div class="sub">自动跟随系统，或手动选择深色/浅色</div>
        </div>
        <div class="row-ctl">
          <select class="text-in" name="theme" style="width:140px">
            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>自动</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>浅色</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>深色</option>
          </select>
        </div>
      </div>
    </section>`;
}

function renderProviderSection(): string {
  return `
    <section class="section providers">
      <div class="providers-head">
        <div class="row-main">
          <div class="title">翻译提供者</div>
          <div class="sub">${settings.providers.length ? `共 ${settings.providers.length} 个配置，启用一个即可` : '点击右侧新建'}</div>
        </div>
        <button class="pill accent" id="add-provider" type="button">+ 新建</button>
      </div>
      <div class="provider-list">
        ${renderProviderList()}
      </div>
    </section>`;
}

function renderProviderList(): string {
  if (settings.providers.length === 0) {
    return '<div class="empty">还没有提供者，点"新建"添加。</div>';
  }
  return settings.providers.map((provider) => `
    <div class="prov-row ${provider.id === settings.activeProviderId ? 'active' : ''} ${provider.enabled ? 'on' : ''}">
      <div class="prov-main">
        <div class="prov-name">
          <span class="prov-label">${escapeHtml(provider.label)}</span>
          <span class="prov-kind">${escapeHtml(providerTemplates[provider.kind].label)}</span>
        </div>
        <div class="prov-status">
          ${provider.enabled
            ? '<span class="tag on">已启用</span>'
            : '<span class="tag">未启用</span>'}
        </div>
      </div>
      <div class="prov-ctl">
        <button class="pill ${provider.enabled ? 'on' : ''}" type="button" data-provider-id="${escapeAttribute(provider.id)}" data-action="toggle">
          ${provider.enabled ? '禁用' : '启用'}
        </button>
        <button class="pill" type="button" data-provider-id="${escapeAttribute(provider.id)}" data-action="edit">编辑</button>
        <button class="pill danger" type="button" data-provider-id="${escapeAttribute(provider.id)}" data-action="remove">删除</button>
      </div>
    </div>
  `).join('');
}

function renderModal(): string {
  return `
    <div class="modal-backdrop" id="modal-backdrop" hidden>
      <div class="modal-panel" id="modal-panel">
        <div class="modal-head">
          <div class="modal-title" id="modal-title">编辑提供者</div>
          <button class="icon-btn" id="modal-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-foot">
          <button class="ghost" id="modal-cancel" type="button">取消</button>
          <button class="primary" id="modal-save" type="button">保存</button>
        </div>
      </div>
    </div>`;
}

// ─── Event binding ────────────────────────────────────────────

function bindSettingsEvents() {
  document.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', (event) => event.preventDefault());
  document.querySelector<HTMLButtonElement>('#record-hotkey')?.addEventListener('click', startHotkeyRecording);
  document.querySelector<HTMLButtonElement>('#add-provider')?.addEventListener('click', () => openProviderModal());
  document.querySelector<HTMLButtonElement>('#modal-close')?.addEventListener('click', closeModal);
  document.querySelector<HTMLButtonElement>('#modal-cancel')?.addEventListener('click', closeModal);
  document.querySelector<HTMLButtonElement>('#modal-save')?.addEventListener('click', saveProviderFromModal);
  document.querySelector<HTMLDivElement>('#modal-backdrop')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  });

  document.querySelector<HTMLSelectElement>('[name="sourceLanguage"]')?.addEventListener('change', (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    settings = { ...settings, sourceLanguage: value };
    autoSave('源语言已更新');
  });

  document.querySelector<HTMLSelectElement>('[name="targetLanguage"]')?.addEventListener('change', (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    settings = { ...settings, targetLanguage: value };
    autoSave('目标语言已更新');
  });

  document.querySelector<HTMLInputElement>('[name="launchOnStartup"]')?.addEventListener('change', (event) => {
    const enabled = (event.currentTarget as HTMLInputElement).checked;
    settings = { ...settings, launchOnStartup: enabled };
    invoke('set_autostart', { enabled }).catch(() => {});
    autoSave(enabled ? '已开启开机自启' : '已关闭开机自启');
  });

  document.querySelector<HTMLSelectElement>('[name="theme"]')?.addEventListener('change', async (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value as AppSettings['theme'];
    settings = { ...settings, theme: value };
    await applyTheme();
    autoSave('主题已更新');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-provider-id]').forEach((button) => {
    const id = button.dataset.providerId ?? '';
    const action = button.dataset.action ?? '';
    button.addEventListener('click', () => {
      if (action === 'toggle') toggleProvider(id);
      else if (action === 'edit') openProviderModal(id);
      else if (action === 'remove') removeProvider(id);
    });
  });
}

// ─── Hotkey ──────────────────────────────────────────────────

function startHotkeyRecording() {
  const display = document.querySelector<HTMLSpanElement>('.hotkey-display');
  if (display) {
    display.textContent = '按下组合键…';
  }

  function onKey(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    const modifierKeys = new Set(['Control', 'Alt', 'Shift', 'Meta']);
    if (modifierKeys.has(event.key)) {
      return;
    }
    window.removeEventListener('keydown', onKey, true);
    const hotkey = formatHotkey(event);
    if (!hotkey) {
      pushToast('热键需要包含至少一个修饰键（Ctrl/Alt/Shift/Meta）', true);
      renderSettings();
      return;
    }
    settings = { ...settings, hotkey };
    autoSave('热键已更新');
    renderSettings();
  }

  window.addEventListener('keydown', onKey, { capture: true });
}

// ─── Modal ────────────────────────────────────────────────────

let modalProviderId: string | null = null;

function openProviderModal(id?: string) {
  const provider = id
    ? settings.providers.find((p) => p.id === id)
    : null;
  modalProviderId = id ?? null;

  const titleEl = document.querySelector<HTMLDivElement>('#modal-title');
  const bodyEl = document.querySelector<HTMLDivElement>('#modal-body');
  const backdropEl = document.querySelector<HTMLDivElement>('#modal-backdrop');

  if (!titleEl || !bodyEl || !backdropEl) {
    return;
  }

  titleEl.textContent = provider ? '编辑提供者' : '新建提供者';
  bodyEl.innerHTML = renderProviderForm(provider);
  backdropEl.hidden = false;
}

function closeModal() {
  const backdropEl = document.querySelector<HTMLDivElement>('#modal-backdrop');
  if (backdropEl) {
    backdropEl.hidden = true;
  }
  modalProviderId = null;
}

function renderProviderForm(provider: ProviderConfig | null | undefined): string {
  const kind = provider?.kind ?? 'baidu-general';
  return `
    <div class="modal-grid">
      <div class="modal-row">
        <div class="modal-label">类型</div>
        <select class="text-in" id="modal-kind">
          ${Object.values(providerTemplates).map((tpl) =>
            `<option value="${tpl.kind}" ${tpl.kind === kind ? 'selected' : ''}>${escapeHtml(tpl.label)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="modal-row">
        <div class="modal-label">名称</div>
        <input class="text-in" id="modal-label" value="${escapeAttribute(provider?.label ?? '')}" placeholder="${escapeAttribute(providerTemplates[kind].label)}" />
      </div>
      <div class="modal-row">
        <div class="modal-label">接口地址</div>
        <input class="text-in" id="modal-endpoint" value="${escapeAttribute(provider?.endpoint ?? '')}" placeholder="${escapeAttribute(providerTemplates[kind].endpoint)}" />
      </div>
      ${kind === 'baidu-general' ? renderModalBaiduFields(provider) : renderModalOpenAiFields(provider)}
      <div class="modal-row">
        <div class="modal-label">启用</div>
        <label class="toggle">
          <input id="modal-enabled" type="checkbox" ${provider?.enabled !== false ? 'checked' : ''} />
          <span class="toggle-knob"></span>
        </label>
      </div>
    </div>`;
}

function renderModalBaiduFields(provider: ProviderConfig | null | undefined): string {
  return `
    <div class="modal-row">
      <div class="modal-label">APP ID</div>
      <input class="text-in" id="modal-appId" value="${escapeAttribute(provider?.appId ?? '')}" autocomplete="off" />
    </div>
    <div class="modal-row">
      <div class="modal-label">密钥</div>
      <input class="text-in" id="modal-secretKey" type="password" value="${escapeAttribute(provider?.secretKey ?? '')}" autocomplete="off" />
    </div>`;
}

function renderModalOpenAiFields(provider: ProviderConfig | null | undefined): string {
  return `
    <div class="modal-row">
      <div class="modal-label">API Key</div>
      <input class="text-in" id="modal-apiKey" type="password" value="${escapeAttribute(provider?.apiKey ?? '')}" autocomplete="off" />
    </div>
    <div class="modal-row">
      <div class="modal-label">模型</div>
      <input class="text-in" id="modal-model" value="${escapeAttribute(provider?.model ?? '')}" placeholder="gpt-4o-mini" />
    </div>`;
}

function getModalValue(id: string): string {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
  return el?.value?.trim() ?? '';
}

function getModalChecked(id: string): boolean {
  const el = document.querySelector<HTMLInputElement>(`#${id}`);
  return el?.checked ?? false;
}

async function saveProviderFromModal() {
  const kind = getModalValue('modal-kind') as ProviderKind;
  const label = getModalValue('modal-label') || providerTemplates[kind].label;
  const endpoint = getModalValue('modal-endpoint');
  const enabled = getModalChecked('modal-enabled');

  const providerData: Partial<ProviderConfig> = {
    kind,
    label,
    endpoint,
    enabled
  };

  if (kind === 'baidu-general') {
    providerData.appId = getModalValue('modal-appId');
    providerData.secretKey = getModalValue('modal-secretKey');
  } else {
    providerData.apiKey = getModalValue('modal-apiKey');
    providerData.model = getModalValue('modal-model');
  }

  if (modalProviderId) {
    settings = {
      ...settings,
      providers: settings.providers.map((p) =>
        p.id === modalProviderId
          ? { ...p, ...providerData }
          : p
      )
    };
  } else {
    const provider = createProvider(kind, settings.providers);
    const merged: ProviderConfig = { ...provider, ...providerData, id: provider.id, kind, enabled };
    settings = {
      ...settings,
      activeProviderId: settings.providers.length === 0 ? merged.id : settings.activeProviderId,
      providers: [...settings.providers, merged]
    };
  }

  closeModal();
  await autoSave(modalProviderId ? '提供者已更新' : '已添加提供者');
  renderSettings();
}

// ─── Provider list actions ────────────────────────────────────

async function toggleProvider(providerId: string) {
  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider) return;

  settings = {
    ...settings,
    activeProviderId: provider.enabled ? settings.activeProviderId : providerId,
    providers: settings.providers.map((p) => {
      if (p.id === providerId) {
        return { ...p, enabled: !p.enabled };
      }
      if (!provider.enabled) {
        return { ...p, enabled: false };
      }
      return p;
    })
  };

  await autoSave(provider.enabled ? '已禁用提供者' : '已启用提供者');
  renderSettings();
}

async function removeProvider(providerId: string) {
  const filtered = settings.providers.filter((p) => p.id !== providerId);
  const nextActiveId = settings.activeProviderId === providerId
    ? enabledProvider(filtered)?.id ?? filtered[0]?.id ?? ''
    : settings.activeProviderId;

  settings = {
    ...settings,
    activeProviderId: nextActiveId,
    providers: filtered
  };

  await autoSave('已删除提供者');
  renderSettings();
}

// ─── Popup ────────────────────────────────────────────────────

let closeTimer: ReturnType<typeof setTimeout> | null = null;
let cursorTrackingTimer: ReturnType<typeof setInterval> | null = null;

async function positionNearCursor() {
  try {
    const pos = await invoke<{ x: number; y: number }>('get_cursor_position');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    await getCurrentWindow().setPosition(new PhysicalPosition(pos.x + 14, pos.y + 18));
  } catch (err) {
    console.error('positionNearCursor failed:', err);
  }
}

async function applyTheme() {
  try {
    await getCurrentWindow().setTheme(settings.theme === 'auto' ? null : settings.theme);
  } catch (err) {
    console.error('applyTheme failed:', err);
  }
}

async function renderLoadingIndicator() {
  // Sync theme in case user changed it from settings while popup was hidden
  settings = ensureProvider(await loadSettings());
  await applyTheme();

  // Hide first to prevent flash when re-triggering while previous popup is visible
  try { await getCurrentWindow().hide(); } catch { /* ignore */ }

  clearCursorTracking();

  document.body.style.background = 'transparent';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  root.innerHTML = `
    <main class="loading-indicator">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </main>
  `;

  try {
    const { PhysicalSize } = await import('@tauri-apps/api/dpi');
    await getCurrentWindow().setSize(new PhysicalSize(68, 36));
    await positionNearCursor();
    await getCurrentWindow().show();
    await getCurrentWindow().setFocus();
  } catch (err) {
    console.error('renderLoadingIndicator failed:', err);
  }

  cursorTrackingTimer = setInterval(() => positionNearCursor(), 50);
}

function renderPopupResult() {
  clearCursorTracking();

  const sourceLabel = LANGUAGES.find((l) => l.value === settings.sourceLanguage)?.label ?? settings.sourceLanguage;

  document.body.style.background = 'transparent';
  document.body.style.borderRadius = '14px';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.borderRadius = '14px';
  document.documentElement.style.overflow = 'hidden';

  root.innerHTML = `
    <main class="popup-card">
      <header id="popup-header">
        <div class="popup-lang-pair">
          <span class="popup-lang-label">${escapeHtml(sourceLabel)}</span>
          <span class="popup-lang-arrow">→</span>
          <select class="popup-lang-select" id="popup-target">
            ${LANGUAGES.filter((l) => l.value !== 'auto').map((l) =>
              `<option value="${l.value}" ${l.value === settings.targetLanguage ? 'selected' : ''}>${escapeHtml(l.label)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="popup-header-actions">
          ${selectionPayload?.text
            ? `<button class="icon-btn" id="copy-source" aria-label="复制原文" title="复制原文">📋</button>`
            : ''}
          <button class="icon-btn popup-close" id="close-popup" aria-label="关闭">×</button>
        </div>
      </header>

      <section class="translation ${isTranslating ? 'loading' : ''}">
        <div class="translation-content">${escapeHtml(errorMessage || translation || '')}</div>
        ${!isTranslating && translation && !errorMessage
          ? `<button class="icon-btn copy-btn" id="copy-translation" aria-label="复制译文" title="复制译文">📋</button>`
          : ''}
      </section>
    </main>
  `;

  bindPopupEvents();
  startPopupCloseTimer();
  fitPopupSize();
}

function bindPopupEvents() {
  document.querySelector<HTMLButtonElement>('#close-popup')?.addEventListener('click', hidePopup);

  document.querySelector<HTMLDivElement>('#popup-header')?.addEventListener('mousedown', (event) => {
    if ((event.target as HTMLElement).closest('button, select')) {
      return;
    }
    getCurrentWindow().startDragging();
  });

  document.querySelector<HTMLSelectElement>('#popup-target')?.addEventListener('change', async (event) => {
    const newTarget = (event.currentTarget as HTMLSelectElement).value;
    settings = { ...settings, targetLanguage: newTarget };
    await saveSettings(settings);
    if (selectionPayload) {
      runTranslation(selectionPayload.text);
    }
  });

  document.querySelector<HTMLButtonElement>('#copy-source')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(selectionPayload?.text ?? '');
    } catch { /* ignore */ }
  });

  document.querySelector<HTMLButtonElement>('#copy-translation')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(translation);
    } catch { /* ignore */ }
  });
}

async function fitPopupSize() {
  const card = document.querySelector<HTMLDivElement>('.popup-card');
  if (!card) return;

  // Max dimensions based on monitor size
  let MAX_W = 960;
  let MAX_H = 640;
  try {
    const monitor = await currentMonitor();
    if (monitor) {
      MAX_W = Math.max(400, Math.round(monitor.size.width * 0.5));
      MAX_H = Math.round(monitor.size.height * 0.6);
    }
  } catch { /* fall back to defaults */ }

  // Expand to max first so the card can grow to its natural width for measurement
  try {
    const { PhysicalSize } = await import('@tauri-apps/api/dpi');
    await getCurrentWindow().setSize(new PhysicalSize(MAX_W, MAX_H));
  } catch { /* ignore */ }

  const prevOverflow = card.style.overflow;
  const prevMinHeight = card.style.minHeight;
  const prevMaxWidth = card.style.maxWidth;
  card.style.overflow = 'visible';
  card.style.minHeight = '0';
  card.style.maxWidth = `${MAX_W}px`;

  await new Promise((resolve) => requestAnimationFrame(resolve));

  const rect = card.getBoundingClientRect();
  const contentW = Math.ceil(rect.width);
  const contentH = Math.ceil(rect.height);

  const w = Math.min(Math.max(180, contentW), MAX_W);
  const h = Math.min(Math.max(80, contentH), MAX_H);
  const needsScroll = contentH > MAX_H;

  card.style.overflow = prevOverflow;
  card.style.minHeight = prevMinHeight;
  card.style.maxWidth = prevMaxWidth;
  card.classList.toggle('scrolls', needsScroll);

  try {
    const { PhysicalSize } = await import('@tauri-apps/api/dpi');
    await getCurrentWindow().setSize(new PhysicalSize(w, h));
    await positionNearCursor();
  } catch {
    // ignore
  }
}

function startPopupCloseTimer() {
  clearCloseTimer();
  // Start countdown: 5s from now
  closeTimer = setTimeout(() => invoke('hide_translation_popup'), 5000);

  const card = document.querySelector<HTMLDivElement>('.popup-card');
  if (!card) return;

  card.addEventListener('mouseenter', () => {
    clearCloseTimer();
  });

  card.addEventListener('mouseleave', () => {
    clearCloseTimer();
    closeTimer = setTimeout(() => invoke('hide_translation_popup'), 5000);
  });
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function clearCursorTracking() {
  if (cursorTrackingTimer) {
    clearInterval(cursorTrackingTimer);
    cursorTrackingTimer = null;
  }
}

function hidePopup() {
  clearCloseTimer();
  clearCursorTracking();
  document.body.style.background = '';
  document.body.style.borderRadius = '';
  document.body.style.overflow = '';
  document.documentElement.style.borderRadius = '';
  document.documentElement.style.overflow = '';
  invoke('hide_translation_popup');
}

async function runTranslation(text: string) {
  settings = ensureProvider(await loadSettings());
  isTranslating = true;
  translation = '';
  errorMessage = '';

  await renderLoadingIndicator();

  try {
    const provider = enabledProvider(settings.providers);
    if (!provider) {
      throw new Error('请先在设置里启用一个翻译提供者');
    }
    translation = await translateText({
      text,
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage,
      provider
    });
  } catch (error) {
    errorMessage = String(error);
  } finally {
    isTranslating = false;
    renderPopupResult();
  }
}
