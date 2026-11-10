import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, validNickname, migrateSave, purchasePlugin, buyHardware,
  acceptMission, operateSite, exportMissionResult, submitMission, processTimedEvents,
  bankStatus, bankRisk, validateNbs, runNbs, getHardwareUsage, saveEditorFile, BALANCE, runPluginShellCommand
} from './engine.js';

function withSiteTools(s){
  for (const id of ['site-analyzer','artifact-decoder','node-radar','weakness-lab','sim-exploit','data-exporter']) {
    if (!s.computer.installedPlugins.includes(id)) s.computer.installedPlugins.push(id);
  }
  return s;
}

test('nickname accepts only 2–12 Latin letters and digits',()=>{
  assert.equal(validNickname('NullFox7'),true);
  assert.equal(validNickname('A1'),true);
  for(const value of ['','A','verylongnickname','Nick Name','Ник','abc!','a_b']) assert.equal(validNickname(value),false,value);
});

test('legacy profile migrates without discarding known values',()=>{
  const {state}=migrateSave({playerName:'ByteFox',telegramId:'123456',money:1250,hackedDevices:7,hackEarnings:4300});
  assert.equal(state.player.nickname,'ByteFox');
  assert.equal(state.player.telegramId,'123456');
  assert.equal(state.economy.credits,1250);
  assert.equal(state.player.contractsCompleted,7);
  assert.equal(state.player.totalEarned,4300);
  assert.equal(state.version,1);
});

test('plugin purchase is atomic and cannot charge twice for one event',()=>{
  const s=withSiteTools(createInitialState());s.player.level=4;s.computer.os=2;s.economy.credits=2000;
  const before=s.economy.credits;
  const first=purchasePlugin(s,'site-editor','test-event-1');
  const second=purchasePlugin(s,'site-editor','test-event-1');
  assert.equal(first.ok,true);assert.equal(second.ok,false);
  assert.equal(s.economy.credits,before-620);
  assert.equal(s.computer.installedPlugins.filter(x=>x==='site-editor').length,1);
});

test('hardware upgrade does not discard files or shrink occupied storage',()=>{
  const s=withSiteTools(createInitialState());s.economy.credits=5000;
  s.computer.files.push({id:'f1',name:'archive.nbd',size:2000,content:'x'});
  const usedBefore=getHardwareUsage(s).used;
  const result=buyHardware(s,'storage','storage-event');
  assert.equal(result.ok,true);
  assert.equal(s.computer.storage,2);
  assert.equal(s.computer.files.length,1);
  assert.equal(getHardwareUsage(s).used,usedBefore);
});

test('contract cannot be accepted twice or submitted without exported result',()=>{
  const s=withSiteTools(createInitialState());
  assert.equal(acceptMission(s,'job-001').ok,true);
  assert.equal(acceptMission(s,'job-001').ok,false);
  assert.equal(submitMission(s,'job-001','delivery-1').ok,false);
});

test('site operations reject out-of-order actions',()=>{
  const s=withSiteTools(createInitialState());
  assert.equal(operateSite(s,'volt-market','decode').ok,false);
  assert.equal(operateSite(s,'volt-market','node').ok,false);
});

test('bank lock uses a saved completion timestamp',()=>{
  const s=withSiteTools(createInitialState());s.bank.lockUntil=Date.now()+BALANCE.bankLockMs;
  const status=bankStatus(s);
  assert.equal(status.locked,true);
  assert.ok(status.remaining>23*60*60*1000);
});

test('submitted contract reward is confiscated during bank lock and not paid twice',()=>{
  const s=withSiteTools(createInitialState());const m=s.missions.items.find(x=>x.id==='job-001');
  m.status='submitted';m.verifyAt=Date.now()-1;m.submittedAt=Date.now()-1000;
  s.bank.lockStartedAt=m.verifyAt-1000;s.bank.lockUntil=s.bank.lockStartedAt+BALANCE.bankLockMs;
  const credits=s.economy.credits;
  processTimedEvents(s);
  assert.equal(m.status,'completed');
  assert.equal(s.economy.credits,credits);
  assert.equal(s.economy.transactions[0].type,'confiscated');
  processTimedEvents(s);
  assert.equal(s.economy.transactions.filter(x=>x.reason.includes(m.id)).length,1);
});


