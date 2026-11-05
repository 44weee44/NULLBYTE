/**
 * NULLBYTE cyber intelligence — full world model for sites, servers, users, phones.
 * Deterministic, save-friendly, shared by all plugins.
 */

export const ACCESS_LEVELS = ['none','discovered','authenticated','limited','user','admin','root'];
const ACCESS_RANK = Object.fromEntries(ACCESS_LEVELS.map((a,i)=>[a,i]));

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick(seed, arr) { return arr[hash32(seed) % arr.length]; }
function ipFromId(id) {
  const h = hash32(id);
  return `203.0.${(h >> 8) & 255}.${20 + (h % 200)}`;
}

const STACKS = {
  shop: { server:'nginx', backend:'Node.js', cms:null, db:'Redis', auth:'session-cookie' },
  bank: { server:'nginx', backend:'Java', cms:null, db:'PostgreSQL', auth:'mfa-token' },
  auto: { server:'Apache', backend:'PHP', cms:null, db:'MySQL', auth:'basic' },
  utility: { server:'nginx', backend:'Go', cms:null, db:'Timescale', auth:'api-key' },
  forum: { server:'nginx', backend:'PHP', cms:'CustomBoard', db:'MySQL', auth:'session' },
  database: { server:'nginx', backend:'Python', cms:null, db:'PostgreSQL', auth:'token' },
  device: { server:'lighttpd', backend:'embedded', cms:null, db:null, auth:'device-pin' },
  wifi: { server:'busybox-httpd', backend:'C', cms:null, db:null, auth:'wps-sim' }
};

const USER_POOL = [
  { username:'night_runner', role:'customer' },
  { username:'mira_voss', role:'client' },
  { username:'eli_north', role:'mechanic' },
  { username:'grid_ops', role:'operator' },
  { username:'cobalt_mod', role:'moderator' },
  { username:'office04', role:'clerk' },
  { username:'volt_buyer', role:'customer' },
  { username:'shadow_node', role:'user' }
];

const VULN_CATALOG = [
  { id:'vuln_weak_session', name:'Weak Session Validation', category:'authentication', severity:'high', accessGranted:'limited', requiresStage:'weakness' },
  { id:'vuln_config_leak', name:'Config Surface Exposure', category:'misconfig', severity:'medium', accessGranted:'authenticated', requiresStage:'node' },
  { id:'vuln_api_overshare', name:'API Overshare', category:'api', severity:'medium', accessGranted:'user', requiresStage:'weakness' },
  { id:'vuln_stale_token', name:'Stale Token Reuse', category:'authentication', severity:'high', accessGranted:'admin', requiresStage:'access' }
];

export function createEmptyIntel() {
  return {
    domains: {},
    servers: {},
    services: {},
    users: {},
    devices: {},
    vulnerabilities: {},
    artifacts: {},
    relations: [],
    operations: [],
    suspicion: {},
    nextBoardAt: 0
  };
}

