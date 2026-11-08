import {
  BALANCE, PLUGINS, HARDWARE, SITES, LOCATIONS, createInitialState, validNickname, escapeText as esc,
  getInstalledPlugin, getPlugin, getHardwareUsage, getRamUsage, purchasePlugin, buyHardware, uninstallPlugin,
  acceptMission, cancelMission, missionBoardTimer, rotateMissionBoard, getSite, getSiteProgress, operateSite, exportMissionResult, submitMission,
  processTimedEvents, bankStatus, bankRisk, attemptBankSimulation, saveEditorFile, validateNbs, runNbs,
  recordHistory, addBookmark, idempotencyKey,
  PLUGIN_SHELLS, PLUGIN_ANIM, runPluginShellCommand, pluginShellBootLines, resolveSiteRef, savePlayerNamedFile, findFileByName, markServerModified,
  isPluginLocked, isMissionVisible, xpThresholdForLevel, listRegionPhones
} from './engine.js';
import { findPhone, phoneMessages, phoneGallery, phoneCallLog, phoneContacts, lockPhone } from './phones.js';
import { bankLogin, bankTransfer, getBankSession, searchNpcs, pluginDocs, touchNpc, NPC_POOL_SIZE } from './npc.js';
import { extendedPluginDocs } from './operations.js';
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
  phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 18h4"/>',
  intel:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/>',
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
  {id:'files',title:'Files',path:'fs://home',ram:1,description:'Файловый менеджер'},
  {id:'phone',title:'Phone Lab',path:'phone://lab',ram:2,description:'Визуальное исследование телефонов'},
  {id:'intel',title:'Intel',path:'intel://feed',ram:1,description:'Разведка, события, discovered'},
  {id:'fbi',title:'FBI',path:'agency://fbi',ram:1,description:'Закрытый раздел'},
  {id:'profile',title:'Профиль',path:'user://operator',ram:1,description:'Оператор и прогресс'},
  {id:'computer',title:'My Computer',path:'system://hardware',ram:1,description:'Компьютер и файлы'}
];
const state = {opened:new Map(),z:20,drag:null,active:null,game:null,provider:'LOCAL SAVE',saveWarning:'',saveTimer:null,terminals:new Map(),termSeq:0,browserTabs:[],selectedMail:null,selectedFileId:null,selectedMissionId:null,editorText:'',editorName:'mission_report',nbsOutput:'Поддерживается только фиксированный список игровых деклараций.',modalConfirm:null,bootDone:false,persisting:false,persistPending:false,saveBlocked:false};

function icon(id,cls='') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${svg[id]||svg.help}</svg>`; }
function appInfo(id) { return APPS.find(a=>a.id===id); }
function fmt(n) { return new Intl.NumberFormat('ru-RU').format(Math.floor(Number(n)||0)); }
function formatDate(ts) { return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(ts)); }
function formatTime(ts) { return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
function humanLeft(ms) { const total=Math.max(0,Math.ceil(ms/1000)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60; return h?`${h}ч ${m}м`:`${m}м ${s}с`; }
function currentRam() { return getRamUsage(state.game,[...state.opened.values()].map(w=>({ram:w.ram,minimized:w.minimized}))); }
function currentLevelNeed() { const lvl=state.game.player.level; if(lvl>=BALANCE.maxLevel) return 0; const need=(typeof xpThresholdForLevel==='function'?xpThresholdForLevel(lvl):BALANCE.xpToLevel[lvl])||0; return Math.max(0,need-state.game.player.xp); }
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
  document.querySelectorAll('.taskbar-app').forEach(item=>item.classList.toggle('active',item.dataset.window===state.active));
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
  $('taskbarApps').innerHTML=[...state.opened.entries()].map(([id,w])=>`<button class="taskbar-app ${state.active===id&&!w.minimized?'active':''} ${w.minimized?'minimized':''}" type="button" data-action="taskbar-window" data-window="${id}" title="${esc(w.title)}"><i>${icon(isTerminalId(id)?'terminal':(isBrowserId(id)?'browser':id))}</i><span>${esc(w.title)}</span></button>`).join('');
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
  const skip=()=>finishBoot();(document.getElementById('bootSkip')||{addEventListener(){},style:{}}).addEventListener('click',skip);run();
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
  const nick = String(state.game.player.nickname||'').trim();
  state.game.player.nickname = nick;
  if(!nick) {
    showNicknameModal();
    if(loaded.warning) toast(loaded.warning,'error');
  } else {
    toast(`С возвращением, ${nick}.`, 'success');
    if(loaded.warning) toast(loaded.warning,'error');
  }
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


function clampWindowRect(el, win) {
  const area = $('desktopWorkspace');
  if (!area || !el) return;
  const maxW = area.clientWidth;
  const maxH = area.clientHeight;
  let w = el.offsetWidth || win?.width || 320;
  let h = el.offsetHeight || win?.height || 240;
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);
  let left = parseFloat(el.style.left) || 0;
  let top = parseFloat(el.style.top) || 0;
  // Keep at least 40px of title bar visible
  left = Math.max(-w + 80, Math.min(left, maxW - 60));
  top = Math.max(0, Math.min(top, maxH - 40));
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  if (win) { win.left = left; win.top = top; win.width = w; win.height = h; }
}

function normalizeAllWindows() {
  for (const [id, win] of state.opened) {
    if (win.minimized || win.maximized) continue;
    const el = document.querySelector(`[data-window="${id}"]`);
    if (el) clampWindowRect(el, win);
  }
}

function isTerminalId(id){return id==='terminal'||String(id).startsWith('term-');}
function terminalIconId(id){return isTerminalId(id)?'terminal':id;}

function createTerminalSession(){
  return {
    lines:[{text:'NULLBYTE NBSHELL 1.0',type:'blue'},{text:'run <plugin-id> · plugins · help',type:'muted'}],
    plugin:null,
    busy:false,
    scrollPin:true
  };
}

function getTerm(id){
  if(!isTerminalId(id))return null;
  if(!state.terminals.has(id))state.terminals.set(id,createTerminalSession());
  return state.terminals.get(id);
}

function isBrowserId(id){return id==='browser'||String(id).startsWith('browser-');}
function browserIconId(id){return isBrowserId(id)?'browser':id;}

function openApp(id) {
  // Each Terminal / Browser launch creates a NEW independent window.
  if(id==='terminal'){
    state.termSeq+=1;
    id=`term-${state.termSeq}`;
    state.terminals.set(id,createTerminalSession());
  }
  if(id==='browser'){
    state.browserSeq=(state.browserSeq||0)+1;
    id=`browser-${state.browserSeq}`;
    if(!state.browserSessions) state.browserSessions=new Map();
    state.browserSessions.set(id,{tabs:[{id:'tab_start',siteId:'',page:'start',title:'Новая вкладка',history:[{page:'start'}],histIdx:0}],active:0});
  }
  const baseId=isTerminalId(id)?'terminal':(isBrowserId(id)?'browser':id);
  const app=appInfo(baseId);if(!app)return;
  const existing=state.opened.get(id);
  if(existing){existing.minimized=false;focusWindow(id);return;}
  const ram=currentRam();if(ram.used+app.ram>ram.total){toast(`Недостаточно RAM: ${app.title} требует ${app.ram} GB.`,'error');return;}
  const area=$('desktopWorkspace');
  const isTerm=isTerminalId(id);
  // Compact terminal like a real OS console; other apps keep previous sizing.
  const width=isTerm
    ? Math.min(560, Math.max(340, Math.floor(area.clientWidth*0.42)))
    : Math.min(880,Math.max(Math.min(320,area.clientWidth-12),area.clientWidth-42));
  const height=isTerm
    ? Math.min(360, Math.max(240, Math.floor(area.clientHeight*0.42)))
    : Math.min(650,Math.max(Math.min(290,area.clientHeight-12),area.clientHeight-42));
  const offset=(state.opened.size%5)*22;
  const title=isTerm?`Terminal ${id.replace('term-','#')}`:(isBrowserId(id)?`Browser ${id.replace('browser-','#')}`:app.title);
  const path=isTerm?`tty://${id}`:(isBrowserId(id)?`net://${id}`:app.path);
  const win={id,title,path,ram:app.ram,minimized:false,maximized:false,alwaysOnTop:false,left:Math.max(8,(area.clientWidth-width)/2+offset-45),top:Math.max(8,(area.clientHeight-height)/2+offset-40),oldRect:null,baseApp:baseId};
  state.opened.set(id,win);
  const element=document.createElement('section');
  element.className=`app-window${isTerm?' app-window-terminal':''}${isBrowserId(id)?' app-window-browser':''}`;
  element.dataset.window=id;
  element.setAttribute('role','dialog');
  element.setAttribute('aria-label',title);
  element.style.width=`${width}px`;
  element.style.height=`${height}px`;
  element.style.left=`${Math.min(win.left,Math.max(8,area.clientWidth-width-8))}px`;
  element.style.top=`${Math.min(win.top,Math.max(8,area.clientHeight-height-8))}px`;
  element.innerHTML=`<header class="window-bar"><span class="window-app-mark">${icon(terminalIconId(id))}</span><strong class="window-title">${esc(title)}</strong><span class="window-path">${esc(path)}</span><div class="window-controls"><button type="button" data-action="toggle-pin-window" class="pin-btn" title="Поверх остальных (Always on Top)" aria-label="Поверх остальных"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 2l1.5 1.5-1 1L16 6l2.5-.5L20 7l-6 6-1.5-1.5L14 10l-1.5 1.5L4 20l-.5-3.5L12 9.5 10.5 8 14 2z"/></svg></button><button type="button" data-action="minimize-window" title="Свернуть" aria-label="Свернуть">—</button><button type="button" data-action="maximize-window" title="Развернуть" aria-label="Развернуть">□</button><button type="button" data-action="close-window" title="Закрыть" aria-label="Закрыть">×</button></div></header><div class="window-content" data-content></div><div class="window-resize" data-resize></div>`;
  $('windowLayer').append(element);wireWindow(id,element);renderWindow(id);focusWindow(id);renderTaskbar();
  if(isTerm)requestAnimationFrame(()=>element.querySelector('.terminal-form input')?.focus({preventScroll:true}));
}

function onGlobalPointerMove(e){
  const d=state.drag;if(!d)return;
  const element=document.querySelector(`[data-window="${d.id}"]`);
  if(!element)return;
  if(d.resize){
    const area=$('desktopWorkspace');
    const w=Math.max(280,Math.min(area.clientWidth-8,d.startW+(e.clientX-d.sx)));
    const h=Math.max(180,Math.min(area.clientHeight-8,d.startH+(e.clientY-d.sy)));
    element.style.width=w+'px';element.style.height=h+'px';
    const win=state.opened.get(d.id);if(win){win.width=w;win.height=h;}
    return;
  }
  const area=$('desktopWorkspace');
  const ww=element.offsetWidth;
  const x=Math.max(-ww+80,Math.min(area.clientWidth-60,e.clientX-d.workspace.left-d.dx));
  const y=Math.max(0,Math.min(area.clientHeight-40,e.clientY-d.workspace.top-d.dy));
  element.style.left=x+'px';element.style.top=y+'px';
  const win=state.opened.get(d.id);if(win){win.left=x;win.top=y;}
}
function onGlobalPointerUp(e){
  if(state.drag&&(e.pointerId===undefined||e.pointerId===state.drag.pointerId)) state.drag=null;
}
if(!window.__nbDragGlobal){
  window.__nbDragGlobal=true;
  document.addEventListener('pointermove',onGlobalPointerMove,{passive:false});
  document.addEventListener('pointerup',onGlobalPointerUp);
  document.addEventListener('pointercancel',onGlobalPointerUp);
}

function wireWindow(id,element) {
  element.addEventListener('pointerdown',e=>{
    if(e.target.closest('.window-controls')||e.target.closest('[data-resize]'))return;
    focusWindow(id);
  });
  const bar=element.querySelector('.window-bar');
  bar.addEventListener('pointerdown',e=>{
    if(e.target.closest('.window-controls')||state.opened.get(id)?.maximized||e.button!==0)return;
    if(e.target.closest('input,textarea,button'))return;
    const rect=element.getBoundingClientRect(),workspace=$('desktopWorkspace').getBoundingClientRect();
    state.drag={id,pointerId:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top,workspace};
    try{bar.setPointerCapture(e.pointerId);}catch{}focusWindow(id);e.preventDefault();
  });
  bar.addEventListener('pointermove',e=>{
    const d=state.drag;if(!d||d.id!==id||d.pointerId!==e.pointerId||d.resize)return;
    const area=$('desktopWorkspace');const ww=element.offsetWidth,wh=element.offsetHeight;const x=Math.max(-ww+80,Math.min(area.clientWidth-60,e.clientX-d.workspace.left-d.dx)),y=Math.max(0,Math.min(area.clientHeight-40,e.clientY-d.workspace.top-d.dy));
    element.style.left=`${x}px`;element.style.top=`${y}px`;const w=state.opened.get(id);if(w){w.left=x;w.top=y;}
  });
  const stop=e=>{if(state.drag?.id===id&&state.drag.pointerId===e.pointerId)state.drag=null;};
  bar.addEventListener('pointerup',stop);bar.addEventListener('pointercancel',stop);bar.addEventListener('lostpointercapture',stop);

  // Resize from bottom-right handle
  const rz=element.querySelector('[data-resize]');
  if(rz){
    rz.addEventListener('pointerdown',e=>{
      if(state.opened.get(id)?.maximized||e.button!==0)return;
      e.stopPropagation();
      const rect=element.getBoundingClientRect();
      state.drag={id,pointerId:e.pointerId,resize:true,startW:rect.width,startH:rect.height,sx:e.clientX,sy:e.clientY};
      try{rz.setPointerCapture(e.pointerId);}catch{}
      focusWindow(id);e.preventDefault();
    });
    rz.addEventListener('pointermove',e=>{
      const d=state.drag;if(!d||d.id!==id||!d.resize||d.pointerId!==e.pointerId)return;
      const area=$('desktopWorkspace');
      const w=Math.max(300,Math.min(area.clientWidth-8,d.startW+(e.clientX-d.sx)));
      const h=Math.max(200,Math.min(area.clientHeight-8,d.startH+(e.clientY-d.sy)));
      element.style.width=`${w}px`;element.style.height=`${h}px`;
      const win=state.opened.get(id);if(win){win.width=w;win.height=h;}clampWindowRect(element,win);
    });
    rz.addEventListener('pointerup',stop);rz.addEventListener('pointercancel',stop);rz.addEventListener('lostpointercapture',stop);
  }
}
function focusWindow(id) {
  const win=state.opened.get(id);if(!win)return;win.minimized=false;state.active=id;state.z++;
  // Normal windows: z 20–999; always-on-top: 10000+
  const base = win.alwaysOnTop ? 10000 : 20;
  const el=document.querySelector(`[data-window="${id}"]`);
  if(el){
    el.classList.remove('is-minimized');
    el.classList.toggle('is-pinned', !!win.alwaysOnTop);
    el.style.zIndex = base + state.z;
    el.classList.add('is-active');
  }
  for(const [other, ow] of state.opened){
    if(other===id) continue;
    const oel=document.querySelector(`[data-window="${other}"]`);
    if(!oel) continue;
    oel.classList.remove('is-active');
    // Keep pinned windows above normal even when not active
    if(ow.alwaysOnTop && !win.alwaysOnTop) {
      oel.style.zIndex = 10000 + (Number(oel.style.zIndex) % 1000 || 1);
    }
  }
  renderTaskbar();
}

