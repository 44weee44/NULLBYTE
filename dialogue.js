/**
 * NULLBYTE NPC dialogue system — trait/mood/trust driven replicas.
 * All text is in-game fiction in Russian.
 */

const GREET = {
  calm: ['Алло.', 'Слушаю.', 'Да?', 'Ну привет.'],
  suspicious: ['Кто это?', 'Чего надо?', 'Незнакомый номер…', 'Говори быстро.'],
  friendly: ['Привет! Рад слышать.', 'О, привет!', 'Здорово, как дела?', 'Хей, слушаю!'],
  greedy: ['Если не про деньги — короче.', 'Время — деньги. Что?', 'Ну?', 'Слушаю, но недолго.'],
  busy: ['Коротко, я занят.', 'Минута есть, говори.', 'Быстрее.', 'Да, чего?'],
  loyal: ['Слушаю тебя.', 'Если это важно — говори.', 'Я на связи.', 'Да, я тут.'],
  nervous: ['А… алло?', 'Это… кто?', 'Ой, привет…', 'Слушаю, только тихо.'],
  blunt: ['Чего.', 'Говори.', 'Ну.', 'Слушаю.'],
  polite: ['Добрый день, слушаю вас.', 'Здравствуйте.', 'Рад вашему звонку.', 'Чем могу помочь?'],
  cynical: ['Опять кто-то хочет чего-то.', 'Ну давай, удиви.', 'Слушаю. Не обещаю.', 'Ха. Ну?']
};

const SMALLTALK = {
  calm: ['Нормально всё.', 'Работаю, как обычно.', 'Тихий день.', 'Без новостей.'],
  suspicious: ['Не люблю болтать.', 'Зачем тебе это?', 'Личное.', 'Не твоё дело.'],
  friendly: ['Да всё супер!', 'Только что с работы.', 'Хотел бы встретиться как-нибудь.', 'Спасибо, что позвонил.'],
  greedy: ['Лишь бы платили вовремя.', 'Курсы скачут, нервы.', 'Думаю, где выгоднее.', 'Деньги не растут на деревьях.'],
  busy: ['Очередь задач.', 'Не отвлекай без дела.', 'Потом продолжим.', 'Сейчас не до разговоров.'],
  loyal: ['Держусь своих.', 'Команда на месте.', 'Можно на меня рассчитывать.', 'Свои не бросаем.'],
  nervous: ['Немного трясёт…', 'Кажется, за мной следят? Шутка.', 'Лучше не долго.', 'Говори тише, ладно?'],
  blunt: ['Ок.', 'Ясно.', 'И что?', 'Дальше.'],
  polite: ['Благодарю за интерес.', 'У меня всё в порядке, спасибо.', 'Приятно поговорить.', 'Надеюсь, у вас тоже всё хорошо.'],
  cynical: ['Как всегда — цирк.', 'Мир не меняется.', 'Ожидаемо плохо.', 'Не обольщайся.']
};

const ASK_MONEY_OK = {
  calm: ['Хорошо. Переведу.', 'Ладно, отправил.', 'Могу помочь этой суммой.', 'Сделано.'],
  suspicious: ['Только потому что… ладно.', 'Раз уж позвонил — держи. Больше не проси сразу.', 'Перевёл. Не злоупотребляй.', 'Ок. Но я запомнил.'],
  friendly: ['Конечно! Сейчас кину.', 'Для тебя — без проблем.', 'Держи, друг.', 'Отправил, не благодари!'],
  greedy: ['Эх… ладно, часть.', 'Только в этот раз.', 'Перевожу. Это не подарок навсегда.', 'Минус с моего счёта. Запомнил.'],
  busy: ['Быстро. Перевёл.', 'Ок, и отстань на сегодня.', 'Готово. Я занят.', 'Отправил.'],
  loyal: ['Своим помогаю. Готово.', 'Держи. Окупишь добром.', 'Перевод сделал.', 'На связи, если что.'],
  nervous: ['Л-ладно… отправил.', 'Только никому не говори.', 'Надеюсь, это безопасно…', 'Перевёл. Всё?'],
  blunt: ['Перевёл.', 'Деньги ушли.', 'Всё.', 'Ок.'],
  polite: ['Разумеется, перевожу.', 'Пожалуйста, сумма отправлена.', 'Надеюсь, это поможет.', 'С удовольствием помогу.'],
  cynical: ['На, подавись. Шучу — перевёл.', 'Классика. Ок, кинул.', 'Мир долгов. Готово.', 'Не удивляйся, если больше не отвечу сразу.']
};