export function seedIntelFromSites(sites, intel) {
  const out = intel && typeof intel === 'object' ? { ...createEmptyIntel(), ...intel } : createEmptyIntel();
  out.domains = out.domains || {};
  out.servers = out.servers || {};
  out.users = out.users || {};
  out.devices = out.devices || {};
  out.vulnerabilities = out.vulnerabilities || {};
  out.artifacts = out.artifacts || {};
  out.relations = Array.isArray(out.relations) ? out.relations : [];
  out.operations = Array.isArray(out.operations) ? out.operations : [];
  out.suspicion = out.suspicion || {};

  for (const site of sites || []) {
    const domainId = `dom_${site.id}`;
    if (!out.domains[domainId]) {
      const ip = ipFromId(site.id);
      out.domains[domainId] = {
        id: domainId, type: 'domain', siteId: site.id, domain: site.domain, title: site.title,
        kind: site.kind, region: site.region, district: site.district, security: site.security,
        ips: [ip], discovered: false, analyzed: false, stack: { ...(STACKS[site.kind] || STACKS.shop) },
        endpoints: [], subdomains: [], lastAnalyzedAt: 0
      };
    }
    const srvId = `srv_${site.id}`;
    if (!out.servers[srvId]) {
      out.servers[srvId] = {
        id: srvId, type: 'server', siteId: site.id, hostname: `web-${site.id}.sim.null`,
        ip: out.domains[domainId].ips[0], region: site.region,
        os: site.kind === 'device' ? 'Embedded RTOS' : 'Linux',
        services: site.kind === 'database' ? ['web','api','database'] : site.kind === 'bank' ? ['web','api','auth'] : ['web','api'],
        securityLevel: site.security, accessLevel: 'none', discovered: false, logs: []
      };
    }
    if (!out.relations.some(r => r.from === domainId && r.to === srvId)) {
      out.relations.push({ from: domainId, to: srvId, kind: 'hosts' });
    }
    // Seed 2 virtual users per site
    for (let i = 0; i < 2; i++) {
      const uTemplate = USER_POOL[(hash32(site.id + ':u' + i) % USER_POOL.length)];
      const uid = `user_${site.id}_${i}`;
      if (!out.users[uid]) {
        out.users[uid] = {
          id: uid, type: 'user', siteId: site.id, username: `${uTemplate.username}_${hash32(site.id+i)%90}`,
          role: uTemplate.role, balance: 200 + (hash32(uid) % 8000), reputation: hash32(uid) % 100,
          accountStatus: 'active', discovered: false, serverId: srvId
        };
      }
      if (!out.relations.some(r => r.from === srvId && r.to === uid)) {
        out.relations.push({ from: srvId, to: uid, kind: 'has_user' });
      }
      // Phone for first user of non-bank sites
      if (i === 0 && site.kind !== 'bank') {
        const did = `phone_${site.id}`;
        if (!out.devices[did]) {
          out.devices[did] = {
            id: did, type: 'phone', siteId: site.id, userId: uid,
            model: pick(did, ['PM-22','NX-Phone','GridHand 4','Cobalt Go']),
            imei: `35${String(hash32(did)%10000000000000).padStart(13,'0')}`.slice(0,15),
            network: pick(did, ['NorthWifi','OldPort-MESH','GridLink']),
            region: site.region, discovered: false, analyzed: false, accessLevel: 'none',
            contacts: [], messages: [], apps: ['N-Mail','Wallet','Maps']
          };
        }
        if (!out.relations.some(r => r.from === uid && r.to === did)) {
          out.relations.push({ from: uid, to: did, kind: 'owns_device' });
        }
      }
    }
    // Seed latent vulns (undiscovered)
    const vTemplate = VULN_CATALOG[hash32(site.id + ':v') % VULN_CATALOG.length];
    const vid = `${vTemplate.id}_${site.id}`;
    if (!out.vulnerabilities[vid]) {
      out.vulnerabilities[vid] = {
        ...vTemplate, id: vid, siteId: site.id, serverId: srvId, discovered: false, exploited: false
      };
    }
  }
  return out;
}

function addArtifact(intel, art) {
  if (!intel.artifacts) intel.artifacts = {};
  const existing = Object.values(intel.artifacts).find(
    a => a.type === art.type && a.targetId === art.targetId && a.label === art.label
  );
  if (existing) {
    existing.data = { ...existing.data, ...art.data };
    existing.confidence = Math.max(existing.confidence || 0, art.confidence || 0);
    existing.updatedAt = Date.now();
    existing.verified = existing.verified || Boolean(art.verified);
    return { artifact: existing, created: false };
  }
  const id = art.id || `art_${hash32(`${art.type}:${art.targetId}:${art.label}:${Object.keys(intel.artifacts).length}`).toString(16)}`;
  const entry = {
    id, type: art.type, sourcePlugin: art.sourcePlugin || 'unknown', targetId: art.targetId,
    label: art.label || art.type, data: art.data || {}, confidence: art.confidence ?? 0.7,
    verified: Boolean(art.verified), tags: art.tags || [], discoveredAt: Date.now(), updatedAt: Date.now()
  };
  intel.artifacts[id] = entry;
  return { artifact: entry, created: true };
}

function logOperation(intel, op) {
  if (!Array.isArray(intel.operations)) intel.operations = [];
  intel.operations.unshift({
    id: op.id || `op_${Date.now().toString(36)}`,
    pluginId: op.pluginId, targetId: op.targetId, status: op.status || 'completed',
    startedAt: op.startedAt || Date.now(), completedAt: Date.now(),
    summary: op.summary || '', artifactsCreated: op.artifactsCreated || []
  });
  intel.operations = intel.operations.slice(0, 100);
}

function bumpSuspicion(intel, targetId, amount) {
  intel.suspicion[targetId] = Math.min(100, (intel.suspicion[targetId] || 0) + amount);
  return intel.suspicion[targetId];
}

function raiseAccess(server, level) {
  if (!server) return;
  if ((ACCESS_RANK[level] || 0) > (ACCESS_RANK[server.accessLevel] || 0)) {
    server.accessLevel = level;
  }
}

function findDomainByRef(intel, ref, sites) {
  const input = String(ref || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!input) return null;
  const domains = Object.values(intel.domains || {});
  let d = domains.find(x => x.domain === input || x.siteId === input);
  if (d) return d;
  if (sites) {
    const site = sites.find(s => s.domain === input || s.id === input || s.title.toLowerCase() === input);
    if (site) return domains.find(x => x.siteId === site.id) || null;
  }
  return domains.find(x => `${x.domain} ${x.title}`.toLowerCase().includes(input)) || null;
}