function togglePinWindow(id) {
  const win = state.opened.get(id);
  if (!win) return;
  win.alwaysOnTop = !win.alwaysOnTop;
  const el = document.querySelector(`[data-window="${id}"]`);
  if (el) {
    el.classList.toggle('is-pinned', win.alwaysOnTop);
    const pin = el.querySelector('.pin-btn');
    if (pin) pin.classList.toggle('is-on', win.alwaysOnTop);
  }
  focusWindow(id);
  toast(win.alwaysOnTop ? 'Окно поверх остальных' : 'Обычный порядок окон', 'success');
}
function minimizeWindow(id) {const win=state.opened.get(id);if(!win)return;win.minimized=true;document.querySelector(`[data-window="${id}"]`)?.classList.add('is-minimized');document.querySelector(`[data-window="${id}"]`)?.classList.remove('is-active');if(state.active===id)state.active=null;const next=[...state.opened.keys()].reverse().find(k=>!state.opened.get(k).minimized);if(next)focusWindow(next);else renderTaskbar();}
function closeWindow(id) {state.opened.delete(id);if(isTerminalId(id))state.terminals.delete(id);document.querySelector(`[data-window="${id}"]`)?.remove();if(state.active===id)state.active=null;const next=[...state.opened.keys()].reverse().find(k=>!state.opened.get(k).minimized);if(next)focusWindow(next);else renderTaskbar();}
function maximizeWindow(id) {
  const win=state.opened.get(id),el=document.querySelector(`[data-window="${id}"]`);if(!win||!el)return;
  if(!win.maximized){win.oldRect={left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height};win.maximized=true;el.classList.add('is-maximized');}
  else{win.maximized=false;el.classList.remove('is-maximized');if(win.oldRect)Object.assign(el.style,win.oldRect);}
  const maxBtn=el.querySelector('[data-action="maximize-window"]');if(maxBtn){maxBtn.textContent=win.maximized?'❐':'□';maxBtn.title=win.maximized?'Восстановить':'Развернуть';}focusWindow(id);
}
function renderWindow(id) {const el=document.querySelector(`[data-window="${id}"] [data-content]`);if(!el)return;el.innerHTML=renderApp(id);wireAppContent(id,el);}
function refreshOpenApps(ids=null) {for(const id of (ids||[...state.opened.keys()]))if(state.opened.has(id))renderWindow(id);renderTaskbar();}
function wireAppContent(id,el) {
  if(isTerminalId(id)){
    const term=getTerm(id);
    const out=el.querySelector('.terminal-output');
    if(out){
      out.addEventListener('scroll',()=>{
        const nearBottom=(out.scrollHeight-out.scrollTop-out.clientHeight)<48;
        if(term) term.scrollPin=nearBottom;
      },{passive:true});
      scrollTerminalBottom(id, true);
    }
    const form=el.querySelector('.terminal-form');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      e.stopPropagation();
      const termNow=getTerm(id);
      // Allow typing/queue only when not mid-animation hard-lock — still accept commands
      const input=form.elements.command;
      const val=input?.value||'';
      if(!val.trim())return;
      if(input)input.value='';
      await runTerminalCommand(id, val);
      queueMicrotask(()=>{
        const i=document.querySelector(`[data-window="${id}"] .terminal-form input`);
        if(i) i.focus({preventScroll:true});
        scrollTerminalBottom(id, true);
      });
    });
  }
  if(isBrowserId(id)){
    const form=el.querySelector('#browserForm')||el.querySelector('.chrome-form');
    form?.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();const v=form.elements.address?.value||form.querySelector('input')?.value||'';navigateBrowser(v,id);});
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
  if(isTerminalId(id)) return renderTerminal(g, id);
  if(isBrowserId(id)) return renderBrowser(g, id);
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
    case 'files':return renderFiles(g);
    case 'phone':return renderPhoneLab(g);
    case 'intel':return renderIntel(g);
    case 'fbi':return renderFbi();
    case 'help':return renderHelp();
    case 'ide':return renderIde(g);
    default:return `<div class="empty-state"><b>Неизвестное приложение</b><p>Приложение не зарегистрировано.</p></div>`;
  }
}
function renderProfile(g) {
  const p=g.player,need=currentLevelNeed(),limit=(typeof xpThresholdForLevel==='function'?xpThresholdForLevel(p.level):BALANCE.xpToLevel[p.level])||p.xp,base=(typeof xpThresholdForLevel==='function'?xpThresholdForLevel(Math.max(1,p.level-1)):BALANCE.xpToLevel[Math.max(0,p.level-1)])||0,progress=p.level>=BALANCE.maxLevel?100:Math.max(0,Math.min(100,(p.xp-base)/Math.max(1,limit-base)*100));
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
  const files = [...(g.computer.files||[]), ...(g.editor.files||[])];
  const usage = getHardwareUsage(g);
  const selected = files.find(f => f.id === state.selectedFileId) || null;
  const list = files.length ? files.map(f => {
    const on = f.id === state.selectedFileId ? 'on' : '';
    const badge = f.encrypted ? 'ENC' : (f.type || 'file');
    return `<button type="button" class="list-row file-row ${on}" data-action="file-select" data-id="${esc(f.id)}">
      <div class="list-main"><strong>${esc(f.name)}</strong><small>${esc(badge)} · ${f.size||1} KB · ${esc(f.path||'/')}</small></div>
    </button>`;
  }).join('') : '<div class="empty-state"><b>Нет файлов</b><p>Отчёты анализа появятся после site-analyzer → save.</p></div>';
  const body = selected
    ? `<div class="file-viewer">
        <div class="file-viewer-head">
          <div><div class="eyebrow">${selected.encrypted?'ENCRYPTED':'FILE'}</div><h3 style="margin:4px 0;font-size:13px">${esc(selected.name)}</h3>
          <small class="muted">${esc(selected.type||'file')} · ${selected.size||1} KB · ${esc(selected.path||'')}</small></div>
          <div class="btn-row">
            <button type="button" class="btn tiny ghost" data-action="file-copy-content" data-id="${esc(selected.id)}">Копировать</button>
            <button type="button" class="btn tiny danger" data-action="file-delete" data-id="${esc(selected.id)}">Удалить</button>
          </div>
        </div>
        <pre class="file-viewer-body" style="user-select:text;white-space:pre-wrap;max-height:min(420px,55vh);overflow:auto;padding:12px;background:#0a1016;border:1px solid #243540;border-radius:8px;margin-top:10px;font-size:11px;line-height:1.45">${esc(String(selected.content||'(пусто)'))}</pre>
      </div>`
    : `<div class="empty-state"><b>Выбери файл</b><p>Слева список · справа содержимое для копирования host / vuln / id.</p></div>`;
  return `<div class="app-heading"><div><div class="eyebrow">FILE SYSTEM</div><h2>Files</h2><p>Локальные файлы · ${fmt(usage.used/1024)} / ${usage.total/1024} GB</p></div><span class="badge">${files.length}</span></div>
  <div class="grid-2 section-gap" style="align-items:start;gap:12px">
    <div class="panel" style="padding:8px;max-height:min(480px,60vh);overflow:auto">${list}</div>
    <div class="panel" style="padding:12px">${body}</div>
  </div>`;
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
  const installed=getInstalledPlugin(g,p.id);
  const wip=typeof isPluginLocked==='function'&&isPluginLocked(p.id);
  const osLocked=g.computer.os<(p.minOs||1),usage=getHardwareUsage(g),space=usage.used+p.storage<=usage.total,bankLocked=bankStatus(g).locked;
  const blocker=wip?'На доработке':osLocked?`NULLBYTE OS ${(p.minOs||1)}.0`:!space?'Недостаточно места':bankLocked?'Банк заблокирован':'Готов к установке';
  const status = wip
    ? '<span class="badge gray">В ДОРАБОТКЕ</span>'
    : installed
      ? '<span class="badge green">INSTALLED</span>'
      : osLocked ? `<span class="badge gray">OS ${(p.minOs||1)}.0</span>`
      : !space ? '<span class="badge red">NO SPACE</span>'
      : bankLocked ? '<span class="badge red">BANK LOCK</span>'
      : `<button class="btn tiny" data-action="install-plugin" data-id="${p.id}" title="${esc(blocker)}">${p.price?'УСТАНОВИТЬ · '+fmt(p.price):'ДОБАВИТЬ'}</button>`;
  return `<div class="list-row"><div class="list-main"><strong>${esc(p.name)} <span class="muted">v${esc(p.version)}</span></strong><small>${esc(p.category)} · ${esc(p.description)}<br>RAM ${p.ram} GB · ${p.storage} MB · ОС ${(p.minOs||1)}.0+ · ${p.cooldown?`${p.cooldown/1000} сек cooldown`:'без cooldown'}${wip?' · <b>WIP</b>':''}</small><small class="text-blue">${wip?'Закрыто до нового чек-листа. Логика сохранена.':esc(p.effect)}</small></div><div class="list-actions"><button class="btn tiny ghost" data-action="plugin-docs" data-id="${p.id}">ПОДРОБНЕЕ</button>${status}</div></div>`;
}
function renderForge(g) {
  const categories=[...new Set(PLUGINS.map(p=>p.category))];
  return `<div class="app-heading"><div><div class="eyebrow">NULFORGE / PACKAGE REPOSITORY</div><h2>NULForge</h2><p>Официальный каталог игровых пакетов NULLBYTE.</p></div><span class="badge">${g.computer.installedPlugins.length} INSTALLED</span></div>
  <div class="notice">Плагины созданы разработчиком. Сейчас web/mobile пакеты помечены «В ДОРАБОТКЕ» — run недоступен. Гейт по уровню снят.</div>
  ${categories.map(cat=>`<div class="panel section-gap"><div class="panel-title"><span>${esc(cat.toUpperCase())}</span><small>${PLUGINS.filter(p=>p.category===cat).length} PACKAGES</small></div><div class="list">${PLUGINS.filter(p=>p.category===cat).map(p=>renderPluginCard(g,p)).join('')}</div></div>`).join('')}`;
}


function getBrowserSession(winId) {
  if (!state.browserSessions) state.browserSessions = new Map();
  if (!state.browserSessions.has(winId)) {
    state.browserSessions.set(winId, {
      tabs: [{ id: 'tab_start', siteId: '', page: 'start', title: 'Новая вкладка', history: [{ page: 'start' }], histIdx: 0 }],
      active: 0
    });
  }
  return state.browserSessions.get(winId);
}

function activeBrowserWinId() {
  if (isBrowserId(state.active)) return state.active;
  for (const id of state.opened.keys()) if (isBrowserId(id) && !state.opened.get(id).minimized) return id;
  return [...state.opened.keys()].find(isBrowserId) || null;
}

function ensureBrowserState() {
  if (!Array.isArray(state.browserTabs)) state.browserTabs = [];
  if (typeof state.browserActive !== 'number') state.browserActive = 0;
  if (!Array.isArray(state.browserClosed)) state.browserClosed = [];
}

function ensureBrowserTab(siteId, page = 'home') {
  ensureBrowserState();
  const site = getSite(state.game, siteId);
  if (!site) return null;
  let tab = state.browserTabs.find(t => t.siteId === siteId);
  if (!tab) {
    tab = {
      id: `tab_${siteId}_${Date.now().toString(36)}`,
      siteId,
      page: page || 'home',
      title: site.title,
      history: [{ page: page || 'home' }],
      histIdx: 0,
      loading: false
    };
    state.browserTabs.push(tab);
  } else {
    tab.page = page || tab.page || 'home';
  }
  state.browserActive = state.browserTabs.indexOf(tab);
  state.game.browser.activeSite = siteId;
  const hist = state.game.browser.history || [];
  if (hist[0]?.siteId !== siteId) {
    hist.unshift({ siteId, at: Date.now() });
    state.game.browser.history = hist.slice(0, 40);
  }
  scheduleSave();
  return tab;
}

function navigateBrowser(value, winId) {
  winId = winId || activeBrowserWinId();
  const input = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!input) { toast('Введи адрес .null или название сайта.', 'error'); return; }
  let domain = input, page = 'home';
  if (input.includes('/')) {
    const parts = input.split('/');
    domain = parts[0];
    page = parts.slice(1).join('/') || 'home';
  }
  const site = state.game.world.sites.find(s => s.domain === domain || s.id === domain || s.title.toLowerCase() === domain)
    || state.game.world.sites.find(s => `${s.title} ${s.domain} ${s.kind}`.toLowerCase().includes(domain));
  if (!site) { toast('Нет совпадений в сети .null', 'error'); return; }
  if (!winId) { openApp('browser'); winId = activeBrowserWinId(); }
  const session = getBrowserSession(winId);
  let tab = session.tabs.find(t => t.siteId === site.id);
  if (!tab) {
    tab = { id: `tab_${site.id}`, siteId: site.id, page, title: site.title, history: [{ page }], histIdx: 0, loading: true };
    session.tabs.push(tab);
  } else {
    tab.page = page;
    tab.history = (tab.history || []).slice(0, (tab.histIdx || 0) + 1);
    tab.history.push({ page });
    tab.histIdx = tab.history.length - 1;
    tab.loading = true;
  }
  session.active = session.tabs.indexOf(tab);
  state.game.browser.activeSite = site.id;
  renderWindow(winId);
  setTimeout(() => { tab.loading = false; if (state.opened.has(winId)) renderWindow(winId); }, 280 + Math.random() * 400);
}

function browserGoPage(page) {
  ensureBrowserState();
  const tab = state.browserTabs[state.browserActive];
  if (!tab) return;
  tab.page = page || 'home';
  tab.history = (tab.history || []).slice(0, tab.histIdx + 1);
  tab.history.push({ page: tab.page });
  tab.histIdx = tab.history.length - 1;
  tab.loading = true;
  renderWindow('browser');
  setTimeout(() => { tab.loading = false; if (state.opened.has('browser')) renderWindow('browser'); }, 200);
}

