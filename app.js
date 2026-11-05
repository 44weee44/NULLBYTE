import {
  BALANCE, PLUGINS, HARDWARE, SITES, LOCATIONS, createInitialState, validNickname, escapeText as esc,
  getInstalledPlugin, getPlugin, getHardwareUsage, getRamUsage, purchasePlugin, buyHardware, uninstallPlugin,
  acceptMission, getSite, getSiteProgress, operateSite, exportMissionResult, submitMission,
  processTimedEvents, bankStatus, bankRisk, attemptBankSimulation, saveEditorFile, validateNbs, runNbs,
  recordHistory, addBookmark, idempotencyKey
} from './engine.js';
import { loadSavedGame, saveGame } from './storage.js';

const $ = id => document.getElementById(id);
const svg = {
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.1 3.3-6.2 8-6.2s7.3 2.1 8 6.2"/>',
  terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  darkshop:'<path d="M4 8h16l-1.5 13h-13L4 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  browser:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  forge:'<path d="M4 5h16v14H4zM8 9l3 3-3 3m6 0h3"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  blackwire:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8m-8 4h5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.8 1.3c-1.1 1.4-2.3 1.6-2.3 3.2m0 3h.01"/>',
  ide:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  bank:'<path d="m3 9 9-6 9 6M5 10v9m5-9v9m4-9v9m5-9v9M3 21h18"/>',
  computer:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>'
};
const APPS = [
  {id:'bank',title:'Aster Bank',path:'bank://account',ram:1,description:'Игровые кредиты'},
  {id:'terminal',title:'Терминал',path:'terminal://nbshell',ram:1,description:'Командный интерфейс'},
  {id:'darkshop',title:'DarkShop',path:'shop://hardware',ram:1,description:'Комплектующие ПК'},
  {id:'browser',title:'Browser',path:'net://fictional-web',ram:2,description:'Вымышленный интернет'},
  {id:'forge',title:'NULForge',path:'repo://plugins',ram:1,description:'Каталог игровых плагинов'},
  {id:'map',title:'NullAtlas',path:'atlas://world',ram:2,description:'Карта игрового мира'},
  {id:'mail',title:'N-Mail',path:'mail://inbox',ram:1,description:'Внутриигровая почта'},
  {id:'blackwire',title:'BlackWire',path:'board://contracts',ram:1,description:'Биржа контрактов NPC'},
  {id:'help',title:'Help / Docs',path:'docs://manual',ram:1,description:'Справка по игре'},
  {id:'ide',title:'NBS IDE',path:'ide://workspace',ram:2,description:'Редактор игровых скриптов'},
  {id:'profile',title:'Профиль',path:'user://operator',ram:1,description:'Оператор и прогресс'},
  {id:'computer',title:'My Computer',path:'system://hardware',ram:1,description:'Компьютер и файлы'}
];
const state = {opened:new Map(),z:20,drag:null,active:null,game:null,provider:'LOCAL SAVE',saveWarning:'',saveTimer:null,terminalLines:[],browserTabs:[],selectedMail:null,selectedFileId:null,selectedMissionId:null,editorText:'',editorName:'mission_report',nbsOutput:'Поддерживается только фиксированный список игровых деклараций.',modalConfirm:null,bootDone:false,persisting:false,persistPending:false,saveBlocked:false};

