/* NULLBYTE game engine. Fictional, deterministic client-side simulation only. */
import { createEmptyIntel, seedIntelFromSites, runWebRecon, migrateIntel, listIntelSummary, ensureIntel, runServerAnalysis, runWeaknessScan, runSimExploit, runUserSearch, runMobileIdentify, runMobileAnalysis, modifyVirtualUser, runDbExport, writeIntelFile, processTemporaryRestores, listActiveTempChanges, applyTemporaryChange, openSession, closeSession } from './cyber.js';
import { createEmptyNpcWorld, migrateNpcWorld, getNpc, touchNpc, bankLogin, getBankSession, expireBankSessions, bankTransfer, requestNpcTransfer, searchNpcs, pluginDocs, NPC_POOL_SIZE, ensureBankAccount, generateNpc, tickNpcCommerce } from './npc.js';
// tickNpcCommerce imported via npc named exports below
import { createEmptyOpsState, migrateOps, processPaymentLinkRestores, buildServerIndex, extractTarget, createArchive, signalMapRegion, grantRegionKey, hijackPaymentLink, recoveryMsForSecurity, REGIONS, MOBILE_PLUGIN_META, extendedPluginDocs } from './operations.js';
import { npcReply, openingLine, moneyDialogue, dialogueStats, getTrust } from './dialogue.js';
import { PHONE_REGIONS, PHONES_PER_REGION, createEmptyPhoneWorld, migratePhoneWorld, generatePhone, listRegionPhones, findPhone, buildNetworkReport, connectNetwork, analyzeNetwork, accessPhone, lockPhone, phoneMessages, phoneContacts, phoneGallery, phoneCallLog, makePhoneId } from './phones.js';
import { createEmptyEvents, migrateEvents, processWorldEvents, listActiveEvents } from './events.js';
export const SAVE_VERSION = 1;
export const PHONE_JOBS = [
  {id:'phone-001',title:'Список контактов',client:'Mira Voss',target:'phone',category:'phone',difficulty:'Лёгкая',minLevel:1,reward:180,xp:40,
    objective:'Подключись к сети региона цели, открой телефон и выгрузи contacts.',
    hint:'net-link → connect <region> → net-analyzer → phone-access open → Phone Lab → Контакты → N-Mail заказчику',
    regionId:'bayshore',ownerHint:'Alex Voss',task:'contacts',requiredPlugins:['net-link','net-analyzer','phone-access']},
  {id:'phone-002',title:'Снимок переписки',client:'Harbor Desk',target:'phone',category:'phone',difficulty:'Лёгкая',minLevel:1,reward:220,xp:50,
    objective:'Сохрани SMS (msgs) целевого телефона в файл и сдай через N-Mail.',
    hint:'Phone Lab → SMS → Сохранить SMS → письмо заказчику',
    regionId:'midtown',ownerHint:'Eli North',task:'msgs',requiredPlugins:['phone-access']},
  {id:'phone-003',title:'Звонок от имени',client:'Null Courier',target:'phone',category:'phone',difficulty:'Средняя',minLevel:1,reward:320,xp:70,
    objective:'Открой указанный телефон в Phone Lab (сессия access).',
    hint:'open PHONE_ID из сети региона → Phone Lab',
    regionId:'ironreach',ownerHint:'Kai Reed',task:'access',requiredPlugins:['phone-access']},
  {id:'phone-004',title:'Галерея для заказа',client:'Green Mart',target:'phone',category:'phone',difficulty:'Средняя',minLevel:1,reward:280,xp:60,
    objective:'Экспортируй gallery телефона в файл.',
    hint:'Phone Lab → Галерея → Сохранить галерею',
    regionId:'southgate',ownerHint:'Nora Shaw',task:'gallery',requiredPlugins:['phone-access']},
  {id:'phone-005',title:'Блокировка на полчаса',client:'Shadowline Ops',target:'phone',category:'phone',difficulty:'Средняя',minLevel:1,reward:350,xp:80,
    objective:'Заблокируй целевой телефон на 30 минут (Lock в Phone Lab).',
    hint:'Phone Lab → Lock 30м',
    regionId:'shadowline',ownerHint:'Dax Kane',task:'lock',requiredPlugins:['phone-access']},
  {id:'phone-006',title:'Номер из Окриджа',client:'Oakridge Watch',target:'phone',category:'phone',difficulty:'Лёгкая',minLevel:1,reward:200,xp:45,
    objective:'Найди телефон в сети oakridge и сохрани contacts.',
    hint:'connect oakridge → scan → open → contacts',
    regionId:'oakridge',ownerHint:'Vera Cole',task:'contacts',requiredPlugins:['net-link','net-analyzer','phone-access']},
  {id:'phone-007',title:'SMS из Мидтауна',client:'Spine Desk',target:'phone',category:'phone',difficulty:'Лёгкая',minLevel:1,reward:210,xp:48,
    objective:'Сними переписку телефона в midtown.',
    hint:'connect midtown → open → сохранить SMS',
    regionId:'midtown',ownerHint:'Sam Hayes',task:'msgs',requiredPlugins:['phone-access']},
];

export const BALANCE = {
  creditsStart: 650,
  maxLevel: 9999,
  xpToLevel: [0, 100, 260, 480, 760, 1100, 1500, 1960, 2480, 3060, 3700],
  verificationDelayMs: 5500,
  siteRecoveryBaseMs: 5 * 60 * 1000,
  bankLockMs: 24 * 60 * 60 * 1000,
  bankUnlockLevel: 8,
  bankReward: 18000,
  bankBaseTraceChance: 0.48,
  balanceDraft: true
};