function browserBack() {
  const tab = state.browserTabs[state.browserActive];
  if (!tab || tab.histIdx <= 0) return;
  tab.histIdx--;
  tab.page = tab.history[tab.histIdx].page;
  renderWindow('browser');
}
function browserForward() {
  const tab = state.browserTabs[state.browserActive];
  if (!tab || tab.histIdx >= tab.history.length - 1) return;
  tab.histIdx++;
  tab.page = tab.history[tab.histIdx].page;
  renderWindow('browser');
}
function browserReload() {
  const tab = state.browserTabs[state.browserActive];
  if (!tab) return;
  tab.loading = true;
  renderWindow('browser');
  setTimeout(() => { tab.loading = false; if (state.opened.has('browser')) renderWindow('browser'); }, 350);
}
function browserNewTab() {
  ensureBrowserState();
  state.browserTabs.push({ id: `tab_new_${Date.now()}`, siteId: '', page: 'start', title: 'Новая вкладка', history: [{ page: 'start' }], histIdx: 0, loading: false });
  state.browserActive = state.browserTabs.length - 1;
  renderWindow('browser');
}
function browserCloseTab(winId, idx) {
  const session = getBrowserSession(winId || activeBrowserWinId());
  idx = Number(idx);
  if (Number.isNaN(idx) || idx < 0 || idx >= session.tabs.length) return;
  if (session.tabs.length <= 1) {
    session.tabs = [{ id: 'tab_start', siteId: '', page: 'start', title: 'Новая вкладка', history: [{ page: 'start' }], histIdx: 0 }];
    session.active = 0;
  } else {
    session.tabs.splice(idx, 1);
    session.active = Math.max(0, Math.min(session.active, session.tabs.length - 1));
  }
  if (winId) renderWindow(winId);
  else renderWindow(activeBrowserWinId());
}

function renderSitePage(g, site, page, progress) {
  const locked = site.recoveryAt > Date.now();
  const access = progress.access;
  const p = page || 'home';

  if (locked) {
    return `<div class="site-page site-error"><div class="site-error-code">503</div><h2>Service Recovering</h2><p>${esc(site.domain)} временно недоступен · recovery ${humanLeft(site.recoveryAt - Date.now())}</p></div>`;
  }

  // Nav helper
  const nav = (items) => `<nav class="site-nav">${items.map(([pg, lab]) => `<button type="button" class="site-nav-link ${p===pg?'on':''}" data-action="browser-page" data-page="${pg}">${lab}</button>`).join('')}</nav>`;

  if (site.kind === 'shop') {
    const products = [
      { n: 'NullCore CPU kit', price: 420 },
      { n: 'Mesh RAM stick', price: 180 },
      { n: 'Harbor SSD 512', price: 310 },
      { n: 'Order VM-204 (ledger)', price: '—' }
    ];
    if (p === 'catalog') {
      return `<div class="site-page site-shop"><header class="site-hero shop"><div class="site-brand">VOLT<span>MARKET</span></div>${nav([['home','Главная'],['catalog','Каталог'],['orders','Заказы'],['about','О нас']])}</header>
        <div class="site-body"><h2>Каталог</h2><div class="shop-grid">${products.map(x=>`<div class="shop-card"><strong>${esc(x.n)}</strong><span>${x.price=== '—' ? 'ledger' : x.price+' CR'}</span></div>`).join('')}</div>
        <p class="site-note">Публичная витрина. Глубокие записи заказа — через операции в Terminal.</p></div></div>`;
    }
    if (p === 'orders') {
      return `<div class="site-page site-shop"><header class="site-hero shop"><div class="site-brand">VOLT<span>MARKET</span></div>${nav([['home','Главная'],['catalog','Каталог'],['orders','Заказы'],['about','О нас']])}</header>
        <div class="site-body"><h2>Заказы</h2>
        <div class="data-table"><div class="dt-row head"><span>ID</span><span>Статус</span><span>Сумма</span></div>
        <div class="dt-row"><span>VM-204</span><span>${access?'visible':'restricted'}</span><span>···</span></div>
        <div class="dt-row"><span>VM-118</span><span>shipped</span><span>90 CR</span></div></div>
        <p class="site-note">Артефакт CATALOG-B7 связан с VM-204.</p></div></div>`;
    }
    return `<div class="site-page site-shop"><header class="site-hero shop"><div class="site-brand">VOLT<span>MARKET</span></div>${nav([['home','Главная'],['catalog','Каталог'],['orders','Заказы'],['about','О нас']])}</header>
      <div class="site-body"><h1>Электроника и комплектующие</h1><p>${esc(site.description)}</p>
      <div class="shop-grid">${products.slice(0,3).map(x=>`<div class="shop-card"><strong>${esc(x.n)}</strong><span>${x.price} CR</span></div>`).join('')}</div>
      <p class="site-meta">Регион: ${esc(site.region)} · sec ${site.security}/5</p>
      ${(()=>{const L=state.game.ops?.paymentLinks?.[site.id]; if(L&&L.current!==L.original&&L.expiresAt>Date.now()) return `<div class="notice warning">Checkout diverted (hidden timer)</div>`; return '';})()}
      <p class="site-meta"></p></div></div>`;
  }

  if (site.kind === 'bank') {
    const sess = state.bankSessionId ? getBankSession(state.game, state.bankSessionId) : null;
    const acc = sess ? state.game.npcWorld?.bankAccounts?.[sess.accountId] : null;
    if (p === 'login' || (!acc && p === 'cabinet')) {
      return `<div class="site-page site-bank"><header class="site-hero bank"><div class="site-brand">ASTER <span>UNION</span></div>${nav([['home','Обзор'],['login','Вход'],['security','Безопасность']])}</header>
        <div class="site-body"><h2>Вход в кабинет</h2>
        <p class="muted">Только игровые счета NPC. Данные можно найти через телефон / разведку.</p>
        <form class="bank-login-form" data-action-form="bank-login"><label>Логин<input class="field" name="login" autocomplete="off"></label><label>Пароль<input class="field" name="password" type="password" autocomplete="off"></label>
        <button class="btn primary" type="submit">ВОЙТИ</button></form>
        <p class="site-note">Сессия скрыто ограничена (~20 мин).</p></div></div>`;
    }
    if (acc) {
      const tx = (acc.transactions||[]).slice(0,8);
      return `<div class="site-page site-bank"><header class="site-hero bank"><div class="site-brand">ASTER <span>UNION</span></div>${nav([['home','Обзор'],['cabinet','Кабинет'],['transfer','Перевод']])}</header>
        <div class="site-body"><h2>Кабинет</h2>
        <div class="bank-dash"><div class="bank-tile"><span>Счёт</span><strong>${esc(acc.accountNo)}</strong></div><div class="bank-tile"><span>Баланс</span><strong>${fmt(acc.balance)} CR</strong></div><div class="bank-tile"><span>Сессия</span><strong>ACTIVE</strong></div></div>
        ${p==='transfer'?`<form class="bank-login-form" data-action-form="bank-transfer"><label>Счёт получателя<input class="field" name="to" placeholder="AST-########"></label><label>Сумма<input class="field" name="amount" type="number" min="1"></label><button class="btn primary" type="submit">ПЕРЕВЕСТИ</button></form>`:''}
        <h3>История</h3>
        ${tx.map(t=>`<div class="forum-row"><strong>${t.type} ${t.amount}</strong><small>${t.to||t.from||''} · ${formatTime(t.at)}</small></div>`).join('')}
        <div class="btn-row section-gap"><button class="btn tiny" data-action="bank-logout">ВЫЙТИ</button></div>
        </div></div>`;
    }
    return `<div class="site-page site-bank"><header class="site-hero bank"><div class="site-brand">ASTER <span>UNION</span></div>${nav([['home','Обзор'],['login','Вход'],['security','Безопасность']])}</header>
      <div class="site-body">
        <div class="bank-dash"><div class="bank-tile"><span>Контур</span><strong>NPC ACCOUNTS</strong></div><div class="bank-tile"><span>Защита</span><strong>${site.security}/5</strong></div><div class="bank-tile"><span>Статус</span><strong>${site.state}</strong></div></div>
        <p>Aster Union — внутриигровой банк. Счета NPC, переводы, ограниченная сессия.</p>
        <p class="site-note">Эндгейм-симуляция оператора — в приложении Aster Bank на рабочем столе.</p>
      </div></div>`;
  }

  if (site.kind === 'forum') {
    const threads = [
      { t: 'Правила симуляции', by: 'mod_cobalt', n: 12 },
      { t: 'Сборка null-mesh', by: 'night_runner', n: 5 },
      { t: 'Сигналы с Площади Маяк', by: 'harbor_ops', n: 8 }
    ];
    if (p === 'threads') {
      return `<div class="site-page site-forum"><header class="site-hero forum"><div class="site-brand">COBALT <span>FORUM</span></div>${nav([['home','Лента'],['threads','Темы'],['users','Участники']])}</header>
        <div class="site-body"><h2>Темы</h2>${threads.map(th=>`<div class="forum-row"><strong>${esc(th.t)}</strong><small>${esc(th.by)} · ${th.n} msg</small></div>`).join('')}
        <p class="site-note">Полные тексты сообщений — через контракт / Terminal export.</p></div></div>`;
    }
    return `<div class="site-page site-forum"><header class="site-hero forum"><div class="site-brand">COBALT <span>FORUM</span></div>${nav([['home','Лента'],['threads','Темы'],['users','Участники']])}</header>
      <div class="site-body"><h1>Сообщество Cobalt</h1><p>${esc(site.description)}</p>
      ${threads.slice(0,2).map(th=>`<div class="forum-row"><strong>${esc(th.t)}</strong><small>${esc(th.by)}</small></div>`).join('')}
      </div></div>`;
  }

  if (site.kind === 'database') {
    return `<div class="site-page site-gov"><header class="site-hero gov"><div class="site-brand">CIVIC <span>RECORDS</span></div>${nav([['home','Портал'],['registry','Реестр'],['docs','Документы']])}</header>
      <div class="site-body">
        <h1>Муниципальный реестр</h1>
        <p>Официальный интерфейс. Записи CR-* доступны операторам с Virtual DB Reader.</p>
        <div class="gov-box"><span>Раздел</span><strong>${p==='registry'?'REGISTRY':'PUBLIC'}</strong></div>
        <div class="data-table"><div class="dt-row head"><span>Код</span><span>Класс</span><span>Доступ</span></div>
        <div class="dt-row"><span>CR-29</span><span>archive</span><span>${progress.database||access?'granted':'restricted'}</span></div>
        <div class="dt-row"><span>CR-11</span><span>public</span><span>open</span></div></div>
      </div></div>`;
  }

  if (site.kind === 'utility') {
    return `<div class="site-page site-util"><header class="site-hero util"><div class="site-brand">GRID<span>WORKS</span></div>${nav([['home','Статус'],['logs','Журналы'],['nodes','Узлы']])}</header>
      <div class="site-body"><h1>Сетевой контроллер</h1>
      <div class="util-meters"><div><span>Load</span><b>${30+site.security*8}%</b></div><div><span>Nodes</span><b>14</b></div><div><span>Journal</span><b>GW-11</b></div></div>
      <p>${esc(site.description)}</p>
      <p class="site-note">Телеметрия публична частично. Полный журнал — через операции.</p></div></div>`;
  }

  if (site.kind === 'auto') {
    return `<div class="site-page site-auto"><header class="site-hero auto"><div class="site-brand">NEON <span>MOTORS</span></div>${nav([['home','Сервис'],['cards','Карточки'],['about','О сервисе']])}</header>
      <div class="site-body"><h1>Сервисные карточки</h1>
      <div class="auto-card"><strong>NM-88</strong><span>VIN-SIM-88</span><small>status: workshop</small></div>
      <div class="auto-card"><strong>NM-12</strong><span>VIN-SIM-12</span><small>status: ready</small></div>
      <p class="site-note">Авто-механика как отдельная система — LOCKED. Здесь только веб-карточки.</p></div></div>`;
  }

  if (site.kind === 'device') {
    return `<div class="site-page site-device"><header class="site-hero device"><div class="site-brand">POCKET <span>MOBILE</span></div>${nav([['home','Устройство'],['apps','Приложения']])}</header>
      <div class="site-body"><div class="phone-frame"><div class="phone-screen"><strong>PM-22</strong><small>demo handset</small><p>Сеть: NorthWifi</p></div></div>
      <p>${esc(site.description)}</p>
      <p class="site-note">Глубокий разбор — map-scanner forensics в Terminal.</p></div></div>`;
  }

  if (site.kind === 'wifi') {
    return `<div class="site-page site-wifi"><header class="site-hero wifi"><div class="site-brand">NORTH <span>WIFI</span></div>${nav([['home','Точка'],['status','Статус']])}</header>
      <div class="site-body"><h1>AP-05 · Площадь Маяк</h1>
      <div class="wifi-panel"><span>SSID</span><strong>NorthWifi-AP05</strong><span>Signal</span><strong>-48 dBm</strong><span>Clients</span><strong>6</strong></div>
      <p class="site-note">Параметры точки экспортируются контрактом.</p></div></div>`;
  }

  // generic
  return `<div class="site-page site-generic"><header class="site-hero"><div class="site-brand">${esc(site.title)}</div></header>
    <div class="site-body"><p>${esc(site.description)}</p><p class="site-meta">${esc(site.domain)} · ${esc(site.kind)} · sec ${site.security}</p></div></div>`;
}

function renderBrowserStart(g) {
  const sites = g.world.sites;
  return `<div class="browser-start">
    <div class="browser-start-hero"><h1>NULLBYTE NET</h1><p>Только домены .null · локальная симуляция</p></div>
    <form class="browser-start-search" id="browserForm"><input class="field" name="address" placeholder="адрес .null или название" autocomplete="off"><button class="btn primary" type="submit">Перейти</button></form>
    <div class="browser-start-grid">${sites.map(s=>`<button type="button" class="start-tile kind-${esc(s.kind)}" data-action="browser-tab" data-site="${s.id}"><strong>${esc(s.title)}</strong><small>${esc(s.domain)}</small></button>`).join('')}</div>
    <div class="browser-start-side">
      <div><h3>История</h3>${(g.browser.history||[]).slice(0,5).map(h=>{const s=getSite(g,h.siteId);return s?`<button type="button" class="linkish" data-action="browser-tab" data-site="${s.id}">${esc(s.domain)}</button>`:'';}).join('')||'<span class="muted">пусто</span>'}</div>
      <div><h3>Закладки</h3>${(g.browser.bookmarks||[]).map(id=>{const s=getSite(g,id);return s?`<button type="button" class="linkish" data-action="browser-tab" data-site="${s.id}">${esc(s.title)}</button>`:'';}).join('')||'<span class="muted">нет</span>'}</div>
    </div>
  </div>`;
}