function icon(id,cls='') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${svg[id]||svg.help}</svg>`; }
function appInfo(id) { return APPS.find(a=>a.id===id); }
function fmt(n) { return new Intl.NumberFormat('ru-RU').format(Math.floor(Number(n)||0)); }
function formatDate(ts) { return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(ts)); }
function formatTime(ts) { return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
function humanLeft(ms) { const total=Math.max(0,Math.ceil(ms/1000)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60; return h?`${h}ч ${m}м`:`${m}м ${s}с`; }
function currentRam() { return getRamUsage(state.game,[...state.opened.values()].map(w=>({ram:w.ram,minimized:w.minimized}))); }
function currentLevelNeed() { const lvl=state.game.player.level; return lvl>=BALANCE.maxLevel?0:Math.max(0,BALANCE.xpToLevel[lvl]-state.game.player.xp); }
function toast(message,type='info') { const el=document.createElement('div');el.className=`toast ${type==='error'?'error':type==='success'?'success':''}`;el.textContent=message;$('toastStack').append(el);setTimeout(()=>el.remove(),4300); }
function scheduleSave() { clearTimeout(state.saveTimer);state.saveTimer=setTimeout(persist,250); }
async function persist() {
  if(!state.game||state.saveBlocked)return;
  if(state.persisting){state.persistPending=true;return;}
  state.persisting=true;
  try {
    do {
      state.persistPending=false;
      state.game.meta.updatedAt=Date.now();
      const result=await saveGame(state.game);
      state.provider=result.provider;state.saveWarning=result.warning||'';
      $('saveStatus').textContent=result.provider;
      $('saveStatus').title=result.warning||'';
      if(!result.ok && result.warning){
        console.warn('[NULLBYTE SAVE]', result.warning);
        if(!state._saveErrorShown){
          toast(result.warning,'error');
          state._saveErrorShown=true;
        }
      } else {
        state._saveErrorShown=false;
      }
    } while(state.persistPending);
  } finally { state.persisting=false; }
}
function refreshSystem() {
  if(!state.game)return;
  const ram=currentRam();
  $('topRam').textContent=`RAM ${ram.used}/${ram.total} GB`;
  $('sessionLabel').textContent=state.game.player.nickname.toUpperCase();
  $('menuNickname').textContent=state.game.player.nickname.toUpperCase();
  $('saveStatus').textContent=state.provider;
  $('systemStatus').textContent=bankStatus(state.game).locked?'SYSTEM READY / BANK LOCKED':'SYSTEM READY';
  document.querySelectorAll('.taskbar-app').forEach(btn=>btn.classList.toggle('active',btn.dataset.window===state.active));
}
function updateClock() {
  const now=new Date();$('clockTime').textContent=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(now);
  $('clockDate').textContent=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(now);
}
function renderDesktopIcons() {
  const icons = $('desktopIcons');
  icons.hidden = false;
  icons.innerHTML = APPS.map(a => `
    <button class="desktop-icon" type="button" data-action="open-app" data-app="${a.id}" title="${esc(a.title)}">
      <span class="desktop-icon-symbol">${icon(a.id)}</span>
      <span>${esc(a.title)}</span>
    </button>
  `).join('');
  $('startMenuApps').innerHTML = APPS.map(a => `
    <button class="start-app" type="button" data-action="open-app" data-app="${a.id}">
      <span class="start-app-icon">${icon(a.id)}</span>
      <span>${esc(a.title)}</span>
    </button>
  `).join('');
}
function renderTaskbar() {
  $('taskbarApps').innerHTML=[...state.opened.entries()].map(([id,w])=>`<button class="taskbar-app ${state.active===id&&!w.minimized?'active':''} ${w.minimized?'minimized':''}" type="button" data-action="taskbar-window" data-window="${id}" title="${esc(w.title)}"><i>${icon(id)}</i><span>${esc(w.title)}</span></button>`).join('');
  refreshSystem();
}
function showModal({title,eyebrow='NULLBYTE SYSTEM',body='',fields='',confirm='ПРОДОЛЖИТЬ',cancel='ОТМЕНА',danger=false,onConfirm=null}) {
  const modal=$('modalCard');state.modalConfirm=onConfirm;
  modal.innerHTML=`<div class="modal-eyebrow">${esc(eyebrow)}</div><h2 id="modalTitle">${esc(title)}</h2>${body?`<p>${body}</p>`:''}${fields}<div class="modal-actions">${cancel?`<button type="button" class="btn ghost" data-action="modal-cancel">${esc(cancel)}</button>`:''}<button type="button" class="btn ${danger?'danger':'primary'}" data-action="modal-confirm">${esc(confirm)}</button></div>`;
  $('modalBackdrop').hidden=false;
  const first=modal.querySelector('input,button');first?.focus();
}
function closeModal(){ $('modalBackdrop').hidden=true;state.modalConfirm=null; }
function confirm(title,body,onConfirm,{danger=false,confirmText='ПОДТВЕРДИТЬ'}={}) {showModal({title,body,confirm:confirmText,danger,onConfirm});}
function finishModal() {const fn=state.modalConfirm;if(fn){const result=fn();if(result===false)return;}closeModal();}

function boot() {
  const lines=['NULLBYTE firmware 1.0.2','Initializing virtual hardware profile','Loading fictional world snapshot','Mounting player save container','Starting desktop services'];
  const log=$('bootLog'),bar=$('bootProgress');let index=0;
  const run=()=>{if(index<lines.length){const row=document.createElement('div');row.textContent=lines[index++];log.append(row);bar.style.width=`${index/lines.length*100}%`;setTimeout(run,220);}else setTimeout(finishBoot,280);};
  const skip=()=>finishBoot();$('bootSkip').addEventListener('click',skip);run();
}
let bootFinished=false;
async function finishBoot() {
  if(bootFinished)return;bootFinished=true;
  try {
    const tg = window.Telegram?.WebApp;
    if(tg){
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.('#0c151d');
      tg.setBackgroundColor?.('#0b1219');
      console.log('[NULLBYTE] CloudStorage', tg.CloudStorage ? 'YES' : 'NO');
    } else {
      console.warn('[NULLBYTE] Telegram.WebApp missing — local only');
    }
  } catch(e) {
    console.warn('[NULLBYTE] Telegram init error', e);
  }
  await new Promise(r => setTimeout(r, 400));
  const tgUser=window.Telegram?.WebApp?.initDataUnsafe?.user||null;
  let loaded=await loadSavedGame(tgUser);
  // Second attempt if cloud failed and no nickname (common Telegram race).
  if(!loaded.state?.player?.nickname && window.Telegram?.WebApp?.CloudStorage){
    await new Promise(r => setTimeout(r, 500));
    const retry=await loadSavedGame(tgUser);
    if(retry.state?.player?.nickname) loaded=retry;
  }
  state.game=loaded.state;state.provider=loaded.provider;state.saveWarning=loaded.warning;state.saveBlocked=Boolean(loaded.blocked);
  $('bootScreen').hidden=true;$('desktopShell').hidden=false;
  renderDesktopIcons();renderTaskbar();updateClock();
  processTimedEvents(state.game);
  $('saveStatus').textContent=state.provider;
  if(!state.game.player.nickname) {showNicknameModal();if(loaded.warning)toast(loaded.warning,'error');}
  else {toast(`С возвращением, ${state.game.player.nickname}.`, 'success');if(loaded.warning)toast(loaded.warning,'error');}
  if(state.game.player.nickname && !state.saveBlocked) {
    await persist();
  } else {
    scheduleSave();
  }
}
function showNicknameModal() {
  const tgId=state.game.player.telegramId;
  const body='Создай ник оператора. Он будет отображаться в системе, контрактах и внутриигровой почте. Ник нельзя использовать как код.';
  const fields=`<label for="nicknameInput">НИК ОПЕРАТОРА</label><input id="nicknameInput" maxlength="12" autocomplete="off" spellcheck="false" placeholder="Например, NullFox"><div class="modal-hint">2–12 символов: только латинские A–Z и цифры 0–9.</div>${tgId?`<div class="modal-hint">Telegram ID: ${esc(tgId)} (справочная информация)</div>`:''}${state.saveBlocked?'<div class="notice warning section-gap">Облачное сохранение обнаружено, но не удалось прочитать или проверить его. Локальной копии нет. Чтобы не перезаписать данные молча, подтверди явный запуск новой игры.</div><label class="confirm-check"><input id="confirmNewSave" type="checkbox"> Я понимаю, что начну новую игру вместо недоступного сохранения.</label>':''}<div id="nicknameError" class="modal-error" hidden></div>`;
  showModal({title:'Первый запуск',eyebrow:'NULLBYTE / USER SETUP',body,fields,confirm:'СОЗДАТЬ ПРОФИЛЬ',cancel:'',onConfirm:()=>{
    const input=$('nicknameInput');const value=input?.value?.trim()||'';
    if(!validNickname(value)){const err=$('nicknameError');if(err){err.textContent='Ник должен содержать 2–12 латинских букв или цифр.';err.hidden=false;}return false;}
    if(state.saveBlocked&&!$('confirmNewSave')?.checked){const err=$('nicknameError');if(err){err.textContent='Подтверди запуск новой игры, чтобы продолжить.';err.hidden=false;}return false;}
    state.saveBlocked=false;state.game.player.nickname=value;refreshSystem();toast(`Профиль ${value} создан. Сохраняю…`,'success');persist().then(()=>{toast(state.provider==='TELEGRAM CLOUD'?'Сохранено в Telegram Cloud.':'Локальное сохранение.','success');refreshSystem();});
  }});
  const input=$('nicknameInput');input?.addEventListener('keydown',e=>{if(e.key==='Enter')finishModal();});
}

function openApp(id) {
  const app=appInfo(id);if(!app)return;
  const existing=state.opened.get(id);
  if(existing){existing.minimized=false;focusWindow(id);return;}
  const ram=currentRam();if(ram.used+app.ram>ram.total){toast(`Недостаточно RAM: ${app.title} требует ${app.ram} GB. Закрой или сверни другое окно либо обнови RAM.`,'error');return;}
  const area=$('desktopWorkspace'),width=Math.min(880,Math.max(Math.min(320,area.clientWidth-12),area.clientWidth-42)),height=Math.min(650,Math.max(Math.min(290,area.clientHeight-12),area.clientHeight-42)),offset=(state.opened.size%5)*24;
  const win={id,title:app.title,path:app.path,ram:app.ram,minimized:false,maximized:false,left:Math.max(8,(area.clientWidth-width)/2+offset-45),top:Math.max(8,(area.clientHeight-height)/2+offset-40),oldRect:null};
  state.opened.set(id,win);
  const element=document.createElement('section');element.className='app-window';element.dataset.window=id;element.setAttribute('role','dialog');element.setAttribute('aria-label',app.title);
  element.style.width=`${width}px`;element.style.height=`${height}px`;element.style.left=`${Math.min(win.left,Math.max(8,area.clientWidth-width-8))}px`;element.style.top=`${Math.min(win.top,Math.max(8,area.clientHeight-height-8))}px`;
  element.innerHTML=`<header class="window-bar"><span class="window-app-mark">${icon(id)}</span><strong class="window-title">${esc(app.title)}</strong><span class="window-path">${esc(app.path)}</span><div class="window-controls"><button type="button" data-action="minimize-window" title="Свернуть" aria-label="Свернуть">—</button><button type="button" data-action="maximize-window" title="Развернуть" aria-label="Развернуть">□</button><button type="button" data-action="close-window" title="Закрыть" aria-label="Закрыть">×</button></div></header><div class="window-content" data-content></div>`;
  $('windowLayer').append(element);wireWindow(id,element);renderWindow(id);focusWindow(id);renderTaskbar();
  if(id==='terminal')requestAnimationFrame(()=>element.querySelector('#terminalForm input')?.focus({preventScroll:true}));
}
function wireWindow(id,element) {
  element.addEventListener('pointerdown',e=>{if(!e.target.closest('.window-controls'))focusWindow(id);});
  const bar=element.querySelector('.window-bar');
  bar.addEventListener('pointerdown',e=>{
    if(e.target.closest('.window-controls')||state.opened.get(id)?.maximized||e.button!==0)return;
    const rect=element.getBoundingClientRect(),workspace=$('desktopWorkspace').getBoundingClientRect();
    state.drag={id,pointerId:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top,workspace};
    try{bar.setPointerCapture(e.pointerId);}catch{}focusWindow(id);e.preventDefault();
  });
  bar.addEventListener('pointermove',e=>{
    const d=state.drag;if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
    const area=$('desktopWorkspace'),x=Math.max(0,Math.min(area.clientWidth-element.offsetWidth,e.clientX-d.workspace.left-d.dx)),y=Math.max(0,Math.min(area.clientHeight-element.offsetHeight,e.clientY-d.workspace.top-d.dy));
    element.style.left=`${x}px`;element.style.top=`${y}px`;const w=state.opened.get(id);w.left=x;w.top=y;
  });
  const stop=e=>{if(state.drag?.id===id&&state.drag.pointerId===e.pointerId)state.drag=null;};
  bar.addEventListener('pointerup',stop);bar.addEventListener('pointercancel',stop);bar.addEventListener('lostpointercapture',stop);
}
function focusWindow(id) {
  const win=state.opened.get(id);if(!win)return;win.minimized=false;state.active=id;state.z++;
  const el=document.querySelector(`[data-window="${id}"]`);if(el){el.classList.remove('is-minimized');el.style.zIndex=state.z;el.classList.add('is-active');}
  for(const [other] of state.opened)if(other!==id)document.querySelector(`[data-window="${other}"]`)?.classList.remove('is-active');
  renderTaskbar();
}
function minimizeWindow(id) {const win=state.opened.get(id);if(!win)return;win.minimized=true;document.querySelector(`[data-window="${id}"]`)?.classList.add('is-minimized');document.querySelector(`[data-window="${id}"]`)?.classList.remove('is-active');if(state.active===id)state.active=null;const next=[...state.opened.keys()].reverse().find(k=>!state.opened.get(k).minimized);if(next)focusWindow(next);else renderTaskbar();}
function closeWindow(id) {state.opened.delete(id);document.querySelector(`[data-window="${id}"]`)?.remove();if(state.active===id)state.active=null;const next=[...state.opened.keys()].reverse().find(k=>!state.opened.get(k).minimized);if(next)focusWindow(next);else renderTaskbar();}
function maximizeWindow(id) {
  const win=state.opened.get(id),el=document.querySelector(`[data-window="${id}"]`);if(!win||!el)return;
  if(!win.maximized){win.oldRect={left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height};win.maximized=true;el.classList.add('is-maximized');}
  else{win.maximized=false;el.classList.remove('is-maximized');if(win.oldRect)Object.assign(el.style,win.oldRect);}
  const btn=el.querySelector('[data-action="maximize-window"]');btn.textContent=win.maximized?'❐':'□';btn.title=win.maximized?'Восстановить':'Развернуть';focusWindow(id);
}
function renderWindow(id) {const el=document.querySelector(`[data-window="${id}"] [data-content]`);if(!el)return;el.innerHTML=renderApp(id);wireAppContent(id,el);}
function refreshOpenApps(ids=null) {for(const id of (ids||[...state.opened.keys()]))if(state.opened.has(id))renderWindow(id);renderTaskbar();}
function wireAppContent(id,el) {
  if(id==='terminal'){
    const form=el.querySelector('#terminalForm');form?.addEventListener('submit',e=>{e.preventDefault();runTerminalCommand(form.elements.command.value);form.elements.command.value='';renderWindow('terminal');document.querySelector('#terminalForm input')?.focus({preventScroll:true});});
  }
  if(id==='browser'){
    const form=el.querySelector('#browserForm');
    form?.addEventListener('submit',e=>{e.preventDefault();const v=form.elements.address?.value||'';navigateBrowser(v);});
  }
  if(id==='ide'){
    const editor=el.querySelector('#nbsEditor');
    editor?.addEventListener('input',()=>{state.editorText=editor.value;syncNbsHighlight(editor);});
    editor?.addEventListener('scroll',()=>syncNbsHighlight(editor));
    if(editor)syncNbsHighlight(editor);
  }
}

function renderApp(id) {
  const g=state.game;
  switch(id){
    case 'profile':return renderProfile(g);
    case 'computer':return renderComputer(g);
    case 'darkshop':return renderDarkShop(g);
    case 'forge':return renderForge(g);
    case 'browser':return renderBrowser(g);
    case 'map':return renderMap(g);
    case 'blackwire':return renderBlackWire(g);
    case 'mail':return renderMail(g);
    case 'bank':return renderBank(g);
    case 'terminal':return renderTerminal(g);
    case 'help':return renderHelp();
    case 'ide':return renderIde(g);
    default:return `<div class="empty-state"><b>Неизвестное приложение</b><p>Приложение не зарегистрировано.</p></div>`;
  }
}
function renderProfile(g) {
  const p=g.player,need=currentLevelNeed(),limit=BALANCE.xpToLevel[p.level]||p.xp,base=BALANCE.xpToLevel[Math.max(0,p.level-1)]||0,progress=p.level>=BALANCE.maxLevel?100:Math.max(0,Math.min(100,(p.xp-base)/(limit-base||1)*100));
  const ram=HARDWARE.ram.find(x=>x.level===g.computer.ram),cpu=HARDWARE.cpu.find(x=>x.level===g.computer.cpu),storage=getHardwareUsage(g);
  return `<div class="app-heading"><div><div class="eyebrow">OPERATOR ACCOUNT</div><h2>Профиль</h2><p>Личная карточка и прогресс оператора.</p></div><span class="badge green">ACTIVE</span></div>
  <section class="profile-hero"><div class="profile-ident"><div class="avatar">${esc(p.nickname.slice(0,2).toUpperCase())}</div><div><h3>${esc(p.nickname)}</h3><small>TELEGRAM ID: ${esc(p.telegramId||'НЕ ДОСТУПЕН')}</small></div></div><div class="profile-rank"><b>LVL ${p.level}</b><small>OPERATOR</small></div></section>
  <div class="panel section-gap"><div class="panel-title"><span>ОПЫТ И УРОВЕНЬ</span><small>${fmt(p.xp)} XP</small></div><div class="progress"><i style="width:${progress}%"></i></div><div class="kv"><span>До следующего уровня</span><b>${p.level>=BALANCE.maxLevel?'МАКСИМУМ':`${fmt(need)} XP`}</b></div><div class="kv"><span>Репутация</span><b>${fmt(p.reputation)}</b></div></div>
  <div class="grid-3 section-gap"><div class="stat-box"><span>КОНТРАКТЫ</span><strong>${fmt(p.contractsCompleted)}</strong><small>успешно закрыто</small></div><div class="stat-box"><span>ЗАРАБОТАНО</span><strong>${fmt(p.totalEarned)}</strong><small>всего кредитов</small></div><div class="stat-box"><span>ОПЕРАЦИИ</span><strong>${fmt(g.stats.successfulOperations)}</strong><small>успешные симуляции</small></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>КОМПЬЮТЕР</span><button class="btn tiny ghost" data-action="open-app" data-app="computer">МОЙ ПК</button></div><div class="hardware-grid"><div class="hardware-card"><span>CPU</span><b>${esc(cpu.name)}</b><small>${cpu.compute} compute units</small></div><div class="hardware-card"><span>RAM</span><b>${esc(ram.name)}</b><small>${ram.gb} GB</small></div><div class="hardware-card"><span>NULLBYTE OS</span><b>VERSION ${g.computer.os}.0</b><small>Уровень ${g.computer.os}</small></div><div class="hardware-card"><span>STORAGE</span><b>${fmt(storage.used/1024)} / ${storage.total/1024} GB</b><small>виртуальный накопитель</small></div></div></div>
  <div class="notice section-gap">Все цели, устройства и данные в NULLBYTE вымышлены. Telegram ID отображается как справочная информация и не считается подтверждённой сервером авторизацией.</div>`;
}
function hardwareDetail(part,item) {
  if(!item)return '';
  if(part==='cpu')return `${item.compute} compute units`;
  if(part==='ram')return `${item.gb} GB RAM`;
  if(part==='gpu')return `${item.power} graphics units`;
  if(part==='storage')return `${item.gb} GB SSD`;
  if(part==='os')return `NULLBYTE OS ${item.level}.0`;
  return '';
}
function renderHardwareUpgrade(g,part,label) {
  const options=HARDWARE[part],current=options.find(x=>x.level===g.computer[part]),next=options.find(x=>x.level===g.computer[part]+1),bankLocked=bankStatus(g).locked;
  return `<div class="list-row hardware-upgrade"><div class="list-main"><strong>${label}: ${esc(current.name)}</strong><small>СЕЙЧАС: ${esc(hardwareDetail(part,current))}</small>${next?`<small>СЛЕДУЮЩИЙ: ${esc(next.name)} · ${esc(hardwareDetail(part,next))} · ${fmt(next.price)} CR</small>`:'<small>Достигнут максимальный уровень.</small>'}</div><div class="list-actions">${next?bankLocked?'<span class="badge red">BANK LOCK</span>':`<button class="btn tiny" data-action="upgrade-hardware" data-part="${part}">УЛУЧШИТЬ</button>`:'<span class="badge green">MAX</span>'}</div></div>`;
}
function renderComputer(g) {
  const usage=getHardwareUsage(g),ram=currentRam();
  return `<div class="app-heading"><div><div class="eyebrow">SYSTEM MANAGER</div><h2>My Computer</h2><p>Комплектующие, ОС и виртуальные файлы.</p></div><span class="badge">NULLBYTE OS ${g.computer.os}.0</span></div>
  <div class="grid-3"><div class="stat-box"><span>RAM TOTAL</span><strong>${HARDWARE.ram.find(x=>x.level===g.computer.ram).gb} GB</strong><small>сейчас ${ram.used} GB занято окнами</small></div><div class="stat-box"><span>DISK SPACE</span><strong>${fmt(usage.used/1024)} GB</strong><small>из ${usage.total/1024} GB</small></div><div class="stat-box"><span>PLUGINS</span><strong>${g.computer.installedPlugins.length}</strong><small>установлено</small></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>КОМПЛЕКТУЮЩИЕ</span><small>UPGRADE MODULE</small></div><div class="list">${renderHardwareUpgrade(g,'cpu','Процессор')}${renderHardwareUpgrade(g,'ram','Оперативная память')}${renderHardwareUpgrade(g,'gpu','Графика')}${renderHardwareUpgrade(g,'storage','Накопитель')}${renderHardwareUpgrade(g,'os','NULLBYTE OS')}</div></div>
  <div class="panel section-gap"><div class="panel-title"><span>УСТАНОВЛЕННЫЕ ПЛАГИНЫ</span><button class="btn tiny ghost" data-action="open-app" data-app="forge">NULFORGE</button></div><div class="list">${g.computer.installedPlugins.map(id=>{const p=getPlugin(id);return p?`<div class="list-row"><div class="list-main"><strong>${esc(p.name)}</strong><small>${esc(p.category)} · RAM ${p.ram} GB · ${p.storage} MB</small></div>${p.starter?'<span class="badge gray">SYSTEM</span>':`<button class="btn tiny ghost" data-action="uninstall-plugin" data-id="${p.id}">УДАЛИТЬ</button>`}</div>`:''}).join('')}</div></div>
  <div class="panel section-gap"><div class="panel-title"><span>ФАЙЛЫ НАКОПИТЕЛЯ</span><small>${g.computer.files.length+g.editor.files.length} ITEMS</small></div>${renderFiles(g)}</div>`;
}
function renderFiles(g) {
  const files=[...g.computer.files,...g.editor.files];if(!files.length)return `<div class="empty-state"><b>Накопитель пуст</b><p>Файлы результатов появятся после выполнения контрактов. NBS-файлы открываются с уровня 5.</p></div>`;
  return `<div class="list">${files.map(f=>`<div class="list-row"><div class="list-main"><strong>${esc(f.name)}</strong><small>${esc(f.type||'NBS script')} · ${f.size} KB · ${formatDate(f.createdAt||f.updatedAt||Date.now())}</small></div><span class="badge">${f.type==='dataset'?'DATASET':'NBS'}</span></div>`).join('')}</div>`;
}
function renderDarkShop(g) {
  const usage=getHardwareUsage(g);
  return `<div class="app-heading"><div><div class="eyebrow">DARK SHOP / HARDWARE</div><h2>DarkShop</h2><p>Игровые компоненты для виртуальной рабочей станции.</p></div><span class="badge amber">COMPONENTS</span></div>
  <div class="notice">Комплектующие устанавливаются автоматически в совместимый слот. Файлы не удаляются при обновлении накопителя.</div>
  <div class="panel section-gap"><div class="panel-title"><span>СВОБОДНОЕ МЕСТО</span><small>${fmt(usage.used/1024)} / ${usage.total/1024} GB</small></div><div class="progress"><i style="width:${Math.min(100,usage.used/usage.total*100)}%"></i></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>КОМПЛЕКТУЮЩИЕ</span><small>ПРОСМОТР / УЛУЧШЕНИЕ</small></div><div class="list">${['cpu','ram','gpu','storage','os'].map(part=>renderHardwareUpgrade(g,part,{cpu:'Процессор',ram:'Оперативная память',gpu:'Графика',storage:'Накопитель',os:'NULLBYTE OS'}[part])).join('')}</div></div>
  <div class="notice warning section-gap">Тестовые цены и характеристики помечены как balance draft в конфигурации engine.js. Они предназначены для первичного тестирования баланса.</div>`;
}
function renderPluginCard(g,p) {
  const installed=getInstalledPlugin(g,p.id),locked=g.player.level<p.requiredLevel,osLocked=g.computer.os<(p.minOs||1),usage=getHardwareUsage(g),space=usage.used+p.storage<=usage.total,bankLocked=bankStatus(g).locked;
  const blocker=locked?`Уровень ${p.requiredLevel}`:osLocked?`NULLBYTE OS ${(p.minOs||1)}.0`:!space?'Недостаточно места':bankLocked?'Банк заблокирован':'Готов к установке';
  return `<div class="list-row"><div class="list-main"><strong>${esc(p.name)} <span class="muted">v${esc(p.version)}</span></strong><small>${esc(p.category)} · ${esc(p.description)}<br>RAM ${p.ram} GB · ${p.storage} MB · уровень ${p.requiredLevel} · ОС ${(p.minOs||1)}.0+ · ${p.cooldown?`${p.cooldown/1000} сек cooldown`:'без cooldown'}</small><small class="text-blue">${esc(p.effect)}</small></div><div class="list-actions">${installed?'<span class="badge green">INSTALLED</span>':locked?`<span class="badge gray">LVL ${p.requiredLevel}</span>`:osLocked?`<span class="badge gray">OS ${(p.minOs||1)}.0</span>`:!space?'<span class="badge red">NO SPACE</span>':bankLocked?'<span class="badge red">BANK LOCK</span>':`<button class="btn tiny" data-action="install-plugin" data-id="${p.id}" title="${esc(blocker)}">${p.price?'УСТАНОВИТЬ · '+fmt(p.price):'ДОБАВИТЬ'}</button>`}</div></div>`;
}
function renderForge(g) {
  const categories=[...new Set(PLUGINS.map(p=>p.category))];
  return `<div class="app-heading"><div><div class="eyebrow">NULFORGE / PACKAGE REPOSITORY</div><h2>NULForge</h2><p>Официальный каталог игровых пакетов NULLBYTE.</p></div><span class="badge">${g.computer.installedPlugins.length} INSTALLED</span></div>
  <div class="notice">Плагины созданы разработчиком. Игрок может устанавливать и удалять готовые пакеты, но не создавать и не публиковать плагины.</div>
  ${categories.map(cat=>`<div class="panel section-gap"><div class="panel-title"><span>${esc(cat.toUpperCase())}</span><small>${PLUGINS.filter(p=>p.category===cat).length} PACKAGES</small></div><div class="list">${PLUGINS.filter(p=>p.category===cat).map(p=>renderPluginCard(g,p)).join('')}</div></div>`).join('')}`;
}
function ensureBrowserTab(siteId) {
  const site=getSite(state.game,siteId);if(!site)return;
  let tab=state.browserTabs.find(t=>t.siteId===siteId);if(!tab)tab={id:idempotencyKey('tab'),siteId};
  state.browserTabs=state.browserTabs.filter(t=>t.siteId!==siteId);state.browserTabs.push(tab);state.browserTabs=state.browserTabs.slice(-5);state.game.browser.activeSite=siteId;recordHistory(state.game,siteId);scheduleSave();
}
function navigateBrowser(value) {
  const input=String(value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(!input){toast('Введи название игрового сайта или адрес .null.','error');return;}
  const site=state.game.world.sites.find(s=>s.domain===input||s.id===input||s.title.toLowerCase()===input)||state.game.world.sites.find(s=>`${s.title} ${s.domain} ${s.kind} ${s.description}`.toLowerCase().includes(input));
  if(!site){toast('Совпадений нет. Browser открывает только сайты вымышленного мира с доменом .null.','error');return;}
  ensureBrowserTab(site.id);renderWindow('browser');
}
function renderBrowser(g) {
  const siteId=state.browserTabs[state.browserTabs.length-1]?.siteId||g.browser.activeSite||'';
  if(!siteId){const homes=g.world.sites;return `<div class="app-heading"><div><div class="eyebrow">NULLBYTE BROWSER / FICTIONAL INTERNET</div><h2>Browser</h2><p>Внутриигровая сеть. Поиск работает только по личному миру.</p></div><span class="badge green">OFFLINE SAFE</span></div><form class="browser-address" id="browserForm"><input class="field" name="address" placeholder="Поиск по сайтам или адрес .null" autocomplete="off"><button class="btn" type="submit">ПОИСК</button></form><div class="panel section-gap"><div class="panel-title"><span>ЗАКЛАДКИ</span><small>${g.browser.bookmarks.length}</small></div><div class="list">${g.browser.bookmarks.map(id=>getSite(g,id)).filter(Boolean).map(s=>`<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)}</small></div><button class="btn tiny ghost" data-action="browser-tab" data-site="${s.id}">ОТКРЫТЬ</button></div>`).join('')||'<div class="empty-state"><b>Нет закладок</b><p>Сохраняй интересные сайты.</p></div>'}</div></div><div class="panel section-gap"><div class="panel-title"><span>ИСТОРИЯ</span><small>${g.browser.history.length}</small></div><div class="list">${g.browser.history.slice(0,8).map(h=>{const s=getSite(g,h.siteId);return s?`<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)} · ${formatTime(h.at)}</small></div><button class="btn tiny ghost" data-action="browser-tab" data-site="${s.id}">ПОВТОРИТЬ</button></div>`:''}).join('')||'<div class="empty-state"><b>История пуста</b><p>Открой первый игровой сайт.</p></div>'}</div></div><div class="panel section-gap"><div class="panel-title"><span>КАТАЛОГ ИГРОВЫХ САЙТОВ</span><small>${homes.length} DOMAINS</small></div><div class="list">${homes.map(s=>`<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)} · ${esc(s.kind)}</small></div><button class="btn tiny" data-action="browser-tab" data-site="${s.id}">ОТКРЫТЬ</button></div>`).join('')}</div></div><div class="notice section-gap">Никаких внешних сайтов, поисковых систем или сетевых запросов — только вымышленный мир NULLBYTE.</div>`;}
  const tabs=state.browserTabs.length?state.browserTabs:[{id:'home',siteId}];const site=getSite(g,siteId)||g.world.sites[0];
  const p=getSiteProgress(g,site.id),activeMission=g.missions.items.find(m=>m.status==='accepted'&&m.target===site.id),isBookmarked=g.browser.bookmarks.includes(site.id),locked=site.recoveryAt>Date.now();
  const stages=site.kind==='bank'?[]:[['analyze','Анализ сайта','site-analyzer',true],['decode','Расшифровка артефакта','artifact-decoder',p.analyzed],['node','Обнаружение узла','node-radar',p.decoded],['weakness','Поиск слабости','weakness-lab',p.node],['exploit','Симуляция доступа','sim-exploit',p.weakness],...(site.kind==='database'?[['database','Чтение виртуальной БД','db-reader',p.access]]:[]),['export','Экспорт результата','data-exporter',site.kind==='database'?p.database:p.access]];
  const stagesHtml=stages.map(([op,label,plugin,ready])=>{const key=({analyze:'analyzed',decode:'decoded',node:'node',weakness:'weakness',exploit:'access',database:'database',export:'exported'})[op];const done=Boolean(p[key]);return `<div class="operation-card"><strong>${esc(label)}</strong><small>${getInstalledPlugin(g,plugin)?`Плагин: ${esc(getPlugin(plugin).name)}`:`Нет плагина: ${esc(getPlugin(plugin).name)}`}</small><button class="btn tiny ${ready?'':'ghost'}" data-action="site-operation" data-op="${op}" data-site="${site.id}" ${!ready||done||locked||!getInstalledPlugin(g,plugin)?'disabled':''}>${done?'ГОТОВО':'ВЫПОЛНИТЬ'}</button></div>`;}).join('');
  const activeGuide=activeMission?`<div class="notice section-gap"><b>Активный контракт ${esc(activeMission.id)}:</b> ${esc(activeMission.title)}. Проходи кнопки цепочки сверху вниз. После «Экспорт результата» нажми «СОЗДАТЬ ФАЙЛ РЕЗУЛЬТАТА», затем открой N-Mail и жми «ОТПРАВИТЬ».</div>`:'';
  const missionFiles=site.kind!=='bank'&&activeMission&&p.access&&p.exported?`<div class="btn-row section-gap">${activeMission.resultFileId?`<span class="badge green">ФАЙЛ СОЗДАН</span><button class="btn tiny primary" data-action="open-app" data-app="mail">ПЕРЕЙТИ В N-MAIL</button>`:`<button class="btn primary" data-action="export-result" data-id="${esc(activeMission.id)}">СОЗДАТЬ ФАЙЛ РЕЗУЛЬТАТА</button>`}<span class="badge green">EXPORT COMPLETE</span></div>`:'';
  return `<div class="browser-top"><div class="browser-traffic"><i></i><i></i><i></i></div><form class="browser-address" id="browserForm"><input class="field" name="address" value="${esc(site.domain)}" aria-label="Игровой адрес" autocomplete="off"><button class="btn tiny" type="submit">ПЕРЕЙТИ</button></form><button class="btn tiny ghost" data-action="browser-home">⌂</button></div>
  <div class="browser-tabs">${tabs.map(t=>{const s=getSite(g,t.siteId);return s?`<div class="browser-tab-wrap ${s.id===site.id?'active':''}"><button class="browser-tab" data-action="browser-tab" data-site="${s.id}">${esc(s.title)}</button><button class="browser-tab-close" type="button" data-action="browser-close-tab" data-tab="${esc(t.id)}" aria-label="Закрыть вкладку ${esc(s.title)}">×</button></div>`:''}).join('')}</div>
  <div class="site-hero"><div class="site-domain">${esc(site.domain)} · ${esc(site.kind.toUpperCase())} · ${esc(site.region)}</div><div class="app-heading" style="margin:6px 0"><h3>${esc(site.title)}</h3><div class="btn-row"><button class="btn tiny ghost" data-action="bookmark-site" data-site="${site.id}">${isBookmarked?'★':'☆'} ${isBookmarked?'СОХРАНЕНО':'ЗАКЛАДКА'}</button><span class="badge ${locked?'red':'green'}">${locked?'RECOVERING':'ONLINE'}</span></div></div><p>${esc(site.description)}</p></div>
  <div class="grid-2 section-gap"><div class="stat-box"><span>SECURITY LEVEL</span><strong>${site.security}/5</strong><small>игровая модель защиты</small></div><div class="stat-box"><span>REVISION</span><strong>${site.revision}</strong><small>состояние сайта</small></div></div>
  ${locked?`<div class="notice warning section-gap">Цель восстанавливается после предыдущей операции. Осталось примерно ${humanLeft(site.recoveryAt-Date.now())}.</div>`:''}
  <div class="panel section-gap"><div class="panel-title"><span>ИГРОВАЯ ЦЕПОЧКА</span><small>${activeMission?`КОНТРАКТ ${activeMission.id}`:'FREE EXPLORATION'}</small></div>${site.kind==='bank'?`<div class="notice warning">Эта цель использует отдельную эндгейм-механику. Открой приложение Aster Bank, чтобы ознакомиться с рисками и требованиями.</div><button class="btn section-gap" data-action="open-app" data-app="bank">ОТКРЫТЬ ASTER BANK</button>`:`${activeGuide}<div class="operation-grid">${stagesHtml}</div>`}${missionFiles}${site.kind!=='bank'&&p.access&&getInstalledPlugin(g,'site-editor')? `<div class="btn-row section-gap"><button class="btn tiny ghost" data-action="site-operation" data-op="modify" data-site="${site.id}">ИЗМЕНИТЬ ВИРТУАЛЬНЫЙ КОНТЕНТ</button></div>`:''}</div>
  <div class="panel section-gap"><div class="panel-title"><span>СОСТОЯНИЕ ЦЕЛИ</span><small>SIMULATION SNAPSHOT</small></div><div class="kv"><span>Артефакт</span><b>${esc(site.artifact)}</b></div><div class="kv"><span>Анализ</span><b>${p.analyzed?'ГОТОВО':'НЕ ВЫПОЛНЕН'}</b></div><div class="kv"><span>Доступ</span><b>${p.access?'ПОЛУЧЕН':'НЕТ'}</b></div><div class="kv"><span>Текущее содержимое</span><b>${esc(site.siteText)}</b></div>${p.access?`<div class="notice success section-gap">Виртуальные данные: ${esc(site.data)}</div>`:''}<div class="btn-row section-gap"><button class="btn tiny ghost" data-action="open-app" data-app="map">ОТКРЫТЬ В NULLATLAS</button><button class="btn tiny ghost" data-action="open-app" data-app="blackwire">КОНТРАКТЫ</button></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>ДОСТУПНЫЕ ИГРОВЫЕ САЙТЫ</span><small>${g.world.sites.length} HOSTS</small></div><div class="list">${g.world.sites.map(s=>`<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)} · security ${s.security}</small></div><button class="btn tiny ghost" data-action="browser-tab" data-site="${s.id}">ОТКРЫТЬ</button></div>`).join('')}</div></div>`;
}
function renderMap(g) {
  const scanner=getInstalledPlugin(g,'map-scanner');
  const points=LOCATIONS.map(loc=>`<button class="map-point" style="left:${loc.x}%;top:${loc.y}%" data-action="map-location" data-location="${loc.id}">${esc(loc.name)}</button>`).join('');
  const npcs=g.world.npc.map(n=>`<div class="list-row"><div class="list-main"><strong>${esc(n.name)} <span class="muted">· ${esc(n.role)}</span></strong><small>${esc(LOCATIONS.find(l=>l.id===n.location)?.name||'Неизвестно')} · ${esc(n.device||'Виртуальное устройство')} · ${esc(n.address||'')}${scanner?`<br>${esc(n.data||'')}`:''} · следующий маршрут ${formatTime(n.nextAt)}</small></div><span class="badge">NPC</span></div>`).join('');
  const sites=g.world.sites.map(s=>{const loc=LOCATIONS.find(l=>l.pois.includes(s.id));return `<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)} · ${esc(s.region)} / ${esc(s.district)}${scanner&&loc?` · X:${loc.x} Y:${loc.y}`:''}</small></div><button class="btn tiny ghost" data-action="browser-tab" data-site="${s.id}">САЙТ</button></div>`;}).join('');
  return `<div class="app-heading"><div><div class="eyebrow">NULLATLAS / WORLD MAP</div><h2>NullAtlas</h2><p>Карта ограниченного вымышленного мира. Координаты условные.</p></div><span class="badge ${scanner?'green':'gray'}">${scanner?'ATLAS SCANNER ACTIVE':'BASIC MAP'}</span></div>
  <div class="map-canvas">${points}<span class="map-label" style="left:8%;top:10%">СЕВЕРНЫЕ ОКРАИНЫ</span><span class="map-label" style="right:7%;bottom:11%">ЦЕНТРАЛЬНЫЙ РАЙОН</span></div>
  <div class="notice section-gap">${scanner?'Atlas Scanner показывает условные координаты POI и дополнительные сведения NPC.':'Установи Atlas Scanner в NULForge, чтобы открыть координаты POI и дополнительные сведения NPC.'} Карта не использует GPS и не показывает реальные IP или адреса.</div>
  <div class="panel section-gap"><div class="panel-title"><span>NPC / МАРШРУТЫ</span><small>СОХРАНЯЕМЫЕ РАСПИСАНИЯ</small></div><div class="list">${npcs}</div></div>
  <div class="panel section-gap"><div class="panel-title"><span>POINTS OF INTEREST</span><small>ВЫМЫШЛЕННЫЕ ОБЪЕКТЫ</small></div><div class="list">${sites}</div></div>`;
}

function missionSteps(m, g) {
  const site = getSite(g, m.target);
  const needDb = site?.kind === 'database';
  const steps = [
    'Открой BlackWire и прими контракт (если ещё не принят).',
    `Открой Browser → цель <b>${esc(site?.domain || m.target)}</b>.`,
    'Нажми по порядку кнопки цепочки на странице сайта:',
    '&nbsp;&nbsp;1) Анализ сайта',
    '&nbsp;&nbsp;2) Расшифровка артефакта',
    '&nbsp;&nbsp;3) Обнаружение узла',
    '&nbsp;&nbsp;4) Поиск слабости',
    '&nbsp;&nbsp;5) Симуляция доступа',
  ];
  if (needDb) steps.push('&nbsp;&nbsp;6) Чтение виртуальной БД (нужен Virtual DB Reader)');
  steps.push(`${needDb ? '7' : '6'}) Экспорт результата`);
  steps.push('Нажми «СОЗДАТЬ ФАЙЛ РЕЗУЛЬТАТА».');
  steps.push('Открой N-Mail → блок «ГОТОВО К ОТПРАВКЕ» → «ОТПРАВИТЬ».');
  steps.push('Подожди проверку (~5–6 сек) — кредиты и XP начислятся автоматически.');
  return steps;
}

function renderMissionGuide(m, g) {
  const site = getSite(g, m.target);
  const loc = LOCATIONS.find(l => (l.pois || []).includes(m.target));
  const tools = (m.requiredPlugins || []).map(id => getPlugin(id)?.name || id).join(' · ') || 'Базовые стартовые';
  const steps = missionSteps(m, g).map(s => `<li>${s}</li>`).join('');
  return `<div class="panel section-gap mission-guide">
    <div class="panel-title"><span>ПОЛНЫЙ ГАЙД · ${esc(m.id)}</span><button class="btn tiny ghost" data-action="mission-close-guide">ЗАКРЫТЬ</button></div>
    <div class="kv"><span>Название</span><b>${esc(m.title)}</b></div>
    <div class="kv"><span>Клиент</span><b>${esc(m.client)}</b></div>
    <div class="kv"><span>Цель</span><b>${esc(site?.title || m.target)} · ${esc(site?.domain || '—')}</b></div>
    <div class="kv"><span>Район</span><b>${esc(loc?.name || site?.region || '—')} / ${esc(site?.district || '—')}</b></div>
    <div class="kv"><span>Сложность / SEC</span><b>${esc(m.difficulty)} · ${site?.security ?? '—'}</b></div>
    <div class="kv"><span>Награда</span><b class="text-green">+${fmt(m.reward)} CR · +${fmt(m.xp)} XP</b></div>
    <div class="kv"><span>Плагины</span><b>${esc(tools)}</b></div>
    <div class="divider"></div>
    <p><b>Задача:</b> ${esc(m.objective)}</p>
    <p class="muted small"><b>Подсказка:</b> ${esc(m.hint)}</p>
    <div class="divider"></div>
    <div class="panel-title"><span>ЧТО ДЕЛАТЬ ПО ШАГАМ</span></div>
    <ol class="mission-steps">${steps}</ol>
    <div class="notice section-gap">Команды в Terminal для миссий не нужны. Вся цепочка выполняется кнопками в Browser. N-Mail — только для финальной отправки файла.</div>
    <div class="btn-row">${m.status==='available'?`<button class="btn primary" data-action="accept-mission" data-id="${m.id}">ПРИНЯТЬ КОНТРАКТ</button>`:m.status==='accepted'?`<button class="btn primary" data-action="mission-open-target" data-id="${m.id}">ОТКРЫТЬ ЦЕЛЬ В BROWSER</button><button class="btn" data-action="open-app" data-app="mail">ОТКРЫТЬ N-MAIL</button>`:m.status==='submitted'?`<span class="badge green">НА ПРОВЕРКЕ</span>`:''}</div>
  </div>`;
}


function renderBlackWire(g) {
  const items=g.missions.items.filter(m=>['available','accepted','submitted'].includes(m.status));
  const selected=state.selectedMissionId?g.missions.items.find(x=>x.id===state.selectedMissionId):null;
  const card=m=>{
    const site=getSite(g,m.target);
    return `<article class="contract-card ${state.selectedMissionId===m.id?'is-selected':''}">
      <div class="contract-top"><strong>${esc(m.title)}</strong><span class="badge ${m.status==='accepted'?'amber':m.status==='submitted'?'green':'gray'}">${m.status==='accepted'?'ACTIVE':m.status==='submitted'?'VERIFYING':'AVAILABLE'}</span></div>
      <p>${esc(m.objective)}</p>
      <div class="contract-meta"><span>ID ${esc(m.id)}</span><span>ЦЕЛЬ ${esc(site?.domain||m.target)}</span><span>SEC ${site?.security||'—'}</span><span>${esc(m.difficulty)}</span></div>
      <div class="contract-meta section-gap"><span>TOOLS ${(m.requiredPlugins||[]).map(id=>getPlugin(id)?.name||id).map(esc).join(' · ')||'Базовые'}</span></div>
      <div class="contract-meta section-gap"><span class="text-green">+${fmt(m.reward)} CR</span><span>+${fmt(m.xp)} XP</span><span>CLIENT ${esc(m.client)}</span></div>
      <div class="divider"></div>
      <div class="small muted">Подсказка: ${esc(m.hint)}</div>
      <div class="btn-row">
        <button class="btn tiny" data-action="mission-details" data-id="${m.id}">ПОДРОБНЕЕ / ГАЙД</button>
        ${m.status==='available'?`<button class="btn primary" data-action="accept-mission" data-id="${m.id}">ПРИНЯТЬ КОНТРАКТ</button>`:m.status==='accepted'?`<button class="btn" data-action="mission-open-target" data-id="${m.id}">ОТКРЫТЬ ЦЕЛЬ В BROWSER</button>`:`<span class="badge green">ПРОВЕРКА · ${humanLeft(m.verifyAt-Date.now())}</span>`}
      </div>
    </article>`;
  };
  const locked=g.missions.items.filter(m=>m.status==='locked');
  return `<div class="app-heading"><div><div class="eyebrow">BLACKWIRE / NPC CONTRACT BOARD</div><h2>BlackWire</h2><p>Биржа заказов от персонажей игрового мира. Без реальных пользователей и чата.</p></div><span class="badge">SOLO MODE</span></div>
  <div class="grid-3"><div class="stat-box"><span>ACTIVE</span><strong>${g.missions.items.filter(m=>m.status==='accepted').length}</strong><small>активные контракты</small></div><div class="stat-box"><span>VERIFYING</span><strong>${g.missions.items.filter(m=>m.status==='submitted').length}</strong><small>ожидают проверки</small></div><div class="stat-box"><span>COMPLETED</span><strong>${g.player.contractsCompleted}</strong><small>закрыто</small></div></div>
  <div class="notice section-gap">1) Прими контракт → 2) открой цель в Browser и пройди цепочку кнопок → 3) создай файл → 4) отправь через N-Mail. Жми <b>ПОДРОБНЕЕ / ГАЙД</b> на любом заказе.</div>
  ${selected?renderMissionGuide(selected,g):''}
  <div class="section-gap list">${items.length?items.map(card).join(''):'<div class="empty-state"><b>Нет доступных контрактов</b><p>Повысь уровень, чтобы открыть новые заказы.</p></div>'}</div>
  ${locked.length?`<div class="panel section-gap"><div class="panel-title"><span>ЗАБЛОКИРОВАНО</span><small>${locked.length}</small></div><div class="list">${locked.slice(0,8).map(m=>`<div class="list-row"><div class="list-main"><strong>${esc(m.title)}</strong><small>Требуется уровень ${m.minLevel} · ${esc(m.difficulty)}</small></div><button class="btn tiny ghost" data-action="mission-details" data-id="${m.id}">ГАЙД</button></div>`).join('')}</div></div>`:''}`;
}

function renderMail(g) {
  const pending=g.missions.items.filter(m=>m.status==='accepted'&&m.resultFileId);
  const waitingFile=g.missions.items.filter(m=>m.status==='accepted'&&!m.resultFileId);
  const selected=g.mail.messages.find(m=>m.id===state.selectedMail)||g.mail.messages[0];
  const list=g.mail.messages.slice(0,30).map(m=>`<button class="mail-item ${m.status==='unread'?'unread':''}" data-action="mail-open" data-id="${m.id}"><strong>${esc(m.subject)}</strong><small>${formatTime(m.at)}</small><p>${esc(m.from)} · ${esc(m.body.slice(0,110))}${m.body.length>110?'…':''}</p></button>`).join('');
  return `<div class="app-heading"><div><div class="eyebrow">N-MAIL / INTERNAL MESSAGING</div><h2>N-Mail</h2><p>Внутриигровые письма, контракты и отправка файлов.</p></div><span class="badge">${g.mail.messages.filter(m=>m.status==='unread').length} UNREAD</span></div>
  ${pending.length?`<div class="panel"><div class="panel-title"><span>ГОТОВО К ОТПРАВКЕ</span><small>DELIVERY QUEUE</small></div><div class="list">${pending.map(m=>{const f=g.computer.files.find(x=>x.id===m.resultFileId);return `<div class="list-row"><div class="list-main"><strong>${esc(m.title)}</strong><small>${esc(m.client)} · ${esc(f?.name||'result file')}</small></div><button class="btn tiny primary" data-action="deliver-mission" data-id="${m.id}">ОТПРАВИТЬ</button></div>`;}).join('')}</div></div>`:''}
  ${waitingFile.length?`<div class="notice warning section-gap">Есть активный контракт без файла результата. Сначала открой цель в Browser, пройди цепочку (анализ → … → экспорт) и нажми «СОЗДАТЬ ФАЙЛ РЕЗУЛЬТАТА». После этого здесь появится кнопка «ОТПРАВИТЬ».<div class="btn-row section-gap">${waitingFile.map(m=>`<button class="btn tiny" data-action="mission-open-target" data-id="${m.id}">ОТКРЫТЬ ${esc(m.id)}</button>`).join('')}</div></div>`:''}
  <div class="grid-2 section-gap" style="align-items:start"><div class="list">${list||'<div class="empty-state"><b>Входящие пусты</b><p>Письма появятся после контрактов и системных событий.</p></div>'}</div><div class="panel">${selected?`<div class="eyebrow">${selected.direction==='in'?'INCOMING MESSAGE':'SENT MESSAGE'}</div><h3 style="margin:8px 0;color:#e1ebf1;font-size:13px">${esc(selected.subject)}</h3><div class="kv"><span>От</span><b>${esc(selected.from)}</b></div><div class="kv"><span>Дата</span><b>${formatDate(selected.at)} ${formatTime(selected.at)}</b></div><div class="divider"></div><div class="mail-body">${esc(selected.body)}</div>${selected.attachments?.length?selected.attachments.map(id=>{const f=g.computer.files.find(x=>x.id===id);return f?`<button class="attachment" data-action="file-open" data-id="${esc(f.id)}">▣ ${esc(f.name)} · ${f.size} KB</button>`:''}).join(''):''}<div class="btn-row section-gap"><button class="btn tiny ghost" data-action="mail-mark" data-id="${selected.id}">ОТМЕТИТЬ ПРОЧИТАННЫМ</button></div>`:'<div class="empty-state"><b>Выбери письмо</b><p>Содержимое появится здесь.</p></div>'}${state.selectedFileId?(()=>{const f=g.computer.files.find(x=>x.id===state.selectedFileId);return f?`<div class="panel section-gap"><div class="panel-title"><span>ПРОСМОТР ВЛОЖЕНИЯ</span><button class="btn tiny ghost" data-action="file-close">ЗАКРЫТЬ</button></div><strong>${esc(f.name)}</strong><pre class="file-preview">${esc(String(f.content||'').slice(0,2400))}${String(f.content||'').length>2400?'\n… файл сокращён для просмотра':''}</pre></div>`:''})():''}</div></div>
  <div class="notice section-gap">Почта работает только внутри вымышленной игры. Кнопка «ОТПРАВИТЬ» появляется только после создания файла результата в Browser.</div>`;
}

function renderBank(g) {
  const status=bankStatus(g),risk=bankRisk(g),tx=g.economy.transactions.slice(0,30);
  const missing=risk.missing.map(id=>getPlugin(id)?.name||id);
  return `<div class="app-heading"><div><div class="eyebrow">ASTER UNION / GAME BANK</div><h2>Aster Bank</h2><p>Игровые кредиты и история экономики.</p></div><span class="badge amber">FICTIONAL BANK</span></div>
  <div class="bank-balance"><span>AVAILABLE CREDITS</span><strong>${fmt(g.economy.credits)} CR</strong><small>Виртуальный счёт оператора · никакого реального платежа</small></div>
  ${status.locked?`<div class="notice danger section-gap"><b>БАНК ЗАБЛОКИРОВАН</b><br>Осталось <b data-bank-until="${g.bank.lockUntil}">${humanLeft(status.remaining)}</b>. Банковские операции недоступны. Другие приложения и контракты продолжают работать; награды по контрактам во время блокировки конфискуются.</div>`:''}
  <div class="panel section-gap"><div class="panel-title"><span>ЭНДГЕЙМ / РИСКОВАЯ СИМУЛЯЦИЯ</span><small>LEVEL ${BALANCE.bankUnlockLevel}+</small></div><p class="muted small">Только игровая проверка. Нужны Vault Decoder, Identity Veil и Trace Obfuscator. При виртуальной трассировке все кредиты конфискуются, а банк блокируется на 24 реальных часа.</p><div class="kv"><span>Требуемый уровень</span><b>${BALANCE.bankUnlockLevel}</b></div><div class="kv"><span>Вероятность трассировки</span><b class="text-red">${Math.round(risk.traceChance*100)}%</b></div><div class="kv"><span>Вероятность успеха</span><b class="text-green">${Math.round(risk.successChance*100)}%</b></div><div class="kv"><span>Награда при успехе</span><b class="text-green">+${fmt(BALANCE.bankReward)} CR</b></div>
  ${missing.length?`<div class="notice warning section-gap">Не установлены: ${missing.map(esc).join(', ')}.</div>`:''}
  ${g.computer.os<4?`<div class="notice warning section-gap">Для двух финальных плагинов требуется NULLBYTE OS 4.0. Текущая версия: ${g.computer.os}.0.</div>`:''}
  <div class="btn-row section-gap"><button class="btn danger" data-action="bank-attempt" ${status.locked||!risk.unlocked||missing.length?'disabled':''}>ЗАПУСТИТЬ СИМУЛЯЦИЮ</button></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>ИСТОРИЯ ТРАНЗАКЦИЙ</span><small>${tx.length} RECORDS</small></div>${tx.length?tx.map(t=>`<div class="transaction-row"><div><strong>${esc(t.reason)}</strong><small>${formatDate(t.at)} · ${formatTime(t.at)}</small></div><b class="${t.type==='income'?'income':t.type==='confiscated'?'confiscated':'expense'}">${t.type==='income'?'+':'−'}${fmt(t.amount)} CR</b></div>`).join(''):'<div class="empty-state"><b>Нет транзакций</b><p>История появится после получения наград и покупок.</p></div>'}</div>`;
}
function renderTerminal(g) {
  if(!state.terminalLines.length) state.terminalLines=[{text:'NULLBYTE NBSHELL 1.0 — безопасный игровой интерфейс.',type:'blue'},{text:'Команды ОС, shell, SQL и сетевые запросы не поддерживаются.',type:'muted'},{text:'Введи help для списка разрешённых команд.',type:'muted'}];
  return `<div class="app-heading"><div><div class="eyebrow">NULLBYTE / COMMAND INTERFACE</div><h2>Terminal</h2><p>Зарегистрированные игровые команды. Это не системная оболочка.</p></div><span class="badge green">SAFE MODE</span></div>
  <div class="terminal-shell"><div class="terminal-toolbar"><span>operator@nullbyte:~</span><span>VIRTUAL TTY · NO SHELL</span></div><div class="terminal-output" id="terminalOutput">${state.terminalLines.map(l=>`<div class="${esc(l.type||'')}">${esc(l.text)}</div>`).join('')}</div><form class="terminal-input-row" id="terminalForm"><span>operator@nullbyte $</span><input name="command" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="help" aria-label="Игровая команда"></form></div>
  <div class="notice section-gap">Разрешены только заранее зарегистрированные команды. Ничего не исполняется на устройстве или сервере.</div>`;
}
function runTerminalCommand(raw) {
  const cmd=String(raw||'').trim();if(!cmd)return;
  const add=(text,type='')=>state.terminalLines.push({text,type});
  add(`operator@nullbyte $ ${cmd}`,'prompt');
  const lower=cmd.toLowerCase();const parts=cmd.split(/\s+/);const one=parts[0]?.toLowerCase();
  if(lower==='help') add('help | info | whoami | status | date | uptime | plugins | pkg list | plugin info NAME | ls | cat FILE | mission list | map | clear','blue');
  else if(lower==='clear'){state.terminalLines=[];}
  else if(lower==='whoami') add(state.game.player.nickname);
  else if(lower==='date') add(new Date().toString());
  else if(lower==='uptime') add(`${Math.floor((Date.now()-state.game.computer.uptimeStartedAt)/60000)} virtual minutes`);
  else if(lower==='info') {
    const g=state.game,ram=HARDWARE.ram.find(x=>x.level===g.computer.ram),cpu=HARDWARE.cpu.find(x=>x.level===g.computer.cpu),storage=getHardwareUsage(g);
    add(`OPERATOR: ${g.player.nickname}\nTELEGRAM_ID: ${g.player.telegramId||'UNAVAILABLE'}\nCPU: ${cpu.name}\nRAM: ${ram.gb} GB\nGPU: ${HARDWARE.gpu.find(x=>x.level===g.computer.gpu).name}\nOS: NULLBYTE OS ${g.computer.os}.0\nLOCATION: NEW ARCHIVE / ${LOCATIONS[0].name}\nSTORAGE: ${fmt(storage.used/1024)} / ${storage.total/1024} GB\nPROCESSES: ${[...state.opened.values()].filter(w=>!w.minimized).length}\nMODE: FICTIONAL SIMULATION`);
  }
  else if(lower==='status') add(`LEVEL ${state.game.player.level} · XP ${state.game.player.xp} · PLUGINS ${state.game.computer.installedPlugins.length} · OPERATIONS ${state.game.stats.operations}`);
  else if(lower==='plugins'||lower==='pkg list') add(PLUGINS.map(p=>`${state.game.computer.installedPlugins.includes(p.id)?'[installed]':'[available]'} ${p.name} (${p.id})`).join('\n'));
  else if(lower.startsWith('plugin info ')) {const q=cmd.slice(12).trim().toLowerCase(),p=PLUGINS.find(x=>x.id===q||x.name.toLowerCase()===q);add(p?`${p.name}\nCATEGORY: ${p.category}\nVERSION: ${p.version}\nRAM: ${p.ram} GB\nSTORAGE: ${p.storage} MB\nREQUIRED LEVEL: ${p.requiredLevel}\nSTATUS: ${getInstalledPlugin(state.game,p.id)?'INSTALLED':'NOT INSTALLED'}\n${p.description}`:'Плагин не найден. Используй pkg list.');}
  else if(lower==='ls') {const files=[...state.game.computer.files,...state.game.editor.files];add(files.length?files.map(f=>`${f.name} (${f.size} KB)`).join('\n'):'Пустой виртуальный каталог.');}
  else if(lower.startsWith('cat ')) {const name=cmd.slice(4).trim();const f=[...state.game.computer.files,...state.game.editor.files].find(x=>x.name===name);add(f?String(f.content).slice(0,1800):'Файл не найден. Команда cat читает только виртуальные игровые файлы.');}
  else if(lower==='mission list') add(state.game.missions.items.filter(m=>['accepted','submitted','available'].includes(m.status)).map(m=>`${m.id} | ${m.status} | ${m.title}`).join('\n')||'Активных контрактов нет.');
  else if(lower==='map') add(LOCATIONS.map(l=>`${l.name} / ${l.city}`).join('\n'));
  else add('Команда не зарегистрирована. Введи help.','error');
  state.terminalLines=state.terminalLines.slice(-120);if(state.opened.has('terminal')){renderWindow('terminal');const out=$('terminalOutput');if(out)out.scrollTop=out.scrollHeight;}
}
function renderHelp() {
  const sections=[
    ['Игровой цикл','Открой BlackWire, прими контракт, изучи вымышленную цель через Browser и плагины, экспортируй результат, затем отправь его через N-Mail. Система проверит файл и начислит кредиты и XP.'],
    ['Terminal','Только команды help, info, whoami, status, date, uptime, plugins, pkg list, plugin info NAME, ls, cat FILE, mission list и map. Команды ОС и произвольный код не исполняются.'],
    ['Плагины','Установи базовые пакеты и докупай нужные в NULForge. Установка проверяет уровень, кредитный баланс, RAM и накопитель. Плагины нельзя создавать или публиковать.'],
    ['Браузер и карта','Browser открывает только домены .null и сайты из личного мира. NullAtlas показывает вымышленный город и расписания NPC. Реальные адреса, GPS и внешние сайты не используются.'],
    ['Симуляция операций','Анализ → декодирование → обнаружение виртуального узла → поиск слабости → симулируемый доступ → экспорт. Защита сайта может усилиться; позже цель восстановится. Все этапы — игровые проверки.'],
    ['NBS / IDE','С уровня 5 доступны виртуальные файлы .nbs. Разрешены только декларации MISSION, TARGET, ANALYZE, DECODE, DISCOVER, VERIFY, SIMULATE, EXPORT и DELIVER. Нет shell, сети, SQL, eval или API.'],
    ['Банк и риски','Aster Bank хранит только игровые кредиты. Эндгейм-симуляция доступна с уровня 8 при наличии дорогих плагинов. Провал конфискует кредиты и блокирует банк на 24 часа реального времени.'],
    ['Сохранение','Прогресс сохраняется автоматически. В Telegram используется CloudStorage с разбивкой больших данных на части; вне Telegram — локальное хранилище браузера. Очистка данных браузера может удалить локальный прогресс.']
  ];
  return `<div class="app-heading"><div><div class="eyebrow">NULLBYTE KNOWLEDGE BASE</div><h2>Help / Docs</h2><p>Справка по механикам одиночной симуляции.</p></div><span class="badge green">RU DOCS</span></div>
  <div class="notice warning">Термины «IP», «уязвимость», «эксплойт», «вирус» и «шифрование» здесь обозначают только игровые сущности. Игра не учит реальному проникновению в системы.</div>
  ${sections.map((s,i)=>`<div class="panel section-gap"><div class="panel-title"><span>${String(i+1).padStart(2,'0')} / ${esc(s[0].toUpperCase())}</span></div><div class="muted small" style="line-height:1.75">${esc(s[1])}</div></div>`).join('')}`;
}

function highlightNbs(source) {
  const allowed=new Set(['MISSION','TARGET','ANALYZE','DECODE','DISCOVER','VERIFY','READ','SIMULATE','EXPORT','DELIVER']);
  return String(source||'').split('\n').map(line=>{
    if(/^\s*#/.test(line))return `<span class="ide-comment">${esc(line)||' '}</span>`;
    const match=line.match(/^(\s*)([A-Za-z]+)(.*)$/);
    if(!match)return esc(line)||' ';
    const command=match[2].toUpperCase(),kind=allowed.has(command)?'ide-keyword':'ide-invalid';
    const rest=esc(match[3]).replace(/&quot;.*?&quot;/g,part=>`<span class="ide-string">${part}</span>`);
    return `${esc(match[1])}<span class="${kind}">${esc(match[2])}</span>${rest}`;
  }).join('\n')+'\n';
}
function syncNbsHighlight(editor) {
  const pre=editor?.parentElement?.querySelector('#nbsHighlight');
  if(pre){pre.innerHTML=highlightNbs(editor.value);pre.scrollTop=editor.scrollTop;pre.scrollLeft=editor.scrollLeft;}
}

function nbsTemplate() {
  const mission=state.game.missions.items.find(m=>m.status==='accepted');if(!mission)return '# Нет активного контракта.\n# Прими контракт в BlackWire, чтобы получить шаблон.';
  return `# NULLBYTE Script — безопасная игровая декларация\nMISSION "${mission.id}"\nTARGET "${mission.target}"\nANALYZE target\nDECODE artifact "sealed-record"\nDISCOVER node\nVERIFY requirement "weakness-found"\nSIMULATE access\n${mission.target==='civic-records'?'READ virtual-records\n':''}EXPORT dataset "${mission.id}-result"\nDELIVER mail "${mission.id}"`;
}
function renderIde(g) {
  const locked=g.player.level<5;
  const fileForge=getInstalledPlugin(g,'file-forge');
  const files=g.editor.files;
  if(!state.editorText)state.editorText=nbsTemplate();
  const activeName=`${state.editorName}.nbs`;
  const tabs=`<button class="ide-tab active" type="button" data-action="ide-new">${esc(activeName)}</button>${files.map(f=>`<button class="ide-tab ${f.name===activeName?'active':''}" type="button" data-action="editor-open" data-id="${esc(f.id)}">${esc(f.name)}</button>`).join('')}`;
  return `<div class="app-heading"><div><div class="eyebrow">NULLBYTE SCRIPT / EDITOR</div><h2>NBS IDE</h2><p>Ограниченный декларативный язык игровой симуляции.</p></div><span class="badge ${locked?'gray':'green'}">${locked?'LOCKED':'UNLOCKED'}</span></div>
  ${locked?`<div class="notice warning">Создание и запуск собственных NBS-сценариев открывается на уровне 5. Осталось ${currentLevelNeed()} XP.</div>`:''}
  ${!locked&&!fileForge?`<div class="notice warning section-gap">Для сохранения собственных файлов установи <b>File Forge</b> в NULForge. Проверка и запуск шаблонов уже доступны.</div>`:''}
  <div class="panel section-gap"><div class="panel-title"><span>WORKSPACE / .NBS</span><small>NO GENERAL-PURPOSE CODE</small></div>
  <div class="ide-tabs">${tabs}</div>
  <label class="field-label" for="nbsFileName">ИМЯ ФАЙЛА</label><input class="field" id="nbsFileName" value="${esc(state.editorName)}" ${locked?'disabled':''}>
  <label class="field-label" for="nbsEditor">СОДЕРЖИМОЕ</label>
  <div class="ide-editor-wrap"><pre id="nbsHighlight" class="ide-highlight" aria-hidden="true">${highlightNbs(state.editorText)}</pre><textarea class="ide-editor" id="nbsEditor" spellcheck="false" autocapitalize="off" ${locked?'disabled':''}>${esc(state.editorText)}</textarea></div>
  <div class="ide-tools section-gap"><div class="ide-search"><input class="field" id="nbsSearch" placeholder="Найти в сценарии…" aria-label="Поиск по сценарию"><button class="btn tiny ghost" data-action="ide-find">НАЙТИ</button></div>
  <div class="btn-row"><button class="btn tiny ghost" data-action="ide-copy" ${locked?'disabled':''}>КОПИРОВАТЬ</button><button class="btn tiny ghost" data-action="ide-clear" ${locked?'disabled':''}>ОЧИСТИТЬ</button><button class="btn tiny ghost" data-action="nbs-template" ${locked?'disabled':''}>ШАБЛОН</button><button class="btn tiny ghost" data-action="nbs-validate">ПРОВЕРИТЬ</button><button class="btn tiny" data-action="nbs-save" ${locked||!fileForge?'disabled':''}>СОХРАНИТЬ</button><button class="btn tiny primary" data-action="nbs-run" ${locked?'disabled':''}>ЗАПУСТИТЬ</button></div></div>
  <div class="ide-output section-gap" id="nbsOutput">${esc(state.nbsOutput)}</div></div>
  <div class="panel section-gap"><div class="panel-title"><span>МОИ NBS-ФАЙЛЫ</span><small>${files.length} FILES</small></div>${files.length?`<div class="list">${files.map(f=>`<div class="list-row"><div class="list-main"><strong>${esc(f.name)}</strong><small>${f.size} KB · ${formatDate(f.updatedAt)}</small></div><div class="list-actions"><button class="btn tiny ghost" data-action="editor-open" data-id="${esc(f.id)}">ОТКРЫТЬ</button><button class="btn tiny danger" data-action="editor-delete" data-id="${esc(f.id)}">×</button></div></div>`).join('')}</div>`:'<div class="empty-state"><b>Пользовательских сценариев нет</b><p>Файлы сохраняются на виртуальный накопитель и занимают место.</p></div>'}</div>
  <div class="notice section-gap">NBS принимает только зарегистрированные команды MISSION, TARGET, ANALYZE, DECODE, DISCOVER, VERIFY, READ, SIMULATE, EXPORT и DELIVER. Нет shell, SQL, сети, eval или доступа к файлам устройства.</div>`;
}

