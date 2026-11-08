"use strict";
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hx4 = n => '0x' + (n >>> 0).toString(16).padStart(4, '0');
const h2 = n => n.toString(16).padStart(2, '0');
const macB = s => s.split(':').map(x => parseInt(x, 16));
const ipB = s => s.split('.').map(Number);
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function cksum16(b){ let s = 0; for (let i = 0; i < b.length; i += 2) s += (b[i] << 8) | (b[i + 1] || 0); while (s >>> 16) s = (s & 0xffff) + (s >>> 16); return (~s) & 0xffff; }
const PN = {tcp:6, udp:17, icmp:1};
const ICMPN = {0:'Echo reply', 3:'Destination unreachable', 8:'Echo request', 11:'Time exceeded'};
const LAYERS = {host:['L2','L3','L4','L7'], pod:['L2','L3','L4','L7'], server:['L2','L3','L4','L7'], router:['L2','L3'], switch:['L2'], nat:['L3','L4'], lb:['L3','L4','L7'], tunnel:['L2','L3'], proxy:['L3','L4','L7']};
function flagsStr(f){ return [[1,'FIN'],[2,'SYN'],[4,'RST'],[8,'PSH'],[16,'ACK']].filter(x => f & x[0]).map(x => x[1]).join(',') || 'none'; }
const t = k => (I18N[app.lang] && I18N[app.lang][k]) || I18N.en[k] || k;

/* ================= application state ================= */
const app = {j:'web', f:'none', s:0, t:0, speed:1, layer:'all', view:'map', itab:'passport', zoom:'fit', lang:'en', theme:'dark', playing:false, sel:null, page:'journey', prog:{}};
const CACHE = new Map();
const SCN = () => SC[app.j];
const FLT = () => SCN().faults.find(f => f.id === app.f) || null;

function geom(){
  const S = SCN(), f = FLT(), N = S.nodes.length - 1, F = f ? f.at : N;
  const kind = !f ? 'normal' : f.type === 'ttl' ? 'icmp' : f.type === 'l7' ? 'normal' : null;
  return {S, f, N, F, R:F, kind, count: kind ? 2 * (F + 1) : F + 1};
}
const stepInfo = (s, g) => s <= g.F ? {dir:'f', j:s} : {dir:'r', j:2 * g.F + 1 - s};
function nodePos(s, g){ return s <= g.F ? s : 2 * g.F + 1 - s; }

/* ================= packet states ================= */
function ttlNeeded(S, at){ let c = 0; for (let k = 1; k <= at; k++){ const n = S.nodes[k]; if (n.reset) c = 0; else if (n.router) c += (n.dec || 1); } return c; }
function ttlFwd(S, f, i){
  let t0 = f && f.type === 'ttl' ? ttlNeeded(S, f.at) : S.ttl;
  for (let k = 1; k <= i; k++){ const n = S.nodes[k]; if (n.reset) t0 = S.ttl; else if (n.router) t0 -= (n.dec || 1); }
  return Math.max(0, t0);
}
function ttlRet(S, R, j){ let t0 = 64; for (let k = R - 1; k >= j; k--){ const n = S.nodes[k]; if (n.reset) t0 = 64; else if (n.router) t0 -= (n.dec || 1); } return Math.max(0, t0); }
function fwdState(S, f, i){
  const st = Object.assign({}, S.base);
  for (let k = 0; k <= i; k++) Object.assign(st, S.nodes[k].set || {});
  st.ttl = ttlFwd(S, f, i); st.rev = false;
  return st;
}
function swapOuter(o){ const m = o.match(/^(\S+) → (\S+)(.*)$/); return m ? `${m[2]} → ${m[1]}${m[3]}` : o; }
function retState(S, f, g, j){
  const link = fwdState(S, f, Math.max(0, j - 1));
  const st = Object.assign({}, link);
  st.ethSrc = link.ethDst; st.ethDst = link.ethSrc; st.ipSrc = link.ipDst; st.ipDst = link.ipSrc;
  st.sport = link.dport; st.dport = link.sport;
  if (link.outer) st.outer = swapOuter(link.outer);
  if (g.kind === 'icmp'){
    const lp = buildPacket(link);
    Object.assign(st, {proto:'icmp', type:11, code:0, id:0, seq:0, payload:lp.bytes.slice(14, 42), payName:'Quoted original packet'});
    st.ipSrc = S.nodes[g.R].addr;
    delete st.sport; delete st.dport; delete st.flags;
  } else Object.assign(st, S.reply || {});
  st.ttl = ttlRet(S, g.R, j); st.rev = true;
  return st;
}