export const PLUGINS = [
  
  { id:'net-link', name:'Net Link', category:'Mobile Operations', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:40, cooldown:0, description:'Подключение терминала к региональной сети (15с).', effect:'Текущая сеть региона.', starter:true },
  { id:'net-analyzer', name:'Net Analyzer', category:'Mobile Operations', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:80, cooldown:0, description:'Анализ региональной сети (~20с) и полный отчёт PHONE_ID.', effect:'Отчёт 550 устройств/регион.', starter:true },
  { id:'phone-access', name:'Phone Access', category:'Mobile Operations', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:100, cooldown:0, description:'Доступ к телефону по PHONE_ID.', effect:'Сессия исследования телефона.', starter:true },
  { id:'mail-drop', name:'Mail Drop', category:'Mobile Operations', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:60, cooldown:0, description:'Вложение для NPC через N-Mail (альтернативный путь).', effect:'Шанс раскрытия PHONE_ID.', starter:true },
  { id:'sms-bomber', name:'SMS Bomber', category:'Mobile Operations', version:'1.0.0', price:40000, requiredLevel:1, minOs:1, ram:1, storage:40, cooldown:5000, description:'Игровая нагрузка SMS на виртуальный номер.', effect:'Симуляция спама.', starter:false },
  { id:'bank-peek', name:'Bank Peek', category:'Mobile Operations', version:'1.0.0', price:100000, requiredLevel:1, minOs:1, ram:1, storage:80, cooldown:0, description:'Доступ к виртуальным банковским пометкам телефона.', effect:'Игровые bank notes.', starter:false },

  { id:'site-analyzer', name:'Site Analyzer', category:'Анализ сайтов', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:120, cooldown:0, description:'WEB RECON: DNS, fingerprint, surface, артефакты разведки.', effect:'Карта домена и SIGNATURE для pipeline.', starter:true },
  { id:'artifact-decoder', name:'Artifact Decoder', category:'Расшифровка', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:180, cooldown:0, description:'Преобразует условный игровой артефакт в подсказку.', effect:'Открывает шаг декодирования.', starter:true },
  { id:'node-radar', name:'Node Radar', category:'Обнаружение узлов', version:'1.1.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:260, cooldown:5000, description:'Находит симулируемый узел цели в личном мире.', effect:'Показывает игровой host-node.', starter:true },
  { id:'weakness-lab', name:'Weakness Lab', category:'Поиск игровых слабостей', version:'1.2.0', price:0, requiredLevel:1, minOs:1, ram:2, storage:420, cooldown:7000, description:'Проверяет абстрактную модель защиты цели.', effect:'Открывает условную слабость.', starter:true },
  { id:'sim-exploit', name:'Sim Exploit', category:'Симуляция доступа', version:'2.0.0', price:0, requiredLevel:1, minOs:1, ram:2, storage:650, cooldown:12000, description:'Выполняет безопасную игровую проверку шанса доступа.', effect:'Завершает этап проникновения в симуляции.', starter:true },
  { id:'data-exporter', name:'Data Exporter', category:'Экспорт', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:220, cooldown:0, description:'Создаёт файл с результатом внутриигровой операции.', effect:'Позволяет экспортировать результат контракта.', starter:true },
  { id:'site-editor', name:'Site Editor', category:'Изменение сайта', version:'1.0.0', price:620, requiredLevel:1, ram:2, storage:380, cooldown:9000, description:'Меняет текст или виртуальную запись тестовой цели.', effect:'Открывает игровое изменение содержимого.',minOs:2 },
  { id:'db-reader', name:'Virtual DB Reader', category:'Виртуальные данные', version:'1.0.0', price:1900, requiredLevel:6, ram:3, storage:900, cooldown:15000, description:'Читает только записи собственной вымышленной базы.', effect:'Открывает высокоуровневые игровые записи.',minOs:3 },
  { id:'identity-mask', name:'Identity Veil', category:'Игровая маскировка', version:'1.0.0', price:3800, requiredLevel:7, ram:2, storage:700, cooldown:0, description:'Снижает условную заметность персонажа в модели мира.', effect:'Уменьшает симулируемый банковский риск.',minOs:3 },
  { id:'bank-decryptor', name:'Vault Decoder', category:'Банк / эндгейм', version:'1.0.0', price:5200, requiredLevel:8, ram:3, storage:1200, cooldown:0, description:'Редкий декриптор для финальной банковской миссии.', effect:'Необходим для рискованной игровой цели.',minOs:4 },
  { id:'obfuscator', name:'Trace Obfuscator', category:'Банк / эндгейм', version:'1.0.0', price:4600, requiredLevel:8, ram:2, storage:1000, cooldown:0, description:'Снижает риск виртуальной трассировки.', effect:'Необходим для рискованной игровой цели.',minOs:4 },
  { id:'file-forge', name:'File Forge', category:'Создание файлов', version:'1.0.0', price:520, requiredLevel:1, ram:1, storage:300, cooldown:0, description:'Подготавливает виртуальные файлы и NBS-документы.', effect:'Разблокирует продвинутую работу с файлами.',minOs:2 },
  { id:'map-scanner', name:'Atlas Scanner', category:'Карта / цели', version:'1.0.0', price:350, requiredLevel:1, ram:1, storage:250, cooldown:0, description:'Уточняет POI и игровые маршруты на NullAtlas.', effect:'Показывает расширенные подсказки карты.',minOs:1 }
];

export const HARDWARE = {
  cpu:[{level:1,name:'NB Core 2',price:0,compute:2},{level:2,name:'NB Core 4',price:850,compute:4},{level:3,name:'NB Core 8',price:1850,compute:8},{level:4,name:'NB Core 12',price:3400,compute:12}],
  ram:[{level:1,name:'4 GB DDR',price:0,gb:4},{level:2,name:'8 GB DDR',price:680,gb:8},{level:3,name:'16 GB DDR',price:1450,gb:16},{level:4,name:'32 GB DDR',price:2800,gb:32}],
  gpu:[{level:1,name:'NB Graphics',price:0,power:1},{level:2,name:'NB Vector 4',price:720,power:4},{level:3,name:'NB Vector 8',price:1550,power:8}],
  storage:[{level:1,name:'64 GB SSD',price:0,gb:64},{level:2,name:'128 GB SSD',price:520,gb:128},{level:3,name:'256 GB SSD',price:1100,gb:256},{level:4,name:'512 GB SSD',price:2400,gb:512}],
  os:[{level:1,name:'NULLBYTE OS 1.0',price:0},{level:2,name:'NULLBYTE OS 1.1',price:900},{level:3,name:'NULLBYTE OS 1.2',price:1800},{level:4,name:'NULLBYTE OS 2.0',price:3200}]
};

export const SITES = [
  {id:'aster-bank',domain:'asterbank.null',title:'Aster Union Bank',kind:'bank',security:5,region:'Северный сектор',district:'Квартал Финансов',description:'Вымышленный городской банк. Данные и счета существуют только в симуляции.',artifact:'SEALED-ACCT-17',data:'Виртуальная запись счёта: AC-017 / статус: проверен',siteText:'Сервис работает штатно.'},
  {id:'volt-market',domain:'voltmarket.null',title:'Volt Market',kind:'shop',security:1,region:'Старый порт',district:'Торговая линия',description:'Каталог электроники и комплектующих.',artifact:'CATALOG-B7',data:'Заказ VM-204 подготовлен к выдаче',siteText:'Весенняя распродажа компонентов.'},
  {id:'neon-motors',domain:'neonmotors.null',title:'Neon Motors',kind:'auto',security:3,region:'Северный сектор',district:'Авеню Моторс',description:'Автосалон и сервис виртуальных автомобилей.',artifact:'VIN-SIM-88',data:'Виртуальная карточка автомобиля NM-88',siteText:'Новые модели уже в каталоге.'},
  {id:'gridworks',domain:'gridworks.null',title:'GridWorks',kind:'utility',security:3,region:'Промзона',district:'Энергорайон',description:'Электротехническая компания вымышленного мира.',artifact:'GRID-LOG-11',data:'Журнал контроллера GW-11',siteText:'Сеть виртуальных объектов стабильна.'},
  {id:'cobalt-forum',domain:'cobaltforum.null',title:'Cobalt Forum',kind:'forum',security:2,region:'Старый порт',district:'Переулок Серверный',description:'Форум жителей и техников.',artifact:'POST-THREAD-04',data:'Сообщение участника: встреча перенесена',siteText:'Обсуждение открыто.'},
  {id:'civic-records',domain:'civicrecords.null',title:'Civic Records',kind:'database',security:4,region:'Центр',district:'Муниципальный квартал',description:'Портал виртуальных городских записей.',artifact:'CIVIC-ROW-29',data:'Виртуальная запись объекта CR-29',siteText:'Портал городских записей.'},
  {id:'pocket-mobile',domain:'pocketmobile.null',title:'Pocket Mobile',kind:'device',security:2,region:'Северный сектор',district:'Жилой квартал',description:'Демо-портал телефона NPC.',artifact:'PHONE-SIM-22',data:'Состояние виртуального устройства PM-22',siteText:'Диагностика устройств доступна.'},
  {id:'north-wifi',domain:'northwifi.null',title:'North Wi-Fi',kind:'wifi',security:3,region:'Старый порт',district:'Площадь Маяк',description:'Симулируемая точка доступа городского пространства.',artifact:'AP-SIM-05',data:'Параметры игровой точки доступа AP-05',siteText:'Гостевая сеть доступна в симуляции.'}
,
  {id:'harbor-bay',domain:'harborbay.null',title:'Harbor Bay Marina',kind:'shop',security:2,region:'Бейшор-Хайтс',district:'Причал',description:'Марина и аренда причалов.',artifact:'SLIP-44',data:'Причал B-12 забронирован',siteText:'Расписание приливов онлайн.'},
  {id:'fisherman-net',domain:'fishnet.null',title:'Fisherman Net',kind:'forum',security:1,region:'Бейшор-Хайтс',district:'Набережная',description:'Форум рыбаков и портовых смен.',artifact:'POST-F9',data:'Тред про ночную смену',siteText:'Уважай правила порта.'},
  {id:'pulse-social',domain:'pulse.null',title:'Pulse',kind:'forum',security:2,region:'Мидтаун-Спайн',district:'Медиа',description:'Городская соцсеть.',artifact:'FEED-01',data:'Пост #8841',siteText:'Лента обновляется.'},
  {id:'city-gazette',domain:'gazette.null',title:'City Gazette',kind:'utility',security:2,region:'Мидтаун-Спайн',district:'Пресса',description:'Городская газета.',artifact:'ISSUE-312',data:'Колонка редактора',siteText:'Свежий выпуск.'},
  {id:'forge-parts',domain:'forgeparts.null',title:'Forge Parts Co',kind:'shop',security:2,region:'Айронрич',district:'Склады',description:'Промкомплектующие.',artifact:'SKU-778',data:'Партия подшипников',siteText:'Опт и розница.'},
  {id:'rail-yard',domain:'railyard.null',title:'Rail Yard Ops',kind:'utility',security:3,region:'Айронрич',district:'Пути',description:'Логистика ж/д узла.',artifact:'TRAIN-09',data:'Состав 09-A',siteText:'Расписание путей.'},
  {id:'drive-thru',domain:'drivethru.null',title:'Drive Thru Auto',kind:'auto',security:2,region:'Саутгейт',district:'Трасса',description:'Экспресс-сервис авто.',artifact:'TICKET-22',data:'Талон 22',siteText:'Очередь на подъёмник.'},
  {id:'lot-47',domain:'lot47.null',title:'Lot 47 Parking',kind:'utility',security:1,region:'Саутгейт',district:'Парковка',description:'Парковочный оператор.',artifact:'SPOT-47',data:'Место 47-C',siteText:'Оплата по часу.'},
  {id:'neighbors-board',domain:'neighbors.null',title:'Neighbors Board',kind:'forum',security:1,region:'Окридж',district:'Дворы',description:'Доска объявлений района.',artifact:'AD-15',data:'Продам диван',siteText:'Будь вежлив.'},
  {id:'green-mart',domain:'greenmart.null',title:'Green Mart',kind:'shop',security:1,region:'Окридж',district:'Ритейл',description:'Продуктовый маркет.',artifact:'CART-3',data:'Заказ #3',siteText:'Акции недели.'},
  {id:'dark-drop',domain:'darkdrop.null',title:'Dark Drop',kind:'forum',security:3,region:'Шэдоулайн',district:'Теневой',description:'Закрытый дроп-форум.',artifact:'DROP-7',data:'Лот 7',siteText:'Без реальных сделок.'},
  {id:'null-chan',domain:'nullchan.null',title:'Null Chan',kind:'forum',security:2,region:'Шэдоулайн',district:'Борды',description:'Имиджборд симуляции.',artifact:'THREAD-404',data:'Тред /tech/',siteText:'Анонимность условная.'},
  {id:'sunrise-clinic',domain:'sunriseclinic.null',title:'Sunrise Clinic',kind:'utility',security:3,region:'Мидтаун-Спайн',district:'Мед',description:'Клиника записи приёма.',artifact:'APPT-88',data:'Приём 88',siteText:'Только симуляция.'},
  {id:'byte-cafe',domain:'bytecafe.null',title:'Byte Café',kind:'shop',security:1,region:'Мидтаун-Спайн',district:'Кафе',description:'Кофейня с терминалами.',artifact:'ORDER-LATTE',data:'Латте x2',siteText:'Wi-Fi для гостей.'},
  {id:'parcel-hub',domain:'parcelhub.null',title:'Parcel Hub',kind:'shop',security:2,region:'Айронрич',district:'Доставка',description:'Служба посылок.',artifact:'PKG-901',data:'Посылка 901',siteText:'Трекинг внутри .null.'},
  {id:'skyline-realty',domain:'skyline.null',title:'Skyline Realty',kind:'utility',security:2,region:'Бейшор-Хайтс',district:'Недвижимость',description:'Агентство аренды.',artifact:'LIST-12',data:'Лот 12',siteText:'Виртуальные объекты.'},
  {id:'campus-net',domain:'campus.null',title:'Campus Net',kind:'forum',security:1,region:'Окридж',district:'Кампус',description:'Студенческая сеть.',artifact:'CLASS-101',data:'Расписание',siteText:'Учёба в симуляции.'},
  {id:'metro-pass',domain:'metropass.null',title:'Metro Pass',kind:'utility',security:2,region:'Саутгейт',district:'Транспорт',description:'Транспортные карты.',artifact:'PASS-55',data:'Карта 55',siteText:'Проезд виртуальный.'},
  {id:'signal-tower',domain:'signtower.null',title:'Signal Tower',kind:'wifi',security:2,region:'Шэдоулайн',district:'Вышка',description:'Релейная точка.',artifact:'RELAY-3',data:'Узел 3',siteText:'Только покрытие.'},
  {id:'ledger-club',domain:'ledgerclub.null',title:'Ledger Club',kind:'bank',security:4,region:'Мидтаун-Спайн',district:'Клуб',description:'Закрытый учётный клуб (не Aster).',artifact:'LEDGER-X',data:'Членство X',siteText:'Отдельный контур.'}

];

export const LOCATIONS = [
  {id:'bayshore',name:'Бейшор-Хайтс',city:'Нулл-Сити',region:'Побережье',x:22,y:28,pois:['volt-market','harbor-bay','fisherman-net','north-wifi'],netKey:'NET-BAYSHORE',ssid:'Bayshore-Mesh'},
  {id:'midtown',name:'Мидтаун-Спайн',city:'Нулл-Сити',region:'Центр',x:52,y:42,pois:['aster-bank','civic-records','pulse-social','city-gazette'],netKey:'NET-MIDTOWN',ssid:'Spine-Public'},
  {id:'ironreach',name:'Айронрич',city:'Нулл-Сити',region:'Промпояс',x:78,y:30,pois:['gridworks','forge-parts','rail-yard'],netKey:'NET-IRON',ssid:'IronAP-03'},
  {id:'southgate',name:'Саутгейт',city:'Нулл-Сити',region:'Юг',x:48,y:72,pois:['neon-motors','drive-thru','lot-47'],netKey:'NET-SOUTH',ssid:'Southgate-Wi'},
  {id:'oakridge',name:'Окридж',city:'Нулл-Сити',region:'Жилой',x:28,y:60,pois:['pocket-mobile','neighbors-board','green-mart'],netKey:'NET-OAK',ssid:'Oakridge-Home'},
  {id:'shadowline',name:'Шэдоулайн',city:'Нулл-Сити',region:'Подсеть',x:72,y:68,pois:['cobalt-forum','dark-drop','null-chan'],netKey:'NET-SHADOW',ssid:'Shadow-Node'}
];



/** Plugins closed until checklist/prompt — visible but not runnable */
export const PLUGINS_LOCKED = new Set([
  // Web / sites — still under construction
  'site-analyzer','artifact-decoder','node-radar','weakness-lab','sim-exploit',
  'data-exporter','site-editor','db-reader','identity-mask','bank-decryptor',
  'obfuscator','file-forge','server-index','target-extractor','archive-exporter',
  // Legacy mobile + control moved to Phone Lab app
  'device-scout','signal-mapper','mobile-decoder','mobile-access','mobile-forensics','map-scanner','phone-call',
  'phone-control'
]);


export function isPluginLocked(id) {
  return PLUGINS_LOCKED.has(id);
}

const STARTER_CONTRACT_TOOLS=['site-analyzer','artifact-decoder','node-radar','weakness-lab','sim-exploit','data-exporter'];
const DB_CONTRACT_TOOLS=[...STARTER_CONTRACT_TOOLS,'db-reader'];
const MISSION_TEMPLATES = [
  {id:'job-001',title:'Потерянная накладная',client:'Mira Voss',target:'volt-market',category:'info',difficulty:'Лёгкая',minLevel:1,reward:180,xp:110,objective:'Найти игровую запись заказа VM-204 и передать файл клиенту.',hint:'В каталоге Volt Market хранится артефакт CATALOG-B7.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-002',title:'Сервисный журнал',client:'GridWorks Support',target:'gridworks',category:'server',difficulty:'Средняя',minLevel:2,reward:360,xp:95,objective:'Получить виртуальный журнал GW-11 и отправить отчёт.',hint:'Сайт расположен в Промзоне. Защита выше базовой.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-003',title:'Автомобильная карточка',client:'Eli North',target:'neon-motors',category:'info',difficulty:'Средняя',minLevel:2,reward:420,xp:110,objective:'Экспортировать карточку автомобиля NM-88.',hint:'Ищи игровой артефакт VIN-SIM-88.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-004',title:'Тема на форуме',client:'Cobalt Moderator',target:'cobalt-forum',category:'site',difficulty:'Лёгкая',minLevel:3,reward:480,xp:125,objective:'Получить копию виртуального сообщения из темы форума.',hint:'Форум находится в Старом порту.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-005',title:'Запись муниципалитета',client:'Office 04',target:'civic-records',category:'database',difficulty:'Сложная',minLevel:6,reward:780,xp:185,objective:'Извлечь и экспортировать виртуальную запись CR-29.',hint:'Нужен Virtual DB Reader для чтения этой цели.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-006',title:'Диагностика телефона',client:'Nora Vale',target:'pocket-mobile',category:'phone',difficulty:'Средняя',minLevel:3,reward:610,xp:150,objective:'Получить отчёт о состоянии демонстрационного телефона PM-22.',hint:'Телефон — полностью вымышленная цель NPC.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-007',title:'Точка доступа',client:'Harbor Cafe',target:'north-wifi',category:'network',difficulty:'Средняя',minLevel:4,reward:820,xp:200,objective:'Экспортировать параметры игровой точки доступа AP-05.',hint:'Точка находится на Площади Маяк.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-008',title:'Архивный реестр',client:'Archive Keeper',target:'civic-records',category:'database',difficulty:'Сложная',minLevel:6,reward:1250,xp:280,objective:'Получить расширенную запись муниципального архива.',hint:'Требуется редкий плагин Virtual DB Reader.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-009',title:'Сервисная диагностика',client:'Neon Motors',target:'neon-motors',category:'server',difficulty:'Средняя',minLevel:5,reward:1700,xp:350,objective:'Подготовить виртуальный отчёт о состоянии сервисной карточки автомобиля.',hint:'NBS уже доступен. Проверь File Forge и ОС.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-010',title:'Состояние городской точки',client:'Harbor Cafe',target:'north-wifi',category:'network',difficulty:'Средняя',minLevel:5,reward:1100,xp:100,objective:'Передать отчёт о виртуальной точке доступа AP-05.',hint:'Точка отмечена на NullAtlas.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-011',title:'Профиль устройства',client:'Pocket Mobile Support',target:'pocket-mobile',category:'phone',difficulty:'Сложная',minLevel:7,reward:2600,xp:240,objective:'Получить расширенную карточку демонстрационного телефона PM-22.',hint:'Изучи виртуальный адрес устройства через Browser.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-012',title:'Энергорайон: журнал',client:'GridWorks Support',target:'gridworks',category:'server',difficulty:'Сложная',minLevel:7,reward:3100,xp:280,objective:'Собрать новый отчёт по виртуальному журналу контроллера GW-11.',hint:'Виртуальная цель восстановилась после предыдущих заказов.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-013',title:'Обсуждение сообщества',client:'Cobalt Moderator',target:'cobalt-forum',category:'site',difficulty:'Сложная',minLevel:8,reward:3600,xp:300,objective:'Передать архивную запись из виртуальной темы форума.',hint:'Проверь текущее состояние Cobalt Forum.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-014',title:'Сервисный архив',client:'Neon Motors',target:'neon-motors',category:'info',difficulty:'Сложная',minLevel:8,reward:3900,xp:320,objective:'Экспортировать расширенную сервисную карточку NM-88.',hint:'Та же безопасная последовательность операций.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-015',title:'Закрытая запись архива',client:'Archive Keeper',target:'civic-records',category:'database',difficulty:'Очень сложная',minLevel:9,reward:4700,xp:400,objective:'Извлечь дополнительную виртуальную запись CR-29.',hint:'Нужен DB Reader и доступ.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-016',title:'Финальный городской отчёт',client:'Office 04',target:'civic-records',category:'database',difficulty:'Очень сложная',minLevel:9,reward:5200,xp:450,objective:'Сформировать полный пакет по муниципальным записям.',hint:'Подготовка к банковскому эндгейму.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-017',title:'Кто за аккаунтом',client:'Cobalt Moderator',target:'cobalt-forum',category:'analysis',difficulty:'Средняя',minLevel:4,reward:900,xp:180,objective:'Связать USER_ID с PHONE_ID через db-reader и map-scanner.',hint:'access → search → phone.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-018',title:'Временная правка',client:'Shadow Broker',target:'volt-market',category:'modify',difficulty:'Средняя',minLevel:4,reward:850,xp:170,objective:'Временно изменить balance у user (site-editor), зафиксировать артефакт.',hint:'Откат 30–60 мин автоматический.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-019',title:'Только разведка',client:'Mira Voss',target:'volt-market',category:'recon',difficulty:'Лёгкая',minLevel:1,reward:100,xp:60,objective:'WEB RECON voltmarket.null — domain в intel.',hint:'Достаточно site-analyzer.',requiredPlugins:['site-analyzer']},
];

export function validNickname(value) { return /^[A-Za-z0-9]{2,12}$/.test(String(value || '')); }
export function escapeText(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
export function idempotencyKey(prefix='evt') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; }

export function createInitialState(tgUser=null) {
  const now=Date.now();
  const state0 = {
    version:SAVE_VERSION,
    meta:{createdAt:now,updatedAt:now,seed:`nb-${now.toString(36)}`,migratedFrom:null},
    player:{nickname:'',telegramId:tgUser?.id ? String(tgUser.id) : '',level:1,xp:0,reputation:0,contractsCompleted:0,totalEarned:0},
    economy:{credits:BALANCE.creditsStart,transactions:[{id:'txn-starter',type:'income',amount:BALANCE.creditsStart,reason:'Стартовый грант оператора',at:now}]},
    computer:{cpu:1,ram:1,gpu:1,storage:1,os:1,files:[],installedPlugins:['net-link','net-analyzer','phone-access','mail-drop'],uptimeStartedAt:now},
    world:{sites:SITES.map(s=>({...s,state:'online',recoveryAt:0,defenseBoost:0,revision:1})),progress:{},npc:[
      {id:'npc-mira',name:'Mira Voss',role:'Клиент',device:'Pocket Mobile V2',address:'mira-pocket.pocketmobile.null',data:'Профиль виртуального телефона PM-22',location:'oldport',nextAt:now+20*60*1000},
      {id:'npc-eli',name:'Eli North',role:'Механик',device:'Garage Terminal',address:'eli-garage.neonmotors.null',data:'Сервисная карточка NM-88',location:'north',nextAt:now+35*60*1000},
      {id:'npc-nora',name:'Nora Vale',role:'Житель',device:'Home Node',address:'nora-home.northwifi.null',data:'Симулируемый статус домашнего узла',location:'center',nextAt:now+50*60*1000}
    ]},
    missions:{items:MISSION_TEMPLATES.map((m,i)=>({...m,status:m.minLevel<=1 && i<3?'available':'locked',acceptedAt:0,submittedAt:0,verifyAt:0,resultFileId:'',rewardPaid:false})),nextIndex:3},
    mail:{messages:[{id:'mail-welcome',direction:'in',from:'NULLBYTE System',to:'operator',subject:'Добро пожаловать в NULLBYTE',body:'Компьютер готов. Открой BlackWire, чтобы принять первый контракт. Все цели и адреса существуют только в игровой симуляции.',at:now,attachments:[],status:'read'}]},
    browser:{history:[],bookmarks:['aster-bank','volt-market'],activeSite:''},
    bank:{lockStartedAt:0,lockUntil:0,lastAttemptAt:0},
    editor:{files:[]},
    cooldowns:{},
    ops:{keys:[]},
    intel:null,
    processedEvents:[],
    stats:{operations:0,successfulOperations:0,failedOperations:0,bytesExported:0}
  };
  state0.intel = seedIntelFromSites(state0.world.sites, createEmptyIntel());
  state0.npcWorld = createEmptyNpcWorld();
  // ensure phone contracts on board
  if (typeof PHONE_JOBS !== 'undefined') {
    for (const j of PHONE_JOBS) {
      if (!state0.missions.items.some(x => x.id === j.id)) {
        const item = bindPhoneMissionTarget({ ...j, status: j.minLevel <= 1 ? 'available' : 'locked' }, 'nb');
        state0.missions.items.push(item);
      }
    }
  }
  // keep templates for tests/legacy; UI uses isMissionVisible (phone- only)
  state0.missions.items.forEach(m => { if (String(m.id||'').startsWith('phone-')) bindPhoneMissionTarget(m, 'nb'); });


  state0.ops = createEmptyOpsState();
  state0.phoneWorld = createEmptyPhoneWorld();
  state0.events = createEmptyEvents();
  unlockMissions(state0);
  rotateMissionBoard(state0, Date.now(), true);
  return state0;
}

function finite(value) { const n=Number(value); return Number.isFinite(n)?n:0; }
function clamp(value,min,max) { return Math.max(min,Math.min(max,finite(value))); }

export function migrateSave(raw,tgUser=null) {
  const fresh=createInitialState(tgUser);
  if (!raw || typeof raw!=='object') return {state:fresh,changed:true};
  // Preserve known fields from the previous prototype instead of silently resetting progress.
  if (!raw.version && (raw.playerName || raw.money!==undefined || raw.telegramId)) {
    fresh.player.nickname = validNickname(raw.playerName)?raw.playerName:'';
    fresh.player.telegramId = raw.telegramId ? String(raw.telegramId) : fresh.player.telegramId;
    fresh.player.contractsCompleted = Math.max(0, Number(raw.hackedDevices) || 0);
    fresh.player.totalEarned = Math.max(0, Number(raw.hackEarnings) || 0);
    if (Number.isFinite(Number(raw.money))) fresh.economy.credits=Math.max(0,Number(raw.money));
    fresh.meta.migratedFrom='legacy-nullbyte-player';
    return {state:fresh,changed:true};
  }
  const out={...fresh,...raw,version:SAVE_VERSION};
  out.meta={...fresh.meta,...(raw.meta||{})};
  out.player={...fresh.player,...(raw.player||{})};
  out.economy={...fresh.economy,...(raw.economy||{})};
  out.computer={...fresh.computer,...(raw.computer||{})};
  out.world={...fresh.world,...(raw.world||{})};
  out.missions={...fresh.missions,...(raw.missions||{})};
  out.mail={...fresh.mail,...(raw.mail||{})};
  out.browser={...fresh.browser,...(raw.browser||{})};
  out.bank={...fresh.bank,...(raw.bank||{})};
  out.editor={...fresh.editor,...(raw.editor||{})};
  out.cooldowns={...fresh.cooldowns,...(raw.cooldowns||{})};
  out.stats={...fresh.stats,...(raw.stats||{})};
  out.intel=migrateIntel(raw.intel, out.world?.sites||fresh.world.sites);
  out.npcWorld=migrateNpcWorld(raw.npcWorld);
  out.ops=migrateOps(raw.ops);
  out.phoneWorld=migratePhoneWorld(raw.phoneWorld);
  if (Array.isArray(out.missions?.items)) {
    out.missions.items.forEach(m => { if (m && String(m.id||'').startsWith('phone-')) bindPhoneMissionTarget(m, 'nb'); });
  }

  out.events=migrateEvents(raw.events);
  // Preserve all ops fields; only normalize keys array
  const rawKeys = Array.isArray(raw.ops?.keys) ? raw.ops.keys : (out.ops.keys || []);
  out.ops.keys = rawKeys.filter(k=>k&&typeof k==='object').slice(-40).map(k=>({
    id:String(k.id||'').slice(0,64), stage:String(k.stage||''), siteId:String(k.siteId||''),
    token:String(k.token||'').slice(0,80), createdAt:finite(k.createdAt), used:Boolean(k.used)
  }));
  for (const key of ['files','installedPlugins']) if (!Array.isArray(out.computer[key])) out.computer[key]=fresh.computer[key];
  for (const key of ['transactions']) if (!Array.isArray(out.economy[key])) out.economy[key]=fresh.economy[key];
  if (!out.world || typeof out.world !== 'object' || Array.isArray(out.world)) out.world=fresh.world;
  // Immutable catalog data always comes from the current build; only simulation state is restored.
  const savedSites=Array.isArray(out.world.sites)?out.world.sites:[];
  out.world.sites=fresh.world.sites.map(base=>{
    const saved=savedSites.find(x=>x&&x.id===base.id)||{};
    return {...base,state:['online','recovering','offline'].includes(saved.state)?saved.state:'online',recoveryAt:finite(saved.recoveryAt),defenseBoost:clamp(saved.defenseBoost,0,5),revision:Math.max(1,Math.floor(finite(saved.revision)||1)),siteText:typeof saved.siteText==='string'?saved.siteText.slice(0,300):base.siteText};
  });
  out.world.progress=out.world.progress&&typeof out.world.progress==='object'&&!Array.isArray(out.world.progress)?out.world.progress:{};
  for(const key of Object.keys(out.world.progress)) if(!SITES.some(x=>x.id===key)) delete out.world.progress[key];
  for(const [key,p] of Object.entries(out.world.progress)) out.world.progress[key]={analyzed:Boolean(p?.analyzed),decoded:Boolean(p?.decoded),node:Boolean(p?.node),weakness:Boolean(p?.weakness),access:Boolean(p?.access),database:Boolean(p?.database),exported:Boolean(p?.exported),modified:Boolean(p?.modified),report:p?.report&&typeof p.report==='object'?p.report:null,lastOperationAt:finite(p?.lastOperationAt)};
  const savedNpcs=Array.isArray(out.world.npc)?out.world.npc:[];
  out.world.npc=fresh.world.npc.map(base=>{const saved=savedNpcs.find(x=>x&&x.id===base.id)||{};return {...base,location:LOCATIONS.some(l=>l.id===saved.location)?saved.location:base.location,nextAt:finite(saved.nextAt)||base.nextAt};});
  if (!Array.isArray(out.missions.items)) out.missions.items=fresh.missions.items;
  const savedMissions=out.missions.items;
  out.missions.items=fresh.missions.items.map(base=>{const saved=savedMissions.find(x=>x&&x.id===base.id)||{};return {...base,status:['locked','available','accepted','submitted','completed','cancelled'].includes(saved.status)?saved.status:base.status,acceptedAt:finite(saved.acceptedAt),submittedAt:finite(saved.submittedAt),verifyAt:finite(saved.verifyAt),resultFileId:typeof saved.resultFileId==='string'?saved.resultFileId:'',rewardPaid:Boolean(saved.rewardPaid),completedAt:finite(saved.completedAt),snapshot:saved.snapshot&&typeof saved.snapshot==='object'?saved.snapshot:null};});
  if (!Array.isArray(out.mail.messages)) out.mail.messages=fresh.mail.messages;
  out.mail.messages=out.mail.messages.filter(m=>m&&typeof m==='object').slice(0,100).map(m=>({id:(String(m.id||idempotencyKey('mail')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('mail')),direction:m.direction==='out'?'out':'in',from:String(m.from||'NULLBYTE').slice(0,60),to:String(m.to||'operator').slice(0,60),subject:String(m.subject||'Без темы').slice(0,120),body:String(m.body||'').slice(0,4000),at:finite(m.at)||Date.now(),attachments:Array.isArray(m.attachments)?m.attachments.filter(x=>typeof x==='string').slice(0,10):[],status:['unread','read','sent'].includes(m.status)?m.status:'read'}));
  if(!Array.isArray(out.computer.files)) out.computer.files=[];
  out.computer.files=out.computer.files.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&typeof f.content==='string').slice(0,300).map(f=>({...f,id:(String(f.id||idempotencyKey('file')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('file')),name:f.name.replace(/[^A-Za-z0-9_.-]/g,'').slice(0,64),content:String(f.content),size:Math.max(1,Math.ceil(String(f.content).length/1024))}));
  if(!Array.isArray(out.editor.files)) out.editor.files=[];
  out.editor.files=out.editor.files.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&typeof f.content==='string').slice(0,100).map(f=>({...f,id:(String(f.id||idempotencyKey('nbs')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('nbs')),name:f.name.replace(/[^A-Za-z0-9_.-]/g,'').slice(0,32),content:String(f.content),size:Math.max(1,Math.ceil(String(f.content).length/1024))}));
  out.computer.installedPlugins=out.computer.installedPlugins.filter(id=>PLUGINS.some(p=>p.id===id));
  for(const id of fresh.computer.installedPlugins) if(!out.computer.installedPlugins.includes(id)) out.computer.installedPlugins.push(id);
  for(const part of ['cpu','ram','gpu','storage','os']) out.computer[part]=Math.max(1,Math.min(HARDWARE[part].length,Math.floor(finite(out.computer[part])||1)));
  out.economy.transactions=out.economy.transactions.filter(t=>t&&typeof t==='object').slice(0,100).map(t=>({id:String(t.id||idempotencyKey('txn')),type:['income','expense','confiscated'].includes(t.type)?t.type:'income',amount:clamp(t.amount,0,1e9),reason:String(t.reason||'Транзакция').slice(0,180),at:finite(t.at)||Date.now()}));
  if(!out.browser||typeof out.browser!=='object') out.browser=fresh.browser;
  out.browser.bookmarks=Array.isArray(out.browser.bookmarks)?[...new Set(out.browser.bookmarks.filter(id=>SITES.some(s=>s.id===id)))].slice(0,30):fresh.browser.bookmarks;
  out.browser.history=Array.isArray(out.browser.history)?out.browser.history.filter(h=>h&&SITES.some(s=>s.id===h.siteId)).slice(0,50).map(h=>({siteId:h.siteId,at:finite(h.at)||Date.now()})):[];
  if(!SITES.some(s=>s.id===out.browser.activeSite)) out.browser.activeSite='';
  out.bank={...fresh.bank,...(out.bank||{})};out.bank.lockUntil=finite(out.bank.lockUntil);out.bank.lockStartedAt=finite(out.bank.lockStartedAt)||(out.bank.lockUntil?Math.max(0,out.bank.lockUntil-BALANCE.bankLockMs):0);out.bank.lastAttemptAt=finite(out.bank.lastAttemptAt);
  out.cooldowns=out.cooldowns&&typeof out.cooldowns==='object'&&!Array.isArray(out.cooldowns)?out.cooldowns:{};
  for(const id of Object.keys(out.cooldowns)) if(!PLUGINS.some(p=>p.id===id)) delete out.cooldowns[id]; else out.cooldowns[id]=finite(out.cooldowns[id]);
  if (!Array.isArray(out.processedEvents)) out.processedEvents=[];
  out.processedEvents=out.processedEvents.filter(x=>typeof x==='string').slice(-500);
  if(!out.stats||typeof out.stats!=='object')out.stats=fresh.stats;
  for(const key of Object.keys(fresh.stats))out.stats[key]=Math.max(0,Math.floor(finite(out.stats[key])));
  if (!validNickname(out.player.nickname)) out.player.nickname='';
  else out.player.nickname=String(out.player.nickname).trim();
  if (!out.player.walletId) {
    let h=0; const s=String(out.player.nickname||out.player.telegramId||'op');
    for (let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0;
    out.player.walletId='CR-'+String(10000000+(Math.abs(h)%90000000));
  }
  out.player.telegramId=String(out.player.telegramId||'').slice(0,40);
  out.player.level=Math.max(1,Math.min(BALANCE.maxLevel,Math.floor(finite(out.player.level)||1)));
  for(const key of ['xp','reputation','contractsCompleted','totalEarned'])out.player[key]=clamp(out.player[key],0,1e9);
  out.economy.credits=clamp(out.economy.credits,0,1e9);
  out.meta.updatedAt=Date.now();
  return {state:out,changed:raw.version!==SAVE_VERSION};
}

export function getInstalledPlugin(state,id) { return state.computer.installedPlugins.includes(id); }
export function getPlugin(id) { return PLUGINS.find(p=>p.id===id); }
export function getHardwareUsage(state) {
  const installed=state.computer.installedPlugins.reduce((sum,id)=>sum+(getPlugin(id)?.storage||0),0);
  const files=state.computer.files.reduce((sum,f)=>sum+(Number(f.size)||0)/1024,0);
  const editor=state.editor.files.reduce((sum,f)=>sum+(Number(f.size)||0)/1024,0);
  return {used:installed+files+editor,total:(HARDWARE.storage.find(x=>x.level===state.computer.storage)||HARDWARE.storage[0]).gb*1024};
}
export function getRamUsage(state,windows=[]) {
  const base=(HARDWARE.ram.find(x=>x.level===state.computer.ram)||HARDWARE.ram[0]).gb;
  const used=windows.filter(w=>!w.minimized).reduce((sum,w)=>sum+(w.ram||1),0);
  return {used,total:base};
}
export function addTransaction(state,type,amount,reason) {
  const n=Number(amount)||0;
  if (type==='income') state.economy.credits+=n;
  else state.economy.credits=Math.max(0,state.economy.credits-n);
  state.economy.transactions.unshift({id:idempotencyKey('txn'),type,amount:n,reason,at:Date.now()});
  state.economy.transactions=state.economy.transactions.slice(0,100);
}
function eventOnce(state,eventId,fn) {
  if (state.processedEvents.includes(eventId)) return {ok:false,reason:'Это действие уже обработано.'};
  const result=fn();
  if (result?.ok) {
    state.processedEvents.push(eventId);
    state.processedEvents=state.processedEvents.slice(-500);
    state.meta.updatedAt=Date.now();
  }
  return result;
}
function canSpend(state,amount) {
  if (state.bank.lockUntil>Date.now()) return 'Банк заблокирован. Расходные операции временно недоступны.';
  if (state.economy.credits<amount) return 'Недостаточно кредитов.';
  return '';
}
export function purchasePlugin(state,pluginId,eventId=idempotencyKey('buy')) {
  return eventOnce(state,eventId,()=>{
    const p=getPlugin(pluginId); if(!p) return {ok:false,reason:'Плагин не найден.'};
    if(getInstalledPlugin(state,pluginId)) return {ok:false,reason:'Плагин уже установлен.'};
    if(state.player.level<p.requiredLevel) return {ok:false,reason:`Требуется уровень ${p.requiredLevel}.`};
    if(state.computer.os<(p.minOs||1)) return {ok:false,reason:`Требуется NULLBYTE OS ${(p.minOs||1)}.0. Обнови ОС в My Computer.`};
    const ramTotal=(HARDWARE.ram.find(x=>x.level===state.computer.ram)||HARDWARE.ram[0]).gb;
    if(p.ram>ramTotal) return {ok:false,reason:`Плагину нужно ${p.ram} GB RAM. Обнови оперативную память.`};
    const usage=getHardwareUsage(state); if(usage.used+p.storage>usage.total) return {ok:false,reason:'Недостаточно места на накопителе.'};
    if(state.computer.os<1) return {ok:false,reason:'Несовместимая версия NULLBYTE OS.'};
    const problem=canSpend(state,p.price); if(problem) return {ok:false,reason:problem};
    addTransaction(state,'expense',p.price,`Установка плагина ${p.name}`);
    state.computer.installedPlugins.push(pluginId);
    return {ok:true,message:`${p.name} установлен.`};
  });
}
export function buyHardware(state,part,eventId=idempotencyKey('hardware')) {
  return eventOnce(state,eventId,()=>{
    const catalog=HARDWARE[part]; if(!catalog) return {ok:false,reason:'Компонент не найден.'};
    const current=state.computer[part]; const next=catalog.find(x=>x.level===current+1);
    if(!next) return {ok:false,reason:'Установлена максимальная версия.'};
    if(state.player.level<Math.max(1,next.level+(part==='os'?0:0)-1)) return {ok:false,reason:'Недостаточный уровень оператора.'};
    if(part==='storage') {
      const usage=getHardwareUsage(state);
      if(next.gb*1024<usage.used) return {ok:false,reason:'Новый накопитель меньше занятого объёма. Файлы не будут удалены.'};
    }
    const problem=canSpend(state,next.price); if(problem) return {ok:false,reason:problem};
    addTransaction(state,'expense',next.price,`Обновление компонента: ${next.name}`);
    state.computer[part]=next.level;
    return {ok:true,message:`Установлено: ${next.name}.`};
  });
}
export function uninstallPlugin(state,pluginId) {
  const p=getPlugin(pluginId); if(!p) return {ok:false,reason:'Плагин не найден.'};
  if(p.starter) return {ok:false,reason:'Базовый системный плагин нельзя удалить.'};
  if(!getInstalledPlugin(state,pluginId)) return {ok:false,reason:'Плагин не установлен.'};
  state.computer.installedPlugins=state.computer.installedPlugins.filter(x=>x!==pluginId);
  return {ok:true,message:'Плагин удалён. Пользовательские файлы сохранены.'};
}
export function acceptMission(state,missionId) {
  // ensure phone target bound
  const _pre = state.missions.items.find(x=>x.id===missionId);
  if (_pre) bindPhoneMissionTarget(_pre, state.meta?.seed||'nb');
  return acceptMission_inner(state,missionId);
}
function acceptMission_inner(state,missionId) {
  const m=state.missions.items.find(x=>x.id===missionId);
  if(!m||!(m.status==='available'||m.status==='locked')) return {ok:false,reason:'Контракт сейчас недоступен.'};
  if(state.player.level<m.minLevel) return {ok:false,reason:`Требуется уровень ${m.minLevel}.`};
  const missing=(m.requiredPlugins||[]).filter(id=>!getInstalledPlugin(state,id));
  if(missing.length)return {ok:false,reason:`Для контракта нужны плагины: ${missing.map(id=>getPlugin(id)?.name||id).join(', ')}.`};
  const active=state.missions.items.filter(x=>x.status==='accepted'||x.status==='submitted').length;
  if(active>=3) return {ok:false,reason:'Одновременно можно вести не более трёх контрактов.'};
  m.status='accepted'; m.acceptedAt=Date.now();
  m.snapshot={siteRevision:state.world.sites.find(s=>s.id===m.target)?.revision||1,security:state.world.sites.find(s=>s.id===m.target)?.security||1};
  return {ok:true,message:`Контракт ${m.id} принят. Цель закреплена в личном мире.`};
}

export function cancelMission(state, missionId) {
  const m = state.missions.items.find(x => x.id === missionId);
  if (!m || (m.status !== 'accepted' && m.status !== 'submitted')) {
    return { ok: false, reason: 'Нет активного контракта для отмены.' };
  }
  m.status = 'cancelled';
  m.cancelledAt = Date.now();
  m.resultFileId = '';
  m.verifyAt = 0;
  // free board eligibility later via rotation
  return { ok: true, message: `Контракт ${m.id} отменён. Награда не выдаётся.` };
}

/** Keep 3–4 available offers; never touch accepted/submitted. */
export function rotateMissionBoard(state, now = Date.now(), force = false) {
  ensureIntel(state);
  // current build: only phone-* can be offered
  state.missions.items.forEach(m => {
    if (!String(m.id||'').startsWith('phone-') && m.status === 'available') m.status = 'locked';
  });

  if (!state.intel.nextBoardAt) state.intel.nextBoardAt = now + 20 * 60 * 1000;
  if (!force && state.intel.nextBoardAt > now) {
    return { rotated: false, nextBoardAt: state.intel.nextBoardAt, offered: state.intel.boardIds || [] };
  }
  state.intel.nextBoardAt = now + 20 * 60 * 1000;
  unlockMissions(state);
  const activeIds = new Set(
    state.missions.items.filter(m => m.status === 'accepted' || m.status === 'submitted').map(m => m.id)
  );
  const eligible = state.missions.items.filter(m =>
    m.status === 'available' && !activeIds.has(m.id) && m.minLevel <= state.player.level
  );
  const bucket = Math.floor(now / (20 * 60 * 1000));
  const scored = eligible.map(m => {
    let h = 2166136261;
    const s = `${state.meta?.seed || 'nb'}:${bucket}:${m.id}`;
    for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
    return { m, score: h >>> 0 };
  }).sort((a, b) => a.score - b.score);
  const want = Math.min(4, Math.max(3, Math.min(eligible.length, 3 + (bucket % 2))));
  const picked = [];
  const seenCat = new Set();
  for (const { m } of scored) {
    if (picked.length >= want) break;
    const cat = m.category || 'info';
    if (seenCat.has(cat)) continue;
    picked.push(m); seenCat.add(cat);
  }
  for (const { m } of scored) {
    if (picked.length >= want) break;
    if (!picked.includes(m)) picked.push(m);
  }
  state.intel.boardIds = picked.map(m => m.id);
  return { rotated: true, nextBoardAt: state.intel.nextBoardAt, offered: state.intel.boardIds };
}

export function missionBoardTimer(state, now = Date.now()) {
  ensureIntel(state);
  if (!state.intel.nextBoardAt) state.intel.nextBoardAt = now + 20 * 60 * 1000;
  return Math.max(0, state.intel.nextBoardAt - now);
}


export function getSite(state,siteId) { return state.world.sites.find(s=>s.id===siteId); }
export function getSiteProgress(state,siteId) {
  if(!state.world.progress[siteId]) state.world.progress[siteId]={analyzed:false,decoded:false,node:false,weakness:false,access:false,database:false,exported:false,modified:false,report:null,lastOperationAt:0};
  return state.world.progress[siteId];
}

/* —— Terminal plugin sessions / one-time operation keys —— */
export const PLUGIN_SHELLS = {

  'net-link': { boot: 'Net Link v1', help: 'connect <region_id> · disconnect · status · list · help · exit', commands: ['connect','disconnect','status','list','help','exit'] },
  'net-analyzer': { boot: 'Net Analyzer v1', help: 'scan — анализ сети · save <имя> — полный отчёт · help · exit', commands: ['scan','analyze','save','help','exit'] },
  'phone-access': { boot: 'Phone Access v1', help: 'open <PHONE_ID> · status · disconnect · help · exit', commands: ['open','status','disconnect','close','help','exit'] },
  'mail-drop': { boot: 'Mail Drop v1', help: 'craft <имя_файла> · attach — через N-Mail · help · exit', commands: ['craft','help','exit'] },
  'sms-bomber': { boot: 'SMS Bomber v1', help: 'bomb <PHONE_ID> · help · exit', commands: ['bomb','help','exit'] },
  'bank-peek': { boot: 'Bank Peek v1', help: 'peek <PHONE_ID> · help · exit', commands: ['peek','help','exit'] },


  'device-scout': { boot:'Device Scout v1', help:'scout <ref> | help | exit', commands:['scout','scan','help','exit'] },
  'signal-mapper': { boot:'Signal Mapper v1', help:'map <region_id> | regions | help | exit', commands:['map','regions','help','exit'] },
  'mobile-decoder': { boot:'Mobile Decoder v1', help:'decode <DEVICE_ID> | help | exit', commands:['decode','help','exit'] },
  'mobile-access': { boot:'Mobile Access v1', help:'access <DEVICE_ID> | status | help | exit', commands:['access','status','help','exit'] },
  'mobile-forensics': { boot:'Mobile Forensics v1', help:'forensics <DEVICE_ID> | help | exit', commands:['forensics','dump','help','exit'] },
  'server-index': { boot:'Server Index v1', help:'index <SERVER_ID> | help | exit', commands:['index','list','help','exit'] },
  'target-extractor': { boot:'Target Extractor v1', help:'extract <USER_ID> | help | exit', commands:['extract','help','exit'] },
  'archive-exporter': { boot:'Archive Exporter v1', help:'pack [fileId...] | list | help | exit', commands:['pack','list','help','exit'] },
  'phone-call': {
    boot: 'Phone Call v1.0 — звонок с виртуального устройства.',
    help: 'call <npc|phone|name> | say <текст> | ask <сумма> | trust | log | hangup | help | exit',
    commands: ['call', 'ask', 'trust', 'hangup', 'help', 'exit']
  },

  'map-scanner': {
    boot: 'Mobile / Geo Link v1.0 — идентификация устройств.',
    help: 'phone <USER_ID|PHONE_ID> | forensics <PHONE_ID> | help | exit',
    commands: ['phone', 'identify', 'forensics', 'analyze', 'mobile', 'help', 'exit']
  },
  'site-editor': {
    boot: 'Site Editor v1.0 — изменение виртуальных записей (нужен access≥user).',
    help: 'set <USER_ID> <balance|reputation|accountStatus> <value> | help | exit',
    commands: ['set', 'modify', 'help', 'exit']
  },

  'site-analyzer': {
    boot: 'Site Analyzer v1.0 — разбор вымышленной цели.',
    help: 'analyze <domain> — разведка сайта, затем save <имя> · save <имя> — сохранить dump · help · exit',
    commands: ['analyze', 'scan', 'save', 'help', 'exit']
  },
  'artifact-decoder': {
    boot: 'Artifact Decoder v1.0 — расшифровка игрового артефакта по ключу анализа.',
    help: 'decode <key> | help | exit',
    commands: ['decode', 'help', 'exit']
  },
  'node-radar': {
    boot: 'Node Radar v1.1 — поиск виртуального host-node.',
    help: 'discover <ARTIFACT_ID> | scan <host|domain> | help | exit',
    commands: ['discover', 'find', 'help', 'exit']
  },
  'weakness-lab': { boot: 'Weakness Lab', help: 'vuln <filename> — найти VULN_PATH в расшифрованном отчёте · help · exit',
    commands: ['probe', 'weakness', 'help', 'exit']
  },
  'sim-exploit': { boot: 'Sim Exploit / Server', help: 'enter <VULN_PATH> — войти на сервер цели · exit server — с сервера · help · exit',
    commands: ['simulate', 'exploit', 'help', 'exit']
  },
  'data-exporter': {
    boot: 'Data Exporter v1.0 — пакет результата для N-Mail.',
    help: 'export <key> [mission-id] | pack <key> [mission-id] | help | exit',
    commands: ['export', 'pack', 'help', 'exit']
  },
  'db-reader': {
    boot: 'Virtual DB Reader v1.0 — пользователи и виртуальные записи.',
    help: 'search <q> | export <domain> | read <SESSION> | help | exit',
    commands: ['search', 'export', 'read', 'query', 'help', 'exit']
  }
};


export const PLUGIN_ANIM = {

  'net-link': [
    'opening radio iface…',
    'probe SSID table…',
    'auth handshake 1/3…',
    'auth handshake 2/3…',
    'lease OK · link up'
  ],
  'net-analyzer': [
    'ARP sweep region…',
    'enumerating handsets 0%…',
    'enumerating handsets 35%…',
    'enumerating handsets 72%…',
    'fingerprint models…',
    'compile PHONE_ID registry…',
    'report ready'
  ],
  'phone-access': [
    'resolve PHONE_ID…',
    'negotiate session token…',
    'bypass lock screen (sim)…',
    'mount userland…',
    'access GRANTED'
  ],
  'mail-drop': [
    'craft payload envelope…',
    'seal attachment…',
    'ready for N-Mail'
  ],
  'sms-bomber': [
    'queue virtual SMS…',
    'flood schedule…',
    'sim complete'
  ],
  'bank-peek': [
    'read wallet notes…',
    'parse ledger hints…',
    'peek OK'
  ],

  'site-analyzer': [
    'handshake with virtual resolver…',
    'pulling public surface map…',
    'fingerprinting response headers…',
    'extracting catalog markers…',
    'compiling signature blob…'
  ],
  'artifact-decoder': [
    'loading cipher table…',
    'aligning artifact blocks…',
    'bruteforce pass 1/3 (sandbox)…',
    'reconstructing payload…',
    'emitting artifact id…'
  ],
  'node-radar': [
    'sweeping simulated subnet…',
    'ping host candidates…',
    'measuring virtual latency…',
    'binding host handle…'
  ],
  'weakness-lab': [
    'building defense model…',
    'scoring surface vectors…',
    'ranking abstract gaps…',
    'locking vector id…'
  ],
  'sim-exploit': [
    'opening sandbox channel…',
    'replaying safe access path…',
    'checking policy gates…',
    'minting session token…'
  ],
  'db-reader': [
    'attaching virtual cursor…',
    'scanning record pages…',
    'materializing row ref…'
  ],
  'data-exporter': [
    'collecting dataset fragments…',
    'packing simulation-only blob…',
    'writing operator file…'
  ]
};

function ensureOps(state) {
  if (!state.ops || typeof state.ops !== 'object') state.ops = { keys: [] };
  if (!Array.isArray(state.ops.keys)) state.ops.keys = [];
}

function makeOpToken(state, stage, siteId) {
  const seed = `${state.meta.seed}:${stage}:${siteId}:${Date.now()}:${state.stats.operations}:${Math.random().toString(36).slice(2, 8)}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hex = (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const short = siteId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'NODE';
  const n = ((h >>> 8) % 9000) + 1000;
  // Diversity: each stage returns a different kind of handle, not a generic KEY.
  switch (stage) {
    case 'analyze': return `SIG/${short}-${hex.slice(0, 6)}`;
    case 'decode': return `ART-ID:${hex.slice(0, 4)}-${n}`;
    case 'node': return `HOST/${short.toLowerCase()}.sim.${hex.slice(0, 4).toLowerCase()}`;
    case 'weakness': return `VEC#${hex.slice(0, 5)}.${n % 97}`;
    case 'access': return `SESSION=${hex}-${short.slice(0, 3)}`;
    case 'database': return `ROW#${n}-${hex.slice(0, 3)}`;
    default: return `TOK-${hex}-${short.slice(0, 4)}`;
  }
}

export function issueOpKey(state, stage, siteId) {
  ensureOps(state);
  // Invalidate previous unused keys for same stage+site (single-use pipeline).
  for (const k of state.ops.keys) {
    if (k.stage === stage && k.siteId === siteId && !k.used) k.used = true;
  }
  const token = makeOpToken(state, stage, siteId);
  const entry = { id: idempotencyKey('key'), stage, siteId, token, createdAt: Date.now(), used: false };
  state.ops.keys.push(entry);
  state.ops.keys = state.ops.keys.slice(-40);
  return entry;
}

export function findOpKey(state, token) {
  ensureOps(state);
  const t = String(token || '').trim();
  return state.ops.keys.find(k => k.token === t) || null;
}

export function resolveSiteRef(state, ref) {
  const input = String(ref || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!input) return null;
  return state.world.sites.find(s =>
    s.domain === input || s.id === input || s.title.toLowerCase() === input ||
    `${s.title} ${s.domain}`.toLowerCase().includes(input)
  ) || null;
}

function pluginCooldown(state, pluginId) {
  const until = state.cooldowns[pluginId] || 0;
  if (until > Date.now()) return Math.ceil((until - Date.now()) / 1000);
  return 0;
}

function touchCooldown(state, pluginId) {
  const p = getPlugin(pluginId);
  if (p?.cooldown) state.cooldowns[pluginId] = Date.now() + p.cooldown;
}

/**
 * Execute a command inside an active plugin shell.
 * Returns { ok, lines:[{text,type}], key?, progressUpdated?, exportFile? }
 */

/** Create encrypted recon dump; returns file meta */
export function createEncryptedSiteDump(state, site, suggestedName) {
  const body = [
    'NULLBYTE ENC SITE DUMP v2',
    `DOMAIN=${site.domain}`,
    `SITE_ID=${site.id}`,
    `KIND=${site.kind}`,
    `SEC=${site.security}`,
    `ARTIFACT=${site.artifact||''}`,
    '---CIPHER---',
    // fake cipher payload
    Array.from({length:12},(_,i)=>`BLK${i}:${Math.abs(hashQuick(site.id+i)).toString(16)}`).join('\n')
  ].join('\n');
  return {
    encrypted: true,
    content: body,
    siteId: site.id,
    domain: site.domain
  };
}

function hashQuick(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

export function savePlayerNamedFile(state, name, content, meta={}) {
  name = String(name||'dump').replace(/[^\w.\-]+/g,'_').slice(0,40);
  if (!name.includes('.')) name += (meta.ext || '.enc');
  if ((state.computer.files||[]).some(f => f.name === name)) {
    return { ok: false, reason: `Файл «${name}» уже есть. Выбери другое имя.` };
  }
  const file = {
    id: idempotencyKey('file'),
    name,
    type: meta.type || 'encrypted',
    size: Math.max(1, Math.ceil(String(content).length/1024)),
    content: String(content),
    path: meta.path || '/recon/',
    createdAt: Date.now(),
    encrypted: meta.encrypted !== false,
    meta: { ...meta, siteId: meta.siteId }
  };
  state.computer.files.unshift(file);
  state.computer.files = state.computer.files.slice(0, 100);
  return { ok: true, file };
}

export function findFileByName(state, name) {
  const n = String(name||'').trim();
  return (state.computer.files||[]).find(f => f.name === n || f.name === n + '.enc' || f.id === n);
}

export function decryptSiteFileInPlace(state, file) {
  if (!file) return { ok: false, reason: 'Файл не найден.' };
  const siteId = file.meta?.siteId;
  const site = siteId ? getSite(state, siteId) : null;
  const decoded = [
    'NULLBYTE DECODED SITE REPORT',
    `FILE=${file.name}`,
    `DOMAIN=${site?.domain || file.meta?.domain || '—'}`,
    `SITE_ID=${siteId||'—'}`,
    `KIND=${site?.kind||'—'}`,
    `SECURITY=${site?.security??'—'}`,
    `ARTIFACT=${site?.artifact||'—'}`,
    '--- SURFACE ---',
    site ? `Title: ${site.title}` : '',
    site ? `Data mark: ${String(site.data||'').slice(0,120)}` : '',
    'Status: readable',
    'Next: weakness-lab → vuln <filename>'
  ].filter(Boolean).join('\n');
  file.content = decoded;
  file.encrypted = false;
  file.type = 'site-report';
  file.meta = { ...(file.meta||{}), decrypted: true, stage: 'decoded' };
  if (site) {
    const r = operateSite(state, site.id, 'decode', null);
    if (!r.ok && r.reason) {
      // still allow file decode if analyze was done via file path
    }
  }
  return { ok: true, file };
}

export function findVulnFromFile(state, file) {
  if (!file) return { ok: false, reason: 'Файл не найден.' };
  if (file.encrypted) return { ok: false, reason: 'Сначала расшифруй файл (artifact-decoder).' };
  const siteId = file.meta?.siteId;
  const site = siteId ? getSite(state, siteId) : null;
  if (site?.kind === 'bank') return { ok: false, reason: 'Банк — отдельный протокол.' };
  const h = hashQuick((siteId||file.name)+'vuln');
  const path = `/var/null/${(site?.domain||'node').split('.')[0]}/v${(h%90+10)}/gate-${(h%9000+1000).toString(16)}`;
  file.meta = { ...(file.meta||{}), vulnPath: path, stage: 'vuln' };
  if (site) operateSite(state, site.id, 'weakness', null);
  return { ok: true, path, siteId, file };
}

export function enterServerSession(state, vulnPath) {
  ensureOps(state);
  // find file with this vuln
  const file = (state.computer.files||[]).find(f => f.meta?.vulnPath === vulnPath || f.meta?.vulnPath === String(vulnPath).trim());
  let siteId = file?.meta?.siteId;
  if (!siteId) {
    // try match path fragment to site
    for (const s of state.world.sites) {
      if (String(vulnPath).includes((s.domain||'').split('.')[0])) { siteId = s.id; break; }
    }
  }
  if (!siteId) return { ok: false, reason: 'Vuln path не связан с известной целью.' };
  const site = getSite(state, siteId);
  if (!site) return { ok: false, reason: 'Сайт не найден.' };
  if (site.kind === 'bank') return { ok: false, reason: 'Банк недоступен через этот вход.' };
  const r = operateSite(state, siteId, 'exploit', null);
  if (!r.ok) return { ok: false, reason: r.reason };
  state.ops.serverSession = {
    siteId,
    domain: site.domain,
    vulnPath: String(vulnPath),
    enteredAt: Date.now(),
    modified: false,
    kickAt: null
  };
  return { ok: true, site, session: state.ops.serverSession };
}

export function exitServerSession(state) {
  if (!state.ops?.serverSession) return { ok: false, reason: 'Не на сервере.' };
  const s = state.ops.serverSession;
  state.ops.serverSession = null;
  return { ok: true, siteId: s.siteId };
}

export function markServerModified(state) {
  if (!state.ops?.serverSession) return;
  const sess = state.ops.serverSession;
  sess.modified = true;
  const site = getSite(state, sess.siteId);
  const sec = site?.security || 3;
  const minutes = ({1:60,2:40,3:20,4:10,5:5})[Math.min(5,Math.max(1,sec))] || 20;
  sess.kickAt = Date.now() + minutes * 60 * 1000;
  // hidden timer — also set site recovery
  if (site) site.recoveryAt = sess.kickAt;
}

export function processServerSessionKick(state, now=Date.now()) {
  const sess = state.ops?.serverSession;
  if (!sess || !sess.kickAt || sess.kickAt > now) return [];
  state.ops.serverSession = null;
  return ['Сессия сервера прервана. Изменения откатываются.'];
}


export function runPluginShellCommand(state, pluginId, rawLine, missionIdHint = null) {
  if (isPluginLocked(pluginId)) {
    return { ok: false, lines: [
      { text: 'NULLBYTE // UNDER CONSTRUCTION', type: 'blue' },
      { text: `Плагин «${pluginId}» закрыт на доработку.`, type: 'error' },
      { text: 'Сайтовый / текущий mobile-контур будет пересобран по новому чек-листу.', type: 'muted' },
      { text: 'Логика не удалена — просто недоступна.', type: 'muted' }
    ]};
  }
  const shell = PLUGIN_SHELLS[pluginId];
  if (!shell) return { ok: false, lines: [{ text: 'Плагин не поддерживает интерактивный режим.', type: 'error' }] };
  if (!getInstalledPlugin(state, pluginId)) {
    return { ok: false, lines: [{ text: `Плагин ${pluginId} не установлен.`, type: 'error' }] };
  }

  const line = String(rawLine || '').trim();
  if (!line) return { ok: true, lines: [] };
  const parts = line.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1] || '';
  const arg2 = parts[2] || '';
  const lines = [];

  if (cmd === 'help') {
    return { ok: true, lines: [{ text: shell.help, type: 'blue' }] };
  }
  if (cmd === 'exit' || cmd === 'quit') {
    return { ok: true, exit: true, lines: [{ text: `Выход из ${getPlugin(pluginId)?.name || pluginId}.`, type: 'muted' }] };
  }

  const wait = pluginCooldown(state, pluginId);
  if (wait > 0) {
    return { ok: false, lines: [{ text: `Плагин остывает: ${wait}с`, type: 'error' }] };
  }

  // —— site-analyzer ——
  
  // —— FILE-BASED WEB PIPELINE ——
  if (pluginId === 'site-analyzer' && (cmd === 'analyze' || cmd === 'scan')) {
    const recon = runWebRecon(state, arg1);
    if (!recon.ok) return { ok: false, lines: recon.lines };
    const site = getSite(state, recon.siteId);
    if (!site) return { ok: false, lines: [{ text: 'SITE_MISSING', type: 'error' }] };
    if (site.recoveryAt > Date.now()) return { ok: false, lines: [{ text: `Цель восстанавливается ~${Math.ceil((site.recoveryAt-Date.now())/60000)} мин.`, type: 'error' }] };
    const r = operateSite(state, site.id, 'analyze', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    // Longer analysis output — no tip chain hints
    const lines = [
      { text: 'NULLBYTE // SITE ANALYZER', type: 'blue' },
      { text: `Target: ${site.domain}`, type: '' },
      { text: 'Crawling surface…', type: 'muted' },
      { text: 'Fingerprinting stack…', type: 'muted' },
      { text: 'Collecting cipher blocks…', type: 'muted' },
      { text: 'Dump ready (encrypted).', type: 'green' },
      { text: 'Как назвать файл? Введи: save <имя>', type: 'blue' }
    ];
    const dump = createEncryptedSiteDump(state, site);
    return {
      ok: true,
      lines,
      progressUpdated: true,
      pendingSave: { kind: 'site-enc', siteId: site.id, content: dump.content, defaultName: `${site.domain.split('.')[0]}-scan` }
    };
  }

  // Global-ish: save <name> while pending — handled in terminal if pendingSave on result
  // Also support explicit save command inside analyzer
  if (pluginId === 'site-analyzer' && cmd === 'save') {
    return { ok: false, lines: [{ text: 'Сначала analyze <domain>, затем save <имя> в том же плагине.', type: 'error' }] };
  }

  if (pluginId === 'artifact-decoder' && (cmd === 'decode' || cmd === 'open')) {
    const file = findFileByName(state, arg1);
    if (!file) return { ok: false, lines: [{ text: 'Файл не найден. Укажи имя: decode <filename>', type: 'error' }] };
    if (!file.encrypted && file.meta?.decrypted) {
      return { ok: true, lines: [{ text: `Уже расшифрован: ${file.name}`, type: 'muted' }, { text: file.content.slice(0, 400), type: '' }] };
    }
    const r = decryptSiteFileInPlace(state, file);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    return {
      ok: true,
      lines: [
        { text: 'NULLBYTE // ARTIFACT DECODER', type: 'blue' },
        { text: `Decrypted in-place: ${file.name}`, type: 'green' },
        { text: file.content.split('\n').slice(0, 10).join('\n'), type: '' },
        { text: 'Дальше: weakness-lab → vuln <filename>', type: 'muted' }
      ],
      progressUpdated: true
    };
  }

  if (pluginId === 'weakness-lab' && (cmd === 'vuln' || cmd === 'probe' || cmd === 'scan')) {
    const file = findFileByName(state, arg1);
    if (!file) return { ok: false, lines: [{ text: 'vuln <filename> — нужен расшифрованный отчёт.', type: 'error' }] };
    const r = findVulnFromFile(state, file);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    return {
      ok: true,
      lines: [
        { text: 'NULLBYTE // WEAKNESS LAB', type: 'blue' },
        { text: `Scanned: ${file.name}`, type: '' },
        { text: 'Weakness found.', type: 'green' },
        { text: `VULN_PATH = ${r.path}`, type: 'green' },
        { text: 'Дальше: sim-exploit → enter <VULN_PATH>', type: 'muted' }
      ],
      key: r.path,
      progressUpdated: true
    };
  }

  if (pluginId === 'sim-exploit' && (cmd === 'enter' || cmd === 'exploit' || cmd === 'use')) {
    const path = parts.slice(1).join(' ') || arg1;
    const r = enterServerSession(state, path);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    return {
      ok: true,
      lines: [
        { text: 'NULLBYTE // SERVER SESSION', type: 'blue' },
        { text: `Connected: ${r.site.domain}`, type: 'green' },
        { text: `shell@${r.site.domain}:~$`, type: '' },
        { text: 'Доступны server-index / site-editor / data-exporter на этом сервере.', type: 'muted' },
        { text: 'Выход: exit server', type: 'muted' }
      ],
      progressUpdated: true,
      serverSession: true
    };
  }

  // exit server from any plugin or shell
  if ((cmd === 'exit' && arg1 === 'server') || (rawLine || '').trim().toLowerCase() === 'exit server') {
    const r = exitServerSession(state);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    return { ok: true, lines: [{ text: 'Disconnected from server.', type: 'muted' }], exit: false };
  }

  if (pluginId === 'node-radar' && (cmd === 'discover' || cmd === 'scan' || cmd === 'find')) {
    // Optional secondary recon — no longer required in main chain
    const site = resolveSiteRef(state, arg1) || getSite(state, state.ops?.serverSession?.siteId);
    if (!site) return { ok: false, lines: [{ text: 'scan <domain>', type: 'error' }] };
    const srv = typeof runServerAnalysis === 'function' ? runServerAnalysis(state, site.id) : { ok: true, lines: [{ text: site.domain, type: '' }] };
    touchCooldown(state, pluginId);
    return { ok: true, lines: (srv.lines || [{ text: 'Node ok', type: 'green' }]), progressUpdated: true };
  }

  if (pluginId === 'server-index' && (cmd === 'index' || cmd === 'dump')) {
    if (!state.ops?.serverSession) return { ok: false, lines: [{ text: 'Нужна сессия сервера (sim-exploit → enter).', type: 'error' }] };
    const site = getSite(state, state.ops.serverSession.siteId);
    const content = [
      'NULLBYTE ENC SERVER INDEX',
      `DOMAIN=${site.domain}`,
      `SITE=${site.id}`,
      '---CIPHER---',
      ...Array.from({length:8},(_,i)=>`U${i}:${hashQuick(site.id+'u'+i).toString(16)}`)
    ].join('\n');
    touchCooldown(state, pluginId);
    return {
      ok: true,
      lines: [
        { text: 'SERVER INDEX — deep scan…', type: 'blue' },
        { text: 'Users / roles / devices collected (encrypted).', type: 'muted' },
        { text: 'Как назвать файл? save <имя>', type: 'blue' }
      ],
      pendingSave: { kind: 'server-enc', siteId: site.id, content, defaultName: `${site.domain.split('.')[0]}-index`, type: 'server-index-enc' }
    };
  }

  if (pluginId === 'target-extractor' && (cmd === 'decode' || cmd === 'decrypt') && arg1) {
    // decrypt server index in place
    const file = findFileByName(state, arg1);
    if (!file) return { ok: false, lines: [{ text: 'Файл не найден', type: 'error' }] };
    const siteId = file.meta?.siteId || state.ops?.serverSession?.siteId;
    const site = getSite(state, siteId);
    const users = Object.values(state.intel?.users || {}).slice(0, 8);
    file.content = [
      'NULLBYTE SERVER INDEX (DECODED)',
      `DOMAIN=${site?.domain||'—'}`,
      `USERS=${users.length}`,
      ...users.map(u => `- ${u.id} ${u.username} role=${u.role}`)
    ].join('\n');
    file.encrypted = false;
    file.type = 'server-index';
    file.meta = { ...(file.meta||{}), decrypted: true };
    touchCooldown(state, pluginId);
    return { ok: true, lines: [{ text: `Decoded in-place: ${file.name}`, type: 'green' }, { text: file.content.slice(0, 500), type: '' }] };
  }

if (pluginId === 'data-exporter' && (cmd === 'export' || cmd === 'pack')) {
    const key = findOpKey(state, arg1);
    if (!key || key.used) {
      return { ok: false, lines: [{ text: 'Нужен SESSION_TOKEN / ACCESS ключ.', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    if (!site) return { ok: false, lines: [{ text: 'Цель не найдена.', type: 'error' }] };
    const needStage = site.kind === 'database' ? 'database' : 'access';
    if (key.stage !== needStage && key.stage !== 'access') {
      return { ok: false, lines: [{ text: `Ожидался токен стадии ${needStage}.`, type: 'error' }] };
    }
    key.used = true;
    const r = operateSite(state, site.id, 'export', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    const lines = [
      { text: 'NULLBYTE // DATA EXPORTER', type: 'blue' },
      { text: r.message, type: '' }
    ];
    let mission = arg2 ? state.missions.items.find(m => m.id === arg2 && m.status === 'accepted') : null;
    if (!mission) mission = state.missions.items.find(m => m.status === 'accepted' && m.target === site.id);
    if (mission) {
      const exp = exportMissionResult(state, mission.id);
      if (exp.ok) {
        lines.push({ text: exp.message, type: 'green' });
        lines.push({ text: 'Отправь файл через N-Mail.', type: 'muted' });
        writeIntelFile(state, `${mission.id}_evidence.report`, `CONTRACT ${mission.id}\nTARGET ${site.domain}\nRESULT OK`, 'report');
        return { ok: true, lines, progressUpdated: true, exportFile: true, missionId: mission.id };
      }
      lines.push({ text: exp.reason, type: 'error' });
    } else {
      lines.push({ text: 'Нет активного контракта на цель — только intel-файл.', type: 'muted' });
      writeIntelFile(state, `${site.id}_export.dat`, `EXPORT ${site.domain}\n${site.data}`, 'dataset');
    }
    return { ok: true, lines, progressUpdated: true };
  }

  if (pluginId === 'site-editor' && (cmd === 'set' || cmd === 'modify')) {
    // set <userId> <field> <value>
    const userId = arg1, field = arg2, value = parts.slice(3).join(' ');
    const r = modifyVirtualUser(state, userId, field, value);
    touchCooldown(state, pluginId);
    return { ok: r.ok, lines: r.lines, progressUpdated: r.ok };
  }

  // Mobile via map-scanner / identity as soft tools — also allow from terminal generic
  if ((pluginId === 'map-scanner' || pluginId === 'identity-mask') && (cmd === 'phone' || cmd === 'identify' || cmd === 'mobile')) {
    const r = cmd === 'mobile' || cmd === 'forensics'
      ? runMobileAnalysis(state, arg1)
      : runMobileIdentify(state, arg1);
    return { ok: r.ok, lines: r.lines, progressUpdated: r.ok };
  }
  if ((pluginId === 'map-scanner') && (cmd === 'forensics' || cmd === 'analyze')) {
    const r = runMobileAnalysis(state, arg1);
    return { ok: r.ok, lines: r.lines, progressUpdated: r.ok };
  }

  
  if (pluginId === 'phone-call') {
    if (cmd === 'call') {
      const ref = parts.slice(1).join(' ') || arg1;
      let npc = touchNpc(state, ref) || searchNpcs(state, ref, 3)[0];
      if (!npc) {
        const devices = Object.values(state.intel?.devices || {});
        const dev = devices.find(d => d.id === ref || String(d.phone||'') === ref);
        if (dev) {
          const idx = Math.abs(String(dev.userId||ref).length * 131 + 17) % 2000;
          npc = touchNpc(state, `npc_${String(idx).padStart(4,'0')}`);
        }
      }
      if (!npc) return { ok: false, lines: [{ text: 'Абонент не найден. call <npc_id|имя|телефон>', type: 'error' }] };
      state._callTarget = npc.id;
      const open = openingLine(state, npc);
      const trust = getTrust(state, npc.id);
      const st = dialogueStats(state, npc.id);
      return { ok: true, lines: [
        { text: 'NULLBYTE // PHONE CALL', type: 'blue' },
        { text: `Connected: ${npc.name} · ${npc.trait} · mood ${npc.mood}`, type: 'green' },
        { text: `Trust: ${trust}/100 · asks ${st.attempts.asks||0} · paid ${st.attempts.success||0}/2`, type: 'muted' },
        { text: `NPC: ${open}`, type: '' },
        { text: 'say <текст> · ask <сумма> · trust · log · hangup', type: 'muted' }
      ]};
    }
    if (cmd === 'say' || cmd === 'talk') {
      if (!state._callTarget) return { ok: false, lines: [{ text: 'Сначала call <цель>', type: 'error' }] };
      const npc = touchNpc(state, state._callTarget);
      const msg = parts.slice(1).join(' ') || arg1 || '';
      if (!msg) return { ok: false, lines: [{ text: 'say <текст>', type: 'error' }] };
      const r = npcReply(state, npc, msg);
      const lines = [
        { text: `You: ${msg}`, type: 'muted' },
        { text: `NPC: ${r.text}`, type: r.blocked ? 'error' : 'green' }
      ];
      if (r.hangup) { state._callTarget = null; lines.push({ text: '[звонок завершён]', type: 'muted' }); }
      if (r.blocked) state._callTarget = null;
      return { ok: true, lines };
    }
    if (cmd === 'ask') {
      if (!state._callTarget) return { ok: false, lines: [{ text: 'Сначала call <цель>', type: 'error' }] };
      const npc = touchNpc(state, state._callTarget);
      const r = requestNpcTransfer(state, state._callTarget, arg1);
      const line = moneyDialogue(state, npc, r);
      const lines = [
        { text: `You: попроси ${arg1} CR`, type: 'muted' },
        { text: `NPC: ${line}`, type: r.ok ? 'green' : 'error' }
      ];
      if (r.ok) lines.push({ text: `+${r.amount} CR · trust ${getTrust(state, npc.id)} · success ${r.successCount}/2`, type: 'green' });
      if (r.blocked) { state._callTarget = null; lines.push({ text: '[контакт прерван]', type: 'error' }); }
      return { ok: true, lines, progressUpdated: r.ok };
    }
    if (cmd === 'trust') {
      if (!state._callTarget) return { ok: false, lines: [{ text: 'Нет активного звонка.', type: 'error' }] };
      const st = dialogueStats(state, state._callTarget);
      return { ok: true, lines: [
        { text: `Trust: ${st.trust}/100`, type: 'blue' },
        { text: `Asks: ${st.attempts.asks||0} · successful transfers: ${st.attempts.success||0}/2`, type: 'muted' }
      ]};
    }
    if (cmd === 'log') {
      if (!state._callTarget) return { ok: false, lines: [{ text: 'Нет активного звонка.', type: 'error' }] };
      const st = dialogueStats(state, state._callTarget);
      if (!st.log.length) return { ok: true, lines: [{ text: 'История пуста', type: 'muted' }] };
      return { ok: true, lines: st.log.slice(-10).map(e => ({ text: `${e.role === 'npc' ? 'NPC' : 'You'}: ${e.text}`, type: e.role==='npc'?'':'muted' })) };
    }
    if (cmd === 'hangup') {
      if (state._callTarget) {
        const npc = touchNpc(state, state._callTarget);
        const r = npcReply(state, npc, '', 'bye');
        state._callTarget = null;
        return { ok: true, lines: [{ text: `NPC: ${r.text}`, type: 'muted' }, { text: 'Звонок завершён.', type: 'muted' }] };
      }
      state._callTarget = null;
      return { ok: true, lines: [{ text: 'Нет активного звонка.', type: 'muted' }] };
    }
  }

  
  if (pluginId === 'device-scout') {
    if (cmd === 'scout' || cmd === 'scan') {
      const ref = parts.slice(1).join(' ') || arg1;
      const devices = Object.values(state.intel?.devices || {});
      let hits = devices.filter(d => JSON.stringify(d).toLowerCase().includes(String(ref).toLowerCase()));
      if (!hits.length && ref) hits = devices.slice(0, 3);
      if (!hits.length) return { ok: false, lines: [{ text: 'Устройства не найдены в intel. Сначала web chain / map-scanner.', type: 'error' }] };
      return { ok: true, lines: [
        { text: 'DEVICE SCOUT RESULTS', type: 'blue' },
        ...hits.slice(0, 8).map(d => ({ text: `${d.id} · ${d.model || 'device'} · user ${d.userId || '—'}`, type: 'green' }))
      ]};
    }
  }
  if (pluginId === 'signal-mapper') {
    if (cmd === 'regions') {
      return { ok: true, lines: REGIONS.map(r => ({ text: `${r.id} · ${r.name} · ${r.netKey}`, type: '' })) };
    }
    if (cmd === 'map') {
      const rid = arg1 || 'region_0';
      const res = signalMapRegion(state, rid);
      return { ok: true, lines: [
        { text: `REGION ${res.region.name}`, type: 'blue' },
        { text: `Key: ${res.keyKnown ? res.region.netKey : '(unknown — grant via mission)'}`, type: 'muted' },
        ...res.nodes.map(n => ({ text: `[${n.type}] ${n.id} ${n.label}`, type: 'green' }))
      ]};
    }
  }
  if (pluginId === 'mobile-decoder') {
    if (cmd === 'decode') {
      const id = arg1;
      const dev = state.intel?.devices?.[id];
      if (!dev) return { ok: false, lines: [{ text: 'DEVICE_ID не найден', type: 'error' }] };
      const content = `DEVICE PROFILE\nID: ${dev.id}\nMODEL: ${dev.model||'—'}\nUSER: ${dev.userId||'—'}\nOS: virt-mobile\n`;
      state.computer.files.unshift({ id: 'file_mdec_'+Date.now().toString(36), name: `${id}-profile.mdev`, type: 'device-profile', size: 1, content, path: '/mobile/', createdAt: Date.now() });
      return { ok: true, lines: [{ text: 'Профиль записан в Files', type: 'green' }, { text: content, type: '' }] };
    }
  }
  if (pluginId === 'mobile-access') {
    if (cmd === 'access') {
      const id = arg1;
      if (!state.intel?.devices?.[id]) return { ok: false, lines: [{ text: 'Нет такого DEVICE_ID', type: 'error' }] };
      if (!state.ops) state.ops = { mobileAccess: {} };
      if (!state.ops.mobileAccess) state.ops.mobileAccess = {};
      state.ops.mobileAccess[id] = { level: 'user', expiresAt: Date.now() + 30*60*1000 };
      return { ok: true, lines: [{ text: `Mobile access GRANTED · ${id}`, type: 'green' }, { text: 'Сессия ~30 мин. Дальше: mobile-forensics / phone-call', type: 'muted' }] };
    }
    if (cmd === 'status') {
      const list = Object.entries(state.ops?.mobileAccess || {}).filter(([,v]) => v.expiresAt > Date.now());
      return { ok: true, lines: list.length ? list.map(([id,v]) => ({ text: `${id} · ${v.level}`, type: 'green' })) : [{ text: 'Нет активных mobile-сессий', type: 'muted' }] };
    }
  }
  if (pluginId === 'mobile-forensics') {
    if (cmd === 'forensics' || cmd === 'dump') {
      const id = arg1;
      const acc = state.ops?.mobileAccess?.[id];
      if (!acc || acc.expiresAt < Date.now()) return { ok: false, lines: [{ text: 'Нужен mobile-access', type: 'error' }] };
      const content = ['FORENSICS '+id,'Contacts: 12','Messages: 48','Calls: 9','Accounts: 3','Notes: 2'].join('\n');
      state.computer.files.unshift({ id: 'file_for_'+Date.now().toString(36), name: `${id}-forensics.mfor`, type: 'forensics', size: 1, content, path: '/mobile/', createdAt: Date.now() });
      return { ok: true, lines: content.split('\n').map((t,i) => ({ text: t, type: i===0?'blue':'' })) };
    }
  }
  if (pluginId === 'server-index') {
    if (cmd === 'index') {
      const r = buildServerIndex(state, arg1);
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      return { ok: true, lines: [{ text: `Index → ${r.file.name}`, type: 'green' }, { text: `Users: ${r.snap.users.length}`, type: '' }] };
    }
    if (cmd === 'list') {
      const keys = Object.keys(state.ops?.serverIndex || {});
      return { ok: true, lines: keys.length ? keys.map(k => ({ text: k, type: '' })) : [{ text: 'пусто', type: 'muted' }] };
    }
  }
  if (pluginId === 'target-extractor') {
    if (cmd === 'extract') {
      const r = extractTarget(state, arg1);
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      return { ok: true, lines: [{ text: `Target → ${r.file.name}`, type: 'green' }] };
    }
  }
  if (pluginId === 'archive-exporter') {
    if (cmd === 'list') {
      const arcs = state.ops?.archives || [];
      return { ok: true, lines: arcs.length ? arcs.map(a => ({ text: `${a.name} · ${a.count} files`, type: '' })) : [{ text: 'нет архивов', type: 'muted' }] };
    }
    if (cmd === 'pack') {
      const ids = args.length ? args : [];
      const r = createArchive(state, ids);
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      return { ok: true, lines: [{ text: `Archive → ${r.file.name}`, type: 'green' }, { text: 'Открой Files или прикрепи в N-Mail', type: 'muted' }] };
    }
  }
  if (pluginId === 'site-editor' && (cmd === 'set' || cmd === 'edit' || cmd === 'hijack' || cmd === 'paylink')) {
    if (state.ops?.serverSession) markServerModified(state);
  }
  if (pluginId === 'site-editor' && (cmd === 'hijack' || cmd === 'paylink')) {
    const siteId = arg1;
    const r = hijackPaymentLink(state, siteId, arg2 || 'operator-wallet');
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    return { ok: true, lines: [{ text: `Payment link diverted ~${r.minutes} min`, type: 'green' }, { text: 'Скрытый таймер. Сайт восстановится сам.', type: 'muted' }] };
  }


  // —— MOBILE / PHONE PIPELINE ——
  if (pluginId === 'net-link') {
    if (cmd === 'list') {
      return { ok: true, lines: [
        { text: 'REGIONS', type: 'blue' },
        ...PHONE_REGIONS.map(r => ({ text: `${r.id} · ${r.name} · ${r.netKey}`, type: '' }))
      ]};
    }
    if (cmd === 'status') {
      const n = state.phoneWorld?.network;
      if (!n) return { ok: true, lines: [{ text: 'Не подключено. connect <region_id>', type: 'muted' }] };
      return { ok: true, lines: [
        { text: `Сеть: ${n.regionId}`, type: 'green' },
        { text: `Key ${n.netKey} · SSID ${n.ssid}`, type: 'muted' }
      ]};
    }
    if (cmd === 'disconnect') {
      if (!state.phoneWorld?.network) return { ok: true, lines: [{ text: 'Сеть уже отключена.', type: 'muted' }] };
      state.phoneWorld.network = null;
      state._phoneTarget = null;
      state.phoneWorld.access = {};
      state.phoneWorld.discovered = {};
      return { ok: true, lines: [
        { text: 'Net Link — drop interface…', type: 'muted' },
        { text: 'Disconnected from regional net.', type: 'green' },
        { text: 'Phone sessions & discovered cleared.', type: 'muted' }
      ], progressUpdated: true, closePhoneLab: true, clearPhone: true };
    }
    if (cmd === 'connect') {
      const rid = arg1 || parts[1];
      const r = connectNetwork(state, rid);
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      return { ok: true, lines: [
        { text: 'Net Link — handshake…', type: 'muted' },
        { text: `Connected: ${r.region.name}`, type: 'green' },
        { text: `${r.region.netKey} / ${r.region.ssid}`, type: '' },
        { text: 'Дальше: run net-analyzer → scan', type: 'muted' }
      ], progressUpdated: true };
    }
  }

  if (pluginId === 'net-analyzer') {
    if (cmd === 'scan' || cmd === 'analyze') {
      const r = analyzeNetwork(state, state.meta?.seed || 'nb');
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      return {
        ok: true,
        lines: [
          { text: 'Net Analyzer — probe…', type: 'blue' },
          { text: `Region ${r.report.region.name}`, type: '' },
          { text: `Devices: ${r.report.count}`, type: 'green' },
          { text: 'Полный реестр готов. save <имя>', type: 'blue' }
        ],
        pendingSave: { kind: 'net-report', content: r.report.text, defaultName: `${r.report.region.id}-net`, type: 'network-report', encrypted: false },
        progressUpdated: true
      };
    }
  }

  if (pluginId === 'phone-access') {
    if (cmd === 'open') {
      const r = accessPhone(state, arg1, state.meta?.seed || 'nb');
      if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
      state._phoneTarget = r.phone.id;
      return { ok: true, lines: [
        { text: 'PHONE ACCESS', type: 'blue' },
        { text: `${r.phone.id} · ${r.phone.ownerName} · ${r.phone.ownerType}`, type: 'green' },
        { text: `${r.phone.model} · ${r.phone.number}`, type: 'muted' },
        { text: 'Дальше: Phone Lab на рабочем столе', type: 'muted' }
      ], progressUpdated: true };
    }
    if (cmd === 'status') {
      const id = state._phoneTarget;
      return { ok: true, lines: [{ text: id ? `Active: ${id}` : 'Нет активного PHONE_ID', type: id ? 'green' : 'muted' }] };
    }
    if (cmd === 'disconnect' || cmd === 'close') {
      const was = state._phoneTarget;
      state._phoneTarget = null;
      if (state.phoneWorld) {
        if (was && state.phoneWorld.access) delete state.phoneWorld.access[was];
        if (was && state.phoneWorld.discovered) delete state.phoneWorld.discovered[was];
      }
      return { ok: true, lines: [
        { text: was ? `Disconnect ${was}` : 'No active phone.', type: was ? 'green' : 'muted' },
        { text: 'Phone Lab session cleared.', type: 'muted' }
      ], progressUpdated: true, closePhoneLab: true };
    }
  }

  if (false && pluginId === 'phone-control') {
    const pid = state._phoneTarget || arg1;
    if (cmd === 'disconnect') {
      state._phoneTarget = null;
      return { ok: true, lines: [{ text: 'Disconnected.', type: 'muted' }] };
    }
    if (!pid || !state.phoneWorld?.access?.[pid]) {
      if (cmd !== 'help') return { ok: false, lines: [{ text: 'Сначала phone-access → open <PHONE_ID>', type: 'error' }] };
    }
    const phone = findPhone(pid, state.meta?.seed || 'nb');
    if (!phone && cmd !== 'help') return { ok: false, lines: [{ text: 'PHONE_ID invalid', type: 'error' }] };
    if (cmd === 'msgs' || cmd === 'messages') {
      const msgs = phoneMessages(phone, state.meta?.seed || 'nb');
      return { ok: true, lines: [{ text: `Messages · ${phone.id}`, type: 'blue' }, ...msgs.map(m => ({ text: `[${m.from}] ${m.text}`, type: '' }))] };
    }
    if (cmd === 'calls') {
      const calls = phoneCallLog(phone, state.meta?.seed || 'nb');
      return { ok: true, lines: [{ text: 'Call log', type: 'blue' }, ...calls.map(c => ({ text: `${c.dir} ${c.with}`, type: '' }))] };
    }
    if (cmd === 'contacts') {
      const ct = phoneContacts(phone, state.meta?.seed || 'nb');
      return { ok: true, lines: [{ text: 'Contacts', type: 'blue' }, ...ct.map(c => ({ text: `${c.name} · ${c.number}`, type: '' }))] };
    }
    if (cmd === 'gallery') {
      const g = phoneGallery(phone, state.meta?.seed || 'nb');
      return { ok: true, lines: [{ text: 'Gallery', type: 'blue' }, ...g.map(x => ({ text: `${x.id} · ${x.title}`, type: '' }))] };
    }
    if (cmd === 'save') {
      const what = arg1; // msgs|gallery
      const name = arg2 || parts[2];
      if (!name) return { ok: false, lines: [{ text: 'save msgs|gallery <имя>', type: 'error' }] };
      let content = '';
      if (what === 'msgs' || what === 'messages') content = phoneMessages(phone, state.meta?.seed||'nb').map(m=>`${m.from}: ${m.text}`).join('\n');
      else if (what === 'gallery') content = phoneGallery(phone, state.meta?.seed||'nb').map(x=>`${x.id} ${x.title} ${x.note}`).join('\n');
      else return { ok: false, lines: [{ text: 'save msgs|gallery <имя>', type: 'error' }] };
      return { ok: true, lines: [{ text: 'Готово к save в терминале: save уже через pending', type: 'muted' }],
        pendingSave: { kind: 'phone-export', content, defaultName: name, type: 'phone-data', encrypted: false } };
    }
    if (cmd === 'lock') {
      lockPhone(state, phone.id, 30);
      return { ok: true, lines: [{ text: `Phone ${phone.id} locked 30 min (sim)`, type: 'green' }], progressUpdated: true };
    }
    if (cmd === 'call') {
      return { ok: true, lines: [{ text: `Calling ${arg1||'contact'} as ${phone.ownerName}…`, type: 'muted' }, { text: 'Виртуальный звонок записан в журнал.', type: 'green' }] };
    }
    if (cmd === 'sms') {
      const text = parts.slice(1).join(' ');
      return { ok: true, lines: [{ text: `SMS as ${phone.ownerName}: ${text}`, type: 'green' }] };
    }
  }

  if (pluginId === 'mail-drop' && cmd === 'craft') {
    const name = arg1 || 'drop';
    const content = 'NULLBYTE MAIL DROP PAYLOAD\n(sim attachment — open chance on send via N-Mail)';
    return { ok: true, lines: [{ text: 'Craft attachment', type: 'blue' }, { text: 'save <имя> затем прикрепи в N-Mail', type: 'muted' }],
      pendingSave: { kind: 'mail-drop', content, defaultName: name, type: 'mail-drop', encrypted: false } };
  }

  if (pluginId === 'sms-bomber' && cmd === 'bomb') {
    if (!state.phoneWorld?.purchases?.smsBomber && !getInstalledPlugin(state,'sms-bomber')) {
      return { ok: false, lines: [{ text: 'Требуется покупка SMS Bomber (40000 CR) в NULForge', type: 'error' }] };
    }
    return { ok: true, lines: [{ text: `Bomb ${arg1} — sim flood queued`, type: 'green' }] };
  }

  if (pluginId === 'bank-peek' && cmd === 'peek') {
    if (!getInstalledPlugin(state,'bank-peek')) return { ok: false, lines: [{ text: 'Купи Bank Peek (100000 CR)', type: 'error' }] };
    const phone = findPhone(arg1, state.meta?.seed||'nb');
    if (!phone) return { ok: false, lines: [{ text: 'PHONE_ID?', type: 'error' }] };
    return { ok: true, lines: [
      { text: 'BANK PEEK (virtual)', type: 'blue' },
      { text: `${phone.ownerName} · notes: balance-hint=${50+((phone.index*17)%5000)} CR`, type: 'green' }
    ]};
  }

return { ok: false, lines: [{ text: `Неизвестная команда «${cmd}». Введи help.`, type: 'error' }] };
}

export function pluginShellBootLines(pluginId) {
  const shell = PLUGIN_SHELLS[pluginId];
  const plugin = getPlugin(pluginId);
  if (!shell) return [{ text: 'Unknown plugin shell', type: 'error' }];
  return [
    { text: shell.boot, type: 'blue' },
    { text: `MODULE: ${plugin?.name || pluginId} · ${plugin?.version || ''}`, type: 'muted' },
    { text: `CMDS: ${shell.help}`, type: 'muted' },
    { text: 'exit — выйти из модуля', type: 'muted' }
  ];
}


export function operateSite(state,siteId,operation,missionId=null) {
  const site=getSite(state,siteId); if(!site) return {ok:false,reason:'Игровая цель не найдена.'};
  if(site.kind==='bank'&&operation==='exploit') return {ok:false,reason:'Aster Union Bank использует отдельный подтверждаемый эндгейм-сценарий в приложении Aster Bank.'};
  if(site.recoveryAt>Date.now()) return {ok:false,reason:`Цель восстанавливается. Осталось ${Math.ceil((site.recoveryAt-Date.now())/60000)} мин.`};
  if(missionId){const mission=state.missions.items.find(x=>x.id===missionId);if(!mission||mission.status!=='accepted'||mission.target!==siteId)return {ok:false,reason:'Контракт неактивен или цель не совпадает с заказом.'};}
  const p=getSiteProgress(state,siteId); const pluginByOp={analyze:'site-analyzer',decode:'artifact-decoder',node:'node-radar',weakness:'weakness-lab',exploit:'sim-exploit',export:'data-exporter',modify:'site-editor',database:'db-reader'};
  const need=pluginByOp[operation];
  const cooldownUntil=need?(state.cooldowns[need]||0):0;
  if(cooldownUntil>Date.now()) return {ok:false,reason:`Плагин восстанавливается. Подожди ${Math.ceil((cooldownUntil-Date.now())/1000)} сек.`};
  if(need&&!getInstalledPlugin(state,need)) return {ok:false,reason:`Не установлен плагин ${getPlugin(need)?.name||need}.`};
  if(operation==='database' && site.kind!=='database') return {ok:false,reason:'Эта цель не содержит виртуальную базу данных.'};
  if(operation==='analyze') { p.analyzed=true; p.report={domain:site.domain,security:site.security,artifact:site.artifact,kind:site.kind}; }
  else if(operation==='decode') { if(!p.analyzed) return {ok:false,reason:'Сначала выполни анализ сайта.'}; p.decoded=true; }
  else if(operation==='node') { if(!p.decoded) return {ok:false,reason:'Сначала расшифруй игровой артефакт.'}; p.node=true; }
  else if(operation==='weakness') { if(!p.decoded && !p.node) return {ok:false,reason:'Сначала расшифруй отчёт или обнаружь узел.'}; p.node=true; p.weakness=true; }
  else if(operation==='exploit') {
    if(!p.weakness) return {ok:false,reason:'Сначала найди игровую слабость.'};
    const required=site.kind==='database'?6:1;
    if(site.kind==='database' && state.player.level<required) return {ok:false,reason:'Для этой виртуальной базы нужен уровень 6.'};
    const levelBonus=Math.min(0.24,(state.player.level-1)*0.025);
    const prepBonus=(state.computer.cpu-1)*0.025+(state.computer.gpu-1)*0.015;
    const maskBonus=getInstalledPlugin(state,'identity-mask')?0.08:0;
    // The first tutorial contract is guaranteed, so a new player cannot be soft-locked by RNG.
    const chance=missionId==='job-001'?1:Math.max(0.12,Math.min(0.94,0.98-site.security*0.07+levelBonus+prepBonus+maskBonus-site.defenseBoost*0.04));
    const roll=seededRoll(`${state.meta.seed}:${site.id}:${Date.now()}:${state.stats.operations}`);
    state.stats.operations++;
    if(roll>chance) {
      state.stats.failedOperations++;
      if(need) state.cooldowns[need]=Date.now()+(getPlugin(need)?.cooldown||0);
      site.defenseBoost=Math.min(5,site.defenseBoost+1);
      beginSiteRecovery(state,site,'failed-access');
      p.analyzed=false;p.decoded=false;p.node=false;p.weakness=false;p.access=false;p.database=false;p.exported=false;p.modified=false;
      return {ok:true,success:false,chance,message:`Симуляция доступа не пройдена (${Math.round(chance*100)}%). Защита цели усилена; восстановление запущено.`};
    }
    p.access=true;state.stats.successfulOperations++;
    site.defenseBoost=Math.min(5,site.defenseBoost+0.5);
  }
  else if(operation==='export') { if(!p.access) return {ok:false,reason:'Для экспорта сначала нужен симулируемый доступ.'}; if(site.kind==='database'&&!p.database) return {ok:false,reason:'Сначала прочитай виртуальную запись через Virtual DB Reader.'}; p.exported=true; const hasActiveMission=state.missions.items.some(m=>m.status==='accepted'&&m.target===siteId); if(!hasActiveMission) beginSiteRecovery(state,site,'export'); }
  else if(operation==='modify') { if(!p.access) return {ok:false,reason:'Для изменения сначала нужен симулируемый доступ.'}; p.modified=true;site.siteText='Содержимое обновлено в игровой симуляции.';site.revision++;beginSiteRecovery(state,site,'modified'); }
  else if(operation==='database') { if(!p.access) return {ok:false,reason:'Сначала получи симулируемый доступ.'}; p.database=true; }
  else return {ok:false,reason:'Операция не зарегистрирована.'};
  p.lastOperationAt=Date.now();
  if(need) state.cooldowns[need]=Date.now()+(getPlugin(need)?.cooldown||0);
  return {ok:true,success:true,message:({analyze:'Анализ завершён. Найден условный артефакт.',decode:'Игровой артефакт расшифрован.',node:'Виртуальный host-node обнаружен.',weakness:'Найдена условная слабость модели защиты.',exploit:'Симуляция доступа успешна.',export:'Результат готов к экспорту.',modify:'Игровое содержимое обновлено.',database:'Виртуальная запись прочитана.'})[operation]};
}
function seededRoll(seed) { let h=2166136261; for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4294967296; }
function beginSiteRecovery(state,site,reason='operation') {
  const jitter=0.7+seededRoll(`${state.meta.seed}:${site.id}:${reason}:${Date.now()}`)*0.6;
  site.state='recovering';
  site.recoveryAt=Date.now()+BALANCE.siteRecoveryBaseMs*(1+site.security*0.25)*jitter;
}

export function exportMissionResult(state,missionId) {
  const m=state.missions.items.find(x=>x.id===missionId);
  if(!m||m.status!=='accepted') return {ok:false,reason:'Нет активного контракта для экспорта.'};
  const existing=state.computer.files.find(f=>f.id===m.resultFileId);if(existing)return {ok:true,message:`Файл ${existing.name} уже создан.`};
  const p=state.world.progress[m.target];
  if(!p?.access) return {ok:false,reason:'Сначала заверши игровые этапы и получи симулируемый доступ.'};
  if(!p.exported) return {ok:false,reason:'Сначала выполни этап Data Exporter в Browser.'};
  const site=getSite(state,m.target);
  if(site.kind==='database'&&(!getInstalledPlugin(state,'db-reader')||!p.database)) return {ok:false,reason:'Сначала прочитай виртуальную запись через Virtual DB Reader.'};
  const content=`NULLBYTE DATASET\nCONTRACT=${m.id}\nTARGET=${site.domain}\nARTIFACT=${site.artifact}\nRESULT=${site.data}\nREVISION=${site.revision}\nSIMULATION_ONLY=true`;
  const file={id:idempotencyKey('file'),name:`${m.id}-result.nbd`,type:'dataset',content,size:Math.max(1,Math.ceil(content.length/1024)),createdAt:Date.now(),missionId:m.id};
  const use=getHardwareUsage(state);if(use.used+file.size>use.total)return {ok:false,reason:'Недостаточно места на виртуальном накопителе.'};
  state.computer.files.push(file);m.resultFileId=file.id;p.exported=true;state.stats.bytesExported+=content.length;
  return {ok:true,message:`Создан файл ${file.name}.`};
}
export function submitMission(state,missionId,eventId=idempotencyKey('deliver')) {
  return eventOnce(state,eventId,()=>{
    const m=state.missions.items.find(x=>x.id===missionId);if(!m||m.status!=='accepted')return {ok:false,reason:'Контракт не готов к сдаче.'};
    const file=state.computer.files.find(f=>f.id===m.resultFileId);if(!file)return {ok:false,reason:'Файл результата не найден.'};
    if(!file.content.includes(`CONTRACT=${m.id}`)||!file.content.includes('SIMULATION_ONLY=true'))return {ok:false,reason:'Файл не прошёл проверку формата.'};
    m.status='submitted';m.submittedAt=Date.now();m.verifyAt=Date.now()+BALANCE.verificationDelayMs;
    const site=getSite(state,m.target); if(site) beginSiteRecovery(state,site,'mission-submit');
    state.mail.messages.unshift({id:idempotencyKey('mail'),direction:'out',from:state.player.nickname,to:m.client,subject:`Результат контракта ${m.id}`,body:`Передан файл ${file.name}. Результат проверяется игровой системой.`,at:Date.now(),attachments:[file.id],status:'sent'});
    state.mail.messages.unshift({id:idempotencyKey('mail'),direction:'in',from:m.client,to:state.player.nickname,subject:'Результат получен',body:'Файл принят в очередь проверки. Ответ придёт во внутриигровую почту.',at:Date.now(),attachments:[],status:'unread'});
    return {ok:true,message:'Результат отправлен. Проверка завершится автоматически.'};
  });
}
export function processTimedEvents(state,now=Date.now()) {
  const notices=[];
  for(const site of state.world.sites) if(site.recoveryAt && site.recoveryAt<=now) {
    site.recoveryAt=0;site.defenseBoost=Math.max(0,site.defenseBoost-1);site.state='online';
    const base=SITES.find(item=>item.id===site.id);if(base)site.siteText=base.siteText;
    const contractStillActive=state.missions.items.some(m=>m.target===site.id&&m.status==='accepted');
    if(!contractStillActive)delete state.world.progress[site.id];
    notices.push(`${site.title}: защита вернулась в штатный режим.`);
  }
  for(const m of state.missions.items) if(m.status==='submitted'&&m.verifyAt&&m.verifyAt<=now) {
    const verifiedAt=m.verifyAt||now;
    const lock=state.bank.lockStartedAt>0 && state.bank.lockStartedAt<=verifiedAt && state.bank.lockUntil>verifiedAt;
    m.status='completed';m.completedAt=now;m.rewardPaid=true;
    state.player.contractsCompleted++;
    state.player.xp+=m.xp; updateLevel(state);
    state.player.reputation+=Math.max(1,Math.round(m.xp/20));
    state.player.totalEarned+=m.reward;
    if(lock) {
      state.economy.transactions.unshift({id:idempotencyKey('txn'),type:'confiscated',amount:m.reward,reason:`Конфискация награды ${m.id}: банковская блокировка`,at:now});
      notices.push(`Контракт ${m.id} завершён, но награда конфискована из-за блокировки банка.`);
    } else {addTransaction(state,'income',m.reward,`Награда за контракт ${m.id}`);notices.push(`Контракт ${m.id} проверен. +${m.reward} кредитов, +${m.xp} XP.`);}
    const msg={id:idempotencyKey('mail'),direction:'in',from:m.client,to:state.player.nickname,subject:`Проверка ${m.id}: успешно`,body:lock?'Результат принят. Награда конфискована из-за активной блокировки банка.':`Результат принят. Начислено ${m.reward} кредитов и ${m.xp} XP.`,at:now,attachments:[],status:'unread'};
    state.mail.messages.unshift(msg);
    unlockMissions(state);
  }
  notices.push(...updateNpcSchedule(state,now));
  updateLevel(state);
  unlockMissions(state);
  state.meta.updatedAt=now;
  
  // Temporary world mutations auto-restore (30–60 min).
  notices.push(...processTemporaryRestores(state, now));
  // Mission board rotation every 20 minutes (active jobs untouched).
  const rot = rotateMissionBoard(state, now, false);
  if (rot.rotated) notices.push(`BlackWire: новые предложения (${(rot.offered||[]).join(', ') || '—'}).`);

  return notices;
}
function unlockMissions(state) {
  for (const m of state.missions.items) {
    if (!String(m.id||'').startsWith('phone-')) continue;
    if (m.status === 'locked' && m.minLevel <= state.player.level) m.status = 'available';
  }
}
/** XP threshold for reaching level L (L>=1). Unbounded curve. */
export function xpThresholdForLevel(level) {
  const L = Math.max(1, Math.floor(level));
  if (L < BALANCE.xpToLevel.length) return BALANCE.xpToLevel[L] || 0;
  // beyond table: quadratic growth from last anchors
  const last = BALANCE.xpToLevel[BALANCE.xpToLevel.length - 1] || 3700;
  const prev = BALANCE.xpToLevel[BALANCE.xpToLevel.length - 2] || 3060;
  const step0 = last - prev;
  // level index past end
  let xp = last;
  for (let i = BALANCE.xpToLevel.length; i <= L; i++) {
    const extra = step0 + Math.floor((i - BALANCE.xpToLevel.length + 1) * 180);
    xp += extra;
  }
  return xp;
}

export function grantXp(state, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!n) return { leveled: false, gained: 0 };
  state.player.xp = (state.player.xp || 0) + n;
  const before = state.player.level;
  updateLevel(state);
  return { leveled: state.player.level > before, gained: n, level: state.player.level };
}

function updateLevel(state) {
  let next = state.player.level;
  while (next < BALANCE.maxLevel && state.player.xp >= xpThresholdForLevel(next)) next++;
  if (next > state.player.level) {
    const old = state.player.level;
    state.player.level = next;
    state.mail.messages.unshift({
      id: idempotencyKey('mail'), direction: 'in', from: 'NULLBYTE System', to: state.player.nickname,
      subject: `Новый уровень: ${next}`,
      body: `Уровень оператора повышен: ${old} → ${next}. Уровни не ограничены — только XP.`,
      at: Date.now(), attachments: [], status: 'unread'
    });
    unlockMissions(state);
  }
}
function updateNpcSchedule(state,now) {
  const notices=[];
  for(const npc of state.world.npc){
    const previous=npc.location;
    while(npc.nextAt&&npc.nextAt<=now){const locs=['north','oldport','industrial','center'];const index=locs.indexOf(npc.location);npc.location=locs[(index+1+locs.length)%locs.length];npc.nextAt+=20*60*1000;}
    if(previous!==npc.location){ /* silent: no toast/notice about district change */ }
  }
  return notices;
}
export function bankStatus(state,now=Date.now()) {return {locked:state.bank.lockUntil>now,remaining:Math.max(0,state.bank.lockUntil-now)};}
export function bankRisk(state) {
  const required=['bank-decryptor','identity-mask','obfuscator'];
  const missing=required.filter(id=>!getInstalledPlugin(state,id));
  const levelBonus=Math.min(0.20,Math.max(0,state.player.level-BALANCE.bankUnlockLevel)*0.035);
  const identityBonus=getInstalledPlugin(state,'identity-mask')?0.08:0;
  const vaultBonus=getInstalledPlugin(state,'bank-decryptor')?0.06:0;
  const obfuscationBonus=getInstalledPlugin(state,'obfuscator')?0.12:0;
  const hardwareBonus=Math.min(0.10,(state.computer.cpu-1)*0.015+(state.computer.gpu-1)*0.02);
  const bankSite=getSite(state,'aster-bank');
  const securityPenalty=(bankSite?.security||1)*0.035;
  const defensePenalty=(bankSite?.defenseBoost||0)*0.025;
  const traceChance=Math.max(0.08,Math.min(0.92,BALANCE.bankBaseTraceChance-levelBonus-identityBonus-vaultBonus-obfuscationBonus-hardwareBonus+securityPenalty+defensePenalty));
  return {traceChance,successChance:1-traceChance,missing,required,locked:bankStatus(state).locked,unlocked:state.player.level>=BALANCE.bankUnlockLevel};
}

export function attemptBankSimulation(state,confirmed=false,eventId=idempotencyKey('bank')) {
  if(!confirmed)return {ok:false,confirm:true,reason:'Подтверди запуск рискованной эндгейм-симуляции.'};
  return eventOnce(state,eventId,()=>{
    const status=bankStatus(state);if(status.locked)return {ok:false,reason:`Банк заблокирован ещё на ${Math.ceil(status.remaining/3600000)} ч.`};
    if(state.player.level<BALANCE.bankUnlockLevel)return {ok:false,reason:`Доступно с уровня ${BALANCE.bankUnlockLevel}.`};
    const required=['bank-decryptor','identity-mask','obfuscator'];const missing=required.filter(id=>!getInstalledPlugin(state,id));
    if(missing.length)return {ok:false,reason:`Не хватает плагинов: ${missing.map(id=>getPlugin(id).name).join(', ')}.`};
    state.bank.lastAttemptAt=Date.now();
    const chance=bankRisk(state).traceChance;
    const roll=seededRoll(`${state.meta.seed}:bank:${Date.now()}:${state.stats.operations}`);
    if(roll<chance){
      const confiscated=state.economy.credits;
      state.economy.transactions.unshift({id:idempotencyKey('txn'),type:'confiscated',amount:confiscated,reason:'Виртуальная трассировка: конфискация всех кредитов',at:Date.now()});
      state.economy.credits=0;state.bank.lockStartedAt=Date.now();state.bank.lockUntil=state.bank.lockStartedAt+BALANCE.bankLockMs;
      state.mail.messages.unshift({id:idempotencyKey('mail'),direction:'in',from:'Aster Union Bank',to:state.player.nickname,subject:'Банковская блокировка',body:'В игровой симуляции обнаружена виртуальная трассировка. Все кредиты конфискованы; банк заблокирован на 24 часа реального времени. Другие приложения и контракты остаются доступны.',at:Date.now(),attachments:[],status:'unread'});
      return {ok:true,success:false,chance,message:'Виртуальная трассировка! Все игровые кредиты конфискованы. Банк заблокирован на 24 часа.'};
    }
    addTransaction(state,'income',BALANCE.bankReward,'Эндгейм-контракт: симуляция Aster Union Bank');
    state.player.totalEarned+=BALANCE.bankReward;state.player.xp+=500;updateLevel(state);
    return {ok:true,success:true,chance,message:`Успех симуляции. +${BALANCE.bankReward} кредитов, +500 XP.`};
  });
}
export function saveEditorFile(state,name,content) {
  if(state.player.level<5)return {ok:false,reason:'Создание собственных NBS-файлов открывается на уровне 5.'};
  if(!getInstalledPlugin(state,'file-forge'))return {ok:false,reason:'Для сохранения собственного NBS-файла установи плагин File Forge в NULForge.'};
  const safeName=String(name||'').trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);
  if(!safeName)return {ok:false,reason:'Имя файла может содержать только латинские буквы, цифры, _ и -.'};
  if(!String(content||'').trim())return {ok:false,reason:'Файл пустой.'};
  const size=Math.max(1,Math.ceil(String(content).length/1024));
  const old=state.editor.files.find(f=>f.name===`${safeName}.nbs`);
  const usage=getHardwareUsage(state);if(!old&&usage.used+size>usage.total)return {ok:false,reason:'Недостаточно места на накопителе.'};
  const file={id:old?.id||idempotencyKey('nbs'),name:`${safeName}.nbs`,content:String(content).slice(0,12000),size,updatedAt:Date.now()};
  if(old)Object.assign(old,file);else state.editor.files.push(file);
  return {ok:true,message:`${file.name} сохранён.`};
}
const NBS_RULES = [
  {re:/^MISSION\s+"([A-Za-z0-9_-]{2,32})"$/i,op:'mission'},
  {re:/^TARGET\s+"([a-z0-9-]{2,40})"$/i,op:'target'},
  {re:/^ANALYZE\s+target$/i,op:'analyze'},
  {re:/^DECODE\s+artifact\s+"[A-Za-z0-9_-]{2,40}"$/i,op:'decode'},
  {re:/^DISCOVER\s+node$/i,op:'node'},
  {re:/^VERIFY\s+requirement\s+"[A-Za-z0-9_-]{2,40}"$/i,op:'weakness'},
  {re:/^READ\s+virtual-records$/i,op:'database'},
  {re:/^SIMULATE\s+access$/i,op:'exploit'},
  {re:/^EXPORT\s+dataset\s+"[A-Za-z0-9_-]{2,40}"$/i,op:'export'},
  {re:/^DELIVER\s+mail\s+"[A-Za-z0-9_-]{2,40}"$/i,op:'deliver'}
];
export function validateNbs(source) {
  const lines=String(source||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  if(!lines.length)return {ok:false,errors:['Файл не содержит команд.'],commands:[]};
  const commands=[],errors=[];
  if(lines.length>32)errors.push('Сценарий превышает лимит в 32 команды.');
  lines.slice(0,32).forEach((line,i)=>{const rule=NBS_RULES.find(r=>r.re.test(line));if(!rule)errors.push(`Строка ${i+1}: неизвестная или недопустимая команда.`);else commands.push({op:rule.op,line});});
  const declarations=commands.filter(c=>c.op==='mission'||c.op==='target');
  if(commands[0]?.op!=='mission'||commands[1]?.op!=='target')errors.push('Первые две команды должны быть MISSION и TARGET.');
  for(const op of ['mission','target','analyze','decode','node','weakness','database','exploit','export','deliver']) {
    if(commands.filter(c=>c.op===op).length>1)errors.push(`Команда ${op.toUpperCase()} может встречаться только один раз.`);
  }
  return {ok:errors.length===0,errors,commands};
}
export function runNbs(state,source) {
  if(state.player.level<5)return {ok:false,reason:'NULLBYTE Script открывается на уровне 5.'};
  const validation=validateNbs(source);if(!validation.ok)return {ok:false,reason:validation.errors.join('\n')};
  const commands=validation.commands;
  const missionCommand=commands.find(c=>c.op==='mission');
  const targetCommand=commands.find(c=>c.op==='target');
  if(!missionCommand||!targetCommand)return {ok:false,reason:'Сценарий должен начинаться с MISSION и TARGET.'};
  const missionId=missionCommand.line.match(/"([^"]+)"/)[1];
  const target=targetCommand.line.match(/"([^"]+)"/)[1];
  const mission=state.missions.items.find(x=>x.id===missionId);
  if(!mission||mission.status!=='accepted')return {ok:false,reason:'Укажи активный контракт командой MISSION.'};
  if(target!==mission.target)return {ok:false,reason:'TARGET не совпадает с закреплённой целью контракта.'};
  const deliverIndex=commands.findIndex(c=>c.op==='deliver');
  const exportIndex=commands.findIndex(c=>c.op==='export');
  if(deliverIndex>=0){
    const deliverId=commands[deliverIndex].line.match(/"([^"]+)"/)[1];
    if(deliverId!==missionId)return {ok:false,reason:'DELIVER должен ссылаться на тот же контракт, что и MISSION.'};
    if(deliverIndex!==commands.length-1)return {ok:false,reason:'DELIVER должен быть последней командой сценария.'};
    if(exportIndex<0||exportIndex>deliverIndex)return {ok:false,reason:'Перед DELIVER требуется команда EXPORT.'};
  }
  const targetSite=getSite(state,mission.target);
  const hasDatabase=commands.some(c=>c.op==='database');
  if(targetSite.kind==='database'&&exportIndex>=0&&!hasDatabase)return {ok:false,reason:'Для этой цели перед EXPORT требуется READ virtual-records.'};
  if(targetSite.kind!=='database'&&hasDatabase)return {ok:false,reason:'READ virtual-records доступна только для цели типа database.'};
  const output=[`Контракт: ${missionId}`,`Цель: ${target}`];
  for(const c of commands){
    if(c.op==='mission'||c.op==='target')continue;
    if(c.op==='deliver'){output.push('Результат отмечен для передачи через N-Mail.');continue;}
    const site=getSite(state,mission.target);
    const result=operateSite(state,site.id,c.op,missionId);
    if(!result.ok||result.success===false)return {ok:false,reason:result.reason||result.message||'Операция завершилась неудачей.',output};
    output.push(result.message);
  }
  const deliverRequested=deliverIndex>=0;
  if(!commands.some(c=>!['mission','target','deliver'].includes(c.op)))return {ok:false,reason:'Добавь в сценарий игровые операции.',output};
  return {ok:true,output,missionId,exportRequested:exportIndex>=0,deliverRequested};
}
export function addBookmark(state,siteId) {if(!getSite(state,siteId))return false;if(!state.browser.bookmarks.includes(siteId))state.browser.bookmarks.push(siteId);return true;}
export function recordHistory(state,siteId) {if(!getSite(state,siteId))return;state.browser.history.unshift({siteId,at:Date.now()});state.browser.history=state.browser.history.slice(0,50);state.browser.activeSite=siteId;}

export { listIntelSummary, seedIntelFromSites, createEmptyIntel };

export { pluginDocs, searchNpcs, bankLogin, bankTransfer, getBankSession, touchNpc, getNpc, NPC_POOL_SIZE, requestNpcTransfer };
export { createArchive, buildServerIndex, extractTarget, signalMapRegion, hijackPaymentLink, REGIONS, extendedPluginDocs };
export function allPluginDocs(){ return { ...pluginDocs(), ...extendedPluginDocs() }; }


export { npcReply, openingLine, moneyDialogue, dialogueStats } from './dialogue.js';


/** Site/web missions hidden while web ops under construction. Phone board later. */

/** Bind concrete phone identity to a phone mission (stable per mission id + seed). */
export function bindPhoneMissionTarget(mission, seedRoot = 'nb') {
  if (!mission || !(String(mission.id || '').startsWith('phone-'))) return mission;
  if (mission._bound) return mission; // once
  const regionId = mission.regionId || 'bayshore';
  try {
    const list = listRegionPhones(regionId, seedRoot);
    let h = 0; const s = String(mission.id || 'p');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const phone = list[Math.abs(h) % list.length];
    mission.phoneId = phone.id;
    mission.ownerName = phone.ownerName;
    mission.phoneNumber = phone.number;
    mission.regionId = regionId;
    mission._bound = true;
    // clean objective once (no stack)
    const baseObj = String(mission.objective || '').split(' Сеть:')[0].trim();
    mission.objective = baseObj;
  } catch (e) {}
  return mission;
}

export function isMissionVisible(m) {
  if (!m) return false;
  // only new phone-* contracts in this build
  return String(m.id || '').startsWith('phone-');
}

export function listVisibleMissions(state) {
  return (state.missions?.items || []).filter(isMissionVisible);
}

export { PHONE_REGIONS, findPhone, buildNetworkReport, listRegionPhones } from './phones.js';


export function queueMailDropOpens(state, now = Date.now()) {
  const notices = [];
  if (!state.mail?.pendingDrops) state.mail.pendingDrops = [];
  const left = [];
  for (const d of state.mail.pendingDrops) {
    if (d.openAt > now) { left.push(d); continue; }
    if (d.opened) { left.push(d); continue; }
    // roll once
    const open = (Math.abs((d.seed || 1) % 100) < (d.chance || 45));
    d.opened = true;
    d.result = open ? 'opened' : 'ignored';
    if (open) {
      const phoneId = d.phoneId || `PH-BAYS-${String((d.seed || 0) % 550).padStart(4, '0')}`;
      notices.push(`NPC открыл вложение → PHONE_ID ${phoneId} · ${d.ownerName || 'owner'}`);
      state.mail.messages.unshift({
        id: `mail_drop_${now}`,
        direction: 'in',
        from: d.npcName || 'NPC',
        to: state.player.nickname,
        subject: 'Вложение просмотрено',
        body: `Устройство: ${phoneId}\nВладелец: ${d.ownerName || '—'}\nНомер: ${d.number || '—'}`,
        at: now,
        attachments: [],
        status: 'unread'
      });
      if (state.phoneWorld) state.phoneWorld.discovered[phoneId] = true;
    } else {
      notices.push('NPC проигнорировал вложение.');
    }
    left.push(d);
  }
  state.mail.pendingDrops = left.slice(-30);
  return notices;
}