function actionResult(result) {
  if(!result)return;
  if(result.ok){toast(result.message||'Готово.',result.success===false?'error':'success');scheduleSave();refreshOpenApps();}
  else toast(result.reason||'Операция невозможна.', 'error');
}
function doInstall(id) {
  const p=getPlugin(id);if(!p)return;
  confirm(`Установить ${p.name}?`,`${esc(p.description)}<br><br>Цена: <b>${fmt(p.price)} CR</b> · RAM: <b>${p.ram} GB</b> · место: <b>${p.storage} MB</b> · ОС: <b>${p.minOs||1}.0+</b>.`,()=>actionResult(purchasePlugin(state.game,id)));}
function doHardware(part) {
  const next=HARDWARE[part]?.find(x=>x.level===state.game.computer[part]+1);if(!next)return;
  confirm('Подтвердить обновление?',`Текущий: <b>${esc(HARDWARE[part].find(x=>x.level===state.game.computer[part]).name)}</b> (${esc(hardwareDetail(part,HARDWARE[part].find(x=>x.level===state.game.computer[part])))}).<br>Новый: <b>${esc(next.name)}</b> (${esc(hardwareDetail(part,next))}).<br>Стоимость: <b>${fmt(next.price)} CR</b>. Компонент будет автоматически установлен в свой слот.`,()=>actionResult(buyHardware(state.game,part)));}
