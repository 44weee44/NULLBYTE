/**
 * NULLBYTE dialogue — large template banks + per-NPC quirks (seeded, compact).
 * ~2000 NPCs get unique speech flavor without storing 2000 full scripts.
 */

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
  if (!arr || !arr.length) return '…';
  return arr[hash32(String(seed)) % arr.length];
}
function pickN(seed, arr, n) {
  const out = [];
  let h = hash32(String(seed));
  for (let i = 0; i < n && arr.length; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    out.push(arr[h % arr.length]);
  }
  return out;
}

const TRAITS = ['calm','suspicious','friendly','greedy','busy','loyal','nervous','blunt','polite','cynical'];

/** Speech particles / fillers unique per quirk */
const PARTICLES = {
  calm: ['ну', 'ладно', 'в общем'],
  suspicious: ['хм', 'так-так', 'интересно'],
  friendly: ['ха', 'слушай', 'э'],
  greedy: ['хе', 'считай', 'короче'],
  busy: ['быстро', 'да-да', 'ну'],
  loyal: ['брат', 'смотри', 'ясно'],
  nervous: ['эм', 'это', 'как бы'],
  blunt: ['...', 'факт', 'всё'],
  polite: ['пожалуйста', 'извините', 'благодарю'],
  cynical: ['ага', 'ну да', 'конечно']
};

const GREET = {
  calm: [
    'Алло.', 'Слушаю.', 'Да?', 'Ну привет.', 'На связи.', 'Говори.', 'Я тут.',
    'Слушаю внимательно.', 'Да, я.', 'Ну?', 'Привет.', 'На месте.'
  ],
  suspicious: [
    'Кто это?', 'Чего надо?', 'Незнакомый номер…', 'Говори быстро.', 'Откуда номер?',
    'Я тебя знаю?', 'Что за звонок?', 'Имя назови.', 'Подозрительно.', 'Ну?', 'Слушаю. Пока.'
  ],
  friendly: [
    'Привет! Рад слышать.', 'О, привет!', 'Здорово, как дела?', 'Хей, слушаю!',
    'Йо!', 'Давно не слышались!', 'Привет-привет!', 'На связи, дружище.', 'Ха, это ты?',
    'Слушаю с улыбкой.', 'Давай, рассказывай!'
  ],
  greedy: [
    'Если не про деньги — короче.', 'Время — деньги. Что?', 'Ну?', 'Слушаю, но недолго.',
    'Надеюсь, это выгодно.', 'Говори по делу.', 'Счётчик тикает.', 'Да?', 'Что по цифрам?',
    'Если про бабло — я тут.'
  ],
  busy: [
    'Коротко, я занят.', 'Минута есть, говори.', 'Быстрее.', 'Да, чего?',
    'Занят. Суть.', 'Две минуты.', 'Не отвлекай зря.', 'Слушаю параллельно.',
    'Говори, и отстань.', 'В работе. Что?'
  ],
  loyal: [
    'Слушаю тебя.', 'Если это важно — говори.', 'Я на связи.', 'Да, я тут.',
    'Для своих — всегда.', 'Говори, раз звонишь.', 'На месте.', 'Слушаю, брат.',
    'Если свои — ок.', 'Давай.'
  ],
  nervous: [
    'А… алло?', 'Это… кто?', 'Ой, привет…', 'Слушаю, только тихо.',
    'Номер странный…', 'Я… слушаю.', 'Не пугай.', 'Алло? Ты ещё тут?',
    'Говори, пока не сбросил.', 'Эм, да?'
  ],
  blunt: [
    'Чего.', 'Говори.', 'Ну.', 'Слушаю.', 'Да.', 'И?', 'Факт?', 'К делу.',
    'Слушаю. Точка.', 'Ну давай.'
  ],
  polite: [
    'Добрый день, слушаю вас.', 'Здравствуйте.', 'Рад вашему звонку.', 'Чем могу помочь?',
    'Добрый вечер.', 'Слушаю вас внимательно.', 'Пожалуйста, говорите.',
    'Приятно слышать.', 'Я к вашим услугам.', 'Здравствуйте, я на месте.'
  ],
  cynical: [
    'Опять кто-то хочет чего-то.', 'Ну давай, удиви.', 'Слушаю. Не обещаю.', 'Ха. Ну?',
    'Цирк начинается.', 'Ещё один звонок. Класс.', 'Ну?', 'Говори, раз уж набрал.',
    'Ожидаю разочарование.', 'Слушаю из вежливости.'
  ]
};

