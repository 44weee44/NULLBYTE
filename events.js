/** NULLBYTE world events — change availability, not only toast spam. */

export function createEmptyEvents() {
  return { version: 1, active: [], history: [], lastSpawnAt: 0 };
}

export function migrateEvents(raw) {
  const b = createEmptyEvents();
  if (!raw || typeof raw !== 'object') return b;
  return {
    version: 1,
    active: Array.isArray(raw.active) ? raw.active.slice(-20) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-40) : [],
    lastSpawnAt: Number(raw.lastSpawnAt) || 0
  };
}

const POOL = [
  { id: 'evt_net_blip', type: 'infra', title: 'Всплеск трафика', body: 'В одном из регионов кратковременно вырос шум сети.', durationMs: 45 * 60 * 1000, effect: { noise: 1 } },
  { id: 'evt_node_up', type: 'infra', title: 'Новый тестовый узел', body: 'На карте отмечен временный узел разведки.', durationMs: 60 * 60 * 1000, effect: { discoverHint: true } },
  { id: 'evt_server_maint', type: 'infra', title: 'Обслуживание узла', body: 'Случайный сервер ушёл на виртуальное обслуживание.', durationMs: 30 * 60 * 1000, effect: { serverBusy: true } },
  { id: 'evt_rumor', type: 'social', title: 'Городской слух', body: 'На форумах обсуждают странный звонок из Шэдоулайн.', durationMs: 90 * 60 * 1000, effect: { rumor: true } },
  { id: 'evt_npc_move', type: 'social', title: 'Смена маршрута', body: 'Несколько NPC сменили привычные точки.', durationMs: 40 * 60 * 1000, effect: { npcShift: true } },
  { id: 'evt_harden', type: 'security', title: 'Усиление защиты', body: 'Один из объектов повысил виртуальный уровень внимания.', durationMs: 50 * 60 * 1000, effect: { harden: true } },
  { id: 'evt_archive', type: 'rare', title: 'Временный архив', body: 'Редкий архивный фрагмент доступен ограниченное время.', durationMs: 25 * 60 * 1000, effect: { rareFile: true } }
];

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function processWorldEvents(state, now = Date.now()) {
  if (!state.events) state.events = createEmptyEvents();
  const notices = [];
  // expire
  const still = [];
  for (const e of state.events.active) {
    if (e.endsAt && e.endsAt <= now) {
      notices.push(`Событие завершено: ${e.title}`);
      state.events.history.unshift({ ...e, endedAt: now });
    } else still.push(e);
  }
  state.events.active = still.slice(-12);
  state.events.history = state.events.history.slice(-40);

  // spawn at most ~1 / 25 min
  if (now - (state.events.lastSpawnAt || 0) > 25 * 60 * 1000 && state.events.active.length < 4) {
    const pool = POOL.filter(p => !state.events.active.some(a => a.templateId === p.id));
    if (pool.length) {
      const pick = pool[hash32(String(now) + (state.player?.nickname || '')) % pool.length];
      const inst = {
        id: `ev_${now.toString(36)}`,
        templateId: pick.id,
        type: pick.type,
        title: pick.title,
        body: pick.body,
        effect: pick.effect,
        startedAt: now,
        endsAt: now + pick.durationMs
      };
      state.events.active.push(inst);
      state.events.lastSpawnAt = now;
      notices.push(`Событие: ${pick.title}`);
      // soft effects
      if (pick.effect.rareFile) {
        state.computer.files.unshift({
          id: `file_evt_${now.toString(36)}`,
          name: `rare-archive-${now.toString(36).slice(-4)}.log`,
          type: 'event-artifact',
          size: 1,
          content: `NULLBYTE RARE ARCHIVE\n${pick.body}\nExpires with event.`,
          path: '/events/',
          createdAt: now
        });
      }
    }
  }
  return notices;
}

export function listActiveEvents(state) {
  return state.events?.active || [];
}