export function migrateIntel(rawIntel, sites) {
  const base = createEmptyIntel();
  if (!rawIntel || typeof rawIntel !== 'object') return seedIntelFromSites(sites, base);
  const merged = {
    ...base, ...rawIntel,
    domains: { ...base.domains, ...(rawIntel.domains || {}) },
    servers: { ...base.servers, ...(rawIntel.servers || {}) },
    users: { ...base.users, ...(rawIntel.users || {}) },
    devices: { ...base.devices, ...(rawIntel.devices || {}) },
    vulnerabilities: { ...base.vulnerabilities, ...(rawIntel.vulnerabilities || {}) },
    artifacts: { ...base.artifacts, ...(rawIntel.artifacts || {}) },
    relations: Array.isArray(rawIntel.relations) ? rawIntel.relations.slice(-600) : [],
    operations: Array.isArray(rawIntel.operations) ? rawIntel.operations.slice(0, 100) : [],
    suspicion: rawIntel.suspicion && typeof rawIntel.suspicion === 'object' ? rawIntel.suspicion : {},
    nextBoardAt: Number(rawIntel.nextBoardAt) || 0
  };
  return seedIntelFromSites(sites, merged);
}

export function listIntelSummary(intel) {
  if (!intel) return 'intel: empty';
  return `dom:${Object.keys(intel.domains||{}).length} srv:${Object.keys(intel.servers||{}).length} user:${Object.keys(intel.users||{}).length} phone:${Object.keys(intel.devices||{}).length} art:${Object.keys(intel.artifacts||{}).length}`;
}

export function ensureIntel(state) {
  if (!state.intel) state.intel = createEmptyIntel();
  state.intel = seedIntelFromSites(state.world?.sites || [], state.intel);
  return state.intel;
}

/** Write a virtual report file onto operator computer */
export function writeIntelFile(state, name, content, type = 'report') {
  if (!state.computer) return null;
  if (!Array.isArray(state.computer.files)) state.computer.files = [];
  const existing = state.computer.files.find(f => f.name === name);
  const file = {
    id: existing?.id || `file_${hash32(name + Date.now()).toString(16)}`,
    name, type, path: `/home/operator/reports/${name}`,
    content: String(content).slice(0, 12000),
    size: Math.max(1, Math.ceil(String(content).length / 1024)),
    createdAt: existing?.createdAt || Date.now()
  };
  if (existing) Object.assign(existing, file);
  else state.computer.files.push(file);
  return file;
}