const SMALLTALK = {
  calm: [
    'Нормально всё.', 'Работаю, как обычно.', 'Тихий день.', 'Без новостей.',
    'Стабильно.', 'Всё ровно.', 'Ничего особенного.', 'День как день.',
    'Спокойно пока.', 'Живу.', 'Всё под контролем.', 'Без сюрпризов — и ладно.'
  ],
  suspicious: [
    'Не люблю болтать.', 'Зачем тебе это?', 'Личное.', 'Не твоё дело.',
    'Вопросы вопросы…', 'С чего такой интерес?', 'Хм.', 'Осторожнее.',
    'Я бы на твоём месте молчал.', 'Информацию не раздаю.', 'Пусто.', 'Ничего.'
  ],
  friendly: [
    'Да всё супер!', 'Только что с работы.', 'Хотел бы встретиться как-нибудь.',
    'Спасибо, что позвонил.', 'Настроение огонь.', 'Расскажи и ты!',
    'Всё пучком.', 'Живой, здоровый.', 'День удался.', 'Рад болтать.',
    'Норм, а у тебя?', 'Без негатива.'
  ],
  greedy: [
    'Лишь бы платили вовремя.', 'Курсы скачут, нервы.', 'Думаю, где выгоднее.',
    'Деньги не растут на деревьях.', 'Считаю расходы.', 'Каждая копейка на счету.',
    'Рынок нервный.', 'Ищу маржу.', 'Без прибыли — день зря.', 'Считаем.'
  ],
  busy: [
    'Очередь задач.', 'Не отвлекай без дела.', 'Потом продолжим.', 'Сейчас не до разговоров.',
    'Дедлайн.', 'Завал.', 'Митинг за митингом.', 'Руки заняты.', 'Позже.', 'Нет времени.'
  ],
  loyal: [
    'Держусь своих.', 'Команда на месте.', 'Можно на меня рассчитывать.', 'Свои не бросаем.',
    'Всё по-честному.', 'Мы держимся.', 'Порядок.', 'Связка крепкая.', 'Как договаривались.', 'Ок.'
  ],
  nervous: [
    'Немного трясёт…', 'Кажется, за мной следят? Шутка.', 'Лучше не долго.',
    'Говори тише, ладно?', 'Сердце колотится.', 'Не люблю звонки.', 'Стресс.',
    'Хочу закончить разговор быстрее.', 'Всё… вроде ок.', 'Напряжённо.'
  ],
  blunt: [
    'Ок.', 'Ясно.', 'И что?', 'Дальше.', 'Норм.', 'Живой.', 'Без деталей.', 'Всё.', 'Да.', 'Нет новостей.'
  ],
  polite: [
    'Благодарю за интерес.', 'У меня всё в порядке, спасибо.', 'Приятно поговорить.',
    'Надеюсь, у вас тоже всё хорошо.', 'День проходит спокойно.', 'Спасибо, что спросили.',
    'Всё благополучно.', 'Работаю в обычном режиме.', 'Без жалоб.', 'Благодарю.'
  ],
  cynical: [
    'Как всегда — цирк.', 'Мир не меняется.', 'Ожидаемо плохо.', 'Не обольщайся.',
    'Серо и предсказуемо.', 'Ещё один прекрасный день в клетке.', 'Ха.',
    'Всё по плану — чужому.', 'Скучно.', 'Классика жанра.'
  ]
};

const WORK = {
  calm: ['На работе тихо.', 'Смена как смена.', 'Отчёты, звонки — обычное.', 'Рутина.', 'Без авралов.'],
  suspicious: ['Про работу не болтаю.', 'Зачем тебе моя работа?', 'Осторожнее с вопросами.', 'Служебно.', 'Молчу.'],
  friendly: ['Работаю в своём темпе.', 'Коллеги нормальные.', 'Иногда завал, но ок.', 'Люблю процесс.', 'Не жалуюсь.'],
  greedy: ['Лишь бы премия была.', 'Считают каждый кредит.', 'Работаю, пока платят.', 'Бонусы решают.', 'Ставка важна.'],
  busy: ['Завал. Не до разговоров.', 'Дедлайн.', 'Потом расскажу.', 'Очередь тикетов.', 'Горит.'],
  loyal: ['Команда держится.', 'Своих не сдаём.', 'Работаем.', 'Плечом к плечу.', 'Как договорились.'],
  nervous: ['Начальство нервирует…', 'Кажется, проверки будут.', 'Тише про работу.', 'Страшно облажаться.', 'Стресс на смене.'],
  blunt: ['Работаю.', 'Обычная смена.', 'Норм.', 'Труд.', 'Факт.'],
  polite: ['Всё по регламенту.', 'Работа идёт своим чередом.', 'Благодарю за интерес.', 'Исполняю обязанности.', 'Всё штатно.'],
  cynical: ['Офисный цирк.', 'Имитация бурной деятельности.', 'Работаем на галочку.', 'Бюрократия жива.', 'Как всегда.']
};