function openMissionTarget(missionId) {
  if(!state.game)return;
  const m=state.game.missions.items.find(x=>x.id===missionId);
  if(!m){toast('Контракт не найден.','error');return;}
  const site=getSite(state.game,m.target);
  if(!site){toast('Цель контракта не найдена.','error');return;}
  ensureBrowserTab(m.target);
  openApp('browser');
  renderWindow('browser');
  toast(`Цель: ${site.domain}`,'success');
}
function runSiteOperation(siteId,op) {
  const mission=state.game.missions.items.find(m=>m.status==='accepted'&&m.target===siteId);
  const result=operateSite(state.game,siteId,op,mission?.id||null);
  if(!result.ok){toast(result.reason,'error');return;}
  toast(result.message,result.success===false?'error':'success');
  // After successful export stage on an active mission, auto-create result file so Mail can send it.
  if(result.ok && result.success!==false && op==='export' && mission){
    const exp=exportMissionResult(state.game,mission.id);
    if(exp.ok) toast(exp.message + ' Открой N-Mail и нажми ОТПРАВИТЬ.','success');
    else toast(exp.reason,'error');
  }
  scheduleSave();
  refreshOpenApps();
}
function exportResult(missionId) {
  const result=exportMissionResult(state.game,missionId);
  actionResult(result);
  if(result.ok){openApp('mail');renderWindow('mail');}
}
function deliverResult(missionId) {
  const result=submitMission(state.game,missionId);
  actionResult(result);
  if(result.ok){renderWindow('mail');renderWindow('blackwire');}
}
function openMail(id) {const m=state.game.mail.messages.find(x=>x.id===id);if(!m)return;state.selectedMail=id;m.status='read';scheduleSave();renderWindow('mail');}
function runNbsAction(action) {
  const editor=$('nbsEditor');if(editor)state.editorText=editor.value;
  const output=$('nbsOutput');
  if(action==='template'){state.editorText=nbsTemplate();renderWindow('ide');return;}
  if(action==='validate'){const result=validateNbs(state.editorText);state.nbsOutput=result.ok?`OK · ${result.commands.length} зарегистрированных команд.\n${result.commands.map(c=>c.op).join(' → ')}`:result.errors.join('\n');if(output)output.textContent=state.nbsOutput;return;}
  if(action==='save'){const name=$('nbsFileName')?.value||state.editorName;const safeName=String(name).trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);const result=saveEditorFile(state.game,name,state.editorText);if(result.ok)state.editorName=safeName;toast(result.message||result.reason,result.ok?'success':'error');if(result.ok){scheduleSave();renderWindow('ide');}return;}
  if(action==='run'){const result=runNbs(state.game,state.editorText);if(!result.ok){toast(result.reason,'error');state.nbsOutput=result.output?.join('\n')||result.reason;if(output)output.textContent=state.nbsOutput;return;}
    if(result.missionId&&result.exportRequested){const m=state.game.missions.items.find(x=>x.id===result.missionId);if(m){const exp=exportMissionResult(state.game,m.id);if(!exp.ok)toast(exp.reason,'error');else result.output.push(exp.message);if(result.deliverRequested&&exp.ok){const sent=submitMission(state.game,m.id);if(sent.ok)result.output.push(sent.message);else result.output.push(sent.reason);}}}
    state.nbsOutput=result.output.join('\n')+(result.deliverRequested?'':'\n\nДля отправки открой N-Mail.');if(output)output.textContent=state.nbsOutput;toast('NBS-сценарий выполнен в игровой симуляции.','success');scheduleSave();refreshOpenApps();return;
  }
}