// ───────────── WEB RECON ─────────────
export function runWebRecon(state, domainRef) {
  const intel = ensureIntel(state);
  const domain = findDomainByRef(intel, domainRef, state.world?.sites);
  if (!domain) return { ok: false, lines: [{ text: 'TARGET_NOT_FOUND — домен .null из Browser.', type: 'error' }] };

  const server = intel.servers[`srv_${domain.siteId}`];
  const wasAnalyzed = domain.analyzed;
  const startedAt = Date.now();
  domain.discovered = true; domain.analyzed = true; domain.lastAnalyzedAt = startedAt;
  if (server) { server.discovered = true; raiseAccess(server, 'discovered'); }

  const h = hash32(domain.siteId + ':surface');
  const publicEndpoints = 8 + (h % 20) + domain.security * 3;
  const apiEndpoints = ['bank','database'].includes(domain.kind) ? 4 + (h % 6) : 1 + (h % 4);
  const loginIfaces = 1 + (h % 2);
  if (!domain.subdomains.length) {
    const prefixes = ['www','api','dev','cdn','mail','auth','static'];
    domain.subdomains = Array.from({ length: 2 + (h % 5) }, (_, i) => `${prefixes[(h+i)%prefixes.length]}.${domain.domain}`);
  }
  if (!domain.endpoints.length) {
    domain.endpoints = ['/', '/login', domain.kind === 'shop' ? '/catalog' : '/app', '/api/v1/status', '/docs'];
  }

  const created = [], updated = [];
  const push = (type, label, data, confidence, tags=[]) => {
    const r = addArtifact(intel, { type, label, targetId: domain.id, sourcePlugin: 'site-analyzer', data, confidence, tags });
    (r.created ? created : updated).push(r.artifact.id);
    return r.artifact;
  };
  push('domain_record', domain.domain, { domain: domain.domain, ips: domain.ips }, 1, ['dns']);
  push('ip_address', domain.ips[0], { ip: domain.ips[0] }, 0.95, ['network']);
  push('server_fingerprint', server?.hostname || domain.domain, { hostname: server?.hostname, ip: server?.ip, os: server?.os, services: server?.services }, 0.84, ['server']);
  push('tech_stack', 'stack', { ...domain.stack }, 0.86, ['fingerprint']);
  push('web_surface', 'surface', { publicEndpoints, apiEndpoints, loginInterfaces: loginIfaces, endpoints: domain.endpoints }, 0.9, ['surface']);
  if (domain.subdomains[0]) push('subdomain', domain.subdomains[0], { subdomain: domain.subdomains[0] }, 0.72, ['dns']);

  const observations = [];
  if (domain.security <= 2) observations.push('Missing Security Headers (probable)');
  if (domain.kind !== 'bank') observations.push('Server banner disclosure (probable)');
  if (apiEndpoints >= 5) observations.push('Wide API surface (interesting)');
  if (domain.security >= 4) observations.push('Elevated monitoring profile');

  const sigSeed = hash32(`${domain.siteId}:${created.length}:${domain.subdomains.length}`);
  const signature = `SIG/${domain.siteId.replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase()}-${(sigSeed>>>0).toString(16).slice(0,6).toUpperCase()}`;
  push('pipeline_signature', signature, { signature, siteId: domain.siteId }, 1, ['pipeline']);

  logOperation(intel, { pluginId: 'site-analyzer', targetId: domain.id, startedAt, summary: `WEB-RECON ${domain.domain}`, artifactsCreated: created });

  const reportText = [
    `NULLBYTE WEB RECON`, `Target: ${domain.domain}`, `IP: ${domain.ips[0]}`,
    `Stack: ${domain.stack.server}/${domain.stack.backend}`, `Signature: ${signature}`
  ].join('\n');
  writeIntelFile(state, `${domain.siteId}_recon.report`, reportText);

  const lines = [
    { text: 'NULLBYTE // WEB RECON', type: 'blue' },
    { text: '----------------------------------------', type: 'muted' },
    { text: `Target: ${domain.domain}`, type: '' },
    { text: `Operation: WEB-RECON-${(sigSeed % 9000 + 1000)}`, type: '' },
    { text: `Status: Completed · ${wasAnalyzed ? 'RESCAN' : 'INITIAL'}`, type: 'green' },
    { text: '', type: 'muted' },
    { text: '[ DOMAIN INTELLIGENCE ]', type: 'blue' },
    { text: `Domain: ${domain.domain}`, type: '' },
    { text: `IP: ${domain.ips.join(', ')}`, type: '' },
    { text: `DNS: A=${domain.ips.length} NS=2 MX=2 TXT=2`, type: 'muted' },
    { text: `Subdomains: ${domain.subdomains.length} · ${domain.subdomains.slice(0,3).join(' · ')}`, type: '' },
    { text: `Region: ${domain.region} / ${domain.district || '—'}`, type: '' },
    { text: '', type: 'muted' },
    { text: '[ TECHNOLOGY FINGERPRINT ]', type: 'blue' },
    { text: `Web Server: ${domain.stack.server} (${Math.round(0.86*100)}%)`, type: '' },
    { text: `Backend: ${domain.stack.backend} · CMS: ${domain.stack.cms || 'none'} · DB: ${domain.stack.db || 'n/a'}`, type: '' },
    { text: `Auth: ${domain.stack.auth}`, type: 'muted' },
    { text: '', type: 'muted' },
    { text: '[ WEB SURFACE ]', type: 'blue' },
    { text: `Public: ${publicEndpoints} · API: ${apiEndpoints} · Login: ${loginIfaces}`, type: '' },
    { text: `Paths: ${domain.endpoints.join(', ')}`, type: 'muted' },
    { text: '', type: 'muted' },
    { text: '[ SECURITY OBSERVATIONS ]', type: 'blue' },
    ...observations.map(o => ({ text: `· ${o}`, type: '' })),
    { text: 'Confirmed vulnerabilities: 0 (observations ≠ exploits)', type: 'muted' },
    { text: '', type: 'muted' },
    { text: '[ ARTIFACTS ]', type: 'blue' },
    { text: `New: ${created.length} · Updated: ${updated.length}`, type: '' },
    { text: `File: /home/operator/reports/${domain.siteId}_recon.report`, type: 'muted' },
    { text: '', type: 'muted' },
    { text: `EXTRACT >> SIGNATURE = ${signature}`, type: 'green' },
    { text: `EXTRACT >> SITE_ID = ${domain.siteId}`, type: 'green' },
    { text: `EXTRACT >> IP = ${domain.ips[0]}`, type: 'green' },
    { text: `EXTRACT >> HOST = ${server?.hostname || 'n/a'}`, type: 'green' }
  ];
  return { ok: true, lines, signature, siteId: domain.siteId, domainId: domain.id, artifactsCreated: created.length };
}