const ASK_OK = {
  calm: ['Хорошо. Переведу.', 'Ладно, отправил.', 'Могу помочь этой суммой.', 'Сделано.', 'Ок, перевод ушёл.', 'Поддержал.'],
  suspicious: ['Только потому что… ладно.', 'Перевёл. Не злоупотребляй.', 'Ок. Но я запомнил.', 'Раз уж позвонил — держи.', 'На этот раз.'],
  friendly: ['Конечно! Сейчас кину.', 'Для тебя — без проблем.', 'Держи, друг.', 'Отправил, не благодари!', 'Легко!', 'Помог с радостью.'],
  greedy: ['Эх… ладно, часть.', 'Только в этот раз.', 'Перевожу. Это не подарок навсегда.', 'Минус с моего счёта.', 'Дорогое решение.'],
  busy: ['Быстро. Перевёл.', 'Ок, и отстань на сегодня.', 'Готово. Я занят.', 'Отправил.', 'И всё, я работаю.'],
  loyal: ['Своим помогаю. Готово.', 'Держи. Окупишь добром.', 'Перевод сделал.', 'На связи, если что.', 'Для своих — да.'],
  nervous: ['Л-ладно… отправил.', 'Только никому не говори.', 'Надеюсь, это безопасно…', 'Перевёл. Всё?', 'Руки трясутся, но ок.'],
  blunt: ['Перевёл.', 'Деньги ушли.', 'Всё.', 'Ок.', 'Готово.'],
  polite: ['Разумеется, перевожу.', 'Пожалуйста, сумма отправлена.', 'Надеюсь, это поможет.', 'С удовольствием помогу.', 'Готово, обращайтесь.'],
  cynical: ['На, подавись. Шучу — перевёл.', 'Классика. Ок, кинул.', 'Мир долгов. Готово.', 'Не удивляйся, если больше не отвечу сразу.', 'Благотворительность года.']
};

const ASK_NO = {
  calm: ['Сейчас не смогу.', 'Не в этот раз.', 'Позже, может быть.', 'Откажусь.', 'Нет возможности.'],
  suspicious: ['Нет. Слишком подозрительно.', 'Не верю.', 'Деньги не раздаю незнакомцам.', 'Отказано.', 'Нет и нет.'],
  friendly: ['Прости, сейчас туго.', 'Очень хотел бы, но не выходит.', 'Давай в другой раз?', 'Сейчас реально пусто.', 'Извини, друг.'],
  greedy: ['Нет. Сам крутись.', 'Бесплатный сыр — только в мышеловке.', 'Не дождёшься.', 'Мой ответ — нет.', 'Деньги мои.'],
  busy: ['Некогда и нет.', 'Потом. Не сейчас.', 'Занят — и без денег на это.', 'Нет.', 'Отстань с этим.'],
  loyal: ['Сейчас не потяну, извини.', 'Своим должен больше. Не могу.', 'Не в этот момент.', 'Отказ, но без зла.', 'Позже, может.'],
  nervous: ['Я… не могу. Страшно.', 'Вдруг отследят перевод?', 'Нет, нет.', 'Давай без денег, ок?', 'Паника. Нет.'],
  blunt: ['Нет.', 'Не дам.', 'Отказ.', 'Нет средств.', 'Не.'],
  polite: ['К сожалению, вынужден отказать.', 'Прошу прощения, не могу.', 'Сейчас это невозможно.', 'Боюсь, придётся отказать.', 'Извините.'],
  cynical: ['Ха. Нет.', 'Мило пытался. Нет.', 'Деньги не растут из жалости.', 'Отказ. Сюрприз.', 'Нет. Точка.']
};