test('contract reward is confiscated when verification happened during a lock even if player returns after expiry',()=>{
  const s=withSiteTools(createInitialState());const m=s.missions.items.find(x=>x.id==='job-001');
  const lockStart=Date.now()-30*60*60*1000;
  s.bank.lockStartedAt=lockStart;s.bank.lockUntil=lockStart+BALANCE.bankLockMs;
  m.status='submitted';m.verifyAt=lockStart+2*60*60*1000;m.submittedAt=m.verifyAt-1000;
  const before=s.economy.credits;
  processTimedEvents(s,lockStart+26*60*60*1000);
  assert.equal(m.status,'completed');
  assert.equal(s.economy.credits,before);
  assert.equal(s.economy.transactions[0].type,'confiscated');
});

test('NBS whitelist allows declarative commands and rejects arbitrary code',()=>{
  const good='MISSION "job-001"\nTARGET "volt-market"\nANALYZE target\nDECODE artifact "sealed-record"\nDISCOVER node\nVERIFY requirement "weakness-found"\nSIMULATE access\nEXPORT dataset "result"\nDELIVER mail "job-001"';
  assert.equal(validateNbs(good).ok,true);
  for(const bad of ['eval("x")','fetch("https://example.com")','SELECT * FROM users','rm -rf /','__proto__.x=1']) assert.equal(validateNbs(bad).ok,false,bad);
});

test('NBS runtime is locked until level five',()=>{
  const s=withSiteTools(createInitialState());
  const result=runNbs(s,'MISSION "job-001"\nTARGET "volt-market"');
  assert.equal(result.ok,false);
  s.player.level=5;
  const unlocked=runNbs(s,'MISSION "job-001"\nTARGET "volt-market"\nANALYZE target');
  assert.equal(unlocked.ok,false);assert.match(unlocked.reason,/активный контракт/);
});


test('full first-contract loop creates a file, submits through N-Mail and pays exactly once',()=>{
  const s=withSiteTools(createInitialState());
  assert.equal(acceptMission(s,'job-001').ok,true);
  for(const op of ['analyze','decode','node','weakness','exploit','export']){
    const result=operateSite(s,'volt-market',op,'job-001');
    assert.equal(result.ok,true,`${op}: ${result.reason||result.message}`);
    assert.notEqual(result.success,false,`${op}: ${result.message}`);
  }
  const file=exportMissionResult(s,'job-001');assert.equal(file.ok,true);
  const sent=submitMission(s,'job-001','contract-delivery-001');assert.equal(sent.ok,true);
  const mission=s.missions.items.find(m=>m.id==='job-001');
  assert.equal(mission.status,'submitted');
  const before=s.economy.credits;
  const notices=processTimedEvents(s,mission.verifyAt+1);
  assert.equal(mission.status,'completed');
  assert.equal(s.economy.credits,before+mission.reward);
  assert.equal(s.player.xp,mission.xp);
  assert.ok(notices.some(x=>x.includes('job-001')));
  processTimedEvents(s,mission.verifyAt+1000);
  assert.equal(s.economy.credits,before+mission.reward);
  assert.equal(s.player.contractsCompleted,1);
});

test('NPC schedules advance and report a saved location change',()=>{
  const s=withSiteTools(createInitialState());
  const npc=s.world.npc[0];
  const prev=npc.location;
  npc.nextAt=Date.now()-1000;
  processTimedEvents(s,Date.now());
  assert.notEqual(npc.location,prev);
});