// ───────────── SERVER ANALYSIS ─────────────
export function runServerAnalysis(state, ref) {
  const intel = ensureIntel(state);
  // ref can be HOST handle, IP, hostname, site id
  let server = Object.values(intel.servers).find(s =>
    s.hostname === ref || s.ip === ref || s.id === ref || s.siteId === ref ||
    String(ref).includes(s.siteId)
  );
  if (!server) {
    const domain = findDomainByRef(intel, ref, state.world?.sites);
    if (domain) server = intel.servers[`srv_${domain.siteId}`];
  }
  if (!server || !server.discovered) {
    return { ok: false, lines: [{ text: 'SERVER_UNKNOWN — сначала WEB RECON / node-radar.', type: 'error' }] };
  }
  const domain = intel.domains[`dom_${server.siteId}`];
  const vulns = Object.values(intel.vulnerabilities).filter(v => v.serverId === server.id);
  server.discovered = true;
  raiseAccess(server, 'discovered');
  const created = [];
  const art = addArtifact(intel, {
    type: 'server_profile', label: server.hostname, targetId: server.id, sourcePlugin: 'node-radar',
    data: { ip: server.ip, os: server.os, services: server.services, access: server.accessLevel }, confidence: 0.9
  });
  if (art.created) created.push(art.artifact.id);

  const lines = [
    { text: 'NULLBYTE // SERVER ANALYSIS', type: 'blue' },
    { text: '----------------------------------------', type: 'muted' },
    { text: `Hostname: ${server.hostname}`, type: '' },
    { text: `IP: ${server.ip} · OS: ${server.os}`, type: '' },
    { text: `Services: ${server.services.join(', ')}`, type: '' },
    { text: `Security level: ${server.securityLevel}/5`, type: '' },
    { text: `Access: ${server.accessLevel}`, type: 'green' },
    { text: `Domain: ${domain?.domain || '—'}`, type: 'muted' },
    { text: `Latent vuln objects: ${vulns.length} (use weakness-lab to expose)`, type: 'muted' },
    { text: `EXTRACT >> HOST_HANDLE = HOST/${server.siteId.replace(/[^a-z0-9]/gi,'').slice(0,6)}.sim`, type: 'green' },
    { text: `EXTRACT >> SERVER_ID = ${server.id}`, type: 'green' }
  ];
  logOperation(intel, { pluginId: 'node-radar', targetId: server.id, summary: `SERVER ${server.hostname}`, artifactsCreated: created });
  return { ok: true, lines, serverId: server.id, siteId: server.siteId, artifactsCreated: created.length };
}

// ───────────── WEAKNESS / VULN DISCOVERY ─────────────
export function runWeaknessScan(state, serverRef) {
  const intel = ensureIntel(state);
  let server = Object.values(intel.servers).find(s => s.id === serverRef || s.hostname === serverRef || s.siteId === serverRef || String(serverRef).includes(s.siteId));
  if (!server) {
    const domain = findDomainByRef(intel, serverRef, state.world?.sites);
    if (domain) server = intel.servers[`srv_${domain.siteId}`];
  }
  if (!server?.discovered) return { ok: false, lines: [{ text: 'NO_SERVER — нужен обнаруженный сервер.', type: 'error' }] };

  const vulns = Object.values(intel.vulnerabilities).filter(v => v.serverId === server.id);
  const lines = [
    { text: 'NULLBYTE // WEAKNESS LAB', type: 'blue' },
    { text: `Target server: ${server.hostname}`, type: '' },
    { text: `Security model: ${server.securityLevel}/5 · suspicion ${intel.suspicion[server.id]||0}%`, type: 'muted' }
  ];
  const exposed = [];
  for (const v of vulns) {
    // Higher security = lower chance to fully confirm
    const chance = Math.max(0.25, 0.92 - server.securityLevel * 0.12);
    const roll = (hash32(v.id + ':' + (state.stats?.operations||0)) % 1000) / 1000;
    if (roll <= chance) {
      v.discovered = true;
      exposed.push(v);
      addArtifact(intel, {
        type: 'vulnerability', label: v.name, targetId: server.id, sourcePlugin: 'weakness-lab',
        data: { vulnId: v.id, severity: v.severity, category: v.category }, confidence: 0.75 + chance * 0.2, tags: ['vuln']
      });
      lines.push({ text: `FINDING: ${v.name} [${v.severity}/${v.category}]`, type: 'green' });
      lines.push({ text: `  id=${v.id} → potential access ${v.accessGranted}`, type: 'muted' });
    } else {
      lines.push({ text: `noise: inconclusive signal (${v.category})`, type: 'muted' });
    }
  }
  if (!exposed.length) lines.push({ text: 'No confirmed weakness this pass. Retry after more recon.', type: 'muted' });
  else lines.push({ text: `EXTRACT >> VECTOR_ID = ${exposed[0].id}`, type: 'green' });

  bumpSuspicion(intel, server.id, 4 + server.securityLevel);
  logOperation(intel, { pluginId: 'weakness-lab', targetId: server.id, summary: `WEAKNESS ${server.hostname}` });
  return { ok: true, lines, siteId: server.siteId, vectorId: exposed[0]?.id, exposed: exposed.length };
}

