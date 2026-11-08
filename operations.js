/**
 * NULLBYTE advanced operations: recovery timers, archives, regional nets, mobile chain helpers.
 */

export const RECOVERY_MINUTES_BY_SEC = {
  1: 60,
  2: 40,
  3: 20,
  4: 10,
  5: 5
};

export function recoveryMsForSecurity(sec) {
  const m = RECOVERY_MINUTES_BY_SEC[Math.min(5, Math.max(1, Number(sec) || 3))] ?? 20;
  return m * 60 * 1000;
}

export function createEmptyOpsState() {
  return {
    version: 1,
    paymentLinks: {},   // siteId -> { original, current, expiresAt, by }
    archives: [],       // exported .narc metadata
    regionAccess: {},   // regionId -> { key, at }
    mobileAccess: {},   // deviceId -> { level, expiresAt }
    serverIndex: {}     // serverId -> snapshot
  };
}

export function migrateOps(raw) {
  const b = createEmptyOpsState();
  if (!raw || typeof raw !== 'object') return b;
  return {
    ...b,
    ...raw,
    paymentLinks: raw.paymentLinks || {},
    archives: Array.isArray(raw.archives) ? raw.archives.slice(0, 50) : [],
    regionAccess: raw.regionAccess || {},
    mobileAccess: raw.mobileAccess || {},
    serverIndex: raw.serverIndex || {}
  };
}

export const REGIONS = [
  { id: 'bayshore', name: 'Бейшор-Хайтс', netKey: 'NET-BAYSHORE', ssid: 'Bayshore-Mesh' },
  { id: 'midtown', name: 'Мидтаун-Спайн', netKey: 'NET-MIDTOWN', ssid: 'Spine-Public' },
  { id: 'ironreach', name: 'Айронрич', netKey: 'NET-IRON', ssid: 'IronAP-03' },
  { id: 'southgate', name: 'Саутгейт', netKey: 'NET-SOUTH', ssid: 'Southgate-Wi' },
  { id: 'oakridge', name: 'Окридж', netKey: 'NET-OAK', ssid: 'Oakridge-Home' },
  { id: 'shadowline', name: 'Шэдоулайн', netKey: 'NET-SHADOW', ssid: 'Shadow-Node' }
];

export function getRegion(id) {
  return REGIONS.find(r => r.id === id) || REGIONS[0];
}

export function signalMapRegion(state, regionId) {
  if (!state.ops) state.ops = createEmptyOpsState();
  const region = getRegion(regionId);
  const nodes = [];
  // Devices tied to region via intel + procedural
  const devices = Object.values(state.intel?.devices || {}).filter(d => {
    const u = state.intel?.users?.[d.userId];
    return true;
  }).slice(0, 8);
  for (const d of devices) {
    nodes.push({ type: 'device', id: d.id, label: d.model || d.id, owner: d.userId });
  }
  // Always include region APs
  nodes.push({ type: 'ap', id: `ap_${region.id}`, label: region.ssid, owner: null });
  nodes.push({ type: 'net', id: region.netKey, label: region.name, owner: null });
  return { region, nodes, keyKnown: !!state.ops.regionAccess[regionId] };
}

export function grantRegionKey(state, regionId) {
  if (!state.ops) state.ops = createEmptyOpsState();
  state.ops.regionAccess[regionId] = { key: getRegion(regionId).netKey, at: Date.now() };
  return state.ops.regionAccess[regionId];
}

/** Temporary payment link swap on a shop site */
export function hijackPaymentLink(state, siteId, newTarget = 'operator-wallet') {
  if (!state.ops) state.ops = createEmptyOpsState();
  const site = state.world?.sites?.find(s => s.id === siteId);
  if (!site) return { ok: false, reason: 'Сайт не найден.' };
  const prog = state.progress?.sites?.[siteId];
  if (!prog?.access) return { ok: false, reason: 'Нужен доступ к сайту (Sim Exploit).' };
  const ms = recoveryMsForSecurity(site.security);
  const original = state.ops.paymentLinks[siteId]?.original || `pay://${site.domain}/checkout`;
  state.ops.paymentLinks[siteId] = {
    original,
    current: `pay://divert/${newTarget}`,
    expiresAt: Date.now() + ms,
    by: state.player?.nickname || 'operator'
  };
  // also record temp change style recovery
  if (!state.intel) return { ok: true, expiresAt: Date.now() + ms };
  return { ok: true, expiresAt: Date.now() + ms, minutes: ms / 60000 };
}