function renderBrowser(g, winId) {
  winId = winId || activeBrowserWinId() || 'browser-1';
  const session = getBrowserSession(winId);
  const browserTabs = session.tabs;
  const browserActive = session.active;
  if (!browserTabs.length) {
    session.tabs = [{ id: 'tab_start', siteId: '', page: 'start', title: 'Новая вкладка', history: [{ page: 'start' }], histIdx: 0 }];
    session.active = 0;
  }
  const tab = session.tabs[session.active] || session.tabs[0];
  const site = tab.siteId ? getSite(g, tab.siteId) : null;
  const progress = site ? getSiteProgress(g, site.id) : {};
  const address = site ? `${site.domain}${tab.page && tab.page !== 'home' ? '/' + tab.page : ''}` : '';
  const secure = site && site.state === 'online' && !(site.recoveryAt > Date.now());

  const tabsHtml = session.tabs.map((t, idx) => {
    const s = t.siteId ? getSite(g, t.siteId) : null;
    const title = s ? s.title : (t.title || 'Новая вкладка');
    const fav = s ? s.kind.slice(0, 1).toUpperCase() : '+';
    return `<div class="chrome-tab ${idx===session.active?'on':''}" data-action="browser-activate-tab" data-win="${esc(winId)}" data-idx="${idx}">
      <span class="chrome-fav">${fav}</span><span class="chrome-tab-title">${esc(title)}</span>
      <button type="button" class="chrome-tab-x" data-action="browser-close-tab" data-win="${esc(winId)}" data-idx="${idx}" aria-label="Закрыть">×</button>
    </div>`;
  }).join('') + `<button type="button" class="chrome-tab-add" data-action="browser-new-tab" data-win="${esc(winId)}" title="Новая вкладка">+</button>`;

  let pageHtml;
  if (!site || tab.page === 'start') pageHtml = renderBrowserStart(g);
  else pageHtml = renderSitePage(g, site, tab.page, progress);

  const canBack = tab.histIdx > 0;
  const canFwd = tab.history && tab.histIdx < tab.history.length - 1;

  return `<div class="browser-app">
    <div class="chrome-tabs">${tabsHtml}</div>
    <div class="chrome-toolbar">
      <button type="button" class="chrome-btn" data-action="browser-back" data-win="${esc(winId)}" ${canBack?'':'disabled'} title="Назад">←</button>
      <button type="button" class="chrome-btn" data-action="browser-forward" data-win="${esc(winId)}" ${canFwd?'':'disabled'} title="Вперёд">→</button>
      <button type="button" class="chrome-btn" data-action="browser-reload" data-win="${esc(winId)}" title="Обновить">↻</button>
      <div class="chrome-omnibox ${tab.loading?'is-loading':''}">
        <span class="chrome-lock" title="${secure?'Secure · sim TLS':'Not secure'}">${secure?'🔒':'⚠️'}</span>
        <form id="browserForm" class="chrome-form"><input name="address" value="${esc(address)}" placeholder="Введите адрес .null" autocomplete="off" spellcheck="false"></form>
        ${tab.loading?'<span class="chrome-spinner"></span>':''}
      </div>
      ${site?`<button type="button" class="chrome-btn" data-action="browser-bookmark" data-win="${esc(winId)}" data-site="${site.id}" title="В закладки">☆</button>`:''}
    </div>
    <div class="chrome-page ${tab.loading?'is-dim':''}">${pageHtml}</div>
  </div>`;
}


function renderMap(g) {
  const selected = state.mapSelected || null;
  const locs = LOCATIONS || [];
  const points = locs.map(loc => `<button type="button" class="map-point ${selected===loc.id?'on':''}" style="left:${loc.x}%;top:${loc.y}%" data-action="map-location" data-location="${loc.id}">${esc(loc.name)}</button>`).join('');
  let detail = '<div class="empty-state"><b>Выбери регион</b><p>Снизу — сетевой ключ и сайты региона.</p></div>';
  if (selected) {
    const loc = locs.find(l => l.id === selected);
    const netKey = loc?.netKey || ('NET-'+String(selected).toUpperCase());
    const ssid = loc?.ssid || 'AP';
    const siteList = (loc?.pois||[]).map(id => getSite(g,id)).filter(Boolean);
    detail = `<div class="panel"><div class="panel-title"><span>${esc(loc?.name||selected)}</span><small>${esc(loc?.region||'')}</small></div>
      <div class="kv"><span>Network key</span><b class="text-green">${esc(netKey)}</b></div>
      <div class="kv"><span>SSID</span><b>${esc(ssid)}</b></div>
      <div class="btn-row section-gap"><button type="button" class="btn tiny" data-action="copy-text" data-text="${esc(netKey)}">КОПИРОВАТЬ КЛЮЧ</button></div>
      <div class="panel-title section-gap"><span>САЙТЫ РЕГИОНА</span><small>${siteList.length}</small></div>
      ${siteList.map(s=>`<div class="list-row"><div class="list-main"><strong>${esc(s.title)}</strong><small>${esc(s.domain)} · ${esc(s.kind)}</small></div>
        <button type="button" class="btn tiny ghost" data-action="browser-tab" data-site="${s.id}">Открыть</button></div>`).join('')||'<div class="muted">Нет точек</div>'}
      <p class="muted small section-gap">Signal Mapper: map region или ключ ${esc(netKey)}</p>
    </div>`;
  }
  return `<div class="app-heading"><div><div class="eyebrow">NULL CITY MAP</div><h2>Карта</h2><p>6 регионов · сетевые ключи · локальные сайты</p></div><span class="badge">MAP</span></div>
  <div class="map-canvas section-gap">${points}</div>
  <div class="section-gap">${detail}</div>`;
}


function missionSteps(m, g) {
  const site = getSite(g, m.target);
  const needDb = site?.kind === 'database';
  const steps = [
    'Открой BlackWire и прими контракт (если ещё не принят).',
    `Открой Browser → цель <b>${esc(site?.domain || m.target)}</b>.`,
    'Работай через Terminal и установленные плагины:',
    '&nbsp;&nbsp;run site-analyzer → analyze &lt;domain&gt; → копируй SIGNATURE',
    '&nbsp;&nbsp;run artifact-decoder → decode &lt;SIGNATURE&gt; → ARTIFACT_ID',
    '&nbsp;&nbsp;run node-radar → discover &lt;ARTIFACT_ID&gt; → HOST_HANDLE',
    '&nbsp;&nbsp;run weakness-lab → probe &lt;HOST_HANDLE&gt; → VECTOR_ID',
    '&nbsp;&nbsp;run sim-exploit → simulate &lt;VECTOR_ID&gt; → SESSION_TOKEN',
  ];
  if (needDb) steps.push('&nbsp;&nbsp;6) Чтение виртуальной БД (нужен Virtual DB Reader)');
  steps.push(`${needDb ? '7' : '6'}) run data-exporter → export &lt;SESSION_TOKEN&gt;`);
  steps.push('Собери результат через data-exporter в Terminal.');
  steps.push('Передай файл заказчику через N-Mail, когда он появится в очереди.');
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
    <div class="btn-row">${m.status==='available'?`<button class="btn primary" data-action="accept-mission" data-id="${m.id}">ПРИНЯТЬ</button>`:m.status==='accepted'?`<span class="badge amber">В РАБОТЕ</span>`:m.status==='submitted'?`<span class="badge green">НА ПРОВЕРКЕ</span>`:''}</div>
  </div>`;
}


function renderBlackWire(g) {
  const now = Date.now();
  const boardLeft = typeof missionBoardTimer === 'function' ? missionBoardTimer(g, now) : 0;
  const boardNotice = '<div class="notice warning section-gap">Контракты по сайтам и mobile закрыты на доработку. Новая ветка — после чек-листа.</div>';
  const boardMin = Math.floor(boardLeft / 60000);
  const boardSec = Math.floor((boardLeft % 60000) / 1000);
  const boardIds = new Set(g.intel?.boardIds || []);
  const available = g.missions.items.filter(m => m.status === 'available' && (boardIds.size ? boardIds.has(m.id) : true));
  const active = g.missions.items.filter(m => m.status === 'accepted' || m.status === 'submitted');
  const selected = state.selectedMissionId ? g.missions.items.find(x => x.id === state.selectedMissionId) : null;
  const card = m => {
    const site = getSite(g, m.target);
    return `<article class="contract-card ${state.selectedMissionId===m.id?'is-selected':''}">
      <div class="contract-top"><strong>${esc(m.title)}</strong><span class="badge ${m.status==='accepted'?'amber':m.status==='submitted'?'green':'gray'}">${m.status==='accepted'?'ACTIVE':m.status==='submitted'?'VERIFYING':(m.category||'JOB').toUpperCase()}</span></div>
      <p>${esc(m.objective)}</p>
      <div class="contract-meta"><span>ID ${esc(m.id)}</span><span>ЦЕЛЬ ${esc(site?.domain||m.target)}</span><span>${esc(m.difficulty)}</span></div>
      <div class="contract-meta section-gap"><span class="text-green">+${fmt(m.reward)} CR</span><span>+${fmt(m.xp)} XP</span><span>${esc(m.client)}</span></div>
      <div class="divider"></div>
      <div class="small muted">${esc(m.hint||'')}</div>
      <div class="btn-row">
        <button class="btn tiny" data-action="mission-details" data-id="${m.id}">ДЕТАЛИ</button>
        ${m.status==='available'?`<button class="btn primary" data-action="accept-mission" data-id="${m.id}">ПРИНЯТЬ</button>`:''}
        ${m.status==='accepted'?`<button class="btn tiny danger" data-action="cancel-mission" data-id="${m.id}">ОТМЕНИТЬ</button>`:''}
        ${m.status==='submitted'?`<span class="badge green">ПРОВЕРКА · ${humanLeft(m.verifyAt-now)}</span>`:''}
      </div>
    </article>`;
  };
  return `<div class="app-heading"><div><div class="eyebrow">BLACKWIRE / CONTRACT BOARD</div><h2>BlackWire</h2><p>3–4 предложения · ротация 20 мин · активные сохраняются</p></div><span class="badge">SOLO</span></div>
  <div class="grid-3">
    <div class="stat-box"><span>OFFERS</span><strong>${available.length}</strong><small>доступно сейчас</small></div>
    <div class="stat-box"><span>ACTIVE</span><strong>${active.length}</strong><small>в работе</small></div>
    <div class="stat-box"><span>ROTATION</span><strong>${String(boardMin).padStart(2,'0')}:${String(boardSec).padStart(2,'0')}</strong><small>до смены доски</small></div>
  </div>
  ${active.length?`<div class="panel section-gap"><div class="panel-title"><span>АКТИВНЫЕ</span></div><div class="list">${active.map(card).join('')}</div></div>`:''}
  <div class="section-gap list">${available.length?available.map(card).join(''):'<div class="empty-state"><b>Нет предложений</b><p>Дождись ротации доски.</p></div>'}</div>
  ${selected?renderMissionGuide(selected,g):''}
  <div class="notice section-gap">Отмена активного контракта снимает его без награды. Собранные артефакты остаются.</div>`;
}

function terminalPrompt(term) {
  if (state.game?.ops?.serverSession && !term?.plugin) {
    return `shell@${state.game.ops.serverSession.domain}:~$`;
  }
  if (term?.plugin) {
    const p = getPlugin(term.plugin);
    const short = (p?.id || term.plugin).replace(/[^a-z0-9]/gi, '').slice(0, 10);
    return `${short}>`;
  }
  return 'operator@nullbyte $';
}

function scrollTerminalBottom(termId, force = false) {
  const out = document.querySelector(`[data-window="${termId}"] .terminal-output`);
  if (!out) return;
  const term = getTerm(termId);
  if (!force && term && !term.scrollPin) return;
  requestAnimationFrame(() => {
    out.scrollTop = out.scrollHeight + 400;
    requestAnimationFrame(() => { out.scrollTop = out.scrollHeight + 400; });
  });
}

function termAdd(termId, text, type = '') {
  const term = getTerm(termId);
  if (!term) return;
  term.lines.push({ text, type });
  term.lines = term.lines.slice(-200);
  const out = document.querySelector(`[data-window="${termId}"] .terminal-output`);
  if (out) {
    const row = document.createElement('div');
    if (type) row.className = type;
    row.textContent = text;
    out.appendChild(row);
    while (out.children.length > 200) out.removeChild(out.firstChild);
    scrollTerminalBottom(termId, true);
  }
}

function pluginBanner(pluginId) {
  const skins = {
    'net-link': {
      color: 'blue',
      lines: [
        '  ╭──── NET LINK ────╮',
        '  │  ≈≈ radio mesh  │',
        '  │  ░░ iface up ░░ │',
        '  ╰─────────────────╯'
      ]
    },
    'net-analyzer': {
      color: 'blue',
      lines: [
        '  ┌─ NET ANALYZER ─┐',
        '  │ ▓▓▓ scan grid  │',
        '  │ ··· PHONE_ID ·│',
        '  └────────────────┘'
      ]
    },
    'phone-access': {
      color: 'green',
      lines: [
        '  ╔═ PHONE ACCESS ═╗',
        '  ║  ▣ unlock sim  ║',
        '  ║  → handset tty ║',
        '  ╚════════════════╝'
      ]
    },
    'mail-drop': {
      color: 'blue',
      lines: [
        '  ◆ MAIL DROP ◆',
        '  { payload.seal }',
        '  → N-Mail attach'
      ]
    },
    'sms-bomber': {
      color: 'error',
      lines: [
        '  !! SMS BOMBER !!',
        '  >>> flood queue',
        '  *** sim only ***'
      ]
    },
    'bank-peek': {
      color: 'blue',
      lines: [
        '  〔 BANK PEEK 〕',
        '  $ notes / ledger',
        '  virtual only'
      ]
    }
  };
  const s = skins[pluginId];
  if (s) return s.lines.map(t => ({ text: t, type: s.color }));
  const p = getPlugin(pluginId);
  const name = (p?.name || pluginId).toUpperCase();
  return [
    { text: `╔══ ${name} ══╗`, type: 'blue' },
    { text: `║ module://${pluginId}`, type: 'muted' },
    { text: `╚══════════════╝`, type: 'blue' }
  ];
}


function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function animatePluginBoot(termId, pluginId) {
  const boots = {
    'net-link': [
      { text: '· radio cold start', type: 'muted' },
      { text: '· load region table', type: 'muted' },
      { text: '· mesh driver OK', type: 'green' }
    ],
    'net-analyzer': [
      { text: '· alloc scan buffer', type: 'muted' },
      { text: '· hash PHONE index', type: 'muted' },
      { text: '· analyzer ready', type: 'green' }
    ],
    'phone-access': [
      { text: '· session vault', type: 'muted' },
      { text: '· handset protocol', type: 'muted' },
      { text: '· access shell ready', type: 'green' }
    ],
    'mail-drop': [
      { text: '· envelope kit', type: 'muted' },
      { text: '· drop ready', type: 'green' }
    ],
    'sms-bomber': [
      { text: '· arm virtual modem', type: 'muted' },
      { text: '· bomber armed', type: 'green' }
    ],
    'bank-peek': [
      { text: '· open notes layer', type: 'muted' },
      { text: '· peek ready', type: 'green' }
    ]
  };
  const seq = boots[pluginId] || [
    { text: '[··] init', type: 'muted' },
    { text: '[==] ready', type: 'green' }
  ];
  for (const f of seq) {
    termAdd(termId, f.text, f.type);
    await sleep(90);
  }
  for (const line of pluginBanner(pluginId)) {
    termAdd(termId, line.text, line.type);
    await sleep(35);
  }
  for (const line of pluginShellBootLines(pluginId)) {
    termAdd(termId, line.text, line.type);
    await sleep(30);
  }
}