const ASK_MUCH = {
  calm: ['Слишком много за раз.', 'Такой суммы нет.', 'Меньше, пожалуйста.', 'Это выше лимита.'],
  suspicious: ['Ты серьёзно?', 'Это развод.', 'Нет. И не звони с таким.', 'Подозрительная сумма.'],
  friendly: ['Ого, это больше, чем есть.', 'Я бы рад, но столько нет.', 'Давай поскромнее?', 'Слишком жирно.'],
  greedy: ['Мечтать не вредно.', 'Нет. И точка.', 'Сам бы такую сумму не отдал.', 'Ха.'],
  busy: ['Нет столько. Коротко.', 'Нереально.', 'Меньше или ничего.', 'Быстро: нет.'],
  loyal: ['Столько не вытяну даже для своих.', 'Превышает возможности.', 'Не могу такую сумму.', 'Жесть.'],
  nervous: ['Это… огромно. Нет.', 'Я в панике от цифры.', 'Не могу.', 'Страшно даже думать.'],
  blunt: ['Много. Нет.', 'Нет суммы.', 'Меньше.', 'Нет.'],
  polite: ['К сожалению, такой суммы у меня нет.', 'Прошу уменьшить запрос.', 'Это выше моих возможностей.', 'Извините.'],
  cynical: ['Ты прикалываешься?', 'Нет. Абсолютно.', 'Жадность — не порок, пока не твоя.', 'Комедия.']
};

const BLOCKED = {
  calm: ['Хватит звонить по деньгам.', 'Разговор окончен.', 'Не беспокой больше.', 'Лимит.'],
  suspicious: ['Всё, блок.', 'Ты выжал лимит. Пока.', 'Конец связи.', 'Хватит.'],
  friendly: ['Друг, хватит. Правда.', 'Мне уже неудобно. Давай без денег.', 'Всё, стоп.', 'Пожалей.'],
  greedy: ['Хватит доить.', 'Ты исчерпал кредит доверия.', 'Отвали.', 'Касса закрыта.'],
  busy: ['Всё. Не звони.', 'Лимит. Конец.', 'Занят навсегда для этого.', 'Отбой.'],
  loyal: ['Даже своим так не надо. Хватит.', 'Остановись.', 'Конец темы.', 'Стоп.'],
  nervous: ['Прошу, больше не звони…', 'Я отключаюсь.', 'Страшно. Пока.', 'Хватит, пожалуйста…'],
  blunt: ['Хватит.', 'Блок.', 'Конец.', 'Всё.'],
  polite: ['Прошу больше не обращаться с такими просьбами.', 'Вынужден прекратить разговор.', 'Всего доброго.', 'Прощайте.'],
  cynical: ['Цирк закрыт.', 'Ты предсказуем. Пока.', 'Конец аттракциона.', 'Трубку кладу.']
};

const UNKNOWN = {
  calm: ['Не понял.', 'Повтори иначе.', 'Что именно?', 'Уточни.'],
  suspicious: ['Говори яснее.', 'Не понял — и не уверен, что хочу.', 'Что за набор слов?', 'Подозрительная каша.'],
  friendly: ['Не уловил, повтори?', 'Ещё раз, пожалуйста.', 'Уточни?', 'Сорри, не въехал.'],
  greedy: ['К делу.', 'Не трать время.', 'Конкретнее.', 'Цифры, факты.'],
  busy: ['Короче.', 'Не ясно.', 'Быстрее к сути.', 'Сжать мысль.'],
  loyal: ['Поясни.', 'Не понял запрос.', 'Скажи прямо.', 'Без намёков.'],
  nervous: ['А? Не расслышал…', 'Повтори, пожалуйста…', 'Я запутался.', 'Слишком быстро…'],
  blunt: ['Что?', 'Неясно.', 'Ещё раз.', 'К чему?'],
  polite: ['Прошу уточнить.', 'Не совсем понял вашу мысль.', 'Могли бы повторить?', 'Извините, уточните.'],
  cynical: ['Блеск. Ничего не ясно.', 'Ещё раз, гений.', 'Ну и речь.', 'Шедевр невнятности.']
};

const BYE = {
  calm: ['Пока.', 'До связи.', 'Ок, отбой.', 'Договорились.'],
  suspicious: ['Всё. Кладу трубку.', 'Хватит.', 'Пока.', 'Отбой.'],
  friendly: ['Пока! Звони ещё.', 'Береги себя!', 'До скорого!', 'Бай!'],
  greedy: ['Пока. Счёт закрыт.', 'Отбой.', 'Всё.', 'До оплаты.'],
  busy: ['Пока, я занят.', 'Отбой.', 'Всё.', 'Работать.'],
  loyal: ['На связи.', 'До связи, свой.', 'Пока.', 'Держись.'],
  nervous: ['Пока…', 'Я отключаюсь.', 'До свидания…', 'Сбрасываю…'],
  blunt: ['Пока.', 'Всё.', 'Отбой.', 'Да.'],
  polite: ['До свидания.', 'Всего доброго.', 'Был рад поговорить.', 'Хорошего дня.'],
  cynical: ['Ну бывай.', 'Отбой, цирк.', 'Пока.', 'Занавес.']
};

