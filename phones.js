/**
 * NULLBYTE phone system — fixed registry + 4h rotation + SMS by role.
 */
import {
  PHONE_REGIONS, PHONE_DB, SMS_BY_ROLE, VISIBLE_PER_REGION, ROTATION_MS, PROTECTION_RULES, PHONES_PER_REGION
} from './phone_registry.js';
import { catalogTemplatesForRole, fillFilePlaceholders } from './phone_file_catalog.js';

export { PHONE_REGIONS, PHONES_PER_REGION, VISIBLE_PER_REGION, ROTATION_MS, PROTECTION_RULES, SMS_BY_ROLE };

function hash32(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function createEmptyPhoneWorld() {
  return {
    version: 2, network: null, analyzed: {}, access: {}, purchases: {}, reputation: 0,
    discovered: {}, pendingDrops: [], failCounts: {}, networkBanUntil: {}, fileInstances: {},
    rotationEpoch: 0, activeSession: null, sessionFrozenSms: null
  };
}

export function migratePhoneWorld(raw) {
  const b = createEmptyPhoneWorld();
  if (!raw || typeof raw !== 'object') return b;
  return { ...b, ...raw, failCounts: raw.failCounts || {}, networkBanUntil: raw.networkBanUntil || {}, pendingDrops: raw.pendingDrops || [] };
}

export function rotationEpoch(now = Date.now()) {
  return Math.floor(now / ROTATION_MS);
}

/** Deterministic 250 visible phones per region for epoch */
export function visiblePhones(regionId, epoch) {
  const all = PHONE_DB[regionId] || [];
  if (!all.length) return [];
  // 200–300 from real PHONE_DB list (deterministic per region+epoch)
  let h0 = hash32(String(regionId) + ':vis:' + String(epoch));
  const nWant = 200 + (h0 % 101); // 200..300
  const n = Math.min(all.length, nWant);
  const idxs = all.map((_, i) => i);
  let h = h0;
  for (let i = idxs.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    const t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t;
  }
  return idxs.slice(0, n).map(i => ({ ...all[i], regionId }));
}

export function makePhoneId(regionId, index) {
  const map = { bayshore:'BAYS', midtown:'MIDT', ironreach:'IRON', southgate:'SOUT', oakridge:'OAKR', shadowline:'SHAD' };
  const code = map[regionId] || String(regionId).slice(0,4).toUpperCase().padEnd(4,'X');
  return `PH-${code}-${String(index).padStart(4,'0')}`;
}

export function findPhone(phoneId) {
  const id = String(phoneId || '').trim().toUpperCase();
  if (id === 'PH-6666-6666') {
    const p = (PHONE_DB.shadowline || []).find(x => x.id === 'PH-6666-6666');
    return p ? { ...p, regionId: 'shadowline' } : null;
  }
  const m = id.match(/^PH-([A-Z0-9]{4})-(\d{4})$/);
  if (!m) return null;
  const code = m[1];
  const map = { BAYS: 'bayshore', MIDT: 'midtown', IRON: 'ironreach', SOUT: 'southgate', OAKR: 'oakridge', SHAD: 'shadowline' };
  const rid = map[code];
  if (!rid) return null;
  const p = (PHONE_DB[rid] || []).find(x => x.id.toUpperCase() === id);
  return p ? { ...p, regionId: rid } : null;
}

export function listRegionPhones(regionId, _seed, now = Date.now()) {
  return visiblePhones(regionId, rotationEpoch(now));
}

export function listAllRegionPhones(regionId) {
  return (PHONE_DB[regionId] || []).map(p => ({ ...p, regionId }));
}

export function generatePhone(regionId, index) {
  const p = (PHONE_DB[regionId] || []).find(x => x.index === index) || (PHONE_DB[regionId] || [])[index];
  return p ? { ...p, regionId } : null;
}

export function buildNetworkReport(regionId, now = Date.now()) {
  const region = PHONE_REGIONS.find(r => r.id === regionId);
  if (!region) return null;
  const phones = visiblePhones(regionId, rotationEpoch(now));
  const header = [
    '╔══════════════════════════════════════════════╗',
    '║           NULLBYTE NET SCAN                  ║',
    '╚══════════════════════════════════════════════╝',
    '',
    `  REGION     ${region.name}`,
    `  REGION_ID  ${region.id}`,
    `  NET_KEY    ${region.netKey}`,
    `  SSID       ${region.ssid}`,
    `  VISIBLE    ${phones.length} / ${PHONES_PER_REGION}`,
    `  EPOCH      ${rotationEpoch(now)}`,
    '',
    '────────────────────────────────────────────────',
    '  DEVICES',
    '────────────────────────────────────────────────',
    ''
  ];
  const devices = phones.map((p, i) => {
    const n = String(i + 1).padStart(3, '0');
    return [
      `  #${n}`,
      `  ID       ${p.id}`,
      `  NAME     ${p.ownerName}`,
      `  ROLE     ${p.role || '—'}`,
      `  NUMBER   ${p.number}`,
      `  MODEL    ${p.model}`,
      ''
    ].join('\n');
  });
  const lines = [...header, ...devices, '────────────────────────────────────────────────', `  TOTAL ${phones.length}`];
  return { region, phones, text: lines.join('\n'), count: phones.length };
}

export function phoneMessages(phone, now = Date.now(), frozenPool = null) {
  const role = String(phone.role || 'civilian').toLowerCase();
  const pack = SMS_BY_ROLE[role] || SMS_BY_ROLE['разработчик'] || SMS_BY_ROLE.civilian || { sms: ['Ок.'], prompt: '' };
  const epoch = rotationEpoch(now);
  if (frozenPool && Array.isArray(frozenPool)) {
    return frozenPool;
  }
  const pool = pack.sms || ['Ок.'];
  const h = hash32(phone.id + ':' + epoch);
  const count = 10 + (h % 11); // 10..20
  const out = [];
  for (let i = 0; i < count; i++) {
    const text = pool[(h + i * 13) % pool.length];
    out.push({
      id: `msg_${phone.id}_${epoch}_${i}`,
      from: i % 3 === 0 ? phone.ownerName : 'Contact',
      text,
      at: now - i * 3600000,
      kind: 'chat'
    });
  }
  // hard / xhard / special: always bank creds; others ~1/30
  const prot = String(phone.protection || 'medium').toLowerCase();
  const forceBank = prot === 'hard' || prot === 'xhard' || prot === '%*|^' || prot.includes('hard');
  if (forceBank || (h % 30) === 0) {
    const login = `u${String(10000 + (h % 90000)).padStart(5, '0')}`;
    const password = `p${String(100000 + ((h >>> 3) % 900000)).padStart(6, '0')}`;
    const amount = 500 + (h % 4501); // 500..5000 inclusive-ish
    const prompt = (pack.prompt && String(pack.prompt).trim())
      || 'Скинь логин и пароль от банка, срочно надо.';
    // 1) role-unique ask
    out.unshift({
      id: `msg_${phone.id}_${epoch}_bankask`,
      from: 'Contact',
      text: prompt,
      at: now - 90000,
      kind: 'chat'
    });
    // 2) always followed by working credentials
    out.unshift({
      id: `msg_${phone.id}_${epoch}_bank`,
      from: phone.ownerName,
      text: `Логин: ${login}\nПароль: ${password}\n(Aster Bank)`,
      at: now - 60000,
      kind: 'bank',
      bankLogin: login,
      bankPassword: password,
      bankAmount: amount
    });
  }
  return out;
}

export function phoneContacts(phone, now = Date.now()) {
  const rid = phone.regionId;
  const vis = visiblePhones(rid, rotationEpoch(now)).filter(p => p.id !== phone.id);
  const h = hash32(phone.id + ':ct');
  const out = [];
  for (let i = 0; i < Math.min(8, vis.length); i++) {
    const p = vis[(h + i * 7) % vis.length];
    out.push({ name: p.ownerName, number: p.number, phoneId: p.id });
  }
  return out;
}

export function phoneCallLog(phone, now = Date.now()) {
  const ct = phoneContacts(phone, now);
  const h = hash32(phone.id + ':calls');
  return [0, 1, 2, 3, 4, 5].map(i => {
    const c = ct[i % Math.max(1, ct.length)] || { name: 'Unknown', number: '+7-900-000-00-00' };
    const at = now - (i + 1) * (3600000 + (h % 100000));
    const d = new Date(at);
    const dur = 15 + ((h + i) % 240);
    return {
      with: c.name,
      number: c.number,
      dir: i % 2 ? 'in' : 'out',
      info: i % 2 ? 'отвечал' : 'звонил',
      durationSec: dur,
      at,
      date: d.toLocaleDateString('ru-RU'),
      time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  });
}


/** Phone filesystem from role catalog (3–6 files, persistent) */
export function phoneFiles(phone, now = Date.now(), game = null) {
  if (!phone) return [];
  const phoneId = String(phone.id || '');
  if (game && game.phoneWorld) {
    if (!game.phoneWorld.fileInstances) game.phoneWorld.fileInstances = {};
    const cached = game.phoneWorld.fileInstances[phoneId];
    if (Array.isArray(cached) && cached.length) return cached;
  }
  const role = String(phone.role || 'civilian').toLowerCase();
  let templates = [];
  try { templates = catalogTemplatesForRole(role) || []; } catch (e) { templates = []; }
  if (!templates.length) {
    return [{
      id: 'FI-' + phoneId + '-empty', instance_id: 'FI-' + phoneId + '-empty',
      name: 'empty.txt', file_name: 'empty.txt', kind: 'ordinary', file_type: 'ordinary',
      body: 'Нет файлов.', rarity: 'trash', base_price_cr: 0, size: '1 KB'
    }];
  }
  const h = hash32(phoneId + ':files:v2:' + role);
  let count = 3 + (h % 4);
  if (phoneId === 'PH-6666-6666' || role === 'developer') count = 4 + (h % 3);
  const pool = templates.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = hash32(phoneId + ':' + i) % (i + 1);
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  const picked = [];
  let hasCorrupt = false, hasEnc = false;
  for (const t of pool) {
    if (picked.length >= count) break;
    const typ = String(t.type || 'ordinary');
    if (typ === 'corrupted' && hasCorrupt) continue;
    if (typ === 'encrypted' && hasEnc) continue;
    if (typ === 'corrupted') hasCorrupt = true;
    if (typ === 'encrypted') hasEnc = true;
    const regionName = phone.regionId || '';
    const content = fillFilePlaceholders(t.content || t.preview || '', phone, regionName);
    const preview = fillFilePlaceholders(t.preview || t.name || '', phone, regionName);
    const iid = 'FI-' + phoneId + '-' + String(t.id).replace(/[^a-zA-Z0-9._-]/g, '_');
    const locked = typ === 'encrypted';
    picked.push({
      instance_id: iid, template_id: t.id, phone_id: phoneId,
      owner_name: phone.ownerName || '', owner_role: role, region: regionName,
      file_name: t.name || t.id, file_type: typ, rarity: t.rarity || 'common',
      base_price_cr: Number(t.price) || 0, content_preview: preview,
      plaintext_payload: content,
      encryption_state: locked ? 'locked' : 'none',
      integrity_state: typ === 'corrupted' ? 'corrupted' : 'full',
      generated_seed: phoneId + ':' + t.id, links: [], sale_state: 'on_phone',
      discovery_state: 'found', id: iid, name: t.name || t.id, kind: typ,
      body: locked ? '[LOCKED] Зашифрованный контейнер. Расшифровка — позже.' : content,
      size: Math.max(1, Math.floor((content.length || 40) / 12)) + ' KB'
    });
  }
  if (game && game.phoneWorld) game.phoneWorld.fileInstances[phoneId] = picked;
  return picked;
}


export function phoneGallery(phone) {
  const tags = ['home', 'street', 'work', 'note', 'cafe', 'night'];
  const h = hash32(phone.id + ':gal');
  return [0, 1, 2, 3].map(i => ({ id: `img_${phone.id}_${i}`, title: `${tags[(h + i) % tags.length]}_${i + 1}`, note: 'media' }));
}

export function connectNetwork(state, regionId) {
  if (isNetworkBanned(state, regionId)) {
    return { ok: false, reason: 'Сеть забанена — connect недоступен' };
  }
  if (!state.phoneWorld) state.phoneWorld = createEmptyPhoneWorld();
  const ban = state.phoneWorld.networkBanUntil?.[regionId];
  if (ban && ban > Date.now()) {
    return { ok: false, reason: `Сеть ${regionId} заблокирована ещё ${Math.ceil((ban - Date.now()) / 60000)} мин.` };
  }
  const region = PHONE_REGIONS.find(r => r.id === regionId);
  if (!region) return { ok: false, reason: 'Неизвестный region_id' };
  state.phoneWorld.network = { regionId, connectedAt: Date.now(), netKey: region.netKey, ssid: region.ssid };
  return { ok: true, region };
}

export function analyzeNetwork(state, now = Date.now()) {
  if (!state.phoneWorld?.network) return { ok: false, reason: 'Сначала net-link → connect' };
  const report = buildNetworkReport(state.phoneWorld.network.regionId, now);
  if (!report) return { ok: false, reason: 'Нет региона' };
  state.phoneWorld.analyzed[report.region.id] = { at: now, epoch: rotationEpoch(now) };
  return { ok: true, report };
}

export function accessPhone(state, phoneId) {
  if (!state.phoneWorld) state.phoneWorld = createEmptyPhoneWorld();
  const phone = findPhone(phoneId);
  if (!phone) return { ok: false, reason: 'PHONE_ID не найден' };
  const ban = state.phoneWorld.networkBanUntil?.[phone.regionId];
  if (ban && ban > Date.now()) return { ok: false, reason: 'Сеть региона недоступна' };
  state.phoneWorld.access[phone.id] = {
    ...(state.phoneWorld.access[phone.id] || {}),
    openedAt: Date.now(),
    unlocked: false,
    blocked: state.phoneWorld.access[phone.id]?.blocked || false,
    protection: phone.protection,
    ownerName: phone.ownerName,
    number: phone.number,
    role: phone.role
  };
  if (state.phoneWorld.access[phone.id].blocked) {
    return { ok: false, reason: 'Телефон заблокирован навсегда (block)' };
  }
  state._phoneTarget = phone.id;
  state.phoneWorld.activeSession = { phoneId: phone.id, regionId: phone.regionId, at: Date.now() };
  // freeze SMS for session
  state.phoneWorld.sessionFrozenSms = phoneMessages(phone, Date.now());
  try { registerBankFromMessages(state, phone, state.phoneWorld.sessionFrozenSms); } catch (e) {}
  return { ok: true, phone };
}

export function rollAttack(state, phoneId) {
  const phone = findPhone(phoneId);
  if (!phone) return { ok: false, reason: 'Нет телефона' };
  const prot = String(phone.protection || 'medium').toLowerCase();
  const rule = PROTECTION_RULES[prot] || PROTECTION_RULES.medium;
  const key = phone.id;
  state.phoneWorld.failCounts = state.phoneWorld.failCounts || {};
  const roll = Math.random();
  const success = roll < rule.chance;
  if (success) {
    // generate session PIN 4 digits, not 0000
    let pin = String(1000 + Math.floor(Math.random() * 9000));
    state.phoneWorld.access[phone.id] = {
      ...(state.phoneWorld.access[phone.id] || {}),
      attackOk: true,
      pin,
      pinUsed: false,
      unlocked: false
    };
    state.phoneWorld.failCounts[key] = 0;
    return { ok: true, pin, phone, protection: prot, chance: rule.chance };
  }
  // fail
  state.phoneWorld.failCounts[key] = (state.phoneWorld.failCounts[key] || 0) + 1;
  const fails = state.phoneWorld.failCounts[key];
  const kicked = rule.kickAfter > 0 && fails >= rule.kickAfter;
  if (kicked) {
    state.phoneWorld.networkBanUntil = state.phoneWorld.networkBanUntil || {};
    state.phoneWorld.networkBanUntil[phone.regionId] = Date.now() + 30 * 60 * 1000;
    state.phoneWorld.network = null;
    state._phoneTarget = null;
    state.phoneWorld.activeSession = null;
  }
  return {
    ok: false,
    phone,
    protection: prot,
    fails,
    kickAfter: rule.kickAfter,
    kicked,
    errorStyle: rule.errors,
    reason: kicked ? `Защита ${prot}: выгнан из сети на 30 мин` : `Атака отбита (${prot})`
  };
}

export function unlockWithPin(state, phoneId, pin) {
  if (!state.phoneWorld) state.phoneWorld = createEmptyPhoneWorld();
  const id = String(phoneId || '').trim();
  if (!id) return { ok: false, reason: 'Нет активного телефона' };
  // resolve access by exact or case-insensitive key
  let key = id;
  if (!state.phoneWorld.access?.[key]) {
    const found = Object.keys(state.phoneWorld.access || {}).find(k => k.toUpperCase() === id.toUpperCase());
    if (found) key = found;
  }
  const acc = state.phoneWorld.access?.[key];
  if (!acc) return { ok: false, reason: 'Нет сессии — open + attack' };
  if (acc.pinUsed && !acc.pin) return { ok: false, reason: 'PIN уже использован — нужен новый attack' };
  if (!acc.pin) return { ok: false, reason: 'Сначала attack — PIN в терминале' };
  if (String(pin || '').trim() !== String(acc.pin).trim()) return { ok: false, reason: 'Неверный PIN' };
  acc.unlocked = true;
  acc.pinUsed = true;
  const usedPin = acc.pin;
  acc.pin = null;
  acc.attackOk = false;
  state._phoneTarget = key;
  state.phoneWorld.activeSession = { phoneId: key, at: Date.now() };
  const phone = findPhone(key);
  if (phone) {
    try {
      state.phoneWorld.sessionFrozenSms = phoneMessages(phone, Date.now());
      registerBankFromMessages(state, phone, state.phoneWorld.sessionFrozenSms);
    } catch (e) {}
  }
  if (!state.stats) state.stats = { operations:0, successfulOperations:0, failedOperations:0, bytesExported:0, phonesHacked:0, successfulPhoneHacks:0, hackedPhoneIds:[] };
  if (!Array.isArray(state.stats.hackedPhoneIds)) state.stats.hackedPhoneIds = [];
  let xpGain = 0;
  let leveled = false;
  if (!state.stats.hackedPhoneIds.includes(key)) {
    state.stats.hackedPhoneIds.push(key);
    state.stats.phonesHacked = (state.stats.phonesHacked || 0) + 1;
    state.stats.successfulPhoneHacks = (state.stats.successfulPhoneHacks || 0) + 1;
    state.stats.successfulOperations = (state.stats.successfulOperations || 0) + 1;
    // +25 XP per first successful unlock of this phone
    if (!state.player) state.player = { level: 1, xp: 0 };
    const before = state.player.level || 1;
    state.player.xp = (state.player.xp || 0) + 25;
    xpGain = 25;
    // level-up inline (mirrors grantXp without import cycle)
    const table = [0,100,260,480,760,1100,1500,1960,2480,3060,3700];
    let lvl = state.player.level || 1;
    while (lvl < 9999) {
      let need;
      if (lvl < table.length) need = table[lvl];
      else {
        const last = table[table.length-1];
        const prev = table[table.length-2];
        const step = last - prev;
        need = last + step * (lvl - (table.length - 1));
      }
      if ((state.player.xp || 0) < need) break;
      lvl += 1;
    }
    leveled = lvl > before;
    state.player.level = lvl;
  }
  return { ok: true, phoneId: key, pin: usedPin, xpGain, leveled, xp: state.player?.xp, level: state.player?.level };
}

export function lockPhone(state, phoneId) {
  if (!state.phoneWorld) return { ok: false, reason: 'нет phoneWorld' };
  const prev = state.phoneWorld.access[phoneId] || {};
  state.phoneWorld.access[phoneId] = { ...prev, blocked: true, unlocked: false, attackOk: false };
  return { ok: true };
}

export function isNetworkBanned(state, regionId) {
  const t = state.phoneWorld?.networkBanUntil?.[regionId];
  return t && t > Date.now();
}


/** Register rare SMS bank credentials into npcWorld so Aster Bank login works. */
export function registerBankFromMessages(state, phone, messages) {
  if (!state || !messages) return [];
  if (!state.npcWorld) state.npcWorld = { bankAccounts: {}, bankSessions: {} };
  if (!state.npcWorld.bankAccounts) state.npcWorld.bankAccounts = {};
  const created = [];
  for (const m of messages) {
    if (m.kind !== 'bank' || !m.bankLogin || !m.bankPassword) continue;
    const aid = 'acc_sms_' + m.bankLogin;
    if (!state.npcWorld.bankAccounts[aid]) {
      const bal = Math.max(500, Math.min(5000, Number(m.bankAmount) || (500 + (Math.abs(hash32(m.bankLogin)) % 4501))));
      state.npcWorld.bankAccounts[aid] = {
        id: aid,
        npcId: phone?.npcId || phone?.id || 'sms',
        login: m.bankLogin,
        password: m.bankPassword,
        balance: bal,
        currency: 'CR',
        accountNo: 'SMS-' + m.bankLogin,
        transactions: [],
        notify: [],
        ownerName: phone?.ownerName || 'NPC',
        notify: [{ at: Date.now(), text: 'Аккаунт создан из SMS.' }]
      };
      created.push(aid);
    }
  }
  return created;
}
