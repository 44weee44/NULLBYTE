import { moneyDialogue, npcReply, openingLine, getTrust, setTrust, dialogueStats } from './dialogue.js';
/**
 * NULLBYTE scalable NPC / bank / phone world layer.
 * Deterministic seed-based generation; instances persist once touched.
 */

const FIRST = ['Alex','Mira','Eli','Nora','Kai','Vera','Dax','Lena','Omar','Sera','Jon','Rita','Pavel','Anya','Chris','Nina','Leo','Tara','Ilya','Maya'];
const LAST = ['Voss','North','Vale','Cross','Reed','Shaw','Kane','Frost','Cole','Hayes','Orlov','Volkov','Stone','Blake','Quinn','Marsh','Drake','Wells','Park','Nguyen'];
const ROLES = ['courier','clerk','mechanic','operator','merchant','driver','tech','guard','student','freelancer'];
const TRAITS = ['calm','suspicious','friendly','greedy','busy','loyal','nervous','blunt','polite','cynical'];

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(seed, arr) { return arr[hash32(seed) % arr.length]; }

export const NPC_POOL_SIZE = 2000;

export function createEmptyNpcWorld() {
  return {
    version: 1,
    instances: {},      // npcId -> overridden/enriched record
    bankAccounts: {},   // accountId -> account
    bankSessions: {},   // sessionId -> session
    callLogs: {},       // phoneId -> [{...}]
    trust: {},          // `${npcId}:${playerKey}` -> number
    transferAttempts: {}, // `${npcId}` -> {count, lastAt}
    regionKeys: {},
    nextTxn: 1
  };
}

export function migrateNpcWorld(raw) {
  const base = createEmptyNpcWorld();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    instances: raw.instances && typeof raw.instances === 'object' ? raw.instances : {},
    bankAccounts: raw.bankAccounts && typeof raw.bankAccounts === 'object' ? raw.bankAccounts : {},
    bankSessions: raw.bankSessions && typeof raw.bankSessions === 'object' ? raw.bankSessions : {},
    callLogs: raw.callLogs && typeof raw.callLogs === 'object' ? raw.callLogs : {},
    trust: raw.trust && typeof raw.trust === 'object' ? raw.trust : {},
    transferAttempts: raw.transferAttempts && typeof raw.transferAttempts === 'object' ? raw.transferAttempts : {},
    regionKeys: raw.regionKeys && typeof raw.regionKeys === 'object' ? raw.regionKeys : {},
    nextTxn: Number(raw.nextTxn) || 1
  };
}

/** Stable procedural NPC from index 0..NPC_POOL_SIZE-1 */
export function generateNpc(index, seedRoot = 'nb') {
  const i = ((Number(index) % NPC_POOL_SIZE) + NPC_POOL_SIZE) % NPC_POOL_SIZE;
  const id = `npc_${String(i).padStart(4, '0')}`;
  const h = hash32(`${seedRoot}:${id}`);
  const first = FIRST[h % FIRST.length];
  const last = LAST[Math.floor(h / 32) % LAST.length];
  const role = ROLES[Math.floor(h / 1024) % ROLES.length];
  const trait = TRAITS[Math.floor(h / 32768) % TRAITS.length];
  const regionIdx = Math.floor(h / 1048576) % 8;
  const phone = `+7-900-${String(1000000 + (h % 9000000)).slice(0, 7)}`;
  const accountNo = `AST-${String(10000000 + (h % 90000000)).slice(0, 8)}`;
  const balance = 50 + (h % 9500);
  const login = `${first.toLowerCase()}${i % 100}`;
  const password = `pw${(h % 9000 + 1000)}`;
  return {
    id,
    index: i,
    firstName: first,
    lastName: last,
    name: `${first} ${last}`,
    role,
    trait,
    regionId: `region_${regionIdx}`,
    phone,
    deviceId: `dev_${id}`,
    accountId: `acc_${id}`,
    accountNo,
    login,
    password,
    balance,
    reputation: h % 100,
    mood: 40 + (h % 40)
  };
}

