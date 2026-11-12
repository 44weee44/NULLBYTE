/**
 * NULLBYTE ↔ Telegram Serverless bridge (client).
 * Server code lives in Bot Serverless (endpoints/lib). This only calls them.
 */
const hasSL = () =>
  !!(window.Telegram?.WebApp?.Serverless && typeof window.Telegram.WebApp.Serverless.call === 'function');

export function serverlessAvailable() {
  return hasSL();
}

export function serverlessCall(name, input = {}) {
  return new Promise((resolve, reject) => {
    if (!hasSL()) {
      reject(Object.assign(new Error('Serverless API unavailable'), { type: 'NO_SERVERLESS' }));
      return;
    }
    try {
      window.Telegram.WebApp.Serverless.call(name, input || {}, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/** Register/sync player on server (migration + pull). Does not replace local save yet. */
export async function serverPlayerSync(saveState = null) {
  const input = {};
  if (saveState) {
    try {
      input.save = typeof saveState === 'string' ? saveState : JSON.parse(JSON.stringify(saveState));
    } catch {
      /* skip broken save */
    }
  }
  return serverlessCall('playerRegisterOrSync', input);
}

export async function serverPullState() {
  return serverlessCall('playerPullState', {});
}

export async function serverHeartbeat() {
  return serverlessCall('playerHeartbeat', {});
}

export async function serverAdminDashboard() {
  return serverlessCall('adminDashboard', {});
}

/**
 * DEV smoke-test after boot. Set window.__NB_SERVER_TEST = false to silence.
 * Shows one alert with result or error.
 */
export async function runServerDevTest() {
  if (window.__NB_SERVER_TEST === false) return null;
  if (!hasSL()) {
    console.warn('[NULLBYTE] Serverless: API missing (open inside Telegram Mini App)');
    return null;
  }
  try {
    const res = await serverPlayerSync(null);
    console.log('[NULLBYTE] playerRegisterOrSync', res);
    const role = res?.user?.role;
    const tg = res?.user?.tg_id;
    const ms = res?.user?.migration_status;
    const msg = `SERVER OK\nrole=${role}\ntg=${tg}\nmigration=${ms}\ncredits=${res?.progress?.credits ?? '—'}`;
    try { window.Telegram?.WebApp?.showAlert?.(msg); } catch (_) {}
    try { alert(msg); } catch (_) {}
    return res;
  } catch (err) {
    console.error('[NULLBYTE] Serverless test failed', err);
    const msg = `SERVER ERR\n${err?.message || err}\ntype=${err?.type || ''}\ncode=${err?.parameters?.code || ''}`;
    try { window.Telegram?.WebApp?.showAlert?.(msg); } catch (_) {}
    try { alert(msg); } catch (_) {}
    return null;
  }
}
