/**
 * NULLBYTE virtual phone registry — PHONE_ID based, regional, stable seeds.
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

const FIRST = [
  'Alex','Mira','Eli','Nora','Kai','Vera','Dax','Lena','Omar','Sera','Jon','Rita','Pavel','Anya','Chris','Nina','Leo','Tara','Ilya','Maya',
  'Daniel','Sophie','Marcus','Elena','Viktor','Anna','James','Olivia','Noah','Emma','Lucas','Ava','Mateo','Isabella','Ethan','Mia',
  'Artem','Polina','Kirill','Daria','Maxim','Yulia','Sergei','Katya','Andrei','Irina','Roman','Alina','Dmitry','Natalia',
  'Ryan','Grace','Owen','Chloe','Caleb','Hannah','Nathan','Lily','Adrian','Zoe','Julian','Stella','Hugo','Clara','Felix','Alice',
  'Boris','Svetlana','Gleb','Oksana','Timur','Valeria','Ruslan','Kristina','Nikita','Marina','Oleg','Tatiana','Ivan','Ekaterina'
];
const LAST = [
  'Voss','North','Vale','Cross','Reed','Shaw','Kane','Frost','Cole','Hayes','Orlov','Volkov','Stone','Blake','Quinn','Marsh',
  'Petrov','Sokolov','Kuznetsov','Smirnov','Popov','Lebedev','Kozlov','Novikov','Morozov','Fedorov','Mikhailov','Alexeev',
  'Walker','Bennett','Parker','Cooper','Murphy','Bailey','Rivera','Foster','Bryant','Hayes','Coleman','Jenkins','Perry','Powell',
  'Ivanov','Sidorov','Nikolaev','Belov','Gromov','Tarasov','Zaitsev','Vinogradov','Bogdanov','Kiselev','Makarov','Andreev',
  'Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson'
];
const OWNER_TYPES = [
  'civilian','business','hacker','corp','student','courier','freelancer',
  'medic','driver','barista','designer','engineer','lawyer','journalist','teacher','guard','pilot','chef','analyst','trader'
];
const MODELS = ['N-Phone 7','Pulse X','GridHand','OakLite','ShadowFold','BayTab','Spine SE','NullOne','Mesh 12','Harbor Mini'];

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
function uniqueFullName(seed, used) {
  for (let k = 0; k < 80; k++) {
    const f = pick(seed + ':f:' + k, FIRST);
    const l = pick(seed + ':l:' + k, LAST);
    const full = `${f} ${l}`;
    if (!used.has(full)) { used.add(full); return full; }
  }
  return `${pick(seed, FIRST)} ${pick(seed + 'x', LAST)} ${hash32(seed) % 99}`;
}

export function makePhoneId(regionId, index) {
  const r = String(regionId).slice(0, 4).toUpperCase().padEnd(4, 'X');
  const n = String(((Number(index) % PHONES_PER_REGION) + PHONES_PER_REGION) % PHONES_PER_REGION).padStart(4, '0');
  return `PH-${r}-${n}`;
}

export function createEmptyPhoneWorld() {
  return { version: 1, network: null, analyzed: {}, access: {}, purchases: { smsBomber: false, bankData: false }, reputation: 0, discovered: {} };
}
export function migratePhoneWorld(raw) {
  const b = createEmptyPhoneWorld();
  if (!raw || typeof raw !== 'object') return b;
  return { ...b, ...raw, analyzed: raw.analyzed || {}, access: raw.access || {}, purchases: { smsBomber: false, bankData: false, ...(raw.purchases || {}) }, reputation: Number(raw.reputation) || 0, discovered: raw.discovered || {}, network: raw.network || null };
}

export function generatePhone(regionId, index, seedRoot = 'nb') {
  const i = ((Number(index) % PHONES_PER_REGION) + PHONES_PER_REGION) % PHONES_PER_REGION;
  const id = makePhoneId(regionId, i);
  const h = hash32(`${seedRoot}:${id}`);
  const type = OWNER_TYPES[h % OWNER_TYPES.length];
  const used = new Set();
  const ownerName = uniqueFullName(`${seedRoot}:own:${id}`, used);
  const digits = String(9000000000 + (h % 899999999)).slice(0, 10);
  return {
    id, regionId, index: i, ownerName, ownerType: type,
    npcId: `npc_${String(h % 2000).padStart(4, '0')}`,
    model: MODELS[h % MODELS.length],
    number: `+7-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
    security: 1 + (h % 5),
    os: ['vOS 3', 'vOS 4', 'PulseOS', 'GridOS', 'NullOS'][h % 5]
  };
}

export function listRegionPhones(regionId, seedRoot = 'nb') {
  const out = [];
  for (let i = 0; i < PHONES_PER_REGION; i++) out.push(generatePhone(regionId, i, seedRoot));
  return out;
}

export function findPhone(phoneId, seedRoot = 'nb') {
  const m = String(phoneId || '').trim().match(/^PH-([A-Z0-9]{4})-(\d{4})$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const idx = Number(m[2]);
  for (const r of PHONE_REGIONS) {
    const trial = makePhoneId(r.id, idx);
    if (trial.toUpperCase() === String(phoneId).trim().toUpperCase()) {
      return generatePhone(r.id, idx, seedRoot);
    }
    // prefix match PH-BAYS vs bayshore
    if (makePhoneId(r.id, 0).slice(0, 7) === `PH-${code}`.slice(0, 7)) {
      return generatePhone(r.id, idx, seedRoot);
    }
  }
  return null;
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

export function phoneMessages(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:msg:${phone.id}`);
  const pool = [
    'Купи хлеб по дороге','Ты где?','Ок, жду у входа','Фото с парка','Не звони после 11','Скинь адрес','Уже вышел','Перенеси на завтра',
    'Счёт на подпись','Встреча в 15:00','Договор N-12','Перенос поставки','Клиент ждёт','Инвойс во вложении','Согласовали сроки',
    'Новый node up','Не свети ID','Дамп готов','Смени ключ','Только через .null','VPN снова упал','Лог чистый',
    'Регламент Q3','Доступ к wiki','Совещание в 10','NDA reminder','Badge expired','Отчёт до пятницы',
    'Дедлайн завтра','Конспект скинь','Столовая закрыта','Пара отменена','Wi‑Fi кампуса лежит','Стипендия пришла',
    'Адрес сменился','Ожидание 10 мин','Код домофона 42','Заказ закрыт','Новый слот доставки','Клиент не отвечает',
    'Макет готов','Оплата пришла?','Правки v2','Созвон в 18','Портфолио обнови','Фикс багов',
    'Смена до 8','Палата 4','Рецепт готов','Вызов на дом','Журнал заполни','Перерыв 15 мин',
    'На месте','Пробка на мосту','Клиент ждёт у входа','Топливо на A95','Маршрут короткий',
    'Смена закрыта','Заказ готов','Молоко закончилось','Чаевые норм','Закрытие в 22',
    'Макет в Figma','Правки клиента','Дедлайн пятница','Шрифты лицензия','Брендбук готов',
    'Лог ошибки','Патч готов','Сервер up','Ревью PR','Тесты green','Релиз ночью',
    'Черновик договора','Суд в 11','Клиент перенёс','Документы на подпись','NDA ок',
    'Источник молчит','Черновик статьи','Редакция ждёт','Фото с места','Дедлайн полоса',
    'Класс 7Б','Собрание родителей','Оценки выставил','Экзамен в пятницу','Кабинет 204',
    'Обход двор','Камера 3 offline','Смена до 6','Инцидент закрыт','Отчёт охране',
    'Слот 14:20','Погода ок','Борт готов','Задержка 20 мин','Маршрут C',
    'Меню на завтра','Поставка овощей','Смена кухни','Банкет на 40','Инвентарь ок',
    'Отчёт Q','Модель пересчитал','Данные dirty','Митинг sync','Dashboard up',
    'Цена упала','Лот закрыт','Склад 12','Оплата прошла','Доставка завтра',
    'Кофе?','Иду','Ок','+','Спс','Позже','Жду','Готово','Нет','Да','Скинь гео','Наберу'
  ];
  // 8–14 messages
  const count = 8 + (h % 7);
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    const text = pool[(h + i * 17) % pool.length];
    const from = i % 2 === 0 ? phone.ownerName : uniqueFullName(`${seedRoot}:msgfrom:${phone.id}:${i}`, used);
    out.push({ id: `msg_${phone.id}_${i}`, from, text, at: Date.now() - (h % 100000) - i * 3600000, kind: 'chat' });
  }
  // ~1/80 bank credentials leak (deterministic per phone)
  if ((h % 80) === 0) {
    const login = `u${String(h % 90000).padStart(5,'0')}`;
    const password = `p${String((h >>> 3) % 900000).padStart(6,'0')}`;
    const amount = 500 + (h % 4501); // 500..5000
    out.unshift({
      id: `msg_${phone.id}_bank`,
      from: 'Aster Notify',
      text: `Aster Bank: вход ${login} / ${password}. Доступный остаток ${amount} CR. Не передавайте код третьим лицам.`,
      at: Date.now() - 60000,
      kind: 'bank',
      bankLogin: login,
      bankPassword: password,
      bankAmount: amount
    });
  }
  return out;
}

export function phoneContacts(phone, seedRoot = 'nb') {
  const used = new Set([phone.ownerName]);
  const out = [];
  for (let i = 0; i < 6; i++) {
    const name = uniqueFullName(`${seedRoot}:ct:${phone.id}:${i}`, used);
    const h = hash32(`${seedRoot}:ctn:${phone.id}:${i}`);
    const d = String(9000000000 + (h % 899999999)).slice(0, 10);
    out.push({ name, number: `+7-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` });
  }
  return out;
}

export function phoneGallery(phone, seedRoot = 'nb') {
  const h = hash32(`${seedRoot}:gal:${phone.id}`);
  const tags = ['home','street','work','note','cafe','night','desk','park'];
  return [0,1,2,3].map(i => ({ id: `img_${phone.id}_${i}`, title: `${tags[(h+i)%tags.length]}_${i+1}`, note: `Виртуальное фото` }));
}

export function phoneCallLog(phone, seedRoot = 'nb') {
  const ct = phoneContacts(phone, seedRoot);
  return [0,1,2,3].map(i => ({ with: ct[i % ct.length].name, dir: i % 2 ? 'in' : 'out', at: Date.now() - i * 7200000 }));
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
