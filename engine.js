/* NULLBYTE game engine. Fictional, deterministic client-side simulation only. */
export const SAVE_VERSION = 1;
export const BALANCE = {
  creditsStart: 650,
  maxLevel: 10,
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
  { id:'site-analyzer', name:'Site Analyzer', category:'Анализ сайтов', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:120, cooldown:0, description:'Читает параметры вымышленных сайтов и артефактов.', effect:'Открывает первичный анализ игровой цели.', starter:true },
  { id:'artifact-decoder', name:'Artifact Decoder', category:'Расшифровка', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:180, cooldown:0, description:'Преобразует условный игровой артефакт в подсказку.', effect:'Открывает шаг декодирования.', starter:true },
  { id:'node-radar', name:'Node Radar', category:'Обнаружение узлов', version:'1.1.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:260, cooldown:5000, description:'Находит симулируемый узел цели в личном мире.', effect:'Показывает игровой host-node.', starter:true },
  { id:'weakness-lab', name:'Weakness Lab', category:'Поиск игровых слабостей', version:'1.2.0', price:0, requiredLevel:1, minOs:1, ram:2, storage:420, cooldown:7000, description:'Проверяет абстрактную модель защиты цели.', effect:'Открывает условную слабость.', starter:true },
  { id:'sim-exploit', name:'Sim Exploit', category:'Симуляция доступа', version:'2.0.0', price:0, requiredLevel:1, minOs:1, ram:2, storage:650, cooldown:12000, description:'Выполняет безопасную игровую проверку шанса доступа.', effect:'Завершает этап проникновения в симуляции.', starter:true },
  { id:'data-exporter', name:'Data Exporter', category:'Экспорт', version:'1.0.0', price:0, requiredLevel:1, minOs:1, ram:1, storage:220, cooldown:0, description:'Создаёт файл с результатом внутриигровой операции.', effect:'Позволяет экспортировать результат контракта.', starter:true },
  { id:'site-editor', name:'Site Editor', category:'Изменение сайта', version:'1.0.0', price:620, requiredLevel:4, ram:2, storage:380, cooldown:9000, description:'Меняет текст или виртуальную запись тестовой цели.', effect:'Открывает игровое изменение содержимого.',minOs:2 },
  { id:'db-reader', name:'Virtual DB Reader', category:'Виртуальные данные', version:'1.0.0', price:1900, requiredLevel:6, ram:3, storage:900, cooldown:15000, description:'Читает только записи собственной вымышленной базы.', effect:'Открывает высокоуровневые игровые записи.',minOs:3 },
  { id:'identity-mask', name:'Identity Veil', category:'Игровая маскировка', version:'1.0.0', price:3800, requiredLevel:7, ram:2, storage:700, cooldown:0, description:'Снижает условную заметность персонажа в модели мира.', effect:'Уменьшает симулируемый банковский риск.',minOs:3 },
  { id:'bank-decryptor', name:'Vault Decoder', category:'Банк / эндгейм', version:'1.0.0', price:5200, requiredLevel:8, ram:3, storage:1200, cooldown:0, description:'Редкий декриптор для финальной банковской миссии.', effect:'Необходим для рискованной игровой цели.',minOs:4 },
  { id:'obfuscator', name:'Trace Obfuscator', category:'Банк / эндгейм', version:'1.0.0', price:4600, requiredLevel:8, ram:2, storage:1000, cooldown:0, description:'Снижает риск виртуальной трассировки.', effect:'Необходим для рискованной игровой цели.',minOs:4 },
  { id:'file-forge', name:'File Forge', category:'Создание файлов', version:'1.0.0', price:520, requiredLevel:5, ram:1, storage:300, cooldown:0, description:'Подготавливает виртуальные файлы и NBS-документы.', effect:'Разблокирует продвинутую работу с файлами.',minOs:2 },
  { id:'map-scanner', name:'Atlas Scanner', category:'Карта / цели', version:'1.0.0', price:350, requiredLevel:2, ram:1, storage:250, cooldown:0, description:'Уточняет POI и игровые маршруты на NullAtlas.', effect:'Показывает расширенные подсказки карты.',minOs:1 }
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
];

export const LOCATIONS = [
  {id:'north',name:'Северный сектор',city:'Новый Архив',region:'Север',x:68,y:22,pois:['aster-bank','neon-motors','pocket-mobile']},
  {id:'oldport',name:'Старый порт',city:'Новый Архив',region:'Запад',x:24,y:47,pois:['volt-market','cobalt-forum','north-wifi']},
  {id:'industrial',name:'Промзона',city:'Новый Архив',region:'Юг',x:56,y:77,pois:['gridworks']},
  {id:'center',name:'Центр',city:'Новый Архив',region:'Восток',x:78,y:56,pois:['civic-records']}
];

const STARTER_CONTRACT_TOOLS=['site-analyzer','artifact-decoder','node-radar','weakness-lab','sim-exploit','data-exporter'];
const DB_CONTRACT_TOOLS=[...STARTER_CONTRACT_TOOLS,'db-reader'];
const MISSION_TEMPLATES = [
  {id:'job-001',title:'Потерянная накладная',client:'Mira Voss',target:'volt-market',difficulty:'Лёгкая',minLevel:1,reward:180,xp:110,objective:'Найти игровую запись заказа VM-204 и передать файл клиенту.',hint:'В каталоге Volt Market хранится артефакт CATALOG-B7.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-002',title:'Сервисный журнал',client:'GridWorks Support',target:'gridworks',difficulty:'Средняя',minLevel:2,reward:360,xp:95,objective:'Получить виртуальный журнал GW-11 и отправить отчёт.',hint:'Сайт расположен в Промзоне. Защита выше базовой.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-003',title:'Автомобильная карточка',client:'Eli North',target:'neon-motors',difficulty:'Средняя',minLevel:2,reward:420,xp:110,objective:'Экспортировать карточку автомобиля NM-88.',hint:'Ищи игровой артефакт VIN-SIM-88.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-004',title:'Тема на форуме',client:'Cobalt Moderator',target:'cobalt-forum',difficulty:'Лёгкая',minLevel:3,reward:480,xp:125,objective:'Получить копию виртуального сообщения из темы форума.',hint:'Форум находится в Старом порту.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-005',title:'Запись муниципалитета',client:'Office 04',target:'civic-records',difficulty:'Сложная',minLevel:6,reward:780,xp:185,objective:'Извлечь и экспортировать виртуальную запись CR-29.',hint:'Нужен Virtual DB Reader для чтения этой цели.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-006',title:'Диагностика телефона',client:'Nora Vale',target:'pocket-mobile',difficulty:'Средняя',minLevel:3,reward:610,xp:150,objective:'Получить отчёт о состоянии демонстрационного телефона PM-22.',hint:'Телефон — полностью вымышленная цель NPC.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-007',title:'Точка доступа',client:'Harbor Cafe',target:'north-wifi',difficulty:'Средняя',minLevel:4,reward:820,xp:200,objective:'Экспортировать параметры игровой точки доступа AP-05.',hint:'Точка находится на Площади Маяк.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-008',title:'Архивный реестр',client:'Archive Keeper',target:'civic-records',difficulty:'Сложная',minLevel:6,reward:1250,xp:280,objective:'Получить расширенную запись муниципального архива.',hint:'Требуется редкий плагин Virtual DB Reader.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-009',title:'Сервисная диагностика',client:'Neon Motors',target:'neon-motors',difficulty:'Средняя',minLevel:5,reward:1700,xp:350,objective:'Подготовить виртуальный отчёт о состоянии сервисной карточки автомобиля.',hint:'NBS уже доступен. Проверь, что File Forge и обновление ОС не мешают покупке DB Reader.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-010',title:'Состояние городской точки',client:'Harbor Cafe',target:'north-wifi',difficulty:'Средняя',minLevel:5,reward:1100,xp:100,objective:'Передать отчёт о виртуальной точке доступа AP-05.',hint:'Точка отмечена на NullAtlas возле Площади Маяк.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-011',title:'Профиль устройства',client:'Pocket Mobile Support',target:'pocket-mobile',difficulty:'Сложная',minLevel:7,reward:2600,xp:240,objective:'Получить расширенную карточку демонстрационного телефона PM-22.',hint:'Изучи виртуальный адрес устройства через Browser и NullAtlas.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-012',title:'Энергорайон: журнал',client:'GridWorks Support',target:'gridworks',difficulty:'Сложная',minLevel:7,reward:3100,xp:280,objective:'Собрать новый отчёт по виртуальному журналу контроллера GW-11.',hint:'Виртуальная цель восстановилась после предыдущих заказов.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-013',title:'Обсуждение сообщества',client:'Cobalt Moderator',target:'cobalt-forum',difficulty:'Сложная',minLevel:8,reward:3600,xp:300,objective:'Передать архивную запись из виртуальной темы форума.',hint:'Проверь текущее состояние Cobalt Forum перед началом.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-014',title:'Сервисный архив',client:'Neon Motors',target:'neon-motors',difficulty:'Сложная',minLevel:8,reward:3900,xp:320,objective:'Экспортировать расширенную сервисную карточку NM-88.',hint:'Цель использует ту же безопасную последовательность операций.',requiredPlugins:STARTER_CONTRACT_TOOLS},
  {id:'job-015',title:'Закрытая запись архива',client:'Archive Keeper',target:'civic-records',difficulty:'Очень сложная',minLevel:9,reward:4700,xp:400,objective:'Извлечь дополнительную виртуальную запись CR-29 и оформить набор данных.',hint:'Нужен Virtual DB Reader и NULLBYTE OS 3.0 или новее.',requiredPlugins:DB_CONTRACT_TOOLS},
  {id:'job-016',title:'Аудит городской инфраструктуры',client:'GridWorks Director',target:'gridworks',difficulty:'Очень сложная',minLevel:9,reward:5200,xp:700,objective:'Подготовить итоговый отчёт о состоянии виртуальной инфраструктуры.',hint:'Это один из последних контрактов перед максимальным уровнем.',requiredPlugins:STARTER_CONTRACT_TOOLS}
];

export function validNickname(value) { return /^[A-Za-z0-9]{2,12}$/.test(String(value || '')); }
export function escapeText(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
export function idempotencyKey(prefix='evt') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; }

export function createInitialState(tgUser=null) {
  const now=Date.now();
  return {
    version:SAVE_VERSION,
    meta:{createdAt:now,updatedAt:now,seed:`nb-${now.toString(36)}`,migratedFrom:null},
    player:{nickname:'',telegramId:tgUser?.id ? String(tgUser.id) : '',level:1,xp:0,reputation:0,contractsCompleted:0,totalEarned:0},
    economy:{credits:BALANCE.creditsStart,transactions:[{id:'txn-starter',type:'income',amount:BALANCE.creditsStart,reason:'Стартовый грант оператора',at:now}]},
    computer:{cpu:1,ram:1,gpu:1,storage:1,os:1,files:[],installedPlugins:['site-analyzer','artifact-decoder','node-radar','weakness-lab','sim-exploit','data-exporter'],uptimeStartedAt:now},
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
    processedEvents:[],
    stats:{operations:0,successfulOperations:0,failedOperations:0,bytesExported:0}
  };
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
  out.ops={keys:Array.isArray(raw.ops?.keys)?raw.ops.keys.filter(k=>k&&typeof k==='object').slice(-40).map(k=>({id:String(k.id||'').slice(0,64),stage:String(k.stage||''),siteId:String(k.siteId||''),token:String(k.token||'').slice(0,80),createdAt:finite(k.createdAt),used:Boolean(k.used)})):[ ]};
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
  out.missions.items=fresh.missions.items.map(base=>{const saved=savedMissions.find(x=>x&&x.id===base.id)||{};return {...base,status:['locked','available','accepted','submitted','completed'].includes(saved.status)?saved.status:base.status,acceptedAt:finite(saved.acceptedAt),submittedAt:finite(saved.submittedAt),verifyAt:finite(saved.verifyAt),resultFileId:typeof saved.resultFileId==='string'?saved.resultFileId:'',rewardPaid:Boolean(saved.rewardPaid),completedAt:finite(saved.completedAt),snapshot:saved.snapshot&&typeof saved.snapshot==='object'?saved.snapshot:null};});
  if (!Array.isArray(out.mail.messages)) out.mail.messages=fresh.mail.messages;
  out.mail.messages=out.mail.messages.filter(m=>m&&typeof m==='object').slice(0,100).map(m=>({id:(String(m.id||idempotencyKey('mail')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('mail')),direction:m.direction==='out'?'out':'in',from:String(m.from||'NULLBYTE').slice(0,60),to:String(m.to||'operator').slice(0,60),subject:String(m.subject||'Без темы').slice(0,120),body:String(m.body||'').slice(0,4000),at:finite(m.at)||Date.now(),attachments:Array.isArray(m.attachments)?m.attachments.filter(x=>typeof x==='string').slice(0,10):[],status:['unread','read','sent'].includes(m.status)?m.status:'read'}));
  if(!Array.isArray(out.computer.files)) out.computer.files=[];
  out.computer.files=out.computer.files.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&typeof f.content==='string').slice(0,300).map(f=>({...f,id:(String(f.id||idempotencyKey('file')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('file')),name:f.name.replace(/[^A-Za-z0-9_.-]/g,'').slice(0,64),content:f.content.slice(0,20000),size:clamp(f.size,1,50000)}));
  if(!Array.isArray(out.editor.files)) out.editor.files=[];
  out.editor.files=out.editor.files.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&typeof f.content==='string').slice(0,100).map(f=>({...f,id:(String(f.id||idempotencyKey('nbs')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||idempotencyKey('nbs')),name:f.name.replace(/[^A-Za-z0-9_.-]/g,'').slice(0,32),content:f.content.slice(0,12000),size:clamp(f.size,1,12000)}));
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
  const m=state.missions.items.find(x=>x.id===missionId);
  if(!m||m.status!=='available') return {ok:false,reason:'Контракт сейчас недоступен.'};
  if(state.player.level<m.minLevel) return {ok:false,reason:`Требуется уровень ${m.minLevel}.`};
  const missing=(m.requiredPlugins||[]).filter(id=>!getInstalledPlugin(state,id));
  if(missing.length)return {ok:false,reason:`Для контракта нужны плагины: ${missing.map(id=>getPlugin(id)?.name||id).join(', ')}.`};
  const active=state.missions.items.filter(x=>x.status==='accepted'||x.status==='submitted').length;
  if(active>=3) return {ok:false,reason:'Одновременно можно вести не более трёх контрактов.'};
  m.status='accepted'; m.acceptedAt=Date.now();
  m.snapshot={siteRevision:state.world.sites.find(s=>s.id===m.target)?.revision||1,security:state.world.sites.find(s=>s.id===m.target)?.security||1};
  return {ok:true,message:`Контракт ${m.id} принят. Цель закреплена в личном мире.`};
}
export function getSite(state,siteId) { return state.world.sites.find(s=>s.id===siteId); }
export function getSiteProgress(state,siteId) {
  if(!state.world.progress[siteId]) state.world.progress[siteId]={analyzed:false,decoded:false,node:false,weakness:false,access:false,database:false,exported:false,modified:false,report:null,lastOperationAt:0};
  return state.world.progress[siteId];
}

/* —— Terminal plugin sessions / one-time operation keys —— */
export const PLUGIN_SHELLS = {
  'site-analyzer': {
    boot: 'Site Analyzer v1.0 — разбор вымышленной цели.',
    help: 'analyze <domain> | scan <domain> | help | exit',
    commands: ['analyze', 'scan', 'help', 'exit']
  },
  'artifact-decoder': {
    boot: 'Artifact Decoder v1.0 — расшифровка игрового артефакта по ключу анализа.',
    help: 'decode <key> | help | exit',
    commands: ['decode', 'help', 'exit']
  },
  'node-radar': {
    boot: 'Node Radar v1.1 — поиск виртуального host-node.',
    help: 'discover <key> | find <key> | help | exit',
    commands: ['discover', 'find', 'help', 'exit']
  },
  'weakness-lab': {
    boot: 'Weakness Lab v1.2 — модель защиты цели.',
    help: 'probe <key> | weakness <key> | help | exit',
    commands: ['probe', 'weakness', 'help', 'exit']
  },
  'sim-exploit': {
    boot: 'Sim Exploit v2.0 — безопасная симуляция доступа.',
    help: 'simulate <key> | exploit <key> | help | exit',
    commands: ['simulate', 'exploit', 'help', 'exit']
  },
  'data-exporter': {
    boot: 'Data Exporter v1.0 — пакет результата для N-Mail.',
    help: 'export <key> [mission-id] | pack <key> [mission-id] | help | exit',
    commands: ['export', 'pack', 'help', 'exit']
  },
  'db-reader': {
    boot: 'Virtual DB Reader v1.0 — чтение виртуальных записей.',
    help: 'read <key> | query <key> | help | exit',
    commands: ['read', 'query', 'help', 'exit']
  }
};


export const PLUGIN_ANIM = {
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
export function runPluginShellCommand(state, pluginId, rawLine, missionIdHint = null) {
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
  if (pluginId === 'site-analyzer' && (cmd === 'analyze' || cmd === 'scan')) {
    const site = resolveSiteRef(state, arg1);
    if (!site) return { ok: false, lines: [{ text: 'Цель не найдена. Укажи домен .null (скопируй из Browser).', type: 'error' }] };
    if (site.recoveryAt > Date.now()) {
      return { ok: false, lines: [{ text: `Цель восстанавливается ещё ~${Math.ceil((site.recoveryAt - Date.now()) / 60000)} мин.`, type: 'error' }] };
    }
    const r = operateSite(state, site.id, 'analyze', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    const key = issueOpKey(state, 'analyze', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: `[boot] probing ${site.domain} …`, type: 'muted' });
    lines.push({ text: `TITLE: ${site.title}`, type: '' });
    lines.push({ text: `KIND: ${site.kind} · SEC: ${site.security}/5 · REGION: ${site.region}`, type: '' });
    lines.push({ text: `ARTIFACT_HINT: ${site.artifact}`, type: 'blue' });
    lines.push({ text: `NOTE: ${site.description}`, type: 'muted' });
    lines.push({ text: `SIGNATURE: ${key.token}`, type: 'green' });
    lines.push({ text: 'Сигнатура одноразовая. Нужна в Artifact Decoder (decode <sig>).', type: 'muted' });
    return { ok: true, lines, key: key.token, progressUpdated: true };
  }

  // —— artifact-decoder ——
  if (pluginId === 'artifact-decoder' && cmd === 'decode') {
    const key = findOpKey(state, arg1);
    if (!key || key.stage !== 'analyze' || key.used) {
      return { ok: false, lines: [{ text: 'Нужна свежая SIGNATURE от Site Analyzer (формат SIG/…).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    if (!site) return { ok: false, lines: [{ text: 'Цель ключа исчезла.', type: 'error' }] };
    const r = operateSite(state, site.id, 'decode', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    key.used = true;
    const next = issueOpKey(state, 'decode', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: `decoding artifact ${site.artifact} …`, type: 'muted' });
    lines.push({ text: `DECODED: условная запись связана с ${site.data}`, type: '' });
    lines.push({ text: `ARTIFACT_ID: ${next.token}`, type: 'green' });
    return { ok: true, lines, key: next.token, progressUpdated: true };
  }

  // —— node-radar ——
  if (pluginId === 'node-radar' && (cmd === 'discover' || cmd === 'find')) {
    const key = findOpKey(state, arg1);
    if (!key || key.stage !== 'decode' || key.used) {
      return { ok: false, lines: [{ text: 'Нужен свежий ARTIFACT_ID от Artifact Decoder (формат ART-ID:…).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    const r = operateSite(state, site.id, 'node', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    key.used = true;
    const next = issueOpKey(state, 'node', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: `scanning virtual subnet near ${site.domain} …`, type: 'muted' });
    lines.push({ text: `NODE: host-${site.id}.sim.null · lag ${12 + site.security * 3}ms`, type: '' });
    lines.push({ text: `HOST_HANDLE: ${next.token}`, type: 'green' });
    return { ok: true, lines, key: next.token, progressUpdated: true };
  }

  // —— weakness-lab ——
  if (pluginId === 'weakness-lab' && (cmd === 'probe' || cmd === 'weakness')) {
    const key = findOpKey(state, arg1);
    if (!key || key.stage !== 'node' || key.used) {
      return { ok: false, lines: [{ text: 'Нужен HOST_HANDLE от Node Radar (формат HOST/…).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    const r = operateSite(state, site.id, 'weakness', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    key.used = true;
    const next = issueOpKey(state, 'weakness', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: 'building defense model …', type: 'muted' });
    lines.push({ text: `MODEL: abstract surface ${site.security} · boost ${site.defenseBoost}`, type: '' });
    lines.push({ text: `VECTOR_ID: ${next.token}`, type: 'green' });
    return { ok: true, lines, key: next.token, progressUpdated: true };
  }

  // —— sim-exploit ——
  if (pluginId === 'sim-exploit' && (cmd === 'simulate' || cmd === 'exploit')) {
    const key = findOpKey(state, arg1);
    if (!key || key.stage !== 'weakness' || key.used) {
      return { ok: false, lines: [{ text: 'Нужен VECTOR_ID от Weakness Lab (формат VEC#…).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    const mission = state.missions.items.find(m => m.status === 'accepted' && m.target === site.id);
    const r = operateSite(state, site.id, 'exploit', mission?.id || null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    key.used = true;
    if (r.success === false) {
      touchCooldown(state, pluginId);
      return { ok: true, lines: [{ text: r.message, type: 'error' }, { text: 'Прогресс по цели сброшен. Начни цепочку заново.', type: 'muted' }], progressUpdated: true };
    }
    const next = issueOpKey(state, 'access', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: 'running sandbox access check …', type: 'muted' });
    lines.push({ text: r.message, type: 'green' });
    lines.push({ text: `DATA_SAMPLE: ${site.data}`, type: '' });
    lines.push({ text: `SESSION_TOKEN: ${next.token}`, type: 'green' });
    return { ok: true, lines, key: next.token, progressUpdated: true };
  }

  // —— db-reader ——
  if (pluginId === 'db-reader' && (cmd === 'read' || cmd === 'query')) {
    const key = findOpKey(state, arg1);
    if (!key || key.stage !== 'access' || key.used) {
      return { ok: false, lines: [{ text: 'Нужен SESSION_TOKEN после Sim Exploit (формат SESSION=…).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    if (site.kind !== 'database') {
      return { ok: false, lines: [{ text: 'Эта цель не содержит виртуальную БД.', type: 'error' }] };
    }
    key.used = true;
    const r = operateSite(state, site.id, 'database', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    const next = issueOpKey(state, 'database', site.id);
    touchCooldown(state, pluginId);
    lines.push({ text: `READ virtual-records @ ${site.domain}`, type: 'muted' });
    lines.push({ text: `ROW: ${site.data}`, type: '' });
    lines.push({ text: `ROW_REF: ${next.token}`, type: 'green' });
    return { ok: true, lines, key: next.token, progressUpdated: true };
  }

  // —— data-exporter ——
  if (pluginId === 'data-exporter' && (cmd === 'export' || cmd === 'pack')) {
    const key = findOpKey(state, arg1);
    if (!key || key.used) {
      return { ok: false, lines: [{ text: 'Нужен неиспользованный SESSION_TOKEN (или ROW_REF для database-целей).', type: 'error' }] };
    }
    const site = getSite(state, key.siteId);
    if (!site) return { ok: false, lines: [{ text: 'Цель ключа не найдена.', type: 'error' }] };
    const needStage = site.kind === 'database' ? 'database' : 'access';
    if (key.stage !== needStage) {
      return { ok: false, lines: [{ text: `Для этой цели нужен ключ стадии ${needStage}.`, type: 'error' }] };
    }
    key.used = true;
    const r = operateSite(state, site.id, 'export', null);
    if (!r.ok) return { ok: false, lines: [{ text: r.reason, type: 'error' }] };
    touchCooldown(state, pluginId);
    lines.push({ text: 'packing dataset …', type: 'muted' });
    lines.push({ text: r.message, type: '' });

    let mission = null;
    if (arg2) mission = state.missions.items.find(m => m.id === arg2 && m.status === 'accepted');
    if (!mission) mission = state.missions.items.find(m => m.status === 'accepted' && m.target === site.id);
    if (mission) {
      const exp = exportMissionResult(state, mission.id);
      if (exp.ok) {
        lines.push({ text: exp.message, type: 'green' });
        lines.push({ text: 'Файл готов. Отправь его заказчику через N-Mail.', type: 'muted' });
        return { ok: true, lines, progressUpdated: true, exportFile: true, missionId: mission.id };
      }
      lines.push({ text: exp.reason, type: 'error' });
      return { ok: true, lines, progressUpdated: true };
    }
    lines.push({ text: 'Активный контракт на эту цель не найден — файл миссии не создан.', type: 'muted' });
    return { ok: true, lines, progressUpdated: true };
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
  else if(operation==='weakness') { if(!p.node) return {ok:false,reason:'Сначала обнаружь виртуальный узел.'}; p.weakness=true; }
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
    state.player.xp+=m.xp;
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
  return notices;
}
function unlockMissions(state) { for(const m of state.missions.items) if(m.status==='locked'&&m.minLevel<=state.player.level)m.status='available'; }
function updateLevel(state) {
  let next=state.player.level;
  while(next<BALANCE.maxLevel&&state.player.xp>=BALANCE.xpToLevel[next])next++;
  if(next>state.player.level) {
    const old=state.player.level;state.player.level=next;
    state.mail.messages.unshift({id:idempotencyKey('mail'),direction:'in',from:'NULLBYTE System',to:state.player.nickname,subject:`Новый уровень: ${next}`,body:`Уровень оператора повышен: ${old} → ${next}. ${next>=5?'Доступно создание игровых NBS-файлов.':''}`,at:Date.now(),attachments:[],status:'unread'});
    unlockMissions(state);
  }
}
function updateNpcSchedule(state,now) {
  const notices=[];
  for(const npc of state.world.npc){
    const previous=npc.location;
    while(npc.nextAt&&npc.nextAt<=now){const locs=['north','oldport','industrial','center'];const index=locs.indexOf(npc.location);npc.location=locs[(index+1+locs.length)%locs.length];npc.nextAt+=20*60*1000;}
    if(previous!==npc.location){const place=LOCATIONS.find(x=>x.id===npc.location)?.name||npc.location;notices.push(`NPC: ${npc.name} сменил район → ${place}.`);}
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