// ───────────── EXPLOIT / ACCESS ─────────────
export function runSimExploit(state, vectorOrServer, missionId = null) {
  const intel = ensureIntel(state);
  let vuln = intel.vulnerabilities[vectorOrServer];
  let server = null;
  if (vuln) server = intel.servers[vuln.serverId];
  else {
    server = Object.values(intel.servers).find(s => s.id === vectorOrServer || s.siteId === vectorOrServer || String(vectorOrServer).includes(s.siteId));
    vuln = Object.values(intel.vulnerabilities).find(v => v.serverId === server?.id && v.discovered);
  }
  if (!server) return { ok: false, lines: [{ text: 'NO_TARGET', type: 'error' }] };

  // Tutorial job-001 always succeeds
  const forced = missionId === 'job-001' || (state.missions?.items||[]).some(m => m.id === 'job-001' && m.status === 'accepted' && m.target === server.siteId);

  if (!vuln?.discovered && !forced) {
    return { ok: false, lines: [{ text: 'NO_VECTOR — сначала weakness-lab (VECTOR_ID).', type: 'error' }] };
  }

  const sus = intel.suspicion[server.id] || 0;
  const base = forced ? 1 : Math.max(0.15, 0.9 - server.securityLevel * 0.1 - sus * 0.004);
  const roll = forced ? 0 : (hash32(server.id + ':ex:' + (state.stats?.operations||0)) % 1000) / 1000;
  const lines = [
    { text: 'NULLBYTE // SIM EXPLOIT', type: 'blue' },
    { text: `Server: ${server.hostname}`, type: '' },
    { text: `Vector: ${vuln?.name || 'tutorial-safe-path'}`, type: 'muted' },
    { text: `Success model: ${Math.round(base*100)}% · suspicion ${sus}%`, type: 'muted' }
  ];

  if (roll > base) {
    bumpSuspicion(intel, server.id, 15);
    server.logs.push({ at: Date.now(), event: 'failed_access_attempt' });
    lines.push({ text: 'RESULT: blocked by policy / noise', type: 'error' });
    lines.push({ text: 'Suspicion increased. Access unchanged.', type: 'muted' });
    logOperation(intel, { pluginId: 'sim-exploit', targetId: server.id, summary: 'EXPLOIT FAIL', status: 'failed' });
    return { ok: true, success: false, lines, siteId: server.siteId };
  }

  const grant = forced ? 'limited' : (vuln?.accessGranted || 'limited');
  raiseAccess(server, grant);
  if (vuln) vuln.exploited = true;
  const session = `SESSION=${(hash32(server.id+Date.now())>>>0).toString(16).toUpperCase()}-${server.siteId.slice(0,3).toUpperCase()}`;
  addArtifact(intel, {
    type: 'session', label: session, targetId: server.id, sourcePlugin: 'sim-exploit',
    data: { session, access: server.accessLevel }, confidence: 1, verified: true, tags: ['access']
  });
  lines.push({ text: `ACCESS GRANTED: ${server.accessLevel}`, type: 'green' });
  lines.push({ text: `EXTRACT >> SESSION_TOKEN = ${session}`, type: 'green' });
  lines.push({ text: `EXTRACT >> ACCESS = ${server.accessLevel}`, type: 'green' });
  bumpSuspicion(intel, server.id, 8);
  logOperation(intel, { pluginId: 'sim-exploit', targetId: server.id, summary: `ACCESS ${server.accessLevel}` });
  return { ok: true, success: true, lines, siteId: server.siteId, session, access: server.accessLevel };
}