export function processPaymentLinkRestores(state, now = Date.now()) {
  if (!state.ops?.paymentLinks) return [];
  const notes = [];
  for (const [siteId, link] of Object.entries(state.ops.paymentLinks)) {
    if (link.expiresAt && link.expiresAt <= now && link.current !== link.original) {
      link.current = link.original;
      link.restoredAt = now;
      notes.push(`Платёжная ссылка ${siteId} восстановлена.`);
    }
  }
  return notes;
}

export function buildServerIndex(state, serverId) {
  if (!state.ops) state.ops = createEmptyOpsState();
  const server = state.intel?.servers?.[serverId];
  if (!server) return { ok: false, reason: 'Сервер не найден в intel.' };
  const users = Object.values(state.intel.users || {}).filter(u => u.serverId === serverId || true).slice(0, 12);
  const snap = {
    id: serverId,
    host: server.host || server.id,
    domain: server.domain || '',
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      deviceId: Object.values(state.intel.devices || {}).find(d => d.userId === u.id)?.id || null
    })),
    at: Date.now()
  };
  state.ops.serverIndex[serverId] = snap;
  // write file
  const content = [
    'NULLBYTE SERVER INDEX',
    `SERVER: ${snap.host}`,
    `DOMAIN: ${snap.domain}`,
    `USERS: ${snap.users.length}`,
    ...snap.users.map(u => `- ${u.id} ${u.username} role=${u.role} device=${u.deviceId || '—'}`)
  ].join('\n');
  const file = {
    id: `file_sidx_${serverId}_${Date.now().toString(36)}`,
    name: `${serverId}-index.nidx`,
    type: 'server-index',
    size: Math.max(1, Math.ceil(content.length / 1024)),
    content,
    path: `/ops/${serverId}/`,
    createdAt: Date.now(),
    meta: { serverId, kind: 'server-index' }
  };
  state.computer.files.unshift(file);
  state.computer.files = state.computer.files.slice(0, 80);
  return { ok: true, file, snap };
}

export function extractTarget(state, userId) {
  const user = state.intel?.users?.[userId];
  if (!user) return { ok: false, reason: 'User ID не найден в intel.' };
  const device = Object.values(state.intel.devices || {}).find(d => d.userId === userId);
  const content = [
    'NULLBYTE TARGET EXTRACT',
    `USER: ${user.id}`,
    `NAME: ${user.username}`,
    `ROLE: ${user.role}`,
    `SERVER: ${user.serverId || '—'}`,
    `DEVICE: ${device?.id || '—'}`,
    `MODEL: ${device?.model || '—'}`,
    `PHONE: ${device?.phone || '—'}`,
    `NOTES: extracted from server index chain`
  ].join('\n');
  const file = {
    id: `file_tgt_${userId}_${Date.now().toString(36)}`,
    name: `${user.username}-target.ntgt`,
    type: 'target-profile',
    size: 1,
    content,
    path: '/ops/targets/',
    createdAt: Date.now(),
    meta: { userId, kind: 'target-profile' }
  };
  state.computer.files.unshift(file);
  return { ok: true, file };
}

export function createArchive(state, fileIds = []) {
  if (!state.ops) state.ops = createEmptyOpsState();
  const files = (state.computer.files || []).filter(f => fileIds.includes(f.id));
  if (!files.length) {
    // default: last 3 ops files
    files.push(...(state.computer.files || []).filter(f => /index|target|export|recon|forensics/i.test(f.name)).slice(0, 5));
  }
  if (!files.length) return { ok: false, reason: 'Нет файлов для архива.' };
  const id = `narc_${Date.now().toString(36)}`;
  const body = files.map(f => `--- FILE ${f.name} ---\n${f.content || ''}`).join('\n\n');
  const archive = {
    id: `file_${id}`,
    name: `${id}.narc`,
    type: 'archive',
    size: Math.max(1, Math.ceil(body.length / 1024)),
    content: `NULLBYTE ARCHIVE .narc\nFILES: ${files.length}\n\n${body}`,
    path: '/ops/archives/',
    createdAt: Date.now(),
    meta: { kind: 'archive', sources: files.map(f => f.id) }
  };
  state.computer.files.unshift(archive);
  state.ops.archives.unshift({ id: archive.id, name: archive.name, at: Date.now(), count: files.length });
  state.ops.archives = state.ops.archives.slice(0, 30);
  return { ok: true, file: archive };
}