export function getNpc(state, npcId) {
  if (!state.npcWorld) state.npcWorld = createEmptyNpcWorld();
  const idx = Number(String(npcId).replace(/\D/g, ''));
  if (!Number.isFinite(idx)) return null;
  const base = generateNpc(idx, state.meta?.seed || 'nb');
  const over = state.npcWorld.instances[npcId] || {};
  // overlay must not wipe trait/name if missing
  return {
    ...base,
    ...over,
    id: base.id,
    trait: over.trait || base.trait,
    name: over.name || base.name,
    firstName: base.firstName,
    lastName: base.lastName,
    mood: typeof over.mood === 'number' ? over.mood : base.mood,
    role: over.role || base.role
  };
}

export function touchNpc(state, npcId) {
  const base = getNpc(state, npcId);
  if (!base) return null;
  if (!state.npcWorld.instances[npcId]) {
    state.npcWorld.instances[npcId] = { id: npcId, discoveredAt: Date.now() };
  }
  ensureBankAccount(state, base);
  return getNpc(state, npcId);
}

export function ensureBankAccount(state, npc) {
  if (!state.npcWorld) state.npcWorld = createEmptyNpcWorld();
  const id = npc.accountId;
  if (!state.npcWorld.bankAccounts[id]) {
    state.npcWorld.bankAccounts[id] = {
      id,
      npcId: npc.id,
      accountNo: npc.accountNo,
      login: npc.login,
      password: npc.password,
      balance: npc.balance,
      transactions: [
        { id: `txn_open_${id}`, type: 'open', amount: npc.balance, at: Date.now() - 86400000, note: 'Account open' }
      ],
      notify: []
    };
  }
  return state.npcWorld.bankAccounts[id];
}

export function bankLogin(state, login, password) {
  if (!state.npcWorld) state.npcWorld = createEmptyNpcWorld();
  login = String(login || '').trim();
  password = String(password || '').trim();
  if (!login || !password) return { ok: false, reason: 'Введи логин и пароль.' };

  let found = null;
  // 1) already known accounts only (from SMS/register)
  for (const acc of Object.values(state.npcWorld.bankAccounts || {})) {
    if (acc.login === login && acc.password === password) { found = acc; break; }
  }
  // 2) tiny hash probe (never full pool)
  if (!found && typeof generateNpc === 'function') {
    const seed = state.meta?.seed || 'nb';
    let h = 2166136261;
    for (let i = 0; i < login.length; i++) { h ^= login.charCodeAt(i); h = Math.imul(h, 16777619); }
    const pool = Math.max(1, NPC_POOL_SIZE || 1);
    const probes = new Set();
    for (let k = 0; k < 12; k++) probes.add(((h >>> 0) + k * 9973) % pool);
    for (const i of probes) {
      try {
        const npc = generateNpc(i, seed);
        if (npc.login === login && npc.password === password) {
          touchNpc(state, npc.id);
          found = state.npcWorld.bankAccounts[npc.accountId];
          break;
        }
      } catch (e) {}
    }
  }
  if (!found) return { ok: false, reason: 'Неверный логин или пароль. Проверь SMS с hard-телефона.' };

  if (!state.npcWorld.bankSessions) state.npcWorld.bankSessions = {};
  const sessionId = `bs_${found.id}_${Date.now().toString(36)}`;
  const expiresAt = Date.now() + 20 * 60 * 1000;
  state.npcWorld.bankSessions[sessionId] = {
    id: sessionId, accountId: found.id, npcId: found.npcId,
    openedAt: Date.now(), expiresAt, active: true
  };
  if (!found.notify) found.notify = [];
  found.notify.unshift({ at: Date.now(), text: 'Новый вход в аккаунт (игровая сессия).' });
  found.notify = found.notify.slice(0, 20);
  return { ok: true, sessionId, account: found, expiresAt };
}


export function getBankSession(state, sessionId) {
  const s = state.npcWorld?.bankSessions?.[sessionId];
  if (!s || !s.active) return null;
  if (s.expiresAt <= Date.now()) {
    s.active = false;
    s.endedAt = Date.now();
    s.reason = 'expired';
    return null;
  }
  return s;
}

export function expireBankSessions(state, now = Date.now()) {
  if (!state.npcWorld?.bankSessions) return [];
  const notices = [];
  for (const s of Object.values(state.npcWorld.bankSessions)) {
    if (s.active && s.expiresAt <= now) {
      s.active = false;
      s.endedAt = now;
      s.reason = 'expired';
      notices.push('Банковская сессия истекла.');
    }
  }
  return notices;
}