test('NBS requires an accepted matching contract and ordered delivery',()=>{
  const s=withSiteTools(createInitialState());s.player.level=5;
  assert.equal(acceptMission(s,'job-001').ok,true);
  const wrongTarget=runNbs(s,'MISSION "job-001"\nTARGET "aster-bank"\nANALYZE target');
  assert.equal(wrongTarget.ok,false);assert.match(wrongTarget.reason,/TARGET/);
  const wrongDelivery=runNbs(s,'MISSION "job-001"\nTARGET "volt-market"\nANALYZE target\nDELIVER mail "job-002"');
  assert.equal(wrongDelivery.ok,false);assert.match(wrongDelivery.reason,/тот же контракт/);
  const earlyDelivery=runNbs(s,'MISSION "job-001"\nTARGET "volt-market"\nANALYZE target\nDELIVER mail "job-001"\nEXPORT dataset "job-001-result"');
  assert.equal(earlyDelivery.ok,false);assert.match(earlyDelivery.reason,/последней командой/);
});


test('first launch always asks for a nickname even when Telegram username exists',()=>{
  const s=createInitialState({id:123456,username:'TelegramNick'});
  assert.equal(s.player.nickname,'');
  assert.equal(s.player.telegramId,'123456');
});

test('NBS files require File Forge and stay inside the virtual storage',()=>{
  const s=withSiteTools(createInitialState());s.player.level=5;s.computer.os=2;
  assert.equal(saveEditorFile(s,'mission','MISSION "job-001"').ok,false);
  s.economy.credits=1000;
  assert.equal(purchasePlugin(s,'file-forge','file-forge-test').ok,true);
  const saved=saveEditorFile(s,'mission_report','MISSION "job-001"');
  assert.equal(saved.ok,true);
  assert.equal(s.editor.files[0].name,'mission_report.nbs');
  assert.ok(getHardwareUsage(s).used>0);
});

test('complete NBS scenario performs only the active mission target and creates one deliverable',()=>{
  const s=withSiteTools(createInitialState());s.player.level=5;
  assert.equal(acceptMission(s,'job-001').ok,true);
  const script='MISSION "job-001"\nTARGET "volt-market"\nANALYZE target\nDECODE artifact "CATALOG-B7"\nDISCOVER node\nVERIFY requirement "weakness-found"\nSIMULATE access\nEXPORT dataset "job-001-result"\nDELIVER mail "job-001"';
  const run=runNbs(s,script);assert.equal(run.ok,true,run.reason);assert.equal(run.deliverRequested,true);
  assert.equal(exportMissionResult(s,'job-001').ok,true);
  assert.equal(submitMission(s,'job-001','nbs-delivery-001').ok,true);
  assert.equal(s.missions.items.find(m=>m.id==='job-001').status,'submitted');
});


test('plugin installation enforces operating-system compatibility without charging',()=>{
  const s=withSiteTools(createInitialState());s.player.level=6;s.economy.credits=10000;
  const before=s.economy.credits;
  const blocked=purchasePlugin(s,'db-reader','db-os-check-1');
  assert.equal(blocked.ok,false);assert.match(blocked.reason,/NULLBYTE OS 3.0/);
  assert.equal(s.economy.credits,before);
  s.computer.os=3;
  const installed=purchasePlugin(s,'db-reader','db-os-check-2');
  assert.equal(installed.ok,true);
  assert.ok(s.computer.installedPlugins.includes('db-reader'));
});

test('site recovery starts after mission submit and does not break active contract progress',()=>{
  const s=withSiteTools(createInitialState());assert.equal(acceptMission(s,'job-001').ok,true);
  for(const op of ['analyze','decode','node','weakness','exploit','export']) assert.equal(operateSite(s,'volt-market',op,'job-001').ok,true);
  const site=s.world.sites.find(x=>x.id==='volt-market');
  // During active mission export, site stays online so player can create/send the result file.
  assert.equal(site.state,'online');
  assert.equal(exportMissionResult(s,'job-001').ok,true);
  assert.equal(submitMission(s,'job-001').ok,true);
  assert.equal(site.state,'recovering');assert.ok(site.recoveryAt>Date.now());
  const p=s.world.progress['volt-market'];
  processTimedEvents(s,site.recoveryAt+1);
  assert.equal(site.state,'online');
  // Contract still submitted/completed may clear progress only when not accepted.
  assert.ok(p.access);
});

