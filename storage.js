import { migrateSave } from './engine.js';

const CLOUD_MANIFEST_KEY = 'nullbyte_save_v1_manifest';
const CLOUD_CHUNK_PREFIX = 'nullbyte_save_v1_part_';
const LEGACY_CLOUD_KEY = 'nullbyte_player';
const LOCAL_KEY = 'nullbyte_save_v1';
const CHUNK_SIZE = 3600; // Telegram CloudStorage permits at most 4096 chars per value.

function cloudApi() {
  try { return window.Telegram?.WebApp?.CloudStorage || null; } catch { return null; }
}
function callCloud(method, ...args) {
  const api=cloudApi();
  if(!api || typeof api[method]!=='function') return Promise.reject(new Error('CloudStorage недоступен'));
  return new Promise((resolve,reject)=>{
    api[method](...args,(error,value)=>error?reject(new Error(String(error))):resolve(value));
  });
}
function checksum(text) {
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}
function splitChunks(text) {
  const chunks=[];
  for(let i=0;i<text.length;i+=CHUNK_SIZE) chunks.push(text.slice(i,i+CHUNK_SIZE));
  return chunks.length?chunks:[''];
}
function getLocal() {
  try { const raw=localStorage.getItem(LOCAL_KEY) || localStorage.getItem(LEGACY_CLOUD_KEY); return raw?JSON.parse(raw):null; } catch { return null; }
}
function setLocal(state) {
  try { localStorage.setItem(LOCAL_KEY,JSON.stringify(state)); return true; } catch { return false; }
}

export async function loadSavedGame(tgUser=null) {
  let raw=null, provider='LOCAL PREVIEW', warning='', cloudReadFailed=false;
  const api=cloudApi();
  if(api) {
    try {
      const manifestText=await callCloud('getItem',CLOUD_MANIFEST_KEY);
      if(manifestText) {
        const manifest=JSON.parse(manifestText);
        if(manifest.version===1 && Number.isInteger(manifest.chunks) && manifest.chunks>0 && manifest.chunks<=500) {
          let combined='';
          for(let i=0;i<manifest.chunks;i++) {
            const chunk=await callCloud('getItem',`${CLOUD_CHUNK_PREFIX}${i}`);
            if(typeof chunk!=='string') throw new Error('Часть облачного сохранения отсутствует.');
            combined+=chunk;
          }
          if(checksum(combined)!==manifest.checksum) throw new Error('Контрольная сумма сохранения не совпала.');
          raw=JSON.parse(combined); provider='TELEGRAM CLOUD';
        }
      }
      if(!raw) {
        const legacy=await callCloud('getItem',LEGACY_CLOUD_KEY);
        if(legacy) { raw=JSON.parse(legacy); provider='TELEGRAM CLOUD / MIGRATION'; }
      }
    } catch(error) {
      cloudReadFailed=true;
      warning=`Не удалось прочитать CloudStorage: ${error.message}`;
    }
  }
  if(!raw) {
    raw=getLocal();
    if(raw) provider='LOCAL SAVE';
  }
  const migrated=migrateSave(raw,tgUser);
  if(raw && migrated.changed) warning=warning||'Сохранение обновлено до текущей версии без сброса известных данных.';
  return {state:migrated.state,provider,warning,hadSave:Boolean(raw),blocked:Boolean(api&&cloudReadFailed&&!raw)};
}

export async function saveGame(state) {
  const snapshot=JSON.stringify(state);
  const localSaved=setLocal(state);
  const api=cloudApi();
  if(!api) return {ok:localSaved,provider:localSaved?'LOCAL SAVE':'SAVE ERROR',warning:localSaved?'Telegram CloudStorage недоступен вне Telegram.': 'Не удалось записать локальное сохранение. Проверь свободное место в хранилище браузера.'};
  try {
    const chunks=splitChunks(snapshot);
    if(chunks.length>500) throw new Error('Сохранение слишком большое для безопасной записи CloudStorage.');
    for(let i=0;i<chunks.length;i++) await callCloud('setItem',`${CLOUD_CHUNK_PREFIX}${i}`,chunks[i]);
    const manifest={version:1,chunks:chunks.length,checksum:checksum(snapshot),savedAt:Date.now()};
    // Write manifest last: incomplete saves are never treated as committed.
    await callCloud('setItem',CLOUD_MANIFEST_KEY,JSON.stringify(manifest));
    // Remove stale chunks left by a previous, larger save.
    try {
      const keys=await callCloud('getKeys');
      const stale=(keys||[]).filter(key=>key.startsWith(CLOUD_CHUNK_PREFIX))
        .filter(key=>Number(key.slice(CLOUD_CHUNK_PREFIX.length))>=chunks.length);
      if(stale.length) await callCloud('removeItems',stale);
    } catch { /* Stale chunks are harmless; manifest defines the committed length. */ }
    return {ok:true,provider:'TELEGRAM CLOUD'};
  } catch(error) {
    return {ok:false,provider:localSaved?'LOCAL SAVE':'SAVE ERROR',warning:`Облачное сохранение не записано: ${error.message}.${localSaved?' Локальная копия оставлена.':' Локальное сохранение также недоступно.'}`};
  }
}
