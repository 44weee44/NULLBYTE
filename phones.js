/**
 * NULLBYTE virtual phone registry — PHONE_ID based, regional, stable seeds.
 * ~550 phones per region × 6 regions. Simulation only.
 */



export const PHONE_REGIONS = [
  { id: 'bayshore', name: 'Бейшор-Хайтс', netKey: 'NET-BAYSHORE', ssid: 'Bayshore-Mesh', x: 22, y: 28 },
  { id: 'midtown', name: 'Мидтаун-Спайн', netKey: 'NET-MIDTOWN', ssid: 'Spine-Public', x: 52, y: 42 },
  { id: 'ironreach', name: 'Айронрич', netKey: 'NET-IRON', ssid: 'IronAP-03', x: 78, y: 30 },
  { id: 'southgate', name: 'Саутгейт', netKey: 'NET-SOUTH', ssid: 'Southgate-Wi', x: 48, y: 72 },
  { id: 'oakridge', name: 'Окридж', netKey: 'NET-OAK', ssid: 'Oakridge-Home', x: 28, y: 60 },
  { id: 'shadowline', name: 'Шэдоулайн', netKey: 'NET-SHADOW', ssid: 'Shadow-Node', x: 72, y: 68 }
];

export const PHONES_PER_REGION = 550;

const OWNER_TYPES = ['civilian', 'business', 'hacker', 'corp', 'student', 'courier', 'freelancer'];
const MODELS = ['N-Phone 7', 'Pulse X', 'GridHand', 'OakLite', 'ShadowFold', 'BayTab', 'Spine SE'];