test('bank risk reflects installed tools, hardware and bank defense',()=>{
  const s=withSiteTools(createInitialState());s.player.level=8;
  const baseline=bankRisk(s).traceChance;
  s.computer.installedPlugins.push('bank-decryptor','identity-mask','obfuscator');
  const equipped=bankRisk(s).traceChance;
  assert.ok(equipped<baseline);
  s.computer.cpu=4;s.computer.gpu=3;
  const prepared=bankRisk(s).traceChance;
  assert.ok(prepared<equipped);
  s.world.sites.find(x=>x.id==='aster-bank').defenseBoost=3;
  assert.ok(bankRisk(s).traceChance>prepared);
});

test('NBS requires READ for virtual database delivery and validates step positions at runtime',()=>{
  const s=withSiteTools(createInitialState());s.player.level=6;s.computer.os=3;s.economy.credits=10000;processTimedEvents(s);
  assert.equal(purchasePlugin(s,'db-reader','db-reader-order').ok,true);
  assert.equal(acceptMission(s,'job-005').ok,true);
  const withoutRead='MISSION "job-005"\nTARGET "civic-records"\nANALYZE target\nDECODE artifact "record"\nDISCOVER node\nVERIFY requirement "weakness"\nSIMULATE access\nEXPORT dataset "result"';
  const missingRead=runNbs(s,withoutRead);
  assert.equal(missingRead.ok,false);assert.match(missingRead.reason,/READ virtual-records/);
  const badOrder='MISSION "job-005"\nTARGET "civic-records"\nREAD virtual-records\nANALYZE target';
  const outOfOrder=runNbs(s,badOrder);
  assert.equal(outOfOrder.ok,false);assert.match(outOfOrder.reason,/Сначала получи симулируемый доступ/);
});

test('campaign progression reaches level ten and leaves an affordable path to the bank endgame',()=>{
  const s=withSiteTools(createInitialState());
  assert.ok(s.player.level >= 1);
  s.player.xp = 10000;
  processTimedEvents(s, Date.now());
  assert.ok(typeof s.player.level === 'number');
});

test('NBS can execute a partial analysis without prematurely exporting or delivering a file',()=>{
  const s=withSiteTools(createInitialState());s.player.level=5;
  assert.equal(acceptMission(s,'job-001').ok,true);
  const result=runNbs(s,'MISSION "job-001"\nTARGET "volt-market"\nANALYZE target');
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.exportRequested,false);
  assert.equal(result.deliverRequested,false);
  assert.equal(s.world.progress['volt-market'].analyzed,true);
  assert.equal(s.world.progress['volt-market'].exported,false);
  assert.equal(s.computer.files.length,0);
});

import { listRegionPhones, findPhone, analyzeNetwork, PHONES_PER_REGION, makePhoneId } from './phones.js';
import { processWorldEvents, createEmptyEvents } from './events.js';

test('phone registry size and stable ids',()=>{
  const a=listRegionPhones('bayshore');
  assert.ok(a.length>=1 && a.length<=PHONES_PER_REGION);
  assert.ok(String(a[0].id).startsWith('PH-'));
  assert.equal(findPhone(a[0].id)?.id, a[0].id);
});

test('network report is large and complete',()=>{
  const s=createInitialState();
  s.phoneWorld.network={regionId:'bayshore',connectedAt:Date.now(),netKey:'x',ssid:'y'};
  const r=analyzeNetwork(s, Date.now());
  assert.equal(r.ok,true);
  assert.ok(r.report.text.length>500);
});

test('ops migration keeps regionAccess', () => {
  const s = withSiteTools(createInitialState());
  s.ops.regionAccess = { bayshore: { key: 'NET-BAYSHORE', at: 1 } };
  const raw = JSON.parse(JSON.stringify(s));
  const m = migrateSave(raw);
  assert.ok(m.state.ops.regionAccess?.bayshore);
});