/* ================= real packet bytes with real checksums ================= */
function buildPacket(st){
  const proto = st.proto, pay = st.payload || [];
  const eth = [...macB(st.ethDst), ...macB(st.ethSrc), 0x08, 0x00];
  const src = ipB(st.ipSrc), dst = ipB(st.ipDst);
  let l4;
  if (proto === 'tcp') l4 = [st.sport >> 8, st.sport & 255, st.dport >> 8, st.dport & 255, ...u32(st.seq), ...u32(st.ack), 0x50, st.flags, 0xfa, 0xf0, 0, 0, 0, 0];
  else if (proto === 'udp'){ const len = 8 + pay.length; l4 = [st.sport >> 8, st.sport & 255, st.dport >> 8, st.dport & 255, len >> 8, len & 255, 0, 0]; }
  else l4 = [st.type, st.code || 0, 0, 0, (st.id || 0) >> 8, (st.id || 0) & 255, (st.seq || 0) >> 8, (st.seq || 0) & 255];
  const total = 20 + l4.length + pay.length;
  const ip = [0x45, 0, total >> 8, total & 255, 0x1c, 0x46, 0x40, 0x00, st.ttl, PN[proto], 0, 0, ...src, ...dst];
  const ic = cksum16(ip); ip[10] = ic >> 8; ip[11] = ic & 255;
  const l4len = l4.length + pay.length;
  const pseudo = [...src, ...dst, 0, PN[proto], l4len >> 8, l4len & 255];
  let ck;
  if (proto === 'tcp'){ ck = cksum16([...pseudo, ...l4, ...pay]); l4[16] = ck >> 8; l4[17] = ck & 255; }
  else if (proto === 'udp'){ ck = cksum16([...pseudo, ...l4, ...pay]) || 0xffff; l4[6] = ck >> 8; l4[7] = ck & 255; }
  else { ck = cksum16([...l4, ...pay]); l4[2] = ck >> 8; l4[3] = ck & 255; }
  const bytes = [...eth, ...ip, ...l4, ...pay];
  const l4n = proto === 'tcp' ? 'TCP' : proto === 'udp' ? 'UDP' : 'ICMP';
  const regions = [{n:'Ethernet II', s:0, e:14, c:'eth', L:'L2'}, {n:'IPv4', s:14, e:34, c:'ip', L:'L3'}, {n:l4n, s:34, e:34 + l4.length, c:'l4', L:'L4'}];
  if (pay.length) regions.push({n:st.payName || 'Data', s:34 + l4.length, e:bytes.length, c:'pay', L:'L7'});
  const rng = {ethDst:[0,6], ethSrc:[6,12], ipSrc:[26,30], ipDst:[30,34], ttl:[22,23], ipCk:[24,26]};
  const v = {ethDst:st.ethDst, ethSrc:st.ethSrc, ipSrc:st.ipSrc, ipDst:st.ipDst, ttl:String(st.ttl), ipCk:hx4(ic), outer:st.outer || ''};
  if (proto === 'tcp'){ Object.assign(rng, {sport:[34,36], dport:[36,38], flags:[47,48], tcpCk:[50,52]}); Object.assign(v, {sport:String(st.sport), dport:String(st.dport), flags:flagsStr(st.flags), tcpCk:hx4(ck)}); }
  else if (proto === 'udp'){ Object.assign(rng, {sport:[34,36], dport:[36,38], udpCk:[40,42]}); Object.assign(v, {sport:String(st.sport), dport:String(st.dport), udpCk:hx4(ck)}); }
  else { Object.assign(rng, {icmpType:[34,35], icmpCk:[36,38], icmpId:[38,40]}); Object.assign(v, {icmpType:`${st.type} (${ICMPN[st.type] || '?'})`, icmpId:hx4(st.id || 0), icmpCk:hx4(ck)}); }
  return {bytes, regions, rng, v, ipLen:total, ipCk:ic, l4Ck:ck};
}