const ASK_MONEY_NO = {
  calm: ['Сейчас не смогу.', 'Не в этот раз.', 'Позже, может быть.', 'Откажусь.'],
  suspicious: ['Нет. Слишком подозрительно.', 'Не верю.', 'Деньги не раздаю незнакомцам.', 'Отказано.'],
  friendly: ['Прости, сейчас туго.', 'Очень хотел бы, но не выходит.', 'Давай в другой раз?', 'Сейчас реально пусто.'],
  greedy: ['Нет. Сам крутись.', 'Бесплатный сыр — только в мышеловке.', 'Не дождёшься.', 'Мой ответ — нет.'],
  busy: ['Некогда и нет.', 'Потом. Не сейчас.', 'Занят — и без денег на это.', 'Нет.'],
  loyal: ['Сейчас не потяну, извини.', 'Своим должен больше. Не могу.', 'Не в этот момент.', 'Отказ, но без зла.'],
  nervous: ['Я… не могу. Страшно.', 'Вдруг отследят перевод?', 'Нет, нет.', 'Давай без денег, ок?'],
  blunt: ['Нет.', 'Не дам.', 'Отказ.', 'Нет средств.'],
  polite: ['К сожалению, вынужден отказать.', 'Прошу прощения, не могу.', 'Сейчас это невозможно.', 'Боюсь, придётся отказать.'],
  cynical: ['Ха. Нет.', 'Мило пытался. Нет.', 'Деньги не растут из жалости.', 'Отказ. Сюрприз.']
};

const ASK_TOO_MUCH = {
  calm: ['Слишком много за раз.', 'Такой суммы нет.', 'Меньше, пожалуйста.'],
  suspicious: ['Сотня тысяч? Ты серьёзно?', 'Это развод.', 'Нет. И не звони с таким.'],
  friendly: ['Ого, это больше, чем есть.', 'Я бы рад, но столько нет.', 'Давай поскромнее?'],
  greedy: ['Мечтать не вредно.', 'Нет. И точка.', 'Сам бы такую сумму не отдал.'],
  busy: ['Нет столько. Коротко.', 'Нереально.', 'Меньше или ничего.'],
  loyal: ['Столько не вытяну даже для своих.', 'Превышает возможности.', 'Не могу такую сумму.'],
  nervous: ['Это… огромно. Нет.', 'Я в панике от цифры.', 'Не могу.'],
  blunt: ['Много. Нет.', 'Нет суммы.', 'Меньше.'],
  polite: ['К сожалению, такой суммы у меня нет.', 'Прошу уменьшить запрос.', 'Это выше моих возможностей.'],
  cynical: ['Ты прикалываешься?', 'Нет. Абсолютно.', 'Жадность — не порок, пока не твоя.']
};

const BLOCKED = {
  calm: ['Хватит звонить по деньгам.', 'Разговор окончен.', 'Не беспокой больше.'],
  suspicious: ['Всё, блок.', 'Ты выжал лимит. Пока.', 'Конец связи.'],
  friendly: ['Друг, хватит. Правда.', 'Мне уже неудобно. Давай без денег.', 'Всё, стоп.'],
  greedy: ['Хватит доить.', 'Ты исчерпал кредит доверия.', 'Отвали.'],
  busy: ['Всё. Не звони.', 'Лимит. Конец.', 'Занят навсегда для этого.'],
  loyal: ['Даже своим так не надо. Хватит.', 'Остановись.', 'Конец темы.'],
  nervous: ['Прошу, больше не звони…', 'Я отключаюсь.', 'Страшно. Пока.'],
  blunt: ['Хватит.', 'Блок.', 'Конец.'],
  polite: ['Прошу больше не обращаться с такими просьбами.', 'Вынужден прекратить разговор.', 'Всего доброго.'],
  cynical: ['Цирк закрыт.', 'Ты предсказуем. Пока.', 'Конец аттракциона.']
};

const UNKNOWN = {
  calm: ['Не понял.', 'Повтори иначе.', 'Что именно?'],
  suspicious: ['Говори яснее.', 'Не понял — и не уверен, что хочу.', 'Что за набор слов?'],
  friendly: ['Не уловил, повтори?', 'Ещё раз, пожалуйста.', 'Уточни?'],
  greedy: ['К делу.', 'Не трать время.', 'Конкретнее.'],
  busy: ['Короче.', 'Не ясно.', 'Быстрее к сути.'],
  loyal: ['Поясни.', 'Не понял запрос.', 'Скажи прямо.'],
  nervous: ['А? Не расслышал…', 'Повтори, пожалуйста…', 'Я запутался.'],
  blunt: ['Что?', 'Неясно.', 'Ещё раз.'],
  polite: ['Прошу уточнить.', 'Не совсем понял вашу мысль.', 'Могли бы повторить?'],
  cynical: ['Блеск. Ничего не ясно.', 'Ещё раз, гений.', 'Ну и речь.']
};