function hash32(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(seed, arr) {
  return arr[hash32(String(seed)) % arr.length];
}

/** Stable PHONE_ID: PH-RRRR-XXXX */
export function makePhoneId(regionId, index) {
  const r = String(regionId).slice(0, 4).toUpperCase().padEnd(4, 'X');
  const n = String(index).padStart(4, '0');
  return `PH-${r}-${n}`;
}

export function createEmptyPhoneWorld() {
  return {
    version: 1,
    network: null,          // { regionId, connectedAt }
    analyzed: {},           // regionId -> { at, reportFileId }
    access: {},             // phoneId -> { level, at, blockedUntil }
    purchases: { smsBomber: false, bankData: false },
    reputation: 0,
    discovered: {}          // phoneId -> true
  };
}

export function migratePhoneWorld(raw) {
  const b = createEmptyPhoneWorld();
  if (!raw || typeof raw !== 'object') return b;
  return {
    ...b,
    ...raw,
    analyzed: raw.analyzed || {},
    access: raw.access || {},
    purchases: { smsBomber: false, bankData: false, ...(raw.purchases || {}) },
    reputation: Number(raw.reputation) || 0,
    discovered: raw.discovered || {},
    network: raw.network || null
  };
}

/** Deterministic phone record — no storage of 3300 full objects */
export function generatePhone(regionId, index, seedRoot = 'nb') {
  const i = ((Number(index) % PHONES_PER_REGION) + PHONES_PER_REGION) % PHONES_PER_REGION;
  const id = makePhoneId(regionId, i);
  const h = hash32(`${seedRoot}:${id}`);
  const type = OWNER_TYPES[h % OWNER_TYPES.length];
  const first = pick(h + 'f', ['Alex','Mira','Eli','Nora','Kai','Vera','Dax','Lena','Omar','Sera','Jon','Rita','Pavel','Anya','Chris','Nina','Leo','Tara','Ilya','Maya']);
  const last = pick(h + 'l', ['Voss','North','Vale','Cross','Reed','Shaw','Kane','Frost','Cole','Hayes','Orlov','Volkov','Stone','Blake','Quinn','Marsh']);
  const npcIdx = h % 2000;
  return {
    id,
    regionId,
    index: i,
    ownerName: `${first} ${last}`,
    ownerType: type,
    npcId: `npc_${String(npcIdx).padStart(4, '0')}`,
    model: MODELS[h % MODELS.length],
    number: `+7-9${String(100000000 + (h % 900000000)).slice(0, 9)}`,
    security: 1 + (h % 5),
    os: ['vOS 3', 'vOS 4', 'PulseOS', 'GridOS'][h % 4]
  };
}

export function listRegionPhones(regionId, seedRoot = 'nb') {
  const out = [];
  for (let i = 0; i < PHONES_PER_REGION; i++) out.push(generatePhone(regionId, i, seedRoot));
  return out;
}

export function findPhone(phoneId, seedRoot = 'nb') {
  const m = String(phoneId || '').match(/^PH-([A-Z0-9]{4})-(\d{4})$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const region = PHONE_REGIONS.find(r => r.id.slice(0, 4).toUpperCase().padEnd(4, 'X').startsWith(code.slice(0, 3)) || makePhoneId(r.id, 0).startsWith(`PH-${code}`));
  // resolve region by matching makePhoneId prefix
  let rid = null;
  for (const r of PHONE_REGIONS) {
    if (makePhoneId(r.id, 0).slice(0, 7) === `PH-${code}`.slice(0, 7) || makePhoneId(r.id, Number(m[2])).id === phoneId) {
      rid = r.id;
      break;
    }
  }
  if (!rid) {
    for (const r of PHONE_REGIONS) {
      const trial = makePhoneId(r.id, Number(m[2]));
      if (trial.toUpperCase() === String(phoneId).toUpperCase()) { rid = r.id; break; }
    }
  }
  if (!rid) return null;
  return generatePhone(rid, Number(m[2]), seedRoot);
}

export function buildNetworkReport(regionId, seedRoot = 'nb') {
  const region = PHONE_REGIONS.find(r => r.id === regionId);
  if (!region) return null;
  const phones = listRegionPhones(regionId, seedRoot);
  const lines = [
    'NULLBYTE NETWORK RECON REPORT',
    `REGION: ${region.name}`,
    `REGION_ID: ${region.id}`,
    `NET_KEY: ${region.netKey}`,
    `SSID: ${region.ssid}`,
    `DEVICES: ${phones.length}`,
    '--- PHONE REGISTRY ---',
    ...phones.map(p => `${p.id} | ${p.ownerName} | ${p.ownerType} | ${p.model} | ${p.number}`)
  ];
  return { region, phones, text: lines.join('\n'), count: phones.length };
}

/** Unique-ish message seeds per phone */
export function phoneMessages(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:msg:${phone.id}`);
  const templates = {
    civilian: ['Купи хлеб', 'Ты где?', 'Ок, жду', 'Фото с парка', 'Не звони после 11'],
    business: ['Счёт на подпись', 'Встреча в 15:00', 'Договор N-12', 'Перенос поставки', 'Клиент ждёт'],
    hacker: ['Новый node up', 'Не свети ID', 'Дамп готов', 'Смени ключ', 'Только .null'],
    corp: ['Регламент Q3', 'Доступ к wiki', 'Совещание', 'NDA reminder', 'Badge expired'],
    student: ['Дедлайн завтра', 'Конспект?', 'Столовая', 'Пара отменена', 'Wi‑Fi кампуса'],
    courier: ['Адрес сменился', 'Ожидание 10 мин', 'Код домофона 42', 'Заказ закрыт', 'Новый слот'],
    freelancer: ['Макет готов', 'Оплата пришла?', 'Правки v2', 'Созвон', 'Портфолио']
  };
  const base = templates[phone.ownerType] || templates.civilian;
  return base.map((t, i) => ({
    id: `msg_${phone.id}_${i}`,
    from: i % 2 === 0 ? phone.ownerName : pick(h + i, ['Unknown', 'Boss', 'Mom', 'Client', 'NetFriend']),
    text: t,
    at: Date.now() - (h % 100000) - i * 3600000
  }));
}

export function phoneContacts(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:ct:${phone.id}`);
  return [0, 1, 2, 3, 4].map(i => ({
    name: pick(h + i, ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Quinn']),
    number: `+7-9${String(200000000 + ((h + i * 17) % 700000000)).slice(0, 9)}`
  }));
}

export function phoneGallery(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:gal:${phone.id}`);
  const tags = {
    civilian: ['home', 'street', 'pet'],
    business: ['office', 'card', 'sign'],
    hacker: ['terminal', 'cable', 'note'],
    corp: ['badge', 'lobby', 'desk'],
    student: ['campus', 'notes', 'cafe'],
    courier: ['package', 'door', 'map'],
    freelancer: ['screen', 'mockup', 'workspace']
  };
  const t = tags[phone.ownerType] || tags.civilian;
  return t.map((tag, i) => ({ id: `img_${phone.id}_${i}`, title: `${tag}_${i + 1}`, note: `Виртуальное фото (${tag})` }));
}

export function phoneCallLog(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:call:${phone.id}`);
  return [0, 1, 2].map(i => ({
    with: pick(h + i, phoneContacts(phone, seedRoot)).name,
    dir: i % 2 ? 'in' : 'out',
    at: Date.now() - i * 7200000 - (h % 50000)
  }));
}

export function connectNetwork(state, regionId) {
  if (!state.phoneWorld) state.phoneWorld = createEmptyPhoneWorld();
  const region = PHONE_REGIONS.find(r => r.id === regionId);
  if (!region) return { ok: false, reason: 'Неизвестный region id. net list' };
  state.phoneWorld.network = { regionId, connectedAt: Date.now(), netKey: region.netKey, ssid: region.ssid };
  return { ok: true, region };
}

export function analyzeNetwork(state, seedRoot = 'nb') {
  if (!state.phoneWorld?.network) return { ok: false, reason: 'Сначала: net connect <region_id>' };
  const report = buildNetworkReport(state.phoneWorld.network.regionId, seedRoot);
  if (!report) return { ok: false, reason: 'Нет региона' };
  state.phoneWorld.analyzed[report.region.id] = { at: Date.now() };
  return { ok: true, report };
}

export function accessPhone(state, phoneId, seedRoot = 'nb') {
  if (!state.phoneWorld) state.phoneWorld = createEmptyPhoneWorld();
  const phone = findPhone(phoneId, seedRoot);
  if (!phone) return { ok: false, reason: 'PHONE_ID не найден. Формат PH-XXXX-0000' };
  const acc = state.phoneWorld.access[phone.id];
  if (acc?.blockedUntil && acc.blockedUntil > Date.now()) {
    return { ok: false, reason: `Телефон заблокирован ещё ${Math.ceil((acc.blockedUntil - Date.now()) / 60000)} мин.` };
  }
  state.phoneWorld.access[phone.id] = { level: 'user', at: Date.now(), blockedUntil: acc?.blockedUntil || 0 };
  state.phoneWorld.discovered[phone.id] = true;
  return { ok: true, phone };
}

export function lockPhone(state, phoneId, minutes = 30) {
  if (!state.phoneWorld) return { ok: false, reason: 'нет phoneWorld' };
  const id = String(phoneId);
  const prev = state.phoneWorld.access[id] || {};
  state.phoneWorld.access[id] = { ...prev, blockedUntil: Date.now() + minutes * 60 * 1000 };
  return { ok: true };
}