function view(s){
  const g = geom(), key = app.j + '|' + app.f + '|' + s;
  if (CACHE.has(key)) return CACHE.get(key);
  const info = stepInfo(s, g);
  const st = info.dir === 'f' ? fwdState(g.S, g.f, info.j) : retState(g.S, g.f, g, info.j);
  const o = {s, info, st, pk:buildPacket(st), g};
  CACHE.set(key, o); return o;
}

function groupsFor(proto){
  const gr = [{k:'eth', n:'Ethernet II', L:'L2', f:['ethDst','ethSrc']}, {k:'ip', n:'IPv4', L:'L3', f:['ipSrc','ipDst','ttl','ipCk']}];
  if (proto === 'tcp') gr.push({k:'l4', n:'TCP', L:'L4', f:['sport','dport','flags','tcpCk']});
  else if (proto === 'udp') gr.push({k:'l4', n:'UDP', L:'L4', f:['sport','dport','udpCk']});
  else gr.push({k:'l4', n:'ICMP', L:'L4', f:['icmpType','icmpId','icmpCk']});
  return gr;
}

/* ================= text for tables, tags and narration ================= */
function whatText(o){
  const S = o.g.S, st = o.st, d = o.info.dir === 'f' ? 'f' : 'r';
  if (st.proto === 'icmp' && st.type === 11) return 'ICMP Time exceeded (TTL expired in transit)';
  if (st.proto === 'tcp') return `${st.sport} → ${st.dport} [${flagsStr(st.flags)}]`;
  if (st.proto === 'udp') return (S.msg && S.msg[d]) || 'UDP datagram';
  return `${(S.msg && S.msg[d]) || ICMPN[st.type]} id=${hx4(st.id || 0)} seq=${st.seq || 0}`;
}
function protoName(st){ return st.proto === 'tcp' ? 'TCP' : st.proto === 'udp' ? ((st.dport === 53 || st.sport === 53) ? 'DNS' : 'UDP') : 'ICMP'; }
function changes(a, b){
  const out = [];
  [['ipSrc','src IP'], ['ipDst','dst IP'], ['sport','src port'], ['dport','dst port'], ['icmpId','id']].forEach(([k, l]) => {
    if (a.pk.v[k] !== undefined && b.pk.v[k] !== undefined && a.pk.v[k] !== b.pk.v[k]) out.push(`${l} ${a.pk.v[k]} → ${b.pk.v[k]}`);
  });
  if (a.pk.v.outer !== b.pk.v.outer) out.push(b.pk.v.outer ? 'tunnel headers added' : 'tunnel headers removed');
  return out;
}
function infoText(s){
  const o = view(s); if (s === 0) return 'Packet created: ' + whatText(o);
  const p = view(s - 1);
  if (o.info.dir === 'r' && p.info.dir === 'f') return (o.g.kind === 'icmp' ? 'Generated here: ' : 'Reply: ') + whatText(o);
  const ch = changes(p, o);
  const ttlC = p.pk.v.ttl !== o.pk.v.ttl, macC = p.pk.v.ethDst !== o.pk.v.ethDst;
  if (ttlC) ch.push(`TTL ${p.pk.v.ttl} → ${o.pk.v.ttl}`);
  if (!ch.length) return macC ? 'forwarded: new MAC pair' : (o.info.dir === 'r' ? 'delivered to the sender' : 'delivered');
  if (macC) ch.push('MACs rewritten');
  return ch.join('; ');
}
function tagText(s){
  if (s === 0) return null;
  const o = view(s), p = view(s - 1);
  if (o.info.dir === 'r' && p.info.dir === 'f') return null;
  const ch = changes(p, o).slice(0, 2);
  if (!ch.length && p.pk.v.ttl !== o.pk.v.ttl) ch.push(`TTL ${p.pk.v.ttl} → ${o.pk.v.ttl}`);
  return ch.length ? ch : null;
}
function defaultRet(o){
  const nd = o.g.S.nodes[o.info.j], g = o.g, first = o.s === g.F + 1;
  if (first){
    if (g.kind === 'icmp') return 'The TTL reached 0 here, so this router drops the packet and originates an ICMP Time Exceeded message addressed to the original sender, quoting the start of the packet that died.';
    if (g.f && g.f.type === 'l7') return 'The gateway rejects the request and sends the error response back along the same connections. The packets are fine; the decision was made at layer 7.';
    return 'The server answers with the mirror image of the request: source and destination swapped, and a fresh TTL.';
  }
  if (o.info.j === 0) return 'The reply arrives. Its addresses match the original request, so the application never sees any of the translations that happened on the way.';
  if (nd.type === 'nat' || nd.type === 'lb') return 'Reverse translation: the stored entry maps the reply back, so the sender sees the address it originally used.';
  if (nd.type === 'proxy') return 'Relays the response on the client-side connection, adding or removing headers on the way (see the L7 tab).';
  if (nd.type === 'tunnel') return 'Re-wraps or unwraps the tunnel headers for the return trip.';
  if (nd.type === 'router' || nd.type === 'switch') return 'Forwards the reply toward the source: TTL minus one, a new MAC pair and a recomputed checksum.';
  return 'Passes the reply along.';
}
function narration(s){ const o = view(s), nd = o.g.S.nodes[o.info.j]; return o.info.dir === 'f' ? nd.does : (nd.rdoes || defaultRet(o)); }