const BYE = {
  calm: ['Пока.', 'До связи.', 'Ок, отбой.'],
  suspicious: ['Всё. Кладу трубку.', 'Хватит.', 'Пока.'],
  friendly: ['Пока! Звони ещё.', 'Береги себя!', 'До скорого!'],
  greedy: ['Пока. Счёт закрыт.', 'Отбой.', 'Всё.'],
  busy: ['Пока, я занят.', 'Отбой.', 'Всё.'],
  loyal: ['На связи.', 'До связи, свой.', 'Пока.'],
  nervous: ['Пока…', 'Я отключаюсь.', 'До свидания…'],
  blunt: ['Пока.', 'Всё.', 'Отбой.'],
  polite: ['До свидания.', 'Всего доброго.', 'Был рад поговорить.'],
  cynical: ['Ну бывай.', 'Отбой, цирк.', 'Пока.']
};


const WORK_TALK = {
  calm: ['На работе тихо.', 'Смена как смена.', 'Отчёты, звонки — обычное.'],
  suspicious: ['Про работу не болтаю.', 'Зачем тебе моя работа?', 'Осторожнее с вопросами.'],
  friendly: ['Работаю в своём темпе.', 'Коллеги нормальные.', 'Иногда завал, но ок.'],
  greedy: ['Лишь бы премия была.', 'Считают каждый кредит.', 'Работаю, пока платят.'],
  busy: ['Завал. Не до разговоров.', 'Дедлайн.', 'Потом расскажу.'],
  loyal: ['Команда держится.', 'Своих не сдаём.', 'Работаем.'],
  nervous: ['Начальство нервирует…', 'Кажется, проверки будут.', 'Тише про работу.'],
  blunt: ['Работаю.', 'Обычная смена.', 'Норм.'],
  polite: ['Всё по регламенту.', 'Работа идёт своим чередом.', 'Благодарю за интерес.'],
  cynical: ['Офисный цирк.', 'Как всегда — имитация бурной деятельности.', 'Работаем на галочку.']
};

const MOOD_SHIFT = {
  positive: 4,
  negative: -6,
  money_ok: 3,
  money_no: -4,
  blocked: -15
};

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(seed, arr) {
  if (!arr || !arr.length) return '…';
  return arr[hash32(String(seed)) % arr.length];
}

function traitOf(npc) {
  return npc?.trait && GREET[npc.trait] ? npc.trait : 'calm';
}

export function getTrust(state, npcId) {
  if (!state.npcWorld) return 40;
  const v = state.npcWorld.trust[`${npcId}:player`];
  return typeof v === 'number' ? v : 40;
}

export function setTrust(state, npcId, value) {
  if (!state.npcWorld) return;
  state.npcWorld.trust[`${npcId}:player`] = Math.max(0, Math.min(100, Math.round(value)));
  return state.npcWorld.trust[`${npcId}:player`];
}

export function getMood(npc, state) {
  const base = typeof npc.mood === 'number' ? npc.mood : 50;
  const inst = state?.npcWorld?.instances?.[npc.id];
  if (inst && typeof inst.mood === 'number') return inst.mood;
  return base;
}

export function adjustMood(state, npcId, delta) {
  if (!state.npcWorld.instances[npcId]) state.npcWorld.instances[npcId] = { id: npcId };
  const cur = state.npcWorld.instances[npcId].mood ?? 50;
  state.npcWorld.instances[npcId].mood = Math.max(0, Math.min(100, cur + delta));
  return state.npcWorld.instances[npcId].mood;
}

export function ensureCallLog(state, npcId) {
  if (!state.npcWorld.callLogs[npcId]) state.npcWorld.callLogs[npcId] = [];
  return state.npcWorld.callLogs[npcId];
}

function pushLog(state, npcId, role, text) {
  const log = ensureCallLog(state, npcId);
  log.push({ role, text, at: Date.now() });
  state.npcWorld.callLogs[npcId] = log.slice(-40);
}

/**
 * Player says free text or intent during a call.
 * intents: greet | smalltalk | ask_money | bye | unknown
 */