export function bankTransfer(state, sessionId, toAccountNo, amount) {
  const session = getBankSession(state, sessionId);
  if (!session) return { ok: false, reason: 'Сессия недействительна или истекла. Войди снова.' };
  if (!state.npcWorld?.bankAccounts) return { ok: false, reason: 'Банк не инициализирован.' };
  const from = state.npcWorld.bankAccounts[session.accountId];
  if (!from) return { ok: false, reason: 'Счёт отправителя не найден.' };
  amount = Math.floor(Number(amount));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'Некорректная сумма.' };
  if (amount > from.balance) return { ok: false, reason: 'Недостаточно средств на счёте NPC (' + from.balance + ' CR).' };

  const destRaw = String(toAccountNo || '').trim();
  const dest = destRaw.toLowerCase();
  if (!dest) return { ok: false, reason: 'Укажи счёт или wallet получателя.' };

  const playerWallet = String(state.player?.walletId || '').trim();
  const nick = String(state.player?.nickname || '').trim().toLowerCase();
  const toPlayer = !!(
    (playerWallet && dest === playerWallet.toLowerCase()) ||
    dest === 'player' ||
    (nick && dest === nick)
  );

  let to = Object.values(state.npcWorld.bankAccounts).find(a =>
    String(a.accountNo || '').toLowerCase() === dest ||
    String(a.login || '').toLowerCase() === dest
  );
  if (!to && !toPlayer) {
    for (let k = 0; k < 400; k++) {
      const npc = generateNpc((hash32(destRaw) + k) % NPC_POOL_SIZE, state.meta?.seed || 'nb');
      if (String(npc.accountNo || '').toLowerCase() === dest || String(npc.login || '').toLowerCase() === dest) {
        touchNpc(state, npc.id);
        to = state.npcWorld.bankAccounts[npc.accountId];
        break;
      }
    }
  }
  if (!to && !toPlayer) {
    return { ok: false, reason: 'Счёт получателя не найден. Укажи свой wallet (Aster Bank на рабочем столе) или accountNo NPC.' };
  }
  if (to && to.id === from.id) return { ok: false, reason: 'Нельзя перевести на тот же счёт.' };

  if (!state.npcWorld.nextTxn) state.npcWorld.nextTxn = 1;
  const txnId = 'txn_' + state.npcWorld.nextTxn++;
  const at = Date.now();
  from.balance -= amount;
  if (!from.transactions) from.transactions = [];

  if (toPlayer) {
    if (!state.economy) state.economy = { credits: 0, transactions: [] };
    state.economy.credits = (Number(state.economy.credits) || 0) + amount;
    if (state.player) state.player.credits = state.economy.credits;
    state.economy.transactions = state.economy.transactions || [];
    state.economy.transactions.unshift({
      id: txnId, type: 'income', amount,
      reason: 'Перевод с NPC-счёта ' + (from.login || from.accountNo || ''),
      at, note: 'Aster transfer'
    });
    if (state.player) state.player.totalEarned = (Number(state.player.totalEarned) || 0) + amount;
    from.transactions.unshift({ id: txnId, type: 'out', amount, to: playerWallet || 'player', at, note: 'to operator' });
    return { ok: true, message: 'Перевод ' + amount + ' CR на wallet оператора выполнен.', amount, to: playerWallet || 'player', newBalance: from.balance };
  }

  to.balance = (Number(to.balance) || 0) + amount;
  if (!to.transactions) to.transactions = [];
  from.transactions.unshift({ id: txnId, type: 'out', amount, to: to.accountNo, at });
  to.transactions.unshift({ id: txnId, type: 'in', amount, from: from.accountNo, at });
  return { ok: true, message: 'Перевод ' + amount + ' CR → ' + to.accountNo + ' выполнен.', amount, to: to.accountNo, newBalance: from.balance };
}


