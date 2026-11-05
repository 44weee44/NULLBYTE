import { migrateSave } from './engine.js';

const CLOUD_MANIFEST_KEY = 'nullbyte_save_v1_manifest';
const CLOUD_CHUNK_PREFIX = 'nullbyte_save_v1_part_';
const LEGACY_CLOUD_KEY = 'nullbyte_player';
const LOCAL_KEY = 'nullbyte_save_v1';
const CHUNK_SIZE = 3600; // Telegram CloudStorage permits at most 4096 chars per value.

function cloudApi() {
  try { return window.Telegram?.WebApp?.CloudStorage || null; } catch { return null; }
}

function callCloud(method, ...args) {
  const api = cloudApi();
  if (!api || typeof api[method] !== 'function') {
    return Promise.reject(new Error('CloudStorage недоступен'));
  }
  return new Promise((resolve, reject) => {
    try {
      api[method](...args, (error, value) => {
        if (error) reject(new Error(String(error)));
        else resolve(value);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

async function callCloudRetry(method, args = [], tries = 3, delayMs = 180) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await callCloud(method, ...args);
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw last || new Error('CloudStorage retry failed');
}

function checksum(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function splitChunks(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
  return chunks.length ? chunks : [''];
}

function getLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY) || localStorage.getItem(LEGACY_CLOUD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocal(state) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    // dual-write legacy key for older loaders
    try { localStorage.setItem(LEGACY_CLOUD_KEY, JSON.stringify(state)); } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function loadSavedGame(tgUser = null) {
  let raw = null;
  let provider = 'LOCAL PREVIEW';
  let warning = '';
  let cloudReadFailed = false;
  const api = cloudApi();

  if (api) {
    try {
      // small settle time after Telegram WebApp boot
      await new Promise(r => setTimeout(r, 120));

      const manifestText = await callCloudRetry('getItem', [CLOUD_MANIFEST_KEY], 3, 200);
      if (manifestText) {
        const manifest = JSON.parse(manifestText);
        if (
          manifest.version === 1 &&
          Number.isInteger(manifest.chunks) &&
          manifest.chunks > 0 &&
          manifest.chunks <= 500
        ) {
          let combined = '';
          for (let i = 0; i < manifest.chunks; i++) {
            const chunk = await callCloudRetry('getItem', [`${CLOUD_CHUNK_PREFIX}${i}`], 3, 160);
            if (typeof chunk !== 'string') throw new Error('Часть облачного сохранения отсутствует.');
            combined += chunk;
          }
          if (checksum(combined) !== manifest.checksum) {
            throw new Error('Контрольная сумма сохранения не совпала.');
          }
          raw = JSON.parse(combined);
          provider = 'TELEGRAM CLOUD';
        }
      }

      if (!raw) {
        const legacy = await callCloudRetry('getItem', [LEGACY_CLOUD_KEY], 2, 160).catch(() => null);
        if (legacy) {
          raw = JSON.parse(legacy);
          provider = 'TELEGRAM CLOUD / MIGRATION';
        }
      }
    } catch (error) {
      cloudReadFailed = true;
      warning = `Не удалось прочитать CloudStorage: ${error.message}`;
      console.warn('[NULLBYTE] cloud load failed', error);
    }
  }

  if (!raw) {
    raw = getLocal();
    if (raw) provider = api ? (cloudReadFailed ? 'LOCAL FALLBACK' : 'LOCAL SAVE') : 'LOCAL SAVE';
  }

  const migrated = migrateSave(raw, tgUser);
  if (raw && migrated.changed) {
    warning = warning || 'Сохранение обновлено до текущей версии без сброса известных данных.';
  }

  // If cloud failed but local has a valid nickname profile, prefer local and do not block.
  const hasLocalProfile = Boolean(raw?.player?.nickname);
  const blocked = Boolean(api && cloudReadFailed && !raw && !hasLocalProfile);

  return {
    state: migrated.state,
    provider,
    warning,
    hadSave: Boolean(raw),
    blocked
  };
}

export async function saveGame(state) {
  const snapshot = JSON.stringify(state);
  const localSaved = setLocal(state);
  const api = cloudApi();

  if (!api) {
    return {
      ok: localSaved,
      provider: localSaved ? 'LOCAL SAVE' : 'SAVE ERROR',
      warning: localSaved
        ? 'Telegram CloudStorage недоступен вне Telegram.'
        : 'Не удалось записать локальное сохранение. Проверь свободное место в хранилище браузера.'
    };
  }

  try {
    const chunks = splitChunks(snapshot);
    if (chunks.length > 500) throw new Error('Сохранение слишком большое для безопасной записи CloudStorage.');

    // Write chunks first, then manifest last (commit marker).
    for (let i = 0; i < chunks.length; i++) {
      await callCloudRetry('setItem', [`${CLOUD_CHUNK_PREFIX}${i}`, chunks[i]], 3, 140);
    }
    const manifest = {
      version: 1,
      chunks: chunks.length,
      checksum: checksum(snapshot),
      savedAt: Date.now()
    };
    await callCloudRetry('setItem', [CLOUD_MANIFEST_KEY, JSON.stringify(manifest)], 3, 140);

    // Also keep a single-key legacy snapshot when it fits (faster recovery path).
    if (snapshot.length <= 4000) {
      try { await callCloudRetry('setItem', [LEGACY_CLOUD_KEY, snapshot], 2, 120); } catch {}
    }

    // Remove stale chunks from a previous larger save.
    try {
      const keys = await callCloudRetry('getKeys', [], 2, 120);
      const stale = (keys || [])
        .filter(key => key.startsWith(CLOUD_CHUNK_PREFIX))
        .filter(key => Number(key.slice(CLOUD_CHUNK_PREFIX.length)) >= chunks.length);
      if (stale.length) await callCloud('removeItems', stale);
    } catch {
      /* stale chunks are harmless; manifest defines committed length */
    }

    return { ok: true, provider: 'TELEGRAM CLOUD', warning: '' };
  } catch (error) {
    console.warn('[NULLBYTE] cloud save failed', error);
    return {
      ok: localSaved,
      provider: localSaved ? 'LOCAL SAVE' : 'SAVE ERROR',
      warning: `Облачное сохранение не записано: ${error.message}.${
        localSaved ? ' Локальная копия оставлена.' : ' Локальное сохранение также недоступно.'
      }`
    };
  }
}