export const MOBILE_PLUGIN_META = [
  { id: 'device-scout', name: 'Device Scout', category: 'Mobile Operations', version: '1.0.0', price: 120, requiredLevel: 2, minOs: 1, ram: 1, storage: 60, cooldown: 0, description: 'Обнаружение виртуальных устройств.', effect: 'Список device ID.', starter: false },
  { id: 'signal-mapper', name: 'Signal Mapper', category: 'Mobile Operations', version: '1.0.0', price: 180, requiredLevel: 2, minOs: 1, ram: 1, storage: 70, cooldown: 0, description: 'Карта региональной сети.', effect: 'Узлы региона.', starter: false },
  { id: 'mobile-decoder', name: 'Mobile Decoder', category: 'Mobile Operations', version: '1.0.0', price: 200, requiredLevel: 3, minOs: 1, ram: 1, storage: 80, cooldown: 0, description: 'Читаемый профиль устройства.', effect: 'device profile file', starter: false },
  { id: 'mobile-access', name: 'Mobile Access', category: 'Mobile Operations', version: '1.0.0', price: 320, requiredLevel: 3, minOs: 2, ram: 1, storage: 90, cooldown: 5000, description: 'Игровой доступ к телефону.', effect: 'mobile session', starter: false },
  { id: 'mobile-forensics', name: 'Mobile Forensics', category: 'Mobile Operations', version: '1.0.0', price: 280, requiredLevel: 3, minOs: 2, ram: 1, storage: 100, cooldown: 0, description: 'Категории данных телефона.', effect: 'forensics report', starter: false },
  { id: 'server-index', name: 'Server Index', category: 'Web Operations', version: '1.0.0', price: 260, requiredLevel: 3, minOs: 1, ram: 1, storage: 80, cooldown: 0, description: 'Индекс пользователей сервера.', effect: '.nidx file', starter: false },
  { id: 'target-extractor', name: 'Target Extractor', category: 'Web Operations', version: '1.0.0', price: 300, requiredLevel: 3, minOs: 1, ram: 1, storage: 90, cooldown: 0, description: 'Сбор профиля цели.', effect: '.ntgt file', starter: false },
  { id: 'archive-exporter', name: 'Archive Exporter', category: 'Web Operations', version: '1.0.0', price: 150, requiredLevel: 2, minOs: 1, ram: 1, storage: 60, cooldown: 0, description: 'Сборка .narc архива.', effect: '.narc', starter: false }
];



export function extendedPluginDocs() {
  return {
    'net-link': {
      title: 'Net Link', role: 'Подключение терминала к региональной сети.',
      steps: ['run net-link', 'list', 'connect bayshore', 'status'],
      inputs: 'region_id (bayshore|midtown|ironreach|southgate|oakridge|shadowline)',
      outputs: 'active network session', next: ['net-analyzer']
    },
    'net-analyzer': {
      title: 'Net Analyzer', role: 'Полный реестр PHONE_ID региона (~550).',
      steps: ['run net-analyzer', 'scan', 'save <имя>'],
      inputs: 'подключённая сеть', outputs: 'network-report file', next: ['phone-access']
    },
    'phone-access': {
      title: 'Phone Access', role: 'Открыть виртуальный телефон по PHONE_ID.',
      steps: ['run phone-access', 'open PH-BAYS-0042', 'status'],
      inputs: 'PHONE_ID из отчёта', outputs: 'active phone target', next: ['Phone Lab app']
    },

    'mail-drop': {
      title: 'Mail Drop', role: 'Вложение для NPC; шанс открытия → PHONE_ID в почте.',
      steps: ['craft payload', 'save file', 'N-Mail attach + send'],
      inputs: '—', outputs: 'mail-drop file / pending open', next: []
    },
    'sms-bomber': {
      title: 'SMS Bomber', role: 'Симуляция SMS-нагрузки (40 000 CR).',
      steps: ['install', 'bomb <PHONE_ID>'], inputs: 'PHONE_ID', outputs: 'sim flood', next: []
    },
    'bank-peek': {
      title: 'Bank Peek', role: 'Виртуальные bank notes телефона (100 000 CR).',
      steps: ['install', 'peek <PHONE_ID>'], inputs: 'PHONE_ID', outputs: 'notes', next: []
    },
    'device-scout': { title: 'Device Scout', role: 'Устарел / заменён.', steps: [], inputs: '—', outputs: '—', next: [] },
    'site-analyzer': { title: 'Site Analyzer', role: 'Web WIP — закрыт.', steps: ['на доработке'], inputs: '—', outputs: '—', next: [] }
  };
}
