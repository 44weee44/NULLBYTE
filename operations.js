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
  { id: 'region_0', name: 'Площадь Маяк', netKey: 'NET-BEACON', ssid: 'NorthWifi-AP05' },
  { id: 'region_1', name: 'Индустриальный Юг', netKey: 'NET-SOUTH', ssid: 'GridMesh-S' },
  { id: 'region_2', name: 'Порт Кабель', netKey: 'NET-PORT', ssid: 'HarborLink' },
  { id: 'region_3', name: 'Стеклянный Центр', netKey: 'NET-GLASS', ssid: 'Civic-AP' },
  { id: 'region_4', name: 'Северные Склады', netKey: 'NET-WARE', ssid: 'Depot-Wi' },
  { id: 'region_5', name: 'Жилой Вектор', netKey: 'NET-HAB', ssid: 'Vector-Res' },
  { id: 'region_6', name: 'Технопарк Null', netKey: 'NET-TECH', ssid: 'NullLab' },
  { id: 'region_7', name: 'Старый Канал', netKey: 'NET-CANAL', ssid: 'CanalAP' }
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
    'device-scout': { title: 'Device Scout', role: 'Поиск устройств по USER/NPC.', steps: ['run device-scout', 'scout <user|npc|phone>'], inputs: 'USER_ID / NPC / phone', outputs: 'DEVICE_ID', next: ['mobile-decoder', 'mobile-access'] },
    'signal-mapper': { title: 'Signal Mapper', role: 'Узлы региональной сети.', steps: ['run signal-mapper', 'map <region_id>'], inputs: 'region_0…region_7', outputs: 'AP/net nodes', next: ['device-scout'] },
    'mobile-decoder': { title: 'Mobile Decoder', role: 'Профиль устройства.', steps: ['decode <DEVICE_ID>'], inputs: 'DEVICE_ID', outputs: 'profile file', next: ['mobile-access'] },
    'mobile-access': { title: 'Mobile Access', role: 'Сессия на телефоне.', steps: ['access <DEVICE_ID>'], inputs: 'DEVICE_ID', outputs: 'mobile session', next: ['mobile-forensics', 'phone-call'] },
    'mobile-forensics': { title: 'Mobile Forensics', role: 'Contacts/Messages/Calls…', steps: ['forensics <DEVICE_ID>'], inputs: 'access session', outputs: 'forensics file', next: ['archive-exporter'] },
    'server-index': { title: 'Server Index', role: 'Пользователи сервера после access.', steps: ['index <SERVER_ID>'], inputs: 'server access', outputs: '.nidx', next: ['target-extractor'] },
    'target-extractor': { title: 'Target Extractor', role: 'Карточка цели из index.', steps: ['extract <USER_ID>'], inputs: 'USER_ID from index', outputs: '.ntgt', next: ['archive-exporter', 'map-scanner'] },
    'archive-exporter': { title: 'Archive Exporter', role: 'Сборка .narc для N-Mail.', steps: ['pack', 'или pack <fileId>…'], inputs: 'ops files', outputs: '.narc', next: ['N-Mail'] },
    'phone-call': { title: 'Phone Call', role: 'Звонок NPC с просьбами о переводе.', steps: ['call <npc>', 'ask <sum≤1000>'], inputs: 'NPC/phone after mobile access', outputs: 'credits / trust', next: [] }
  };
}