function handleAction(action,el) {
  const id=el.dataset.id,app=el.dataset.app,site=el.dataset.site,part=el.dataset.part;
  switch(action){
    case 'open-app':$('startMenu').hidden=true;$('startButton').setAttribute('aria-expanded','false');openApp(app);break;
    case 'close-window':closeWindow(el.closest('.app-window')?.dataset.window);break;
    case 'minimize-window':minimizeWindow(el.closest('.app-window')?.dataset.window);break;
    case 'maximize-window':maximizeWindow(el.closest('.app-window')?.dataset.window);break;
    case 'taskbar-window':{const w=state.opened.get(el.dataset.window);if(!w)break;if(!w.minimized&&state.active===w.id)minimizeWindow(w.id);else focusWindow(w.id);break;}
    case 'install-plugin':doInstall(id);break;
    case 'upgrade-hardware':doHardware(part);break;
    case 'uninstall-plugin':confirm('Удалить плагин?',`Удалить ${esc(getPlugin(id)?.name||id)}? Пользовательские файлы не будут затронуты.`,()=>{const r=uninstallPlugin(state.game,id);actionResult(r);});break;
    case 'accept-mission':{
      if(!state.game){toast('Игра ещё не загружена.','error');break;}
      const r=acceptMission(state.game,id);
      if(r.ok){
        state.selectedMissionId=id;
        toast(r.message||'Контракт принят.','success');
        scheduleSave();
        if(state.opened.has('blackwire'))renderWindow('blackwire');
        else openApp('blackwire');
      } else {
        toast(r.reason||'Не удалось принять контракт.','error');
      }
      break;
    }
    case 'mission-details':{
      state.selectedMissionId=id;
      if(!state.opened.has('blackwire'))openApp('blackwire');
      else renderWindow('blackwire');
      break;
    }
    case 'mission-close-guide':state.selectedMissionId=null;if(state.opened.has('blackwire'))renderWindow('blackwire');break;
    case 'mission-open-target':openMissionTarget(id);break;
    case 'browser-tab':ensureBrowserTab(site);if(!state.opened.has('browser'))openApp('browser');renderWindow('browser');break;
    case 'browser-home':state.browserTabs=[];state.game.browser.activeSite='';renderWindow('browser');break;
    case 'browser-close-tab':{state.browserTabs=state.browserTabs.filter(t=>t.id!==el.dataset.tab);state.game.browser.activeSite=state.browserTabs[state.browserTabs.length-1]?.siteId||'';renderWindow('browser');break;}
    case 'bookmark':case 'bookmark-site':{const ok=addBookmark(state.game,site);toast(ok?'Закладка сохранена.':'Не удалось сохранить закладку.',ok?'success':'error');scheduleSave();renderWindow('browser');break;}
    case 'site-operation':runSiteOperation(site,el.dataset.op);break;
    case 'export-result':exportResult(id);break;
    case 'deliver-mission':confirm('Отправить результат?',`Файл по контракту <b>${esc(id)}</b> будет передан внутриигровому заказчику.`,()=>deliverResult(id));break;
    case 'mail-open':openMail(id);break;
    case 'file-open':state.selectedFileId=id;renderWindow('mail');break;
    case 'file-close':state.selectedFileId=null;renderWindow('mail');break;
    case 'mail-mark':{const m=state.game.mail.messages.find(x=>x.id===id);if(m)m.status='read';scheduleSave();renderWindow('mail');break;}
    case 'map-location':{
      const loc=LOCATIONS.find(x=>x.id===el.dataset.location);
      if(loc){
        const s=state.game.world.sites.find(x=>loc.pois.includes(x.id));
        const residents=state.game.world.npc.filter(n=>n.location===loc.id);
        if(s){ensureBrowserTab(s.id);openApp('browser');renderWindow('browser');}
        else showModal({title:loc.name,eyebrow:'NULLATLAS / LOCATION',body:`Район игрового мира: ${esc(loc.city||'NULLBYTE')} . Здесь сейчас ${residents.length} NPC.`,fields:`<div class="panel"><div class="panel-title"><span>ПЕРСОНАЖИ В РАЙОНЕ</span></div>${residents.map(n=>`<div class="list-row"><div class="list-main"><strong>${esc(n.name)}</strong><small>${esc(n.role)} · ${esc(n.device||'Виртуальное устройство')}</small></div></div>`).join('')||'<div class="muted small">Сейчас персонажей нет.</div>'}</div>`,confirm:'ЗАКРЫТЬ',cancel:'',onConfirm:()=>true});
      }
      break;
    }
    case 'bank-attempt':{const risk=bankRisk(state.game);confirm('Запустить банковскую симуляцию?',`Вероятность виртуальной трассировки: <b>${Math.round(risk.traceChance*100)}%</b>.<br>При неудаче будут конфискованы все <b>${fmt(state.game.economy.credits)} CR</b>, а Aster Bank заблокируется на <b>24 часа</b> реального времени. Другие контракты останутся доступны, но их награды во время блокировки будут конфискованы. Продолжить?`,()=>actionResult(attemptBankSimulation(state.game,true)),{danger:true,confirmText:'ПОДТВЕРЖДАЮ РИСК'});break;}
    case 'nbs-template':case 'nbs-validate':case 'nbs-save':case 'nbs-run':runNbsAction(action.replace('nbs-',''));break;
    case 'editor-open':{const f=state.game.editor.files.find(x=>x.id===id);if(f){state.editorText=f.content;state.editorName=f.name.replace(/\.nbs$/,'');renderWindow('ide');}break;}
    case 'ide-new':state.editorName='mission_report';state.editorText=nbsTemplate();state.nbsOutput='Новый сценарий готов.';renderWindow('ide');break;
    case 'ide-clear':state.editorText='';{const editor=$('nbsEditor');if(editor){editor.value='';syncNbsHighlight(editor);editor.focus();}}break;
    case 'ide-copy':{const editor=$('nbsEditor');if(editor){editor.select();const value=editor.value;try{if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>toast('Сценарий скопирован.','success')).catch(()=>toast('Браузер не разрешил доступ к буферу обмена. Используй Ctrl/Cmd+C.','error'));}else{const ok=document.execCommand?.('copy');toast(ok?'Сценарий скопирован.':'Используй Ctrl/Cmd+C для копирования.',ok?'success':'info');}}catch{toast('Используй Ctrl/Cmd+C для копирования.','info');}}break;}
    case 'ide-find':{const editor=$('nbsEditor'),input=$('nbsSearch'),query=input?.value?.trim();if(!editor||!query){toast('Введи текст для поиска.','error');break;}const text=editor.value.toLowerCase(),q=query.toLowerCase();let index=text.indexOf(q,editor.selectionEnd||0);if(index<0)index=text.indexOf(q);if(index<0){toast('Совпадений не найдено.','error');break;}editor.focus();editor.setSelectionRange(index,index+query.length);break;}
    case 'editor-delete':confirm('Удалить NBS-файл?',`Файл ${esc(state.game.editor.files.find(x=>x.id===id)?.name||'')} будет удалён.`,()=>{state.game.editor.files=state.game.editor.files.filter(x=>x.id!==id);scheduleSave();refreshOpenApps();toast('Файл удалён.','success');},{danger:true,confirmText:'УДАЛИТЬ'});break;
    case 'modal-cancel':closeModal();break;
    case 'modal-confirm':finishModal();break;
  }
}

