import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from './engine.js';
import {loadSavedGame, saveGame} from './storage.js';

function installStorageMocks({cloudEnabled=true,localEnabled=true}={}) {
  const cloud=new Map();
  const local=new Map();
  const api={
    getItem(key,cb){cb(null,cloud.get(key)??'');},
    setItem(key,value,cb){if(String(value).length>4096){cb('value too long');return;}cloud.set(key,String(value));cb(null,true);},
    getKeys(cb){cb(null,[...cloud.keys()]);},
    removeItems(keys,cb){for(const key of keys)cloud.delete(key);cb(null,true);}
  };
  globalThis.window=cloudEnabled?{Telegram:{WebApp:{CloudStorage:api}}}:{};
  globalThis.localStorage=localEnabled?{
    getItem(key){return local.get(key)??null;},
    setItem(key,value){local.set(key,String(value));},
    removeItem(key){local.delete(key);},
    clear(){local.clear();}
  }:undefined;
  return {cloud,local};
}
function removeStorageMocks(){delete globalThis.window;delete globalThis.localStorage;}

test('Telegram CloudStorage writes bounded chunks and restores the complete save',async()=>{
  const {cloud}=installStorageMocks();
  try {
    const state=createInitialState();state.player.nickname='CloudFox';
    state.computer.files.push({id:'large-file',name:'large.nbd',content:'x'.repeat(15000),size:15});
    const saved=await saveGame(state);
    assert.equal(saved.ok,true);assert.equal(saved.provider,'TELEGRAM CLOUD');
    const manifest=JSON.parse(cloud.get('nullbyte_save_v1_manifest'));
    assert.ok(manifest.chunks>1);
    for(let i=0;i<manifest.chunks;i++)assert.ok(cloud.get(`nullbyte_save_v1_part_${i}`).length<=4096);
    const loaded=await loadSavedGame();
    assert.equal(loaded.provider,'TELEGRAM CLOUD');
    assert.equal(loaded.state.player.nickname,'CloudFox');
    assert.equal(loaded.state.computer.files[0].content.length,15000);
  } finally {removeStorageMocks();}
});

test('corrupt cloud save falls back to local backup and warns the player',async()=>{
  const {cloud}=installStorageMocks();
  try {
    const state=createInitialState();state.player.nickname='BackupFox';
    assert.equal((await saveGame(state)).ok,true);
    cloud.set('nullbyte_save_v1_part_0','corrupted');
    const loaded=await loadSavedGame();
    assert.equal(loaded.provider,'LOCAL SAVE');
    assert.equal(loaded.state.player.nickname,'BackupFox');
    assert.match(loaded.warning,/CloudStorage/);
    assert.equal(loaded.blocked,false);
  } finally {removeStorageMocks();}
});

test('unreadable cloud save without a local copy cannot be silently overwritten',async()=>{
  const {cloud}=installStorageMocks({localEnabled:false});
  try {
    const state=createInitialState();state.player.nickname='LostFox';
    assert.equal((await saveGame(state)).ok,true);
    cloud.set('nullbyte_save_v1_part_0','corrupted');
    const loaded=await loadSavedGame();
    assert.equal(loaded.hadSave,false);
    assert.equal(loaded.blocked,true);
    assert.match(loaded.warning,/CloudStorage/);
  } finally {removeStorageMocks();}
});
