/**
 * NULLBYTE phone system — fixed registry + 4h rotation + SMS by role.
 */
import {
  PHONE_REGIONS, PHONE_DB, SMS_BY_ROLE, VISIBLE_PER_REGION, ROTATION_MS, PROTECTION_RULES, PHONES_PER_REGION
} from './phone_registry.js';

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
    discovered: {}, pendingDrops: [], failCounts: {}, networkBanUntil: {},
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
  const n = Math.min(VISIBLE_PER_REGION, all.length);
  // shuffle indices by epoch
  const idxs = all.map((_, i) => i);
  let h = hash32(regionId + ':' + epoch);
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
      `  DEFENSE  ${p.protection}`,
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


/** Role-based phone filesystem: 1–7 files with lore content */
export function phoneFiles(phone, now = Date.now()) {
  if (!phone) return [];
  const role = String(phone.role || 'civilian').toLowerCase();
  const h = hash32(String(phone.id) + ':files:' + role);
  const count = 1 + (h % 7); // 1..7
  const owner = phone.ownerName || 'Unknown';
  const pools = {
    student: [
      { kind: 'notes', name: 'konspekt_algebra.txt', body: 'Лекция 12. Матрицы.\nФормула: det(A) для 2x2.\nНе забыть лабу до пятницы.\n— ' + owner },
      { kind: 'docs', name: 'raspisanie_semestr.md', body: '# Расписание\nПн: мат.анализ\nСр: сети\nПт: зачёт по крипте (вымышленный курс NULLBYTE U).' },
      { kind: 'report', name: 'otchet_laba3.txt', body: 'Отчёт лаб.3\nТема: сканирование портов (учебный стенд).\nВывод: всё в пределах симуляции.' },
      { kind: 'data', name: 'contacts_backup.csv', body: 'name,phone\nЛена,+7-900-100-11-22\nКирилл,+7-900-100-33-44' },
      { kind: 'corrupt', name: 'photo_vacation.raw', body: '<<BINARY CORRUPT 0xDEAD>>\nне удалось восстановить заголовок JPEG' },
      { kind: 'encrypted', name: 'notes.enc', body: 'NBENC1:8f3a91c0e2b7d4...\n(нужен ключ с mail-drop / artifact)' },
      { kind: 'script', name: 'homework.py', body: '# учебный скрипт\nprint("hello nullbyte")\n# TODO: сдать до дедлайна' },
    ],
    developer: [
      { kind: 'script', name: 'deploy.sh', body: '#!/bin/bash\n# staging only\nnpm run build && rsync -a dist/ staging:/var/www/' },
      { kind: 'docs', name: 'API_SPEC.md', body: '# Internal API (fiction)\nPOST /v1/session\nAuth: Bearer <token>\nDo not commit production keys.' },
      { kind: 'data', name: 'env.sample', body: 'DB_HOST=127.0.0.1\nAPI_KEY=changeme\nNODE_ENV=development' },
      { kind: 'report', name: 'bug_report_882.txt', body: 'Bug #882: race on save\nSteps: open two tabs, spam save\nStatus: investigating' },
      { kind: 'encrypted', name: 'secrets.vault', body: 'VAULT::AES\nblob=9a2f... (игровой контейнер)' },
      { kind: 'corrupt', name: 'core.dump', body: 'ELF core dump truncated\nstack: 0x7fff....' },
      { kind: 'notes', name: 'todo.txt', body: '- refactor auth\n- fix phone sync\n- не пушить на main без review' },
    ],
    manager: [
      { kind: 'report', name: 'Q3_report.pdf.txt', body: 'Q3 summary (fiction)\nRevenue: stable\nRisks: vendor lock\nNext: cut cloud spend 8%' },
      { kind: 'docs', name: 'org_chart.txt', body: 'CEO → COO → Team leads\nHR: closed channel\nAccess: managers only' },
      { kind: 'dossier', name: 'employee_notes.md', body: '# Notes\n' + owner + ' meeting notes.\nAction items: 1) budget 2) hiring freeze' },
      { kind: 'data', name: 'payroll_stub.csv', body: 'id,role,amount\n12,dev,4500\n15,ops,3900\n(внутриигровые цифры)' },
      { kind: 'encrypted', name: 'board_minutes.enc', body: 'ENCRYPTED BOARD MINUTES\nkey required' },
      { kind: 'notes', name: 'meeting_12.txt', body: 'Стендап 12:00\nБлокер: лицензии\nРешение: перенос релиза' },
      { kind: 'corrupt', name: 'scan_contract.tif', body: 'TIFF header invalid / partial scan' },
    ],
    courier: [
      { kind: 'data', name: 'routes_today.txt', body: '1. Dock 4\n2. Midtown locker\n3. Southgate pickup\nETA only in sim' },
      { kind: 'notes', name: 'client_codes.txt', body: 'BOX-19A / code 4412\nBOX-19B / code 0091' },
      { kind: 'report', name: 'delivery_log.txt', body: '09:12 delivered\n11:40 delay traffic\n15:02 signed' },
      { kind: 'corrupt', name: 'map_cache.bin', body: 'MAPCACHE corrupt sector' },
      { kind: 'encrypted', name: 'vip_list.enc', body: 'ENC VIP addresses' },
    ],
    medic: [
      { kind: 'docs', name: 'protocol_triage.md', body: '# Triage protocol (fiction)\nABC → stabilize → transfer' },
      { kind: 'report', name: 'shift_report.txt', body: 'Shift 08-20\nCases: 14\nCritical: 1 (stabilized)' },
      { kind: 'notes', name: 'pharma_list.txt', body: 'Inventory check:\n- saline\n- bandages\n(игровой список)' },
      { kind: 'dossier', name: 'patient_anon.txt', body: 'ID: ANON-204\nStatus: discharged\nNo real PII' },
      { kind: 'encrypted', name: 'records.enc', body: 'MED-ENC v2' },
      { kind: 'corrupt', name: 'ultrasound.dat', body: 'data stream interrupted' },
    ],
    guard: [
      { kind: 'report', name: 'patrol_log.txt', body: 'Sector A clear\nSector B camera 3 offline\nReport filed' },
      { kind: 'docs', name: 'sop_entry.txt', body: 'SOP: visitor badge, metal check, logbook' },
      { kind: 'data', name: 'badge_ids.txt', body: 'BADGE-1001\nBADGE-1002\nBADGE-1044' },
      { kind: 'notes', name: 'incident_04.txt', body: 'Incident: perimeter alarm false positive' },
      { kind: 'encrypted', name: 'cam_export.enc', body: 'CAMEXPORT locked' },
      { kind: 'corrupt', name: 'dvr_chunk.bin', body: 'DVR chunk CRC fail' },
    ],
    trader: [
      { kind: 'data', name: 'prices_today.csv', body: 'item,bid,ask\nNULLBYTE,12.4,12.6\n44weee,3.1,3.2\ntunnel,8.0,8.3' },
      { kind: 'report', name: 'pnl_week.txt', body: 'PnL week: +2.4% (sim)\nMax DD: -1.1%' },
      { kind: 'notes', name: 'signals.txt', body: 'Long NULLBYTE on dip\nAvoid leverage >2x' },
      { kind: 'script', name: 'bot_config.json', body: '{\n  "pair": "NULLBYTE/CR",\n  "mode": "paper"\n}' },
      { kind: 'encrypted', name: 'wallet.seed.enc', body: 'SEED ENC — do not share' },
      { kind: 'corrupt', name: 'orderbook.snap', body: 'snapshot truncated' },
      { kind: 'docs', name: 'risk_policy.md', body: '# Risk\nMax position 15%\nStop -3%' },
    ],
    journalist: [
      { kind: 'dossier', name: 'source_A.md', body: '# Source A\nClaim: port expansion\nStatus: unverified\n(fiction)' },
      { kind: 'docs', name: 'draft_article.txt', body: 'Title: Mesh networks of Midtown\nLead: ...\nNeed second source' },
      { kind: 'notes', name: 'interview_q.txt', body: '1. Who funds mesh?\n2. Outages frequency?' },
      { kind: 'data', name: 'foia_stub.txt', body: 'Request ID FOIA-SIM-19\nPending' },
      { kind: 'encrypted', name: 'whistle.enc', body: 'WHISTLEBLOB' },
      { kind: 'corrupt', name: 'audio_interview.wav', body: 'RIFF.... corrupt' },
      { kind: 'report', name: 'factcheck.txt', body: 'Claim X: false\nClaim Y: partial' },
    ],
  };
  // fallbacks
  const generic = [
    { kind: 'notes', name: 'notes.txt', body: 'Личные заметки ' + owner + '\n— встреча\n— не забыть оплату' },
    { kind: 'docs', name: 'readme.txt', body: 'Файлы устройства (симуляция NULLBYTE).' },
    { kind: 'data', name: 'backup.json', body: '{\n  "owner": "' + owner + '",\n  "device": "' + (phone.device || 'phone') + '"\n}' },
    { kind: 'corrupt', name: 'unknown.dat', body: '???? unreadable block' },
    { kind: 'encrypted', name: 'safe.enc', body: 'SAFEBOX encrypted' },
    { kind: 'report', name: 'summary.txt', body: 'Краткий отчёт за неделю. Без деталей.' },
    { kind: 'script', name: 'util.js', body: '// snippet\nexport const ok = true;' },
    { kind: 'dossier', name: 'profile.txt', body: 'Имя: ' + owner + '\nРоль: ' + role + '\nРайон: ' + (phone.regionId || '—') },
  ];
  const pool = pools[role] || pools.civilian || generic;
  const base = pool.length ? pool : generic;
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = base[(h + i * 17) % base.length];
    const id = 'pf_' + phone.id + '_' + i;
    out.push({
      id,
      name: src.name,
      kind: src.kind,
      body: src.body,
      size: 200 + ((h >> (i % 8)) % 8000),
      at: now - i * 86400000,
    });
  }
  return out;
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
    blocked: state.phoneWorld.access[phone.id]?.blocked || false
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