function onUiAction(event){
  const button=event.target.closest('[data-action]');
  if(!button)return;
  // Avoid double-firing when both pointerup and click fire.
  const now=Date.now();
  if(button._nbActAt && now-button._nbActAt<350)return;
  button._nbActAt=now;
  event.preventDefault();
  try{handleAction(button.dataset.action,button);}catch(err){console.error('[NULLBYTE] action',button.dataset.action,err);toast(String(err.message||err),'error');}
}
document.addEventListener('click',onUiAction);
document.addEventListener('pointerup',onUiAction);

document.addEventListener('pointerdown',event=>{
  const editable=event.target.closest('input,textarea,select,[contenteditable="true"]');
  if(editable){
    const win=editable.closest('.app-window');
    if(win)focusWindow(win.dataset.window);
    // Prevent the desktop window layer from stealing focus after a touch.
    queueMicrotask(()=>{ if(editable.isConnected && !editable.disabled) editable.focus({preventScroll:true}); });
  }
},true);
$('startButton').addEventListener('click',()=>{$('startMenu').hidden=!$('startMenu').hidden;$('startButton').setAttribute('aria-expanded',String(!$('startMenu').hidden));});
document.addEventListener('pointerdown',e=>{if(!$('startMenu').hidden&&!$('startMenu').contains(e.target)&&!e.target.closest('#startButton')){$('startMenu').hidden=true;$('startButton').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modalBackdrop').hidden)closeModal();else if(!$('startMenu').hidden){$('startMenu').hidden=true;$('startButton').setAttribute('aria-expanded','false');}}});
$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop')&&state.modalConfirm===null)closeModal();});

window.addEventListener('beforeunload',()=>{if(state.game&&!state.saveBlocked){state.game.meta.updatedAt=Date.now();try{localStorage.setItem('nullbyte_save_v1',JSON.stringify(state.game));}catch{}}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist();});
window.addEventListener('resize',()=>{for(const [id,w] of state.opened){const el=document.querySelector(`[data-window="${id}"]`);if(!el||w.maximized)continue;const a=$('desktopWorkspace');const maxX=Math.max(0,a.clientWidth-el.offsetWidth),maxY=Math.max(0,a.clientHeight-el.offsetHeight);w.left=Math.min(w.left,maxX);w.top=Math.min(w.top,maxY);el.style.left=`${w.left}px`;el.style.top=`${w.top}px`;}});
let wasBankLocked=false;
setInterval(()=>{
  updateClock();if(!state.game)return;
  const notices=processTimedEvents(state.game);
  if(notices.length){notices.forEach(n=>toast(n,'success'));scheduleSave();refreshOpenApps();}
  const bankLocked=state.game.bank.lockUntil>Date.now();
  $('systemStatus').textContent=bankLocked?'SYSTEM READY / BANK LOCKED':'SYSTEM READY';
  document.querySelectorAll('[data-bank-until]').forEach(el=>{el.textContent=humanLeft(Number(el.dataset.bankUntil)-Date.now());});
  if(wasBankLocked&&!bankLocked)refreshOpenApps(['bank','darkshop','forge','computer']);
  wasBankLocked=bankLocked;
},1000);

// Prevent browser zoom gestures/shortcuts so the desktop layout stays stable.
document.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)event.preventDefault();},{passive:false});
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&['+','=','-','0'].includes(event.key))event.preventDefault();
});
for(const name of ['gesturestart','gesturechange','gestureend']){
  document.addEventListener(name,event=>event.preventDefault(),{passive:false});
}
document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement))return;
  if(form.id==='browserForm'){
    event.preventDefault();
    navigateBrowser(form.elements.address?.value||'');
  }
  if(form.id==='terminalForm'){
    event.preventDefault();
    const input=form.elements.command;
    runTerminalCommand(input?.value||'');
    if(input)input.value='';
    renderWindow('terminal');
    queueMicrotask(()=>document.querySelector('#terminalForm input')?.focus({preventScroll:true}));
  }
});
boot();