/** Player receives credits from NPC via phone request */
export function requestNpcTransfer(state, npcId, amount) {
  const npc = touchNpc(state, npcId);
  if (!npc) return { ok: false, reason: 'NPC не найден.' };
  amount = Math.floor(Number(amount));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'Сумма некорректна.' };
  if (amount > 1000) return { ok: false, reason: 'Максимум одной просьбы — 1000 CR.', dialogue: 'Слишком много за раз.' };

  const key = npcId;
  const att = state.npcWorld.transferAttempts[key] || { success: 0, asks: 0 };
  att.asks += 1;
  if (att.success >= 2) {
    state.npcWorld.transferAttempts[key] = att;
    return { ok: false, reason: 'Контакт прерван.', dialogue: 'Хватит. Не звони больше по деньгам.', blocked: true };
  }

  const trustKey = `${npcId}:player`;
  const trust = state.npcWorld.trust[trustKey] ?? 40;
  const acc = ensureBankAccount(state, npc);

  if (amount > acc.balance) {
    return { ok: false, reason: 'У NPC нет столько средств.', dialogue: 'У меня столько нет.', trust };
  }

  let chance = att.success === 0 ? 0.55 + trust / 400 : 0.30 + trust / 500;
  if (npc.trait === 'greedy') chance -= 0.15;
  if (npc.trait === 'friendly' || npc.trait === 'loyal') chance += 0.1;
  const roll = (hash32(`${npcId}:${att.asks}:${att.success}`) % 1000) / 1000;

  if (roll > chance) {
    state.npcWorld.trust[trustKey] = Math.max(0, trust - 8);
    state.npcWorld.transferAttempts[key] = att;
    return { ok: false, reason: 'Отказ.', dialogue: pick(npcId + att.asks, ['Не сейчас.', 'Не уверен.', 'Потом как-нибудь.']), trust: state.npcWorld.trust[trustKey] };
  }

  acc.balance -= amount;
  state.economy.credits += amount;
  state.economy.transactions.unshift({
    id: `txn_call_${Date.now().toString(36)}`,
    type: 'income',
    amount,
    reason: `Перевод от ${npc.name} (звонок)`,
    at: Date.now()
  });
  att.success += 1;
  state.npcWorld.transferAttempts[key] = att;
  state.npcWorld.trust[trustKey] = Math.min(100, trust + 5);
  acc.transactions.unshift({ id: `txn_req_${att.success}`, type: 'out', amount, to: 'player', at: Date.now(), status: 'ok' });

  return {
    ok: true,
    amount,
    dialogue: att.success === 1 ? 'Ладно, перевёл.' : 'Ещё раз — и всё.',
    trust: state.npcWorld.trust[trustKey],
    successCount: att.success
  };
}