const RUMOR = {
  calm: ['Слухи — шум.', 'Не слушаю сплетни.', 'Говорят разное.', 'Без комментариев.'],
  suspicious: ['Кто тебе сказал?', 'Слухи сливают намеренно.', 'Не верь всему.', 'Откуда инфа?'],
  friendly: ['Слышал кое-что, но не уверен.', 'На районе шумят.', 'Могу рассказать потом.', 'Интересные новости.'],
  greedy: ['Слухи не платят.', 'Инфа стоит денег.', 'Без прайса — молчу.', 'Плати — узнаешь.'],
  busy: ['Не до слухов.', 'Потом.', 'Нет времени на сплетни.', 'Занят.'],
  loyal: ['Своих не обсуждаю.', 'Молчу, если надо.', 'Слухи вредят команде.', 'Тихо.'],
  nervous: ['Слухи меня пугают…', 'Лучше не говорить.', 'Вдруг услышат?', 'Шшш.'],
  blunt: ['Слухи. И что?', 'Мне всё равно.', 'Факты, не слухи.', 'Дальше.'],
  polite: ['Предпочитаю не распространять слухи.', 'Не располагаю достоверной информацией.', 'Извините.', 'Без сплетен.'],
  cynical: ['Слухи — валюта идиотов.', 'Все врут.', 'Шум.', 'Классика.']
};

/**
 * Compact per-NPC quirk derived from id (no heavy storage).
 */
export function npcQuirk(npcId, trait) {
  const h = hash32(String(npcId));
  const formality = h % 3; // 0 casual, 1 neutral, 2 formal-leaning
  const verbosity = h % 3; // 0 short, 1 normal, 2 longer
  const playerNick = pick(h + 'nick', ['оператор', 'друг', 'знакомый', 'абонент', 'ты', 'босс', 'коллега']);
  const particle = pick(h + 'p', PARTICLES[trait] || PARTICLES.calm);
  const catchphrase = pick(h + 'c', [
    '', '', '', // often empty
    ` ${particle}.`,
    formality === 2 ? ' Если позволите.' : '',
    verbosity === 0 ? '' : '',
  ]);
  return { formality, verbosity, playerNick, particle, seed: h };
}

function traitOf(npc) {
  return npc?.trait && GREET[npc.trait] ? npc.trait : 'calm';
}