// ───────────── USER INTEL ─────────────
export function runUserSearch(state, query) {
  const intel = ensureIntel(state);
  const q = String(query||'').trim().toLowerCase();
  if (!q) return { ok: false, lines: [{ text: 'Usage: search <username|user_id|site_id>', type: 'error' }] };

  const users = Object.values(intel.users).filter(u => {
    const server = intel.servers[u.serverId];
    // Need at least limited access OR discovered domain analysis
    const domain = intel.domains[`dom_${u.siteId}`];
    const accessOk = server && ACCESS_RANK[server.accessLevel] >= ACCESS_RANK.limited;
    const reconOk = domain?.analyzed;
    if (!accessOk && !reconOk) return false;
    return u.id.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.siteId.includes(q);
  });

  const lines = [
    { text: 'NULLBYTE // USER INTELLIGENCE', type: 'blue' },
    { text: `Query: ${q}`, type: '' },
    { text: `Matches: ${users.length}`, type: users.length ? 'green' : 'muted' }
  ];
  for (const u of users.slice(0, 8)) {
    u.discovered = true;
    const phone = Object.values(intel.devices).find(d => d.userId === u.id);
    addArtifact(intel, {
      type: 'user_record', label: u.username, targetId: u.id, sourcePlugin: 'db-reader',
      data: { username: u.username, role: u.role, siteId: u.siteId, balance: u.balance }, confidence: 0.88
    });
    lines.push({ text: `USER ${u.id}`, type: 'blue' });
    lines.push({ text: `  name=${u.username} role=${u.role} status=${u.accountStatus}`, type: '' });
    lines.push({ text: `  site=${u.siteId} balance=${u.balance} rep=${u.reputation}`, type: 'muted' });
    if (phone) {
      lines.push({ text: `  linked_device=${phone.id} (${phone.discovered?'known':'hidden'})`, type: 'muted' });
      lines.push({ text: `EXTRACT >> USER_ID = ${u.id}`, type: 'green' });
      if (phone.discovered) lines.push({ text: `EXTRACT >> PHONE_ID = ${phone.id}`, type: 'green' });
      else lines.push({ text: `HINT: device linked but not identified — mobile tools`, type: 'muted' });
    } else {
      lines.push({ text: `EXTRACT >> USER_ID = ${u.id}`, type: 'green' });
    }
  }
  if (!users.length) lines.push({ text: 'No visible users. Need recon and/or server access ≥ limited.', type: 'muted' });
  logOperation(intel, { pluginId: 'db-reader', targetId: q, summary: `USER_SEARCH ${q}` });
  return { ok: true, lines, count: users.length };
}

// ───────────── MOBILE ─────────────
export function runMobileIdentify(state, ref) {
  const intel = ensureIntel(state);
  let phone = intel.devices[ref];
  if (!phone) {
    const user = intel.users[ref] || Object.values(intel.users).find(u => u.username === ref);
    if (user) phone = Object.values(intel.devices).find(d => d.userId === user.id);
  }
  if (!phone) {
    // try site
    phone = Object.values(intel.devices).find(d => d.siteId === ref);
  }
  if (!phone) return { ok: false, lines: [{ text: 'DEVICE_NOT_FOUND — нужен USER_ID с linked device.', type: 'error' }] };

  const user = intel.users[phone.userId];
  if (!user?.discovered) return { ok: false, lines: [{ text: 'USER_NOT_KNOWN — сначала user search.', type: 'error' }] };

  phone.discovered = true;
  addArtifact(intel, {
    type: 'device_id', label: phone.id, targetId: phone.id, sourcePlugin: 'map-scanner',
    data: { model: phone.model, network: phone.network, userId: phone.userId }, confidence: 0.9
  });
  const lines = [
    { text: 'NULLBYTE // MOBILE IDENTIFY', type: 'blue' },
    { text: `Device: ${phone.id}`, type: '' },
    { text: `Model: ${phone.model}`, type: '' },
    { text: `Network: ${phone.network} · Region: ${phone.region}`, type: '' },
    { text: `Owner user: ${user.username} (${user.id})`, type: '' },
    { text: `EXTRACT >> PHONE_ID = ${phone.id}`, type: 'green' },
    { text: `EXTRACT >> NETWORK = ${phone.network}`, type: 'green' }
  ];
  logOperation(intel, { pluginId: 'mobile-id', targetId: phone.id, summary: `PHONE ${phone.id}` });
  return { ok: true, lines, phoneId: phone.id };
}