/* ================= layer 7 ================= */
function foldL7(list, ops){
  let out = list.map(x => [x[0], x[1]]); if (!ops) return out;
  (ops.del || []).forEach(k => { out = out.filter(x => x[0] !== k); });
  Object.entries(ops.mod || {}).forEach(([k, v]) => out.forEach(x => { if (x[0] === k) x[1] = v; }));
  (ops.add || []).forEach(a => out.push([a[0], a[1]]));
  return out;
}
function l7Of(s){
  const o = view(s), S = o.g.S, g = o.g;
  if (o.info.dir === 'f'){
    if (!S.l7) return null;
    let l = S.l7.hdr; for (let k = 0; k <= o.info.j; k++) l = foldL7(l, S.nodes[k].l7ops);
    return {title:S.l7.title, note:S.l7.note, rows:l, dir:'f'};
  }
  if (g.kind === 'icmp') return {none:'icmp'};
  const base = g.f && g.f.type === 'l7' ? g.f.resp : S.l7r; if (!base) return null;
  let l = base.hdr; for (let k = g.R - 1; k >= o.info.j; k--) l = foldL7(l, S.nodes[k].l7rops);
  return {title:base.title, rows:l, dir:'r'};
}
function l7Diff(s){
  const cur = l7Of(s); if (!cur || !cur.rows) return cur;
  const prev = s > 0 ? l7Of(s - 1) : null;
  const pr = prev && prev.rows && prev.dir === cur.dir ? prev.rows : null;
  const rows = cur.rows.map(([k, v]) => { const m = pr && pr.find(x => x[0] === k); return {k, v, st:!pr ? '' : !m ? 'new' : m[1] !== v ? 'chg' : '', old:m && m[1] !== v ? m[1] : null}; });
  if (pr) pr.forEach(([k, v]) => { if (!cur.rows.find(x => x[0] === k)) rows.push({k, v, st:'del'}); });
  return Object.assign({}, cur, {rows});
}