function flavor(line, npc, quirk, seed) {
  let t = line;
  const { formality, verbosity, playerNick, particle } = quirk;
  if (verbosity === 2 && hash32(seed + 'v') % 3 === 0) {
    t = t.replace(/\.$/, '') + (formality === 2 ? ', если вас это интересует.' : `, ${playerNick}.`);
  } else if (verbosity === 0 && t.length > 28) {
    t = t.split(/[.!?]/)[0] + '.';
  }
  if (hash32(seed + 'p') % 5 === 0 && particle) {
    t = `${particle.charAt(0).toUpperCase() + particle.slice(1)}, ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  }
  if (formality === 0 && hash32(seed + 'f') % 4 === 0) {
    t = t.replace('Здравствуйте', 'Привет').replace('Добрый день', 'Йо');
  }
  return t;
}

export function getTrust(state, npcId) {
  if (!state.npcWorld) return 40;
  const v = state.npcWorld.trust[`${npcId}:player`];
  return typeof v === 'number' ? v : 40;
}

export function setTrust(state, npcId, value) {
  if (!state.npcWorld) return 40;
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
  state.npcWorld.callLogs[npcId] = log.slice(-50);
}

export function npcReply(state, npc, playerText, intent = null, extra = {}) {
  const trait = traitOf(npc);
  const trust = getTrust(state, npc.id);
  const mood = getMood(npc, state);
  const quirk = npcQuirk(npc.id, trait);
  const seed = `${npc.id}:${Date.now()}:${playerText || intent}:${mood}`;
  const text = String(playerText || '').toLowerCase().trim();

  let kind = intent;
  if (!kind) {
    if (!text || /^(привет|здрав|алло|хай|хей|hi|hello|йо)/.test(text)) kind = 'greet';
    else if (/пока|отбой|bye|конец|всё$|все$/.test(text)) kind = 'bye';
    else if (/деньг|перевод|скинь|дай|cr|кредит|сумм|рубл|бабл|ask|money|кинь/.test(text)) kind = 'ask_money';
    else if (/работа|смен|коллег|офис|работ/.test(text)) kind = 'work';
    else if (/слух|новост|район|город|что слышно/.test(text)) kind = 'rumor';
    else if (/как дела|что нового|погод|small|настроен/.test(text)) kind = 'smalltalk';
    else kind = 'unknown';
  }

  const att = state.npcWorld.transferAttempts?.[npc.id];
  if (att?.success >= 2 && kind === 'ask_money') {
    const line = flavor(pick(seed, BLOCKED[trait]), npc, quirk, seed);
    pushLog(state, npc.id, 'npc', line);
    adjustMood(state, npc.id, -12);
    setTrust(state, npc.id, trust - 10);
    return { text: line, kind: 'blocked', trust: getTrust(state, npc.id), mood: getMood(npc, state), blocked: true };
  }

  const bank = {
    greet: GREET,
    smalltalk: SMALLTALK,
    work: WORK,
    rumor: RUMOR,
    ask_money: ASK_NO,
    bye: BYE,
    unknown: UNKNOWN
  }[kind] || UNKNOWN;

  let line = pick(seed, bank[trait] || bank.calm || UNKNOWN.calm);

  // trust / mood modifiers
  if (kind === 'greet') {
    if (trust >= 75) line = pick(seed + 'hi', [line, `О, ${quirk.playerNick}. ${line}`, `Снова ты. ${line}`]);
    else if (trust <= 20) line = pick(seed + 'lo', [line, pick(seed, GREET.suspicious), '…Ну?']);
    if (mood < 25) line += ' Настроение никуда.';
    else if (mood > 80 && trait === 'friendly') line += ' День хороший!';
  }

  if (kind === 'ask_money' && extra.amount > 1000) {
    line = pick(seed, ASK_MUCH[trait]);
    kind = 'ask_too_much';
  }

  line = flavor(line, npc, quirk, seed);
  pushLog(state, npc.id, 'npc', line);

  if (kind === 'bye') return { text: line, kind, trust, mood, hangup: true };
  if (kind === 'smalltalk' || kind === 'work') adjustMood(state, npc.id, 1);

  return { text: line, kind, trust: getTrust(state, npc.id), mood: getMood(npc, state) };
}

export function moneyDialogue(state, npc, result) {
  const trait = traitOf(npc);
  const quirk = npcQuirk(npc.id, trait);
  const seed = `${npc.id}:money:${result.ok}:${result.successCount || 0}:${Date.now()}`;
  let line;
  if (result.blocked) line = pick(seed, BLOCKED[trait]);
  else if (result.ok) {
    line = pick(seed, ASK_OK[trait]);
    if (result.successCount >= 2) line += ' Это последний раз.';
    adjustMood(state, npc.id, 3);
  } else if (/максимум|1000|много/i.test(result.reason || '')) {
    line = pick(seed, ASK_MUCH[trait]);
  } else if (/нет такой|нет столько|средств/i.test(result.reason || '')) {
    line = pick(seed, ['У меня столько нет.', 'Пусто на счету.', pick(seed, ASK_MUCH[trait])]);
  } else {
    line = pick(seed, ASK_NO[trait]);
    adjustMood(state, npc.id, -4);
    setTrust(state, npc.id, getTrust(state, npc.id) - 3);
  }
  line = flavor(line, npc, quirk, seed);
  pushLog(state, npc.id, 'npc', line);
  return line;
}

export function openingLine(state, npc) {
  return npcReply(state, npc, '', 'greet').text;
}

export function dialogueStats(state, npcId) {
  return {
    trust: getTrust(state, npcId),
    log: (state.npcWorld?.callLogs?.[npcId] || []).slice(-12),
    attempts: state.npcWorld?.transferAttempts?.[npcId] || { success: 0, asks: 0 },
    quirk: npcQuirk(npcId, 'calm')
  };
}

/** Approx unique line combinations (documentation helper) */
export function dialogueCoverage() {
  const traits = TRAITS.length;
  const cats = [GREET, SMALLTALK, WORK, ASK_OK, ASK_NO, ASK_MUCH, BLOCKED, UNKNOWN, BYE, RUMOR];
  let lines = 0;
  for (const c of cats) for (const t of TRAITS) lines += (c[t] || []).length;
  return { traits, baseLines: lines, note: 'Per-NPC quirk multiplies variants without storing full scripts' };
}