export function runMobileAnalysis(state, phoneId) {
  const intel = ensureIntel(state);
  const phone = intel.devices[phoneId];
  if (!phone?.discovered) return { ok: false, lines: [{ text: 'PHONE_UNKNOWN — identify device first.', type: 'error' }] };

  phone.analyzed = true;
  if (!phone.contacts.length) {
    phone.contacts = [
      { name: 'Mira Voss', id: 'c_mira' },
      { name: 'GridWorks', id: 'c_grid' },
      { name: 'Unknown', id: 'c_x' }
    ];
    phone.messages = [
      { from: 'GridWorks', body: 'Ticket GW-11 closed in sim.' },
      { from: 'Mira Voss', body: 'Нужна накладная VM-204.' }
    ];
  }
  addArtifact(intel, {
    type: 'device_profile', label: phone.id, targetId: phone.id, sourcePlugin: 'mobile-analysis',
    data: { apps: phone.apps, contacts: phone.contacts.length, messages: phone.messages.length }, confidence: 0.92
  });
  writeIntelFile(state, `${phone.id}.deviceinfo`, JSON.stringify({ id: phone.id, model: phone.model, network: phone.network, apps: phone.apps }, null, 2), 'deviceinfo');

  const lines = [
    { text: 'NULLBYTE // MOBILE FORENSICS', type: 'blue' },
    { text: `Device: ${phone.id} · ${phone.model}`, type: '' },
    { text: `IMEI(sim): ${phone.imei}`, type: 'muted' },
    { text: `Apps: ${phone.apps.join(', ')}`, type: '' },
    { text: `Contacts: ${phone.contacts.length} · Messages: ${phone.messages.length}`, type: '' },
    { text: `Access: ${phone.accessLevel}`, type: '' },
    { text: `File: /home/operator/reports/${phone.id}.deviceinfo`, type: 'muted' },
    { text: `EXTRACT >> PHONE_ID = ${phone.id}`, type: 'green' }
  ];
  for (const m of phone.messages.slice(0, 3)) lines.push({ text: `  msg <${m.from}> ${m.body}`, type: 'muted' });
  logOperation(intel, { pluginId: 'mobile-analysis', targetId: phone.id, summary: `FORENSICS ${phone.id}` });
  return { ok: true, lines, phoneId: phone.id };
}

// ───────────── DATA MODIFY ─────────────
export function modifyVirtualUser(state, userId, field, value) {
  const intel = ensureIntel(state);
  const user = intel.users[userId];
  if (!user) return { ok: false, lines: [{ text: 'USER_NOT_FOUND', type: 'error' }] };
  const server = intel.servers[user.serverId];
  if (!server || ACCESS_RANK[server.accessLevel] < ACCESS_RANK.user) {
    return { ok: false, lines: [{ text: 'INSUFFICIENT_ACCESS — need access ≥ user', type: 'error' }] };
  }
  const allowed = ['balance','reputation','accountStatus'];
  if (!allowed.includes(field)) return { ok: false, lines: [{ text: `FIELD_DENIED — allowed: ${allowed.join(', ')}`, type: 'error' }] };

  const prev = user[field];
  if (field === 'balance' || field === 'reputation') user[field] = Number(value);
  else user[field] = String(value).slice(0, 40);

  server.logs.push({ at: Date.now(), event: 'record_modify', userId, field, prev, next: user[field] });
  bumpSuspicion(intel, server.id, 12);
  addArtifact(intel, {
    type: 'modification', label: `${userId}.${field}`, targetId: userId, sourcePlugin: 'site-editor',
    data: { field, prev, next: user[field] }, confidence: 1, verified: true
  });
  const lines = [
    { text: 'NULLBYTE // VIRTUAL RECORD MODIFY', type: 'blue' },
    { text: `User: ${user.username} (${user.id})`, type: '' },
    { text: `${field}: ${prev} → ${user[field]}`, type: 'green' },
    { text: `Logged on ${server.hostname} · suspicion ${intel.suspicion[server.id]}%`, type: 'muted' }
  ];
  logOperation(intel, { pluginId: 'site-editor', targetId: userId, summary: `MODIFY ${field}` });
  return { ok: true, lines, user };
}

export function runDbExport(state, siteId) {
  const intel = ensureIntel(state);
  const server = intel.servers[`srv_${siteId}`];
  if (!server) return { ok: false, lines: [{ text: 'NO_SERVER', type: 'error' }] };
  if (ACCESS_RANK[server.accessLevel] < ACCESS_RANK.limited) {
    return { ok: false, lines: [{ text: 'INSUFFICIENT_ACCESS', type: 'error' }] };
  }
  const users = Object.values(intel.users).filter(u => u.siteId === siteId);
  users.forEach(u => { u.discovered = true; });
  const content = users.map(u => `${u.id}\t${u.username}\t${u.role}\t${u.balance}`).join('\n');
  writeIntelFile(state, `${siteId}_users.dat`, content, 'dataset');
  const lines = [
    { text: 'NULLBYTE // DB READ / EXPORT', type: 'blue' },
    { text: `Server: ${server.hostname} · access ${server.accessLevel}`, type: '' },
    { text: `Rows: ${users.length}`, type: 'green' },
    { text: `File: /home/operator/reports/${siteId}_users.dat`, type: 'muted' }
  ];
  for (const u of users.slice(0, 5)) lines.push({ text: `  ${u.username} · ${u.role} · ${u.balance}`, type: '' });
  logOperation(intel, { pluginId: 'db-reader', targetId: server.id, summary: `DB_EXPORT ${siteId}` });
  return { ok: true, lines, siteId };
}

export { ACCESS_RANK };