/* ================= how it was computed (auto + authored) ================= */
function cksumBlock(o, p){
  const b = o.pk.bytes.slice(14, 34); b[10] = 0; b[11] = 0;
  const words = []; for (let i = 0; i < 20; i += 2) words.push((b[i] << 8) | b[i + 1]);
  const sum = words.reduce((a, c) => a + c, 0); let fold = sum; while (fold >>> 16) fold = (fold & 0xffff) + (fold >>> 16);
  const res = (~fold) & 0xffff;
  const changed = p && p.pk.ipCk !== o.pk.ipCk;
  return {t:changed ? 'IP header checksum (recomputed)' : 'IP header checksum', d:['rfc1071'],
    c:`words (checksum field = 0000):\n${words.map(w => w.toString(16).padStart(4, '0')).join(' ')}\nsum   = 0x${sum.toString(16)}\nfold  = 0x${fold.toString(16).padStart(4, '0')}   (carry added back in)\n~fold = ${hx4(res)}   ← written into the header${res === o.pk.ipCk ? '' : '  (MISMATCH)'}`};
}
function howBlocks(s){
  const o = view(s), nd = o.g.S.nodes[o.info.j], p = s > 0 ? view(s - 1) : null, out = [];
  if (o.info.dir === 'f'){
    (nd.how || []).forEach(b => out.push(b));
    if (nd.nat){ const n = nd.nat; out.push({t:(n.mode === 'dst' ? 'Destination' : 'Source') + ' NAT entry', c:`${n.mode === 'dst' ? 'DNAT' : 'SNAT'}: ${n.a}  →  ${n.b}\nstored so the reply can be translated back`, d:(nd.docs || []).slice(0, 1)}); }
  } else if (nd.nat){
    const n = nd.nat;
    out.push({t:'Reverse translation', c:n.mode === 'dst' ? `reply src ${n.b}\nlookup → entry found\nrewrite src to ${n.a}` : `reply dst ${n.b}\nlookup → entry found\nrewrite dst to ${n.a}`});
  }
  if (p && p.info.dir === o.info.dir && Number(o.pk.v.ttl) === Number(p.pk.v.ttl) - 1)
    out.push({t:'TTL decrement', c:`TTL out = TTL in − 1 = ${p.pk.v.ttl} − 1 = ${o.pk.v.ttl}\nat 0 the router drops the packet and sends ICMP Time Exceeded`, d:['rfc791', 'rfc792']});
  out.push(cksumBlock(o, p && p.info.dir === o.info.dir ? p : null));
  const k4 = o.st.proto === 'tcp' ? 'tcpCk' : o.st.proto === 'udp' ? 'udpCk' : 'icmpCk';
  if (p && p.pk.v[k4] !== undefined && p.pk.v[k4] !== o.pk.v[k4])
    out.push({t:o.st.proto.toUpperCase() + ' checksum (recomputed)', d:o.st.proto === 'icmp' ? ['rfc792'] : [o.st.proto === 'tcp' ? 'rfc9293' : 'rfc768'], c:o.st.proto === 'icmp' ? `ones-complement sum over the ICMP message\nresult ${o.pk.v[k4]}` : `ones-complement sum over:\n  pseudo-header (src ${o.st.ipSrc}, dst ${o.st.ipDst}, proto ${PN[o.st.proto]}, length ${o.pk.bytes.length - 34})\n  ${o.st.proto.toUpperCase()} header + payload\nresult ${o.pk.v[k4]}`});
  return out;
}
function docsFor(s){
  const o = view(s), nd = o.g.S.nodes[o.info.j], ids = [...(nd.docs || [])];
  if (o.g.f && s >= o.g.F) ids.push(...(o.g.f.d || []));
  ids.push(...(o.g.S.docs || []));
  groupsFor(o.st.proto).forEach(gr => gr.f.forEach(k => ids.push(...((FINFO[k] || {}).d || []))));
  return [...new Set(ids)].filter(id => DOCS[id]);
}
const docChip = id => { const d = DOCS[id]; return d ? `<a class="doc ${d.k === 'Vendor' ? 'v' : d.k === 'Tool' ? 't' : ''}" href="${d.u}" target="_blank" rel="noopener" title="${esc(d.s || d.k)}"><em>${d.k === 'Standard' ? 'RFC' : d.k}</em>${esc(d.l.replace(/^RFC \d+ · /, ''))} ↗</a>` : ''; };

/* ================= progress (localStorage, optional) ================= */
function loadProg(){ try{ app.prog = JSON.parse(localStorage.getItem('hbh-progress') || '{}') || {}; }catch(_){ app.prog = {}; } }
function saveProg(){ try{ localStorage.setItem('hbh-progress', JSON.stringify(app.prog)); }catch(_){} }
function markProg(){
  const g = geom(), p = app.prog[app.j] || {max:0, done:false};
  p.max = Math.max(p.max, app.s);
  if (!g.f && app.s >= g.count - 1) p.done = true;
  app.prog[app.j] = p; saveProg();
}