export function npcReply(state, npc, playerText, intent = null, extra = {}) {
  const trait = traitOf(npc);
  const trust = getTrust(state, npc.id);
  const mood = getMood(npc, state);
  const seed = `${npc.id}:${Date.now()}:${playerText || intent}`;
  const text = String(playerText || '').toLowerCase().trim();

  // detect intent if not provided
  let kind = intent;
  if (!kind) {
    if (!text || /^(привет|здрав|алло|хай|хей|hi|hello)/.test(text)) kind = 'greet';
    else if (/пока|отбой|bye|конец|всё/.test(text)) kind = 'bye';
    else if (/деньг|перевод|скинь|дай|cr|кредит|сумм|рубл|бабл|ask|money/.test(text)) kind = 'ask_money';
    else if (/работа|смен|коллег|офис/.test(text)) kind = 'work';
    else if (/как дела|что нового|погод|small/.test(text)) kind = 'smalltalk';
    else kind = 'unknown';
  }

  // blocked contact
  const att = state.npcWorld.transferAttempts?.[npc.id];
  if (att?.success >= 2 && kind === 'ask_money') {
    const line = pick(seed, BLOCKED[trait]);
    pushLog(state, npc.id, 'npc', line);
    adjustMood(state, npc.id, MOOD_SHIFT.blocked);
    setTrust(state, npc.id, trust - 10);
    return { text: line, kind: 'blocked', trust: getTrust(state, npc.id), mood: getMood(npc, state), blocked: true };
  }

  if (kind === 'greet') {
    let line = pick(seed, GREET[trait]);
    if (trust >= 70) line += ' Рад, что ты на связи.';
    else if (trust <= 25) line = pick(seed + 's', ['…Ну?', 'Чего тебе.', pick(seed, GREET.suspicious)]);
    if (mood < 30) line += ' Настроение так себе.';
    pushLog(state, npc.id, 'npc', line);
    return { text: line, kind, trust, mood };
  }

  if (kind === 'work') {
    const line = pick(seed, WORK_TALK[trait] || WORK_TALK.calm);
    pushLog(state, npc.id, 'npc', line);
    return { text: line, kind, trust, mood };
  }

  if (kind === 'smalltalk') {
    let line = pick(seed, SMALLTALK[trait]);
    if (mood > 70) line = pick(seed, ['Сегодня лучше обычного.', line]);
    if (mood < 30) line = pick(seed, ['Не лучший день.', line]);
    pushLog(state, npc.id, 'npc', line);
    adjustMood(state, npc.id, 1);
    return { text: line, kind, trust: getTrust(state, npc.id), mood: getMood(npc, state) };
  }

  if (kind === 'bye') {
    const line = pick(seed, BYE[trait]);
    pushLog(state, npc.id, 'npc', line);
    return { text: line, kind, trust, mood, hangup: true };
  }

  if (kind === 'ask_money') {
    // handled by requestNpcTransfer caller — here only flavor if called directly
    const amount = Number(extra.amount) || 0;
    if (amount > 1000) {
      const line = pick(seed, ASK_TOO_MUCH[trait]);
      pushLog(state, npc.id, 'npc', line);
      return { text: line, kind: 'ask_too_much', trust, mood };
    }
    const line = pick(seed, ASK_MONEY_NO[trait]);
    pushLog(state, npc.id, 'npc', line);
    return { text: line, kind: 'ask_no', trust, mood };
  }

  const line = pick(seed, UNKNOWN[trait]);
  pushLog(state, npc.id, 'npc', line);
  return { text: line, kind: 'unknown', trust, mood };
}

/** Flavor line after successful/failed transfer */
export function moneyDialogue(state, npc, result) {
  const trait = traitOf(npc);
  const seed = `${npc.id}:money:${result.ok}:${result.successCount || 0}:${Date.now()}`;
  let line;
  if (result.blocked) line = pick(seed, BLOCKED[trait]);
  else if (result.ok) {
    line = pick(seed, ASK_MONEY_OK[trait]);
    if (result.successCount >= 2) line += ' Это последний раз.';
    adjustMood(state, npc.id, MOOD_SHIFT.money_ok);
  } else if (/максимум|1000|много/i.test(result.reason || '')) {
    line = pick(seed, ASK_TOO_MUCH[trait]);
  } else if (/нет такой|нет столько|средств/i.test(result.reason || '')) {
    line = pick(seed, ['У меня столько нет.', 'Пусто на счету.', pick(seed, ASK_TOO_MUCH[trait])]);
  } else {
    line = pick(seed, ASK_MONEY_NO[trait]);
    adjustMood(state, npc.id, MOOD_SHIFT.money_no);
    setTrust(state, npc.id, getTrust(state, npc.id) - 3);
  }
  pushLog(state, npc.id, 'npc', line);
  return line;
}

export function openingLine(state, npc) {
  const r = npcReply(state, npc, '', 'greet');
  return r.text;
}

export function dialogueStats(state, npcId) {
  return {
    trust: getTrust(state, npcId),
    log: (state.npcWorld?.callLogs?.[npcId] || []).slice(-12),
    attempts: state.npcWorld?.transferAttempts?.[npcId] || { success: 0, asks: 0 }
  };
}