export function searchNpcs(state, query, limit = 20) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const out = [];
  // Search touched first
  for (const id of Object.keys(state.npcWorld?.instances || {})) {
    const n = getNpc(state, id);
    if (!n) continue;
    if (`${n.name} ${n.phone} ${n.accountNo} ${n.login} ${n.id}`.toLowerCase().includes(q)) out.push(n);
    if (out.length >= limit) return out;
  }
  // Procedural scan sample
  const start = hash32(q) % NPC_POOL_SIZE;
  for (let k = 0; k < Math.min(400, NPC_POOL_SIZE); k++) {
    const n = generateNpc((start + k) % NPC_POOL_SIZE, state.meta?.seed || 'nb');
    if (`${n.name} ${n.phone} ${n.accountNo} ${n.login}`.toLowerCase().includes(q)) {
      out.push(n);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function pluginDocs() {
  return {
    'site-analyzer': {
      title: 'Site Analyzer',
      role: 'Первичная разведка виртуального сайта (.null).',
      steps: ['Открой Browser и скопируй домен', 'В Terminal: run site-analyzer', 'analyze <domain>', 'Скопируй SIGNATURE и файл отчёта'],
      inputs: 'Домен .null или ID сайта',
      outputs: 'SIGNATURE, intel-артефакты, *_recon.report',
      next: ['artifact-decoder']
    },
    'artifact-decoder': {
      title: 'Artifact Decoder',
      role: 'Расшифровка маркера/подписи анализа.',
      steps: ['Вставь SIGNATURE из анализа', 'decode <SIGNATURE>', 'Получи ARTIFACT_ID'],
      inputs: 'SIGNATURE от Site Analyzer',
      outputs: 'ARTIFACT_ID',
      next: ['node-radar']
    },
    'node-radar': {
      title: 'Node Radar',
      role: 'Обнаружение серверного узла цели.',
      steps: ['discover <ARTIFACT_ID> или scan <host>', 'Считай HOST / SERVER_ID'],
      inputs: 'ARTIFACT_ID или домен',
      outputs: 'HOST_HANDLE, профиль сервера',
      next: ['weakness-lab']
    },
    'weakness-lab': {
      title: 'Weakness Lab',
      role: 'Поиск игровых слабостей защиты.',
      steps: ['probe <NODE>', 'Найди VECTOR_ID'],
      inputs: 'Обнаруженный сервер / NODE ключ',
      outputs: 'VECTOR_ID / vuln objects',
      next: ['sim-exploit']
    },
    'sim-exploit': {
      title: 'Sim Exploit',
      role: 'Игровое получение доступа к серверу.',
      steps: ['simulate <VECTOR>', 'Получи SESSION и уровень access'],
      inputs: 'VECTOR / weakness key',
      outputs: 'SESSION_TOKEN, access level',
      next: ['db-reader', 'data-exporter', 'site-editor']
    },
    'data-exporter': {
      title: 'Data Exporter',
      role: 'Сборка файла результата контракта.',
      steps: ['export <SESSION>', 'Отправь файл через N-Mail'],
      inputs: 'SESSION / access token',
      outputs: 'Файл контракта .nbd',
      next: ['N-Mail']
    },
    'db-reader': {
      title: 'Virtual DB Reader',
      role: 'Поиск пользователей и export записей.',
      steps: ['search <query>', 'export <domain>'],
      inputs: 'SESSION или site id при access',
      outputs: 'USER_ID, *.dat',
      next: ['map-scanner', 'site-editor']
    },
    'map-scanner': {
      title: 'Map Scanner / Mobile',
      role: 'Идентификация устройств и forensics.',
      steps: ['phone <USER_ID>', 'forensics <PHONE_ID>'],
      inputs: 'USER_ID / PHONE_ID',
      outputs: 'deviceinfo, PHONE_ID',
      next: ['Phone Call (mobile)']
    },
    'site-editor': {
      title: 'Site Editor',
      role: 'Временное изменение игровых записей user.',
      steps: ['set <USER_ID> balance|reputation|accountStatus <value>', 'Жди авто-откат 30–60 мин'],
      inputs: 'access ≥ user, USER_ID',
      outputs: 'modification artifact',
      next: []
    }
  };
}


export function tickNpcCommerce(state, now = Date.now()) {
  if (!state.npcWorld || !state.ops) return [];
  const notices = [];
  // Throttle: at most one event per ~3 minutes keyed by clock bucket
  const bucket = Math.floor(now / 180000);
  if (state.npcWorld._commerceBucket === bucket) return notices;
  state.npcWorld._commerceBucket = bucket;

  const shops = (state.world?.sites || []).filter(s => s.kind === 'shop');
  const touched = Object.keys(state.npcWorld.instances || {});
  if (!shops.length || !touched.length) return notices;

  const npcId = touched[bucket % touched.length];
  const npc = getNpc(state, npcId);
  if (!npc) return notices;
  const acc = ensureBankAccount(state, npc);
  const amount = 15 + (hash32(npcId + String(bucket)) % 80);
  if (acc.balance < amount) return notices;

  const shop = shops[bucket % shops.length];
  const link = state.ops.paymentLinks?.[shop.id];
  const diverted = link && link.current && link.current !== link.original && link.expiresAt > now;

  acc.balance -= amount;
  acc.transactions.unshift({
    id: `txn_shop_${bucket}`,
    type: 'out',
    amount,
    to: diverted ? 'operator-divert' : shop.domain,
    at: now,
    status: 'ok',
    note: diverted ? 'diverted checkout' : 'npc purchase'
  });
  acc.transactions = acc.transactions.slice(0, 40);

  if (diverted) {
    state.economy.credits += amount;
    state.economy.transactions.unshift({
      id: `txn_div_${bucket}`,
      type: 'income',
      amount,
      reason: `Перехват оплаты ${shop.domain} (${npc.name})`,
      at: now
    });
    notices.push(`NPC ${npc.name} оплатил ${amount} CR на ${shop.domain} → перехват.`);
  }
  return notices;
}