async function animateWork(termId, pluginId) {
  const steps = (typeof PLUGIN_ANIM !== 'undefined' && PLUGIN_ANIM[pluginId]) || ['processing…', 'done'];
  const streams = {
    'net-analyzer': () => [
      `DEV ${String(1000+((Math.random()*8999)|0)).padStart(4,'0')}  rssi=-${40+((Math.random()*40)|0)}  mac=${[...Array(6)].map(()=>((Math.random()*256)|0).toString(16).padStart(2,'0')).join(':')}`,
      `PHONE_ID candidate  PH-${['BAYS','MIDT','IRON','SOUT'][((Math.random()*4)|0)]}-${String((Math.random()*550)|0).padStart(4,'0')}`,
      `pkt in=${((Math.random()*4000)|0)}  out=${((Math.random()*1200)|0)}  drop=${((Math.random()*12)|0)}`
    ],
    'net-link': () => [
      `iface wlan0  ch=${1+((Math.random()*11)|0)}  bssid=${[...Array(6)].map(()=>((Math.random()*256)|0).toString(16).padStart(2,'0')).join(':')}`,
      `auth SAE  retry=${(Math.random()*3)|0}  rtt=${((Math.random()*40)+2)|0}ms`
    ],
    'phone-access': () => [
      `token ${[...Array(8)].map(()=>((Math.random()*16)|0).toString(16)).join('')}…`,
      `fs mount /user  blocks=${((Math.random()*900)+100)|0}`,
      `lockstate=${['secure','weak','open'][((Math.random()*3)|0)]}`
    ],
    'mail-drop': () => [`mime multipart  size=${((Math.random()*40)+4)|0}kb  crc=ok`],
    'sms-bomber': () => [`queue +${((Math.random()*80)|0)}  rate=${((Math.random()*20)+5)|0}/s`],
    'bank-peek': () => [`ledger hint  offset=0x${((Math.random()*0xffff)|0).toString(16)}`]
  };
  const gen = streams[pluginId] || (() => [`0x${((Math.random()*0xffffff)|0).toString(16).padStart(6,'0')}  n=${((Math.random()*9999)|0)}`]);
  termAdd(termId, `┌─ WORK · ${pluginId}`, 'blue');
  for (let i = 0; i < steps.length; i++) {
    const pct = Math.round(((i + 1) / steps.length) * 100);
    const filled = Math.round(pct / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    termAdd(termId, `│ ${steps[i]}`, '');
    for (const line of gen()) {
      termAdd(termId, `│   » ${line}`, 'muted');
      await sleep(55 + Math.random() * 50);
    }
    termAdd(termId, `│ [${bar}] ${pct}%`, 'blue');
    await sleep(180 + Math.random() * 120);
  }
  termAdd(termId, `└─ complete`, 'green');
}



async function enterPlugin(termId, pluginId) {
  if (isPluginLocked(pluginId) || pluginId === 'phone-control') {
    termAdd(termId, `Плагин «${pluginId}» недоступен (на доработке / заменён).`, 'error');
    if (pluginId === 'phone-control') termAdd(termId, 'Управление телефоном — приложение Phone Lab на рабочем столе.', 'muted');
    else termAdd(termId, 'Запуск из консоли закрыт, пока модуль на доработке.', 'muted');
    return;
  }

  const term = getTerm(termId);
  if (!term) return;
  const p = getPlugin(pluginId) || PLUGINS.find(x => x.id === pluginId || x.name.toLowerCase() === pluginId.toLowerCase());
  if (!p) { termAdd(termId, 'Плагин не найден.', 'error'); return; }
  if (!getInstalledPlugin(state.game, p.id)) { termAdd(termId, `«${p.name}» не установлен.`, 'error'); return; }
  if (!PLUGIN_SHELLS[p.id]) { termAdd(termId, 'Нет shell.', 'error'); return; }
  if (term.busy) { termAdd(termId, 'busy…', 'error'); return; }
  term.busy = true;
  try {
    await animatePluginBoot(termId, p.id);
    term.plugin = p.id;
    const win = document.querySelector(`[data-window="${termId}"]`);
    win?.querySelector('.terminal-form .term-prompt') && (win.querySelector('.terminal-form .term-prompt').textContent = terminalPrompt(term));
    const tool = win?.querySelector('.terminal-toolbar .term-mode');
    if (tool) tool.textContent = p.id;
  } finally {
    term.busy = false;
    const input = document.querySelector(`[data-window="${termId}"] .terminal-form input`);
    if (input) { input.disabled = false; input.focus({ preventScroll: true }); }
  }
}

function renderTerminal(g, termId) {
  const term = getTerm(termId);
  const plug = term.plugin ? getPlugin(term.plugin) : null;
  return `<div class="term-root"><div class="terminal-shell terminal-shell-compact"><div class="terminal-toolbar"><span class="term-prompt-label">${esc(terminalPrompt(term))}</span><span class="term-mode">${plug ? esc(plug.id) : 'tty'}</span></div><div class="terminal-output">${term.lines.map(l => `<div class="${esc(l.type || '')}">${esc(l.text)}</div>`).join('')}</div><form class="terminal-input-row terminal-form" data-term="${esc(termId)}"><span class="term-prompt">${esc(terminalPrompt(term))}</span><input name="command" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${plug ? 'help | exit' : 'run site-analyzer'}" aria-label="Команда"></form></div></div>`;
}

async function runTerminalCommand(termId, raw) {
  const term = getTerm(termId);
  if (!term) return;
  const cmd = String(raw || '').trim();
  if (!cmd) return;
  termAdd(termId, `${terminalPrompt(term)} ${cmd}`, 'prompt');
  term.scrollPin = true;

  // —— SERVER SHELL (when connected) —— locked while web ops WIP ——
  if (state.game.ops?.serverSession && !term.plugin) {
    termAdd(termId, 'Серверная сессия на доработке. exit server.', 'error');
    if (cmd.toLowerCase().includes('exit')) {
      const r = runPluginShellCommand(state.game, 'sim-exploit', 'exit server');
      for (const line of (r.lines||[])) termAdd(termId, line.text, line.type||'');
    }
    return;
  }
  if (false && state.game.ops?.serverSession && !term.plugin) {
    const sess = state.game.ops.serverSession;
    const lower = cmd.toLowerCase();
    const parts = cmd.split(/\s+/);
    const one = (parts[0]||'').toLowerCase();
    if (lower === 'exit server' || lower === 'exit' || lower === 'logout') {
      const r = runPluginShellCommand(state.game, 'sim-exploit', 'exit server');
      for (const line of (r.lines||[])) termAdd(termId, line.text, line.type||'');
      scheduleSave();
      return;
    }
    if (lower === 'help') {
      termAdd(termId, 'SERVER SHELL — команды узла (не локальный ПК)', 'blue');
      termAdd(termId, 'whoami | users | services | read <file> | set user <id> <field> <val>', 'muted');
      termAdd(termId, 'delete user <id> | posts | ban <id> | exit server', 'muted');
      return;
    }
    if (one === 'whoami') {
      termAdd(termId, `shell@${sess.domain}  site=${sess.siteId}`, 'green');
      return;
    }
    if (one === 'users') {
      const users = Object.values(state.game.intel?.users||{}).slice(0, 15);
      if (!users.length) termAdd(termId, 'Нет записей users в intel. server-index → decode.', 'muted');
      users.forEach(u => termAdd(termId, `${u.id}  ${u.username}  role=${u.role}`));
      return;
    }
    if (one === 'services') {
      termAdd(termId, 'http 443  up', '');
      termAdd(termId, 'ssh  22   filtered', '');
      termAdd(termId, `domain ${sess.domain}`, 'muted');
      return;
    }
    if (one === 'set' && parts[1] === 'user') {
      const uid = parts[2]; const field = parts[3]; const val = parts.slice(4).join(' ');
      const u = state.game.intel?.users?.[uid];
      if (!u) { termAdd(termId, 'user not found', 'error'); return; }
      if (field === 'username' || field === 'role') { u[field] = val; termAdd(termId, `updated ${uid}.${field}=${val}`, 'green'); }
      else termAdd(termId, 'fields: username | role', 'error');
      if (typeof markServerModified === 'function') markServerModified(state.game);
      else if (state.game.ops?.serverSession) { state.game.ops.serverSession.modified = true; }
      scheduleSave();
      return;
    }
    if (one === 'delete' && parts[1] === 'user') {
      const uid = parts[2];
      if (state.game.intel?.users?.[uid]) { delete state.game.intel.users[uid]; termAdd(termId, `deleted ${uid}`, 'green'); }
      else termAdd(termId, 'not found', 'error');
      scheduleSave();
      return;
    }
    if (one === 'posts') {
      termAdd(termId, 'forum posts (sim): post_01 likes=12 | post_02 likes=3', 'muted');
      return;
    }
    if (one === 'ban') {
      termAdd(termId, `ban flag set for ${parts[1]||'?'} (sim)`, 'green');
      scheduleSave();
      return;
    }
    termAdd(termId, `server: неизвестная команда «${cmd}». help`, 'error');
    return;
  }


  if (term.plugin) {
    const lower = cmd.toLowerCase();
    if (lower === 'exit' || lower === 'quit') {
      const result = runPluginShellCommand(state.game, term.plugin, 'exit');
      for (const line of result.lines || []) termAdd(termId, line.text, line.type || '');
      term.plugin = null;
      const win = document.querySelector(`[data-window="${termId}"]`);
      if (win?.querySelector('.terminal-form .term-prompt')) win.querySelector('.terminal-form .term-prompt').textContent = terminalPrompt(term);
      const tool = win?.querySelector('.terminal-toolbar .term-mode');
      if (tool) tool.textContent = 'tty';
      return;
    }
    if (lower === 'help') {
      for (const line of (runPluginShellCommand(state.game, term.plugin, 'help').lines || [])) termAdd(termId, line.text, line.type || '');
      return;
    }
    if (lower === 'clear') {
      term.lines = [];
      const out = document.querySelector(`[data-window="${termId}"] .terminal-output`);
      if (out) out.innerHTML = '';
      return;
    }
    // save <name> after analyze / server-index
    if (lower.startsWith('save ') || lower === 'save') {
      const name = cmd.slice(4).trim() || term.pendingSave?.defaultName;
      if (!term.pendingSave) {
        termAdd(termId, 'Нечего сохранять. Сначала analyze / index.', 'error');
        return;
      }
      if (!name) {
        termAdd(termId, 'save <имя_файла>', 'error');
        return;
      }
      const meta = {
        siteId: term.pendingSave.siteId,
        type: term.pendingSave.type || 'encrypted',
        encrypted: true,
        path: '/recon/',
        ext: '.enc'
      };
      const r = savePlayerNamedFile(state.game, name, term.pendingSave.content, meta);
      if (!r.ok) { termAdd(termId, r.reason, 'error'); return; }
      term.pendingSave = null;
      termAdd(termId, `Saved: ${r.file.name}`, 'green');
      termAdd(termId, 'Открой Files или: artifact-decoder → decode <имя>', 'muted');
      scheduleSave();
      refreshOpenApps(['files','computer']);
      return;
    }
    if (lower === 'exit server' || lower.startsWith('exit server')) {
      const result = runPluginShellCommand(state.game, term.plugin || 'sim-exploit', 'exit server');
      for (const line of result.lines || []) termAdd(termId, line.text, line.type || '');
      scheduleSave();
      return;
    }
    term.busy = true;
    try {
      const shellMeta = PLUGIN_SHELLS[term.plugin];
      const cmd0 = (cmd.split(/\s+/)[0]||'').toLowerCase();
      const allowed = shellMeta?.commands || [];
      if (allowed.length && !allowed.includes(cmd0) && cmd0 !== 'save' && !(cmd0==='exit' && cmd.toLowerCase().includes('server'))) {
        termAdd(termId, `Нет такой команды: ${cmd0}. Введи help`, 'error');
      } else {
        const heavy = (term.plugin === 'site-analyzer' || term.plugin === 'server-index') && /^(analyze|scan|index|dump)\b/i.test(cmd);
        if (heavy) {
          for (const step of ['connecting…','fingerprint…','payload map…','cipher pack…']) {
            termAdd(termId, step, 'muted');
            await sleep(400);
          }
        }
        const result = runPluginShellCommand(state.game, term.plugin, cmd);
        for (const line of result.lines || []) {
          termAdd(termId, line.text, line.type || '');
          await sleep(20);
        }
        if (result.pendingSave) term.pendingSave = result.pendingSave;
        if (result.serverSession) {
          term.plugin = null;
          const win = document.querySelector(`[data-window="${termId}"]`);
          if (win?.querySelector('.terminal-form .term-prompt')) win.querySelector('.terminal-form .term-prompt').textContent = terminalPrompt(term);
          const tool = win?.querySelector('.terminal-toolbar .term-mode');
          if (tool) tool.textContent = 'server';
          termAdd(termId, 'Локальные команды ПК отключены. help — серверные.', 'muted');
        }
        if (result.exit) term.plugin = null;
        if (result.progressUpdated || result.exportFile) scheduleSave();
        if (result.exportFile) toast('Файл готов → N-Mail', 'success');
        if (result.progressUpdated) refreshOpenApps(['browser', 'mail', 'blackwire', 'computer', 'files', 'phone', 'intel']);
        if (result.closePhoneLab) {
          state._phoneTarget = null;
          if (state.opened.has('phone')) renderWindow('phone');
          termAdd(termId, '→ Phone Lab очищен.', 'muted');
        } else if (term.plugin === 'phone-access' && state._phoneTarget) {
          openApp('phone');
          termAdd(termId, '→ Phone Lab открыт.', 'green');
        }
      }
    } finally {
      term.busy = false;
      const input = document.querySelector(`[data-window="${termId}"] .terminal-form input`);
      if (input) { input.disabled = false; input.focus({ preventScroll: true }); }
    }
    return;
  }

  const lower = cmd.toLowerCase();
  const parts = cmd.split(/\s+/);
  const one = (parts[0] || '').toLowerCase();
  if (lower === 'help') {
    termAdd(termId, 'help | clear | plugins | run <plugin> | files | mission list', 'blue');
    termAdd(termId, 'files — открыть файловый менеджер / list', 'muted');
    termAdd(termId, 'intel | ops | rm <file> — разведка / журнал / удаление файла', 'blue');
  } else if (lower === 'clear') {
    term.lines = [];
    const out = document.querySelector(`[data-window="${termId}"] .terminal-output`);
    if (out) out.innerHTML = '';
  } else if (lower === 'whoami') termAdd(termId, state.game.player.nickname);
  else if (lower === 'status' || lower === 'info') termAdd(termId, `LEVEL ${state.game.player.level} · XP ${state.game.player.xp}`);
  else if (one === 'files' || lower === 'files' || lower.startsWith('files ')) {
    const sub = (parts[1]||'open').toLowerCase();
    if (sub === 'list') {
      const files = state.game.computer.files||[];
      if (!files.length) termAdd(termId, 'Нет файлов.', 'muted');
      else files.slice(0,40).forEach(f=>termAdd(termId, `${f.name}  [${f.encrypted?'ENC':(f.type||'file')}]`));
    } else {
      openApp('files');
      termAdd(termId, 'Files opened.', 'green');
    }
  } else if (lower === 'plugins' || lower === 'pkg list') {
    termAdd(termId, PLUGINS.map(p => `${state.game.computer.installedPlugins.includes(p.id)?'[on]':'[  ]'} ${p.id}${PLUGIN_SHELLS[p.id]?' [shell]':''}`).join('\n'));
  } else if (lower.startsWith('plugin info ')) {
    const q = cmd.slice(12).trim().toLowerCase();
    const p = PLUGINS.find(x => x.id === q || x.name.toLowerCase() === q);
    if (!p) termAdd(termId, 'Не найден.', 'error');
    else {
      termAdd(termId, `${p.name}\n${p.description}`);
      if (PLUGIN_SHELLS[p.id]) termAdd(termId, `SHELL: ${PLUGIN_SHELLS[p.id].help}`, 'blue');
    }
  } else if (one === 'run' || one === 'use') await enterPlugin(termId, parts.slice(1).join(' ').trim());
  else if (lower === 'ls') {
    const files = [...state.game.computer.files, ...state.game.editor.files];
    termAdd(termId, files.length ? files.map(f => `${f.name} (${f.size} KB)`).join('\n') : 'Пусто.');
  } else if (lower.startsWith('cat ')) {
    const f = [...state.game.computer.files, ...state.game.editor.files].find(x => x.name === cmd.slice(4).trim());
    termAdd(termId, f ? String(f.content) : 'Нет файла.', f ? '' : 'error');
  } else if (lower === 'mission list') {
    termAdd(termId, state.game.missions.items.filter(m => ['accepted','submitted','available'].includes(m.status) && isMissionVisible(m)).map(m => `${m.id} | ${m.status} | ${m.title}`).join('\n') || 'Контракты на доработке (сайты/телефоны).');
  } else if (lower === 'map') termAdd(termId, LOCATIONS.map(l => `${l.name}`).join('\n'));
  else if (lower === 'intel') {
    const intel = state.game.intel;
    if (!intel) termAdd(termId, 'intel empty', 'muted');
    else {
      const doms = Object.values(intel.domains || {}).filter(d => d.discovered || d.analyzed);
      const srvs = Object.values(intel.servers || {}).filter(s => s.discovered);
      const users = Object.values(intel.users || {}).filter(u => u.discovered);
      const phones = Object.values(intel.devices || {}).filter(d => d.discovered);
      termAdd(termId, `INTEL · dom ${doms.length} · srv ${srvs.length} · users ${users.length} · phones ${phones.length} · art ${Object.keys(intel.artifacts||{}).length}`, 'blue');
      for (const d of doms.slice(0, 8)) termAdd(termId, `  ${d.domain} · ${d.kind} · sec ${d.security}`);
      for (const s of srvs.slice(0, 6)) termAdd(termId, `  ${s.hostname} · access=${s.accessLevel} · ${s.ip}`, 'muted');
      for (const u of users.slice(0, 6)) termAdd(termId, `  user ${u.username} (${u.id})`, 'muted');
      for (const p of phones.slice(0, 4)) termAdd(termId, `  phone ${p.id} · ${p.model} · ${p.network}`, 'muted');
    }
  } else if (lower === 'ops' || lower === 'history') {
    const ops = state.game.intel?.operations || [];
    if (!ops.length) termAdd(termId, 'Нет операций.', 'muted');
    else for (const o of ops.slice(0, 12)) termAdd(termId, `${o.pluginId} · ${o.summary || o.targetId} · ${o.status}`);
  } else if (lower.startsWith('rm ') || lower.startsWith('delete ')) {
    const name = cmd.split(/\s+/).slice(1).join(' ').trim().split('/').pop();
    const files = state.game.computer.files;
    const idx = files.findIndex(f => f.name === name || f.id === name);
    if (idx < 0) termAdd(termId, 'FILE_NOT_FOUND', 'error');
    else {
      const f = files[idx];
      if (state.game.missions.items.some(m => m.status === 'accepted' && m.resultFileId === f.id))
        termAdd(termId, 'FILE_IN_USE — активный контракт', 'error');
      else { files.splice(idx, 1); termAdd(termId, `Deleted: ${f.name}`, 'green'); scheduleSave(); }
    }
  }
  else termAdd(termId, 'unknown — help', 'error');
}


function renderMail(g) {
  const pending=g.missions.items.filter(m=>m.status==='accepted'&&m.resultFileId);
  const selected=g.mail.messages.find(m=>m.id===state.selectedMail)||g.mail.messages[0];
  const list=g.mail.messages.slice(0,30).map(m=>`<button class="mail-item ${m.status==='unread'?'unread':''}" data-action="mail-open" data-id="${m.id}"><strong>${esc(m.subject)}</strong><small>${formatTime(m.at)}</small><p>${esc(m.from)} · ${esc(m.body.slice(0,110))}${m.body.length>110?'…':''}</p></button>`).join('');
  return `<div class="app-heading"><div><div class="eyebrow">N-MAIL / INTERNAL MESSAGING</div><h2>N-Mail</h2><p>Внутриигровые письма, контракты и отправка файлов.</p></div><span class="badge">${g.mail.messages.filter(m=>m.status==='unread').length} UNREAD</span></div>
  ${pending.length?`<div class="panel"><div class="panel-title"><span>ГОТОВО К ОТПРАВКЕ</span><small>DELIVERY QUEUE</small></div><div class="list">${pending.map(m=>{const f=g.computer.files.find(x=>x.id===m.resultFileId);return `<div class="list-row"><div class="list-main"><strong>${esc(m.title)}</strong><small>${esc(m.client)} · ${esc(f?.name||'result file')}</small></div><button class="btn tiny primary" data-action="deliver-mission" data-id="${m.id}">ОТПРАВИТЬ</button></div>`;}).join('')}</div></div>`:''}
  
  <div class="panel section-gap"><div class="panel-title"><span>НАПИСАТЬ</span><small>COMPOSE</small></div>
  <form id="mailComposeForm">
    <input class="field" name="to" placeholder="Получатель (клиент / система)" style="margin-bottom:6px">
    <input class="field" name="subject" placeholder="Тема" style="margin-bottom:6px">
    <textarea class="field" name="body" rows="3" placeholder="Текст" style="margin-bottom:6px"></textarea>
    <select class="field" name="attach" style="margin-bottom:6px"><option value="">— вложение —</option>${(g.computer.files||[]).slice(0,40).map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select>
    <button class="btn primary" type="submit">ОТПРАВИТЬ ПИСЬМО</button>
  </form></div>
<div class="grid-2 section-gap" style="align-items:start"><div class="list">${list||'<div class="empty-state"><b>Входящие пусты</b><p>Письма появятся после контрактов и системных событий.</p></div>'}</div><div class="panel">${selected?`<div class="eyebrow">${selected.direction==='in'?'INCOMING MESSAGE':'SENT MESSAGE'}</div><h3 style="margin:8px 0;color:#e1ebf1;font-size:13px">${esc(selected.subject)}</h3><div class="kv"><span>От</span><b>${esc(selected.from)}</b></div><div class="kv"><span>Дата</span><b>${formatDate(selected.at)} ${formatTime(selected.at)}</b></div><div class="divider"></div><div class="mail-body">${esc(selected.body)}</div>${selected.attachments?.length?selected.attachments.map(id=>{const f=g.computer.files.find(x=>x.id===id);return f?`<button class="attachment" data-action="file-open" data-id="${esc(f.id)}">▣ ${esc(f.name)} · ${f.size} KB</button>`:''}).join(''):''}<div class="btn-row section-gap"><button class="btn tiny ghost" data-action="mail-mark" data-id="${selected.id}">ОТМЕТИТЬ ПРОЧИТАННЫМ</button></div>`:'<div class="empty-state"><b>Выбери письмо</b><p>Содержимое появится здесь.</p></div>'}${state.selectedFileId?(()=>{const f=g.computer.files.find(x=>x.id===state.selectedFileId);return f?`<div class="panel section-gap"><div class="panel-title"><span>ПРОСМОТР ВЛОЖЕНИЯ</span><button class="btn tiny ghost" data-action="file-close">ЗАКРЫТЬ</button></div><strong>${esc(f.name)}</strong><pre class="file-preview">${esc(String(f.content||'').slice(0,2400))}${String(f.content||'').length>2400?'\n… файл сокращён для просмотра':''}</pre></div>`:''})():''}</div></div>
  <div class="notice section-gap">Почта работает только внутри вымышленной игры. Никакие реальные email-адреса или внешние сообщения не используются.</div>`;
}

function renderBank(g) {
  const status=bankStatus(g),risk=bankRisk(g),tx=g.economy.transactions.slice(0,30);
  const missing=risk.missing.map(id=>getPlugin(id)?.name||id);
  return `<div class="app-heading"><div><div class="eyebrow">ASTER UNION / GAME BANK</div><h2>Aster Bank</h2><p>Игровые кредиты и история экономики.</p></div><span class="badge amber">FICTIONAL BANK</span></div>
  <div class="bank-balance"><span>AVAILABLE CREDITS</span><strong>${fmt(g.economy.credits)} CR</strong><small>Виртуальный счёт оператора · никакого реального платежа</small></div>
  <div class="panel section-gap"><div class="panel-title"><span>КОШЕЛЁК ОПЕРАТОРА</span><small>WALLET</small></div>
  <div class="kv"><span>Номер</span><b id="playerWallet">${esc(g.player.walletId||'—')}</b></div>
  <button type="button" class="btn tiny" data-action="copy-text" data-text="${esc(g.player.walletId||'')}">КОПИРОВАТЬ НОМЕР</button>
  <p class="muted small">NPC переводят на этот номер · только внутриигровые CR</p></div>
  ${status.locked?`<div class="notice danger section-gap"><b>БАНК ЗАБЛОКИРОВАН</b><br>Осталось <b data-bank-until="${g.bank.lockUntil}">${humanLeft(status.remaining)}</b>. Банковские операции недоступны. Другие приложения и контракты продолжают работать; награды по контрактам во время блокировки конфискуются.</div>`:''}
  <div class="panel section-gap"><div class="panel-title"><span>ЭНДГЕЙМ / РИСКОВАЯ СИМУЛЯЦИЯ</span><small>LEVEL ${BALANCE.bankUnlockLevel}+</small></div><p class="muted small">Только игровая проверка. Нужны Vault Decoder, Identity Veil и Trace Obfuscator. При виртуальной трассировке все кредиты конфискуются, а банк блокируется на 24 реальных часа.</p><div class="kv"><span>Требуемый уровень</span><b>${BALANCE.bankUnlockLevel}</b></div><div class="kv"><span>Вероятность трассировки</span><b class="text-red">${Math.round(risk.traceChance*100)}%</b></div><div class="kv"><span>Вероятность успеха</span><b class="text-green">${Math.round(risk.successChance*100)}%</b></div><div class="kv"><span>Награда при успехе</span><b class="text-green">+${fmt(BALANCE.bankReward)} CR</b></div>
  ${missing.length?`<div class="notice warning section-gap">Не установлены: ${missing.map(esc).join(', ')}.</div>`:''}
  ${g.computer.os<4?`<div class="notice warning section-gap">Для двух финальных плагинов требуется NULLBYTE OS 4.0. Текущая версия: ${g.computer.os}.0.</div>`:''}
  <div class="btn-row section-gap"><button class="btn danger" data-action="bank-attempt" ${status.locked||!risk.unlocked||missing.length?'disabled':''}>ЗАПУСТИТЬ СИМУЛЯЦИЮ</button></div></div>
  <div class="panel section-gap"><div class="panel-title"><span>ИСТОРИЯ ТРАНЗАКЦИЙ</span><small>${tx.length} RECORDS</small></div>${tx.length?tx.map(t=>`<div class="transaction-row"><div><strong>${esc(t.reason)}</strong><small>${formatDate(t.at)} · ${formatTime(t.at)}</small></div><b class="${t.type==='income'?'income':t.type==='confiscated'?'confiscated':'expense'}">${t.type==='income'?'+':'−'}${fmt(t.amount)} CR</b></div>`).join(''):'<div class="empty-state"><b>Нет транзакций</b><p>История появится после получения наград и покупок.</p></div>'}</div>`;
}





function renderFbi() {
  return `<div class="app-heading"><div><div class="eyebrow">FEDERAL BUREAU OF INVESTIGATION</div><h2>FBI</h2><p>Закрытый операционный канал</p></div><span class="badge">LOCKED</span></div>
  <div class="panel" style="text-align:center;padding:28px 16px">
    <div style="font-size:28px;letter-spacing:.2em;opacity:.5;margin-bottom:12px">FBI</div>
    <h3 style="margin:0 0 8px">Раздел недоступен</h3>
    <p class="muted">Контракты федерального бюро появятся в будущем обновлении. Сейчас вкладка только резервирует место в системе.</p>
    <div class="notice section-gap">Нет активных заданий · нет выплат · нет рейтинга</div>
  </div>`;
}


function renderPhoneLab(g) {
  const pw = g.phoneWorld || {};
  const net = pw.network;
  const activeId = state._phoneTarget || null;
  let phone = null;
  try { if (activeId) phone = findPhone(activeId, g.meta?.seed || 'nb'); } catch (e) {}
  const discovered = Object.keys(pw.discovered || {});
  const discList = discovered.slice(0, 30).map(id =>
    `<button type="button" class="btn tiny ${id===activeId?'primary':'ghost'}" data-action="phone-lab-open" data-id="${esc(id)}">${esc(id)}</button>`
  ).join(' ') || '<span class="muted">Сначала: net-analyzer → save → phone-access open PHONE_ID</span>';

  let body = `<div class="empty-state"><b>Нет активного телефона</b><p>1) net-link connect · 2) net-analyzer scan · 3) phone-access open PH-… · Phone Lab откроется сам</p></div>`;
  if (phone) {
    const seed = g.meta?.seed || 'nb';
    const msgs = phoneMessages(phone, seed);
    const gal = phoneGallery(phone, seed);
    const calls = typeof phoneCallLog === 'function' ? phoneCallLog(phone, seed) : [];
    const contacts = typeof phoneContacts === 'function' ? phoneContacts(phone, seed) : [];
    const blocked = pw.access?.[phone.id]?.blockedUntil > Date.now();
    body = `<div class="phone-lab-wrap"><div class="phone-frame">
      <div class="phone-screen">
        <div class="phone-status">${esc(phone.model)} · ${esc(phone.os)} ${blocked?'· LOCKED':''}</div>
        <div class="phone-owner"><b>${esc(phone.ownerName)}</b><small>${esc(phone.ownerType)} · sec ${phone.security}</small></div>
        <div class="phone-num">${esc(phone.id)} · ${esc(phone.number)}</div>
        <div class="phone-tabs btn-row section-gap">
          <button type="button" class="btn tiny ${state.phoneLabTab!=='calls'&&state.phoneLabTab!=='contacts'&&state.phoneLabTab!=='gallery'?'primary':'ghost'}" data-action="phone-lab-tab" data-tab="msgs">SMS</button>
          <button type="button" class="btn tiny ${state.phoneLabTab==='calls'?'primary':'ghost'}" data-action="phone-lab-tab" data-tab="calls">Звонки</button>
          <button type="button" class="btn tiny ${state.phoneLabTab==='contacts'?'primary':'ghost'}" data-action="phone-lab-tab" data-tab="contacts">Контакты</button>
          <button type="button" class="btn tiny ${state.phoneLabTab==='gallery'?'primary':'ghost'}" data-action="phone-lab-tab" data-tab="gallery">Галерея</button>
        </div>
        <div class="phone-section">
          ${state.phoneLabTab==='calls' ? calls.map(c=>`<div class="phone-msg"><span>${esc(c.dir)}</span><p>${esc(c.with)}</p></div>`).join('') :
            state.phoneLabTab==='contacts' ? contacts.map(c=>`<div class="phone-msg"><span>${esc(c.name)}</span><p>${esc(c.number)}</p></div>`).join('') :
            state.phoneLabTab==='gallery' ? `<div class="phone-gal">${gal.map(x=>`<div class="phone-thumb">${esc(x.title)}</div>`).join('')}</div>` :
            msgs.map(m=>`<div class="phone-msg"><span>${esc(m.from)}</span><p>${esc(m.text)}</p></div>`).join('')}
        </div>
        <div class="btn-row section-gap">
          <button type="button" class="btn tiny" data-action="phone-lab-export" data-kind="msgs" data-id="${esc(phone.id)}">Сохранить SMS</button>
          <button type="button" class="btn tiny" data-action="phone-lab-export" data-kind="gallery" data-id="${esc(phone.id)}">Сохранить галерею</button>
          <button type="button" class="btn tiny danger" data-action="phone-lab-lock" data-id="${esc(phone.id)}">Lock 30м</button>
          <button type="button" class="btn tiny ghost" data-action="copy-text" data-text="${esc(phone.id)}">Copy ID</button>
          <button type="button" class="btn tiny" data-action="phone-lab-disconnect">Disconnect</button>
        </div>
      </div>
    </div></div>`;
  }
  return `<div class="app-heading"><div><div class="eyebrow">PHONE LAB</div><h2>Телефон</h2><p>Исследование после phone-access · вместо phone-control</p></div><span class="badge">${discovered.length} ID</span></div>
  <div class="kv"><span>Сеть</span><b>${net ? esc(net.regionId)+' · '+esc(net.netKey||'') : 'не подключено (net-link)'}</b></div>
  <div class="panel section-gap"><div class="panel-title"><span>DISCOVERED</span></div><div style="display:flex;flex-wrap:wrap;gap:6px">${discList}</div></div>
  <div class="section-gap">${body}</div>`;
}


function renderIntel(g) {
  const intel = g.intel || {};
  const doms = Object.values(intel.domains||{}).slice(0,12);
  const ev = (g.events?.active||[]);
  const ph = Object.keys(g.phoneWorld?.discovered||{});
  return `<div class="app-heading"><div><div class="eyebrow">INTEL FEED</div><h2>Intel</h2><p>Разведка, discovered PHONE_ID, события мира</p></div><span class="badge">LIVE</span></div>
  <div class="grid-3">
    <div class="stat-box"><span>DOMAINS</span><strong>${doms.length}</strong></div>
    <div class="stat-box"><span>PHONES</span><strong>${ph.length}</strong></div>
    <div class="stat-box"><span>EVENTS</span><strong>${ev.length}</strong></div>
  </div>
  <div class="panel section-gap"><div class="panel-title"><span>СОБЫТИЯ</span></div>
    ${ev.length?ev.map(e=>`<div class="list-row"><div class="list-main"><strong>${esc(e.title)}</strong><small>${esc(e.body)}</small></div></div>`).join(''):'<div class="muted">Нет активных</div>'}
  </div>
  <div class="panel section-gap"><div class="panel-title"><span>PHONE_ID</span></div>
    <div class="muted small" style="word-break:break-all">${ph.slice(0,40).map(esc).join(', ')||'—'}</div>
  </div>
  <div class="panel section-gap"><div class="panel-title"><span>DOMAINS</span></div>
    ${doms.map(d=>`<div class="list-row"><div class="list-main"><strong>${esc(d.domain||d.id)}</strong><small>${esc(d.kind||'')}</small></div></div>`).join('')||'<div class="muted">Пусто</div>'}
  </div>`;
}

function renderHelp() {
  const g = state.game;
  const sections = [
    ['Обзор NULLBYTE', 'Одиночная симуляция хакерской жизни в вымышленном городе Нулл-Сити. Все сети, телефоны, серверы, почта и банки — игровые. Нет доступа к реальным устройствам, SMS, сайтам или API.'],
    ['Что исследовать', '1) Региональные сети и телефоны (PHONE_ID). 2) Виртуальные сайты .null (сейчас web-цепочка на доработке). 3) Серверы и Intel. 4) Контракты BlackWire. 5) Случайные события мира.'],
    ['Регионы и сеть', 'NullAtlas: 6 регионов (Бейшор-Хайтс, Мидтаун-Спайн, Айронрич, Саутгейт, Окридж, Шэдоулайн). Terminal: run net-link → list → connect <region_id>. Подключение только внутриигровое.'],
    ['Анализ сети', 'run net-analyzer → scan (~анализ) → save <имя>. Полный отчёт содержит все ~550 PHONE_ID региона. Не обрезается. Ищи нужный ID сам (поиск в Files / IDE).'],
    ['Телефоны PHONE_ID', 'Идентификатор формата PH-XXXX-0000. open через phone-access. После open открывается Phone Lab. SMS/звонки/галерея/lock/export — в приложении. disconnect в phone-access или кнопка Disconnect. Прогресс (файлы, discovered) сохраняется, сессия — нет.'],
    ['Альтернатива: Mail Drop', 'run mail-drop → craft → save файл → N-Mail вложение NPC. Движок считает шанс/задержку открытия. При успехе в почте приходит PHONE_ID.'],
    ['Плагины mobile', 'Бесплатно: net-link, net-analyzer, phone-access, mail-drop. Управление телефоном — Phone Lab. Платно: sms-bomber 40000 CR, bank-peek 100000 CR. Старые mobile-модули удалены.'],
    ['Сайты (WIP)', 'Web-плагины в NULForge помечены «В доработке». Логика сохранена, run закрыт до отдельного чек-листа.'],
    ['Terminal', 'help | plugins | run <id> | files | ls | cat | mission list | intel | map. В плагине: help, exit. Неизвестная команда — сразу ошибка без фейковой загрузки.'],
    ['Files и IDE', 'Files — список и просмотр. IDE — вкладки, правка, поиск, сохранение виртуальных файлов. Нет доступа к файловой системе устройства.'],
    ['N-Mail / BlackWire', 'Почта для писем и сдачи. Контракты по сайтам временно скрыты; phone-ветка расширяется.'],
    ['События', 'Движок сам создаёт редкие события (инфра / социал / security / rare). Они меняют доступность и иногда кладут артефакт в Files. Пропуск не ломает основной прогресс.'],
    ['Уровни и экономика', 'Уровень растёт только от XP, потолка практически нет. Гейт плагинов по уровню снят. CR — только игровые.'],
    ['Сохранение', 'Telegram CloudStorage (чанки) + local fallback. Ник вводится один раз. migrateSave не затирает ops/phoneWorld/events.'],
    ['Частые ошибки', '«Плагин на доработке» — web/legacy. «Сначала connect» — нет сети. «PHONE_ID не найден» — проверь формат из отчёта. Файлы смотри в Files, не жди автоподсветки ID.']
  ];
  const plugs = (typeof PLUGINS !== 'undefined' ? PLUGINS : []).map(p => {
    const lock = typeof isPluginLocked === 'function' && isPluginLocked(p.id);
    return `<div class="list-row"><div class="list-main"><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${lock ? 'WIP' : 'OK'} · ${esc(p.description)}</small></div>
      <button class="btn tiny ghost" data-action="plugin-docs" data-id="${p.id}">ПОДРОБНЕЕ</button></div>`;
  }).join('');
  const ev = (g?.events?.active || []).map(e => `<div class="list-row"><div class="list-main"><strong>${esc(e.title)}</strong><small>${esc(e.body)}</small></div></div>`).join('') || '<div class="muted small">Активных событий нет</div>';
  return `<div class="app-heading"><div><div class="eyebrow">NULLBYTE KNOWLEDGE BASE</div><h2>Help / Docs</h2><p>Полное руководство: что исследовать, как брать ID, какие инструменты.</p></div><span class="badge green">RU</span></div>
  <div class="notice warning">Все термины «взлом», «сеть», «SMS» — только симуляция.</div>
  ${sections.map((s,i)=>`<div class="panel section-gap"><div class="panel-title"><span>${String(i+1).padStart(2,'0')} / ${esc(s[0].toUpperCase())}</span></div><div class="muted small" style="line-height:1.75">${esc(s[1])}</div></div>`).join('')}
  <div class="panel section-gap"><div class="panel-title"><span>ПЛАГИНЫ</span></div><div class="list">${plugs}</div></div>
  <div class="panel section-gap"><div class="panel-title"><span>СОБЫТИЯ СЕЙЧАС</span></div>${ev}</div>`;
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
  if (!state.ide) state.ide = { tabs: [], active: 0, find: '', replace: '', dirty: {} };
  const files = [...(g.computer.files||[]), ...(g.editor.files||[])];
  if (!state.ide.tabs.length && files[0]) {
    state.ide.tabs = [{ id: files[0].id, name: files[0].name }];
    state.ide.active = 0;
  }
  const tab = state.ide.tabs[state.ide.active];
  const file = tab ? files.find(f => f.id === tab.id || f.name === tab.name) : null;
  const content = file ? String(file.content || '') : '';
  const lines = content.split('\n');
  const lineNos = lines.map((_, i) => i + 1).join('\n');
  const tabsHtml = state.ide.tabs.map((t, idx) =>
    `<button type="button" class="ide-tab ${idx===state.ide.active?'on':''}" data-action="ide-tab" data-idx="${idx}">${esc(t.name)}</button>`
  ).join('') || '<span class="muted small">Нет вкладок</span>';
  const list = files.slice(0, 50).map(f => `<button type="button" class="list-row" data-action="ide-open" data-id="${esc(f.id)}"><div class="list-main"><strong>${esc(f.name)}</strong><small>${esc(f.type||'file')} · ${String(f.content||'').length} ch</small></div></button>`).join('') || '<div class="muted">Файлов нет</div>';
  return `<div class="app-heading"><div><div class="eyebrow">VIRTUAL IDE · READ ONLY</div><h2>NBS IDE / Viewer</h2><p>Просмотр · копирование · удаление. Редактирование временно отключено.</p></div><span class="badge">RO</span></div>
  <div class="ide-layout section-gap">
    <div class="panel ide-sidebar" style="max-height:min(520px,60vh);overflow:auto;padding:8px">${list}</div>
    <div class="ide-main">
      <div class="ide-tabs btn-row" style="flex-wrap:wrap;gap:4px">${tabsHtml}</div>
      <div class="ide-toolbar btn-row section-gap">
        <button type="button" class="btn tiny ghost" data-action="ide-copy">Копировать всё</button>
        <button type="button" class="btn tiny ghost" data-action="ide-find">Найти</button>
        <button type="button" class="btn tiny danger" data-action="ide-delete" ${file?'':'disabled'}>Удалить файл</button>
      </div>
      <div class="ide-find row section-gap" style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="field" id="ideFind" placeholder="Найти в файле" value="${esc(state.ide.find||'')}" style="flex:1;min-width:120px">
      </div>
      <div class="ide-editor-wrap" style="display:flex;border:1px solid #2a3a48;border-radius:8px;overflow:hidden;min-height:280px;background:#0a1016">
        <pre class="ide-gutter muted" style="margin:0;padding:10px 8px;text-align:right;user-select:none;font-size:11px;line-height:1.45;border-right:1px solid #1e2a33;min-width:36px">${lineNos || '1'}</pre>
        <pre id="ideBody" class="ide-body" style="flex:1;margin:0;padding:10px;font-size:11px;line-height:1.45;overflow:auto;max-height:min(420px,55vh);user-select:text;white-space:pre-wrap;color:#d5e0ea">${esc(content)||'(пусто)'}</pre>
      </div>
      <div class="muted small section-gap">Символов: ${content.length} · ${file ? esc(file.name) : '—'} · только чтение</div>
    </div>
  </div>`;
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
    case 'bank-logout':state.bankSessionId=null;toast('Сессия закрыта');refreshOpenApps();break;
    case 'plugin-docs':{
      const docs={...pluginDocs(),...extendedPluginDocs()}[id]||{...pluginDocs(),...extendedPluginDocs()}[el.dataset.plugin];
      const p=docs||{title:id,role:'Нет описания',steps:[],inputs:'—',outputs:'—',next:[]};
      showModal({title:p.title||'Плагин',eyebrow:'ПОДРОБНЕЕ О ПЛАГИНЕ',body:`
        <p><b>Назначение:</b> ${esc(p.role)}</p>
        <p><b>Вход:</b> ${esc(p.inputs)}</p>
        <p><b>Выход:</b> ${esc(p.outputs)}</p>
        <p><b>Шаги:</b></p><ol style="margin:6px 0 0 18px">${(p.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
        <p><b>Далее:</b> ${(p.next||[]).map(esc).join(', ')||'—'}</p>`,confirm:'ЗАКРЫТЬ',cancel:'',onConfirm:()=>{}});
      break;
    }
    case 'copy-text':{
      const t=el.dataset.text||'';
      if(navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(()=>toast('Скопировано','success')).catch(()=>toast(t,'info'));
      else toast(t,'info');
      break;
    }
    case 'ide-open':{
      const f=[...(state.game.computer.files||[]),...(state.game.editor.files||[])].find(x=>x.id===id);
      if(!f) break;
      if(!state.ide) state.ide={tabs:[],active:0,find:'',replace:'',dirty:{}};
      let idx=state.ide.tabs.findIndex(t=>t.id===f.id);
      if(idx<0){ state.ide.tabs.push({id:f.id,name:f.name}); idx=state.ide.tabs.length-1; }
      state.ide.active=idx; renderWindow('ide'); break;
    }
    case 'ide-tab':{
      const idx=parseInt(el.dataset.idx,10);
      // flush textarea to dirty buffer
      const body=$('ideBody');
      if(body && state.ide?.tabs[state.ide.active]){
        const t=state.ide.tabs[state.ide.active];
        const f=state.game.computer.files.find(x=>x.id===t.id);
        if(f && body.value!==f.content){ state.ide.dirty[t.id]=true; state._ideBuf=state._ideBuf||{}; state._ideBuf[t.id]=body.value; }
      }
      if(!isNaN(idx)) state.ide.active=idx; renderWindow('ide'); break;
    }
    case 'ide-save':{ toast('Редактирование отключено — только просмотр','info'); break; }
    case 'ide-save-disabled':{
      const body=$('ideBody'); if(!body||!state.ide?.tabs?.length) break;
      const t=state.ide.tabs[state.ide.active];
      let f=state.game.computer.files.find(x=>x.id===t.id);
      if(!f){ f={id:'file_ide_'+Date.now().toString(36),name:t.name||'note.txt',type:'text',path:'/ide/',createdAt:Date.now(),content:''}; state.game.computer.files.unshift(f); t.id=f.id; }
      f.content=body.value; f.size=Math.max(1,Math.ceil(f.content.length/1024));
      state.ide.dirty[t.id]=false; scheduleSave(); toast('Сохранено','success'); renderWindow('ide'); break;
    }
    case 'ide-copy':{
      const body=$('ideBody');
      const text=body?(body.value!==undefined?body.value:body.textContent):'';
      if(text&&navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast('Скопировано','success'));
      break;
    }
    case 'ide-new':{ toast('Создание из IDE отключено. Файлы появляются из плагинов.','info'); break; }
    case 'ide-new-disabled':{
      if(!state.ide) state.ide={tabs:[],active:0,find:'',replace:'',dirty:{}};
      const name=`note_${Date.now().toString(36)}.txt`;
      const f={id:'file_ide_'+Date.now().toString(36),name,type:'text',content:'',path:'/ide/',createdAt:Date.now(),size:1};
      state.game.computer.files.unshift(f);
      state.ide.tabs.push({id:f.id,name}); state.ide.active=state.ide.tabs.length-1;
      scheduleSave(); renderWindow('ide'); break;
    }
    case 'ide-delete':{
      const t=state.ide?.tabs?.[state.ide.active]; if(!t) break;
      state.game.computer.files=state.game.computer.files.filter(x=>x.id!==t.id);
      state.ide.tabs.splice(state.ide.active,1); state.ide.active=Math.max(0,state.ide.active-1);
      scheduleSave(); renderWindow('ide'); break;
    }
    case 'ide-replace-one':{ toast('Редактирование отключено','info'); break; }
    case 'ide-replace-one-x':{
      const body=$('ideBody'); const find=$('ideFind')?.value||''; const rep=$('ideReplace')?.value||'';
      if(body&&find){ const i=body.value.indexOf(find); if(i>=0){ body.value=body.value.slice(0,i)+rep+body.value.slice(i+find.length); toast('Заменено','success'); } else toast('Не найдено','info'); }
      break;
    }
    case 'ide-replace-all':{ toast('Редактирование отключено','info'); break; }
    case 'ide-replace-all-x':{
      const body=$('ideBody'); const find=$('ideFind')?.value||''; const rep=$('ideReplace')?.value||'';
      if(body&&find){ const c=(body.value.split(find).length-1); body.value=body.value.split(find).join(rep); toast('Замен: '+c,'success'); }
      break;
    }
    case 'ide-find':{
      const body=$('ideBody'); const find=$('ideFind')?.value||'';
      if(body&&find){ const i=body.value.indexOf(find); toast(i>=0?('Позиция '+i):'Не найдено', i>=0?'success':'info'); }
      break;
    }
    case 'nbs-run':{
      const body=$('ideBody'); if(body) state.editorText=body.value;
      const result=runNbs(state.game, state.editorText||'');
      state.nbsOutput=(result.output||[]).join('\n')||result.reason||'';
      toast(result.ok?'NBS OK':'NBS ошибка', result.ok?'success':'error');
      renderWindow('ide'); scheduleSave(); break;
    }
    case 'phone-lab-open':{
      state._phoneTarget = id;
      if(!state.game.phoneWorld) state.game.phoneWorld={access:{},discovered:{}};
      state.game.phoneWorld.access[id]={level:'user',at:Date.now()};
      state.game.phoneWorld.discovered[id]=true;
      renderWindow('phone'); break;
    }
    case 'phone-lab-tab':{
      state.phoneLabTab = el.dataset.tab || 'msgs';
      renderWindow('phone'); break;
    }
    case 'phone-lab-export':{
      const kind = el.dataset.kind || 'msgs';
      const phone = findPhone(id, state.game.meta?.seed||'nb');
      if(!phone){ toast('Нет телефона','error'); break; }
      let content='', name='';
      if(kind==='gallery'){
        content = phoneGallery(phone, state.game.meta?.seed||'nb').map(x=>`${x.id} ${x.title} ${x.note}`).join('\n');
        name = `${phone.id}-gallery.txt`;
      } else {
        content = phoneMessages(phone, state.game.meta?.seed||'nb').map(m=>`${m.from}: ${m.text}`).join('\n');
        name = `${phone.id}-msgs.txt`;
      }
      const file = { id:'file_ph_'+Date.now().toString(36), name, type:'phone-data', content, path:'/phone/', createdAt:Date.now(), size:Math.max(1,Math.ceil(content.length/1024)) };
      state.game.computer.files.unshift(file);
      scheduleSave(); toast('Файл: '+name,'success'); break;
    }
    case 'phone-lab-disconnect':{
      const was = state._phoneTarget;
      state._phoneTarget = null;
      if (was && state.game.phoneWorld?.access) delete state.game.phoneWorld.access[was];
      toast('Телефон отключён','success'); renderWindow('phone'); break;
    }
    case 'phone-lab-lock':{
      if(typeof lockPhone==='function') lockPhone(state.game, id, 30);
      else if(state.game.phoneWorld){ state.game.phoneWorld.access[id]={...(state.game.phoneWorld.access[id]||{}), blockedUntil:Date.now()+30*60*1000}; }
      toast('Lock 30м','success'); scheduleSave(); renderWindow('phone'); break;
    }
    case 'open-app':$('startMenu').hidden=true;$('startButton').setAttribute('aria-expanded','false');openApp(app);break;
    case 'close-window':closeWindow(el.closest('.app-window')?.dataset.window);break;
    case 'toggle-pin-window': togglePinWindow(el.closest('.app-window')?.dataset.window); break;
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
    case 'cancel-mission':{
      confirm('Отменить контракт?',`Контракт <b>${esc(id)}</b> будет снят. Награда не будет выдана. Артефакты сохранятся.`,()=>{
        const r=cancelMission(state.game,id);
        actionResult(r);
        if(r.ok){state.selectedMissionId=null;renderWindow('blackwire');}
      });
      break;
    }
    case 'mission-close-guide':state.selectedMissionId=null;if(state.opened.has('blackwire'))renderWindow('blackwire');break;
    case 'mission-open-target':openMissionTarget(id);break;
    
    case 'browser-activate-tab': {
      const winId = el.dataset.win || activeBrowserWinId();
      const session = getBrowserSession(winId);
      const idx = Number(el.dataset.idx);
      if (!Number.isNaN(idx)) { session.active = idx; renderWindow(winId); }
      break;
    }
    case 'browser-close-tab': {
      browserCloseTab(el.dataset.win || activeBrowserWinId(), Number(el.dataset.idx));
      break;
    }
    case 'browser-new-tab': {
      const winId = el.dataset.win || activeBrowserWinId();
      const session = getBrowserSession(winId);
      session.tabs.push({ id: `tab_new_${Date.now()}`, siteId: '', page: 'start', title: 'Новая вкладка', history: [{ page: 'start' }], histIdx: 0 });
      session.active = session.tabs.length - 1;
      renderWindow(winId);
      break;
    }
    case 'browser-back': {
      const winId = el.dataset.win || activeBrowserWinId();
      const session = getBrowserSession(winId);
      const tab = session.tabs[session.active];
      if (tab && tab.histIdx > 0) { tab.histIdx--; tab.page = tab.history[tab.histIdx].page; renderWindow(winId); }
      break;
    }
    case 'browser-forward': {
      const winId = el.dataset.win || activeBrowserWinId();
      const session = getBrowserSession(winId);
      const tab = session.tabs[session.active];
      if (tab && tab.histIdx < tab.history.length - 1) { tab.histIdx++; tab.page = tab.history[tab.histIdx].page; renderWindow(winId); }
      break;
    }
    case 'browser-reload': {
      const winId = el.dataset.win || activeBrowserWinId();
      renderWindow(winId);
      break;
    }
    case 'browser-page': {
      const winId = el.dataset.win || activeBrowserWinId();
      const session = getBrowserSession(winId);
      const tab = session.tabs[session.active];
      if (tab) {
        tab.page = el.dataset.page || 'home';
        tab.history = (tab.history || []).slice(0, tab.histIdx + 1);
        tab.history.push({ page: tab.page });
        tab.histIdx = tab.history.length - 1;
        renderWindow(winId);
      }
      break;
    }
    case 'browser-bookmark': {
      const sid = el.dataset.site;
      if (!sid) break;
      const bm = state.game.browser.bookmarks || [];
      if (!bm.includes(sid)) { bm.push(sid); state.game.browser.bookmarks = bm; toast('В закладках','success'); scheduleSave(); }
      else toast('Уже в закладках');
      break;
    }

    case 'browser-tab':{
      let winId = el.dataset.win || activeBrowserWinId();
      if (!winId || !state.opened.has(winId)) { openApp('browser'); winId = activeBrowserWinId(); }
      ensureBrowserTab(site);
      // attach site to this session
      const session = getBrowserSession(winId);
      const siteObj = getSite(state.game, site);
      if (siteObj) {
        let tab = session.tabs.find(t => t.siteId === site);
        if (!tab) {
          tab = { id: `tab_${site}`, siteId: site, page: 'home', title: siteObj.title, history: [{ page: 'home' }], histIdx: 0 };
          session.tabs.push(tab);
        }
        session.active = session.tabs.indexOf(tab);
        state.game.browser.activeSite = site;
      }
      renderWindow(winId);
      break;
    }
    case 'copy-domain':{
      const d=el.dataset.domain||'';
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(d).then(()=>toast('Домен скопирован.','success')).catch(()=>toast(d,'info'));}
      else toast(d,'info');
      break;
    }
    case 'browser-home':state.browserTabs=[];state.game.browser.activeSite='';renderWindow('browser');break;
    
    case 'bookmark':case 'bookmark-site':{const ok=addBookmark(state.game,site);toast(ok?'Закладка сохранена.':'Не удалось сохранить закладку.',ok?'success':'error');scheduleSave();renderWindow('browser');break;}
    case 'site-operation':runSiteOperation(site,el.dataset.op);break;
    case 'export-result':exportResult(id);break;
    case 'deliver-mission':confirm('Отправить результат?',`Файл по контракту <b>${esc(id)}</b> будет передан внутриигровому заказчику.`,()=>deliverResult(id));break;
    case 'mail-open':openMail(id);break;
    case 'file-copy-content':{
      const f=[...state.game.computer.files,...state.game.editor.files].find(x=>x.id===id);
      if(f&&navigator.clipboard?.writeText){navigator.clipboard.writeText(String(f.content||'')).then(()=>toast('Скопировано','success')).catch(()=>toast('Нет доступа к буферу','error'));}
      else if(f) toast(String(f.content||'').slice(0,200),'info');
      break;
    }
    case 'file-select':state.selectedFileId=id;if(!state.opened.has('files'))openApp('files');else{const w=state.opened.get('files');if(w)w.minimized=false;renderWindow('files');focusWindow('files');}break;
    case 'file-delete':{
      const all=[state.game.computer.files,state.game.editor.files];
      for(const arr of all){const i=arr.findIndex(f=>f.id===id);if(i>=0){arr.splice(i,1);break;}}
      state.selectedFileId=null;scheduleSave();renderWindow('files');toast('Файл удалён','success');break;
    }
    case 'file-open':state.selectedFileId=id;renderWindow('mail');break;
    case 'file-close':state.selectedFileId=null;renderWindow('mail');break;
    case 'mail-mark':{const m=state.game.mail.messages.find(x=>x.id===id);if(m)m.status='read';scheduleSave();renderWindow('mail');break;}
    case 'map-location':{
      const locId=el.dataset.location;
      state.mapSelected=locId;
      renderWindow('map');
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
  // Prefer the innermost action target (e.g. tab close over tab activate).
  const now=Date.now();
  if(button._nbActAt && now-button._nbActAt<350)return;
  button._nbActAt=now;
  // Don't preventDefault on inputs; only on actionable chrome controls
  if(!event.target.closest('input,textarea,select')) event.preventDefault();
  try{
    handleAction(button.dataset.action,button);
  }catch(err){
    console.error('[NULLBYTE] action',button.dataset.action,err);
    toast(String(err.message||err),'error');
  }
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
  if(form.id==='mailComposeForm'){
    event.preventDefault();
    const to=form.elements.to?.value?.trim()||'system';
    const subject=form.elements.subject?.value?.trim()||'Без темы';
    const body=form.elements.body?.value?.trim()||'';
    const attach=form.elements.attach?.value||'';
    state.game.mail.messages.unshift({
      id:'mail_'+Date.now().toString(36), direction:'out', from:state.game.player.nickname, to, subject, body,
      at:Date.now(), attachments:attach?[attach]:[], status:'sent'
    });
    if(attach){
      const f=(state.game.computer.files||[]).find(x=>x.id===attach);
      if(f && (f.type==='mail-drop' || /drop|payload/i.test(f.name))){
        if(!state.game.mail.pendingDrops) state.game.mail.pendingDrops=[];
        const seed = Date.now() % 100000;
        state.game.mail.pendingDrops.push({
          fileId: f.id, npcName: to, openAt: Date.now() + (15000 + seed % 45000),
          chance: 40 + (seed % 30), seed, opened: false,
          phoneId: null, ownerName: null, number: null
        });
        // assign random phone from bayshore for reveal
        const phList = (typeof listRegionPhones==='function') ? listRegionPhones('bayshore') : null;
        if(phList){ const ph=phList[seed % 550]; const last=state.game.mail.pendingDrops.at(-1); last.phoneId=ph.id; last.ownerName=ph.ownerName; last.number=ph.number; }
      }
    }
    scheduleSave(); toast('Письмо отправлено (внутриигровое)','success'); renderWindow('mail');
    return;
  }
  if(form.id==='browserForm'||form.classList?.contains('chrome-form')){
    event.preventDefault();
    const winId=form.closest('[data-window]')?.dataset.window||activeBrowserWinId();
    navigateBrowser(form.elements.address?.value||form.querySelector('input')?.value||'', winId);
  }
  if(form.classList?.contains('terminal-form')){
    event.preventDefault();
    const termId=form.getAttribute('data-term')||form.closest('[data-window]')?.dataset.window;
    if(!termId)return;
    const input=form.elements.command;
    const val=input?.value||'';
    if(!val.trim())return;
    if(input)input.value='';
    runTerminalCommand(termId, val).then(()=>{
      queueMicrotask(()=>{
        const i=document.querySelector(`[data-window="${termId}"] .terminal-form input`);
        if(i) i.focus({preventScroll:true});
        scrollTerminalBottom(termId, true);
      });
    });
  }
});
boot();
