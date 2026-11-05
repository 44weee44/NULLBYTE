import { migrateSave } from './engine.js';

const CLOUD_MANIFEST_KEY = 'nullbyte_save_v1_manifest';
const CLOUD_CHUNK_PREFIX = 'nullbyte_save_v1_part_';
const LEGACY_CLOUD_KEY = 'nullbyte_player';
const LOCAL_KEY = 'nullbyte_save_v1';
const CHUNK_SIZE = 3500;

function cloudApi() {
  try {
    const api = window.Telegram?.WebApp?.CloudStorage;
    return api && typeof api.getItem === 'function' && typeof api.setItem === 'function' ? api : null;
  } catch {
    return null;
  }
}

function callCloud(method, ...args) {
  const api = cloudApi();
  if (!api || typeof api[method] !== 'function') {
    return Promise.reject(new Error('CloudStorage недоступен'));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`CloudStorage.${method} timeout`));
      }
    }, 8000);
    try {
      api[method](...args, (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(new Error(String(error)));
        else resolve(value);
      });
    } catch (e) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
  });
}

async function callCloudRetry(method, args = [], tries = 4, delayMs = 200) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await callCloud(method, ...args);
    } catch (e) {
      last = e;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
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
    const raw = JSON.stringify(state);
    localStorage.setItem(LOCAL_KEY, raw);
    try { localStorage.setItem(LEGACY_CLOUD_KEY, raw); } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function loadSavedGame(tgUser = null) {
  let raw = null;
  let provider = 'NEW GAME';
  let warning = '';
  let cloudReadFailed = false;
  const api = cloudApi();

  if (api) {
    try {
      await new Promise(r => setTimeout(r, 150));
      let manifestText = null;
      try {
        manifestText = await callCloudRetry('getItem', [CLOUD_MANIFEST_KEY], 3, 180);
      } catch (e) {
        console.warn('[NULLBYTE] manifest read', e);
      }

      if (manifestText && String(manifestText).trim()) {
        const manifest = JSON.parse(manifestText);
        if (
          manifest.version === 1 &&
          Number.isInteger(manifest.chunks) &&
          manifest.chunks > 0 &&
          manifest.chunks <= 500
        ) {
          let combined = '';
          for (let i = 0; i < manifest.chunks; i++) {
            const chunk = await callCloudRetry('getItem', [`${CLOUD_CHUNK_PREFIX}${i}`], 3, 150);
            if (typeof chunk !== 'string') throw new Error(`Часть ${i} отсутствует`);
            combined += chunk;
          }
          if (checksum(combined) !== manifest.checksum) {
            throw new Error('Контрольная сумма не совпала');
          }
          raw = JSON.parse(combined);
          provider = 'TELEGRAM CLOUD';
        }
      }

      if (!raw) {
        try {
          const legacy = await callCloudRetry('getItem', [LEGACY_CLOUD_KEY], 2, 150);
          if (legacy && String(legacy).trim()) {
            raw = JSON.parse(legacy);
            provider = 'TELEGRAM CLOUD / MIGRATION';
          }
        } catch (e) {
          console.warn('[NULLBYTE] legacy cloud read', e);
        }
      }
    } catch (error) {
      cloudReadFailed = true;
      warning = `CloudStorage: ${error.message}`;
      console.warn('[NULLBYTE] cloud load failed', error);
    }
  }

  if (!raw) {
    raw = getLocal();
    if (raw) provider = 'LOCAL SAVE';
  }

  const migrated = migrateSave(raw, tgUser);
  if (raw && migrated.changed) {
    warning = warning || 'Сохранение обновлено до текущей версии.';
  }

  // Never hard-block if we have any recoverable profile with a nickname.
  const hasProfile = Boolean(migrated.state?.player?.nickname);
  const blocked = Boolean(api && cloudReadFailed && !raw && !hasProfile);

  return {
    state: migrated.state,
    provider,
    warning,
    hadSave: Boolean(raw),
    blocked
  };
}

export async function saveGame(state) {
  // Always try local first — works as backup even inside Telegram.
  const localSaved = setLocal(state);
  const api = cloudApi();
  const snapshot = JSON.stringify(state);

  if (!api) {
    return {
      ok: localSaved,
      provider: localSaved ? 'LOCAL SAVE' : 'SAVE ERROR',
      warning: localSaved
        ? 'CloudStorage недоступен (открой как Telegram Mini App).'
        : 'Не удалось записать сохранение.'
    };
  }

  try {
    const chunks = splitChunks(snapshot);
    if (chunks.length > 500) throw new Error('Сохранение слишком большое');

    for (let i = 0; i < chunks.length; i++) {
      await callCloudRetry('setItem', [`${CLOUD_CHUNK_PREFIX}${i}`, chunks[i]], 4, 160);
    }
    const manifest = {
      version: 1,
      chunks: chunks.length,
      checksum: checksum(snapshot),
      savedAt: Date.now()
    };
    await callCloudRetry('setItem', [CLOUD_MANIFEST_KEY, JSON.stringify(manifest)], 4, 160);

    // Compact single-key mirror when possible
    if (snapshot.length <= 4000) {
      try {
        await callCloudRetry('setItem', [LEGACY_CLOUD_KEY, snapshot], 2, 120);
      } catch {}
    }

    try {
      const keys = await callCloudRetry('getKeys', [], 2, 120);
      const stale = (keys || [])
        .filter(k => k.startsWith(CLOUD_CHUNK_PREFIX))
        .filter(k => Number(k.slice(CLOUD_CHUNK_PREFIX.length)) >= chunks.length);
      if (stale.length) await callCloud('removeItems', stale);
    } catch {}

    return { ok: true, provider: 'TELEGRAM CLOUD', warning: '' };
  } catch (error) {
    console.warn('[NULLBYTE] cloud save failed', error);
    return {
      ok: localSaved,
      provider: localSaved ? 'LOCAL SAVE' : 'SAVE ERROR',
      warning: `Облако: ${error.message}.${localSaved ? ' Локальная копия есть.' : ''}`
    };
  }
}
