"use strict";
/* ================= fx2.js: atmosphere, world view, device card, bloom, layer timeline, what-if, story ================= */

/* ---------- zone atmosphere ---------- */
function rng(seed){ let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function atmKind(n){
  if (/home|office|lan\b|vlan|cafe|coffee|customer|campus|private network/i.test(n)) return 'home';
  if (/node|rack|datacenter|datacentre|compute|server|origin|services|pod\b|kernel|linux/i.test(n)) return 'dc';
  if (/vpc|cloud|aws|azure|gcp|google|region|subnet|vnet|tenant|cluster|kubernetes|mesh|managed/i.test(n)) return 'cloud';
  return 'net';
}
function atmosphere(zg, z, zi){
  const kind = atmKind(z.name), r = rng(zi + 3), g = SV('g', {class:'atm atm-' + kind}, zg);
  const pt = () => Pj(z.x0 + 12 + r() * Math.max(8, z.x1 - z.x0 - 24), z.y0 + 12 + r() * Math.max(8, z.y1 - z.y0 - 24), -5);
  if (kind === 'net'){ for (let i = 0; i < 9; i++){ const [x, y] = pt(); SV('circle', {cx:x, cy:y, r:(1.5 + r() * 1.5).toFixed(1), class:'ad', style:`animation-delay:${(r() * 7).toFixed(2)}s;animation-duration:${(5 + r() * 5).toFixed(1)}s`}, g); } }
  else if (kind === 'cloud'){ for (let i = 0; i < 3; i++){ const [x, y] = pt(); SV('ellipse', {cx:x, cy:y, rx:12, ry:6.9, class:'ar', style:`animation-delay:${(i * 1.4).toFixed(1)}s`}, g); } }
  else if (kind === 'dc'){ const n = 12; for (let i = 0; i < n; i++){ const [x, y] = Pj(z.x0 + 14 + i * ((z.x1 - z.x0 - 28) / (n - 1)), z.y0 + 9, -5); SV('rect', {x:x - 1.5, y:y - 1.5, width:3, height:3, rx:0.6, class:'al', style:`animation-delay:${(r() * 3).toFixed(2)}s`}, g); } }
  else { const [cx, cy] = Pj((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, -5), rx = ((z.x1 - z.x0) + (z.y1 - z.y0)) * K * 0.38; SV('ellipse', {cx, cy, rx, ry:rx * 0.5, class:'ah'}, g); }
}

/* ---------- celebration without confetti ---------- */
function bloom(k, big){
  const fx = $('#fx'); if (!fx || !scene) return; const [x, y] = scene.scr[k], g = SV('g', {class:'bloom' + (big ? ' big' : '')}, fx);
  [0, 0.25, 0.5].forEach(d => SV('ellipse', {cx:x, cy:y - 2, rx:36, ry:20.5, class:'blr', style:`animation-delay:${d}s`}, g));
  const c = SV('g', {transform:`translate(${x},${y - PZ - 56})`, class:'blc'}, g); SV('circle', {r:12, class:'blb'}, c); SV('path', {d:'M-5.5 0.5 L-1.5 4.5 L6 -4', class:'blk'}, c);
  const p = $('.prog'); if (p){ p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); }
}

/* ---------- device "open up" card ---------- */
let devT = null, devK = -1;
function devCardHtml(k){
  const g = geom(), nd = g.S.nodes[k], x = (nd.x || [])[0], f = g.f; let body = '';
  if (x && x.kind === 'table'){
    const hit = (x.hitF && f && x.hitF[f.id]) || x.hit || [];
    body = `<div class="dt">${esc(x.title)}</div><table>${x.rows.slice(0, 5).map((r, i) => `<tr class="${hit.includes(i) ? 'hit' : ''}">${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  } else if (x && x.kind === 'flow'){
    body = `<div class="dt">${esc(x.title)}</div><div class="dfl">${x.items.map((it, i) => `<span class="${(x.hit || []).includes(i) ? 'hit' : ''}">${esc(it)}</span>`).join('<i>→</i>')}</div>`;
  } else body = `<p>${esc(nd.does.length > 170 ? nd.does.slice(0, 167) + '…' : nd.does)}</p>`;
  return `<div class="dh"><b>${esc(nd.name)}</b><span>${esc(nd.tag)}</span></div>${body}<div class="dk">Click to jump here</div>`;
}
function devShow(k, ng){
  const c = $('#devcard'), w = $('.stagewrap'); if (!c || !w || app.view !== 'map') return;
  devK = k; c.innerHTML = devCardHtml(k); ng.classList.add('lift');
  const r = ng.getBoundingClientRect(), s = w.getBoundingClientRect(), cw = 270;
  let left = r.left - s.left + r.width / 2 - cw / 2; left = Math.max(8, Math.min(s.width - cw - 8, left));
  const above = r.top - s.top > 190; c.style.left = left + 'px'; c.style.top = (above ? r.top - s.top - 8 : r.bottom - s.top + 8) + 'px'; c.style.width = cw + 'px';
  c.classList.toggle('below', !above); c.classList.add('on');
}
function devHide(){ clearTimeout(devT); const c = $('#devcard'); if (c) c.classList.remove('on'); $$('#map .node.lift').forEach(n => n.classList.remove('lift')); devK = -1; }
function bindDev(){
  const m = $('#map'); if (!m) return;
  m.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const ng = e.target.closest('.node'); if (!ng) return; const k = +ng.id.slice(2); if (k === devK) { clearTimeout(devT); return; } clearTimeout(devT); devT = setTimeout(() => devShow(k, ng), 140); });
  m.addEventListener('pointerout', e => { const ng = e.target.closest('.node'); if (!ng || (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#nd' + ng.id.slice(2)))) return; clearTimeout(devT); devT = setTimeout(devHide, 90); });
  m.addEventListener('focusin', e => { const ng = e.target.closest && e.target.closest('.node'); if (ng) devShow(+ng.id.slice(2), ng); });
  m.addEventListener('focusout', devHide);
}

/* ---------- world view: day and night ---------- */
const GEO = {base:null, pts:null, nodes:null, off:null};
const rad = d => d * Math.PI / 180;
function sunPos(d){
  const n = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5, decl = rad(-23.44 * Math.cos(2 * Math.PI / 365 * (n + 10))), B = 2 * Math.PI * (n - 81) / 365;
  const eqt = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B), utc = d.getUTCHours() + d.getUTCMinutes() / 60; let lon = -15 * (utc - 12 + eqt / 60); lon = ((lon + 540) % 360) - 180;
  return {decl, lon};
}
const geoDate = () => { const d = new Date(); if (GEO.off != null){ d.setUTCHours(0, 0, 0, 0); d.setTime(d.getTime() + GEO.off * 60000); } return d; };
function geoMask(){ if (GEO.mask) return GEO.mask; const bin = atob(GEOMASK.b64), bits = []; for (let i = 0; i < bin.length; i++){ const b = bin.charCodeAt(i); for (let j = 7; j >= 0; j--) bits.push((b >> j) & 1); } return (GEO.mask = bits); }
const geoEl = (lat, lon, sp) => Math.sin(rad(lat)) * Math.sin(sp.decl) + Math.cos(rad(lat)) * Math.cos(sp.decl) * Math.cos(rad(lon - sp.lon));
function geoBase(){
  const W = GEOMASK.W, H = GEOMASK.H, cw = 8, ch = 7, mask = geoMask(), cv = GEO.base || (GEO.base = document.createElement('canvas')); cv.width = W * cw; cv.height = H * ch;
  const c = cv.getContext('2d'), cs = getComputedStyle(document.documentElement), dayC = cs.getPropertyValue('--chg').trim() || '#6cc3e6', dimC = cs.getPropertyValue('--dim').trim() || '#8f9bba', light = app.theme === 'light', sp = sunPos(geoDate());
  GEO.sp = sp;
  for (let r = 0; r < H; r++){
    const lat = GEOMASK.LAT0 - (r + 0.5) * (GEOMASK.LAT0 - GEOMASK.LAT1) / H;
    for (let q = 0; q < W; q++){
      const lon = -180 + (q + 0.5) * 360 / W, el = geoEl(lat, lon, sp), night = el < 0, land = mask[r * W + q];
      if (night){ c.fillStyle = light ? 'rgba(40,60,120,.16)' : 'rgba(0,0,10,.32)'; c.fillRect(q * cw, r * ch, cw, ch); }
      else if (el < 0.12){ c.fillStyle = light ? 'rgba(255,160,60,.10)' : 'rgba(255,170,70,.07)'; c.fillRect(q * cw, r * ch, cw, ch); }
      if (land){ c.globalAlpha = night ? 0.55 : 1; c.fillStyle = night ? dimC : dayC; c.beginPath(); c.arc(q * cw + cw / 2, r * ch + ch / 2, 2.2, 0, 6.3); c.fill(); c.globalAlpha = 1; }
    }
  }
  GEO.stamp = Date.now();
}
function geoSetup(){
  const S = SCN(), box = $('#secGeo'); if (!box) return; const n = S.nodes.length, pts = new Array(n).fill(null);
  S.nodes.forEach((nd, i) => { if (nd.geo) pts[i] = nd.geo; });
  const known = pts.map((p, i) => p ? i : -1).filter(i => i >= 0);
  if (known.length < 2){ box.hidden = true; GEO.pts = null; return; }
  for (let i = 0; i < n; i++){ if (pts[i]) continue; const a = known.filter(k => k < i).pop(), b = known.find(k => k > i); if (a == null) pts[i] = pts[b]; else if (b == null) pts[i] = pts[a]; else { const f = (i - a) / (b - a); pts[i] = [pts[a][0] + (pts[b][0] - pts[a][0]) * f, pts[a][1] + (pts[b][1] - pts[a][1]) * f]; } }
  GEO.pts = pts; GEO.known = known; box.hidden = false; GEO.base = null;
}
function geoU(t, g){ const s0 = Math.max(0, Math.min(g.count - 1, Math.floor(t))), s1 = Math.min(g.count - 1, s0 + 1), a = nodePos(s0, g), b = nodePos(s1, g); return a + (b - a) * Math.max(0, Math.min(1, t - s0)); }
function geoAt(u){ const P = GEO.pts, i = Math.max(0, Math.min(P.length - 1, Math.floor(u))), j = Math.min(P.length - 1, i + 1), f = u - i; return [P[i][0] + (P[j][0] - P[i][0]) * f, P[i][1] + (P[j][1] - P[i][1]) * f]; }
function geoDraw(){
  const box = $('#secGeo'), cv = $('#geoC'); if (!GEO.pts || !box || box.hidden || !box.open || !cv) return;
  if (!GEO.base || Date.now() - GEO.stamp > 300000) geoBase();
  const ctx = cv.getContext('2d'), W = GEO.base.width, H = GEO.base.height; if (cv.width !== W){ cv.width = W; cv.height = H; }
  ctx.clearRect(0, 0, W, H); ctx.drawImage(GEO.base, 0, 0);
  const P = ([la, lo]) => [(lo + 180) / 360 * W, (GEOMASK.LAT0 - la) / (GEOMASK.LAT0 - GEOMASK.LAT1) * H], g = geom(), u = geoU(app.t, g), cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--accent').trim() || '#f0b24a', ok = cs.getPropertyValue('--ok').trim() || '#5fd1a0', txt = cs.getPropertyValue('--text').trim() || '#fff';
  const pts = GEO.pts.map(P);
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = acc; ctx.globalAlpha = 0.28; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = acc; ctx.beginPath(); const fu = Math.floor(u); pts.slice(0, fu + 1).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); const cur = P(geoAt(u)); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
  GEO.known.forEach(i => { const p = pts[i]; ctx.fillStyle = txt; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 6.3); ctx.fill(); ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 6.3); ctx.fill(); });
  const ph = (performance.now() % 1400) / 1400; ctx.strokeStyle = ok; ctx.globalAlpha = 1 - ph; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cur[0], cur[1], 7 + ph * 14, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = ok; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cur[0], cur[1], 6, 0, 6.3); ctx.fill(); ctx.stroke();
  const ll = geoAt(u), d = geoDate(), local = new Date(d.getTime() + ll[1] / 15 * 3600000), hh = String(local.getUTCHours()).padStart(2, '0') + ':' + String(local.getUTCMinutes()).padStart(2, '0'), day = geoEl(ll[0], ll[1], GEO.sp) > 0;
  const nm = g.S.nodes[Math.max(0, Math.min(g.S.nodes.length - 1, Math.round(u)))].name, note = $('#geoNote'); if (note) note.textContent = `${nm} · ${hh} local · ${day ? 'daytime' : 'night'}`;
}
function bindGeo(){
  const d = $('#secGeo'); if (!d) return;
  d.addEventListener('toggle', () => { if (d.open) geoDraw(); });
  $('#geoT').addEventListener('input', e => { GEO.off = +e.target.value; GEO.base = null; $('#geoTl').textContent = String(Math.floor(GEO.off / 60)).padStart(2, '0') + ':' + String(GEO.off % 60).padStart(2, '0') + ' UTC'; geoDraw(); });
  $('#geoNow').addEventListener('click', () => { GEO.off = null; GEO.base = null; geoNowUI(); geoDraw(); });
  geoNowUI(); setInterval(() => { if (!reduced && !document.hidden && app.page === 'journey' && GEO.pts && !app.playing && raf == null) geoDraw(); }, 140);
}
function geoNowUI(){ const n = new Date(); $('#geoT').value = n.getUTCHours() * 60 + n.getUTCMinutes(); $('#geoTl').textContent = 'now'; }

/* ---------- layer timeline (swimlanes) ---------- */
const LANE_ROWS = ['L7', 'L4', 'L3', 'L2'], LANE_NAME = {L7:'Application', L4:'Transport', L3:'Network', L2:'Link'};
function laneInfo(s){
  const g = geom(), o = view(s), p = s ? view(s - 1) : null, nd = g.S.nodes[o.info.j], v = o.pk.v, pv = p && p.pk.v, ty = LAYERS[nd.type] || [], out = {L2:null, L3:null, L4:null, L7:null}, F = g.F;
  if (pv && (pv.ethSrc !== v.ethSrc || pv.ethDst !== v.ethDst)) out.L2 = {t:'new MAC pair', k:'chg'}; else if (nd.type === 'switch') out.L2 = {t:'switches frame', k:'pass'};
  if (pv && (pv.outer || '') !== (v.outer || '')) out.L2 = {t:v.outer ? 'encapsulates' : 'decapsulates', k:'tun'};
  if (pv){
    const c = []; if (pv.ttl !== v.ttl) c.push('TTL ' + pv.ttl + '→' + v.ttl); if (pv.ipSrc !== v.ipSrc) c.push('source rewritten'); if (pv.ipDst !== v.ipDst) c.push('destination rewritten');
    if (c.length) out.L3 = {t:c.join(', '), k:(pv.ipSrc !== v.ipSrc || pv.ipDst !== v.ipDst) ? 'chg' : 'pass'}; else if (ty.includes('L3') && nd.type !== 'host' && nd.type !== 'server' && nd.type !== 'pod') out.L3 = {t:'routes', k:'pass'};
    const c4 = []; if (pv.sport !== v.sport || pv.dport !== v.dport) c4.push('ports rewritten'); if (pv.flags !== v.flags && v.flags != null) c4.push(pv.flags + '→' + v.flags);
    if (c4.length) out.L4 = {t:c4.join(', '), k:'chg'}; else if (nd.type === 'nat') out.L4 = {t:'tracks the flow', k:'pass'};
  } else { out.L3 = {t:'builds IP header', k:'act'}; out.L4 = {t:'builds ' + protoName(o.st), k:'act'}; out.L2 = {t:'frames it', k:'act'}; }
  if (nd.type === 'proxy' || nd.type === 'lb'){ if (ty.includes('L7')) out.L7 = {t:'reads the request', k:'act'}; if (!out.L4) out.L4 = {t:'ends the connection', k:'act'}; }
  if ((nd.type === 'host' || nd.type === 'server' || nd.type === 'pod') && (s === 0 || s === F || s === g.count - 1)) out.L7 = {t:s === F && o.info.dir === 'f' ? 'application receives' : s === 0 ? 'application sends' : 'application gets reply', k:'act'};
  if (g.f && s === g.F) out.L3 = Object.assign({}, out.L3 || {}, {t:g.f.short, k:'bad'});
  return out;
}
let lanesKey = '';
function drawLanes(){
  const g = geom(), el = $('#lanes'), key = [app.j, app.f, app.lang].join('|');
  if (key !== lanesKey || !el.firstChild){
    lanesKey = key; let h = '<div class="lgrid" style="--n:' + g.count + '"><div class="lc lh"></div>';
    for (let s = 0; s < g.count; s++){ const o = view(s), nd = g.S.nodes[o.info.j]; h += `<button class="lc lh ${o.info.dir === 'r' ? 'r' : ''}" data-s="${s}" style="--i:${s}"><b>${s + 1}</b><span>${esc(nd.code)}</span></button>`; }
    LANE_ROWS.forEach(L => {
      h += `<div class="lc ll"><span class="lay ${L}">${L}</span><small>${LANE_NAME[L]}</small></div>`;
      for (let s = 0; s < g.count; s++){ const c = laneInfo(s)[L], o = view(s); h += c ? `<button class="lc lcell ${c.k} ${o.info.dir === 'r' ? 'r' : ''}" data-s="${s}" style="--i:${s}" title="Step ${s + 1}: ${esc(c.t)}"><span>${esc(c.t)}</span></button>` : `<div class="lc lempty ${o.info.dir === 'r' ? 'r' : ''}" data-s="${s}"></div>`; }
    });
    el.innerHTML = h + '</div>';
  }
  $$('#lanes [data-s]').forEach(e => { const s = +e.dataset.s; e.classList.toggle('cur', s === app.s); e.classList.toggle('past', s < app.s); });
  const cur = $('#lanes .lh.cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({block:'nearest', inline:'center', behavior:reduced ? 'auto' : 'smooth'});
}

/* ---------- what if ---------- */
const WI = {ttl:64, mtu:1500, size:1500, df:1, node:2, act:'drop'};
const nodeOpts = (from, sel) => SCN().nodes.map((n, k) => k >= from && k < SCN().nodes.length - 1 ? `<option value="${k}" ${k === sel ? 'selected' : ''}>${k}. ${esc(n.name)}</option>` : '').join('');
function wiTtl(T){
  const S = SCN(); let t = T; const trail = [T];
  for (let k = 1; k < S.nodes.length; k++){ const n = S.nodes[k]; if (n.reset) t = S.ttl; else if (n.router){ const d = n.dec || 1; if (t - d <= 0) return {die:k, trail}; t -= d; } trail.push(t); }
  return {die:null, left:t, trail};
}
function wiTtlHtml(){
  const S = SCN(), r = wiTtl(+WI.ttl);
  const chips = S.nodes.map((n, k) => { const v = r.trail[k]; const dead = r.die === k, gone = r.die != null && k > r.die; return `<span class="wc ${dead ? 'bad' : gone ? 'gone' : ''}"><i>${esc(n.code)}</i><b>${dead ? '✕' : gone ? '·' : v}</b></span>`; }).join('');
  const msg = r.die ? `Expires at hop ${r.die} (${esc(S.nodes[r.die].name)}). That router drops it and sends back ICMP Time Exceeded. This is exactly how traceroute finds each hop.` : `Arrives with TTL ${r.left} left. Healthy.`;
  return `<div class="wc-row">${chips}</div><p class="wo ${r.die ? 'bad' : 'ok'}">${msg}</p>${r.die ? '<button class="btn" data-wi-go="ttl">Replay this on the map</button>' : ''}`;
}
function wiMtuCalc(){
  const S = SCN(), k = Math.min(+WI.node, S.nodes.length - 2), st = fwdState(S, null, k), ov = (st.outer || '').match(/\+(\d+) B/), over = ov ? +ov[1] : 0, eff = +WI.mtu - over, size = +WI.size;
  return {k, over, eff, size, big:size > eff};
}
function wiMtuHtml(){
  const S = SCN(), c = wiMtuCalc(); let msg, cls = 'ok', go = false;
  if (!c.big) msg = `A ${c.size}-byte packet fits (effective MTU ${c.eff}${c.over ? ', after ' + c.over + ' bytes of encapsulation' : ''}). Nothing happens.`;
  else if (+WI.df){ cls = 'bad'; go = true; msg = `${c.size} bytes does not fit through ${esc(S.nodes[c.k].name)} (effective MTU ${c.eff}${c.over ? ', after ' + c.over + ' bytes of encapsulation' : ''}). With Don't Fragment set the router drops it and should send ICMP "fragmentation needed". If that ICMP is filtered, the connection hangs: a PMTUD black hole.`; }
  else { const per = Math.floor((c.eff - 20) / 8) * 8, n = Math.ceil((c.size - 20) / per); cls = 'warn'; msg = `Without DF the router fragments it into ${n} pieces. It works, but every piece must arrive, and fragments are often dropped by firewalls.`; }
  return `<label class="wl">Narrowest link MTU <b id="wiMtuV">${WI.mtu}</b><input type="range" data-wi="mtu" min="576" max="9000" step="2" value="${WI.mtu}"></label>
    <label class="wl">Packet size <b id="wiSizeV">${WI.size}</b> bytes<input type="range" data-wi="size" min="200" max="9000" step="2" value="${WI.size}"></label>
    <div class="wrow"><label>At <select data-wi="node">${nodeOpts(1, +WI.node)}</select></label><label><input type="checkbox" data-wi="df" ${+WI.df ? 'checked' : ''}> Don't Fragment</label></div>
    <p class="wo ${cls}" id="wiMtuOut">${msg}</p>${go ? '<button class="btn" data-wi-go="mtu">Replay this on the map</button>' : ''}`;
}
function wiFwHtml(){
  const S = SCN(), k = Math.min(+WI.node, S.nodes.length - 2), rtt = Math.max(1, S.nodes[k].ms * 2), tcp = S.base && S.base.proto === 'tcp';
  const drop = WI.act === 'drop' || !tcp;
  const msg = drop ? `The packet vanishes at ${esc(S.nodes[k].name)}. The sender waits and retries: ${tcp ? 'SYN again after 1 s, 3 s, 7 s, 15 s... The app sees "timed out" after about 2 minutes (or whatever its own timeout is). It looks like a network outage, and nothing tells you where.' : 'nothing ever comes back, so the app waits for its own timeout.'}`
    : `${esc(S.nodes[k].name)} answers immediately with a TCP reset. The app sees "Connection refused" after about ${rtt.toFixed(0)} ms. The failure is instant and points straight at the device that said no.`;
  return `<div class="wrow"><label>At <select data-wi="node">${nodeOpts(1, +WI.node)}</select></label>
    <label><input type="radio" name="wact" data-wi="act" value="drop" ${drop ? 'checked' : ''}> DROP (silent)</label><label class="${tcp ? '' : 'dis'}"><input type="radio" name="wact" data-wi="act" value="reject" ${!drop ? 'checked' : ''} ${tcp ? '' : 'disabled'}> REJECT (reset)</label></div>
    <p class="wo ${drop ? 'bad' : 'warn'}" id="wiFwOut">${msg}</p><button class="btn" data-wi-go="fw">Replay this on the map</button>`;
}
function drawWhatIf(){
  const S = SCN();
  return `<p class="hint">Change a number and see what would happen to this packet. Then replay it on the map.</p>
    <div class="wcard"><h4>Starting TTL <b id="wiTtlV">${WI.ttl}</b></h4><input type="range" data-wi="ttl" min="1" max="${S.ttl}" value="${Math.min(WI.ttl, S.ttl)}"><div id="wiTtl">${wiTtlHtml()}</div></div>
    <div class="wcard"><h4>Path MTU</h4><div id="wiMtu">${wiMtuHtml()}</div></div>
    <div class="wcard"><h4>A firewall says no</h4><div id="wiFw">${wiFwHtml()}</div></div>`;
}
function wiUpdate(which){
  if (which === 'ttl'){ $('#wiTtlV').textContent = WI.ttl; $('#wiTtl').innerHTML = wiTtlHtml(); }
  else if (which === 'mtu' || which === 'size' || which === 'df'){ $('#wiMtu').innerHTML = wiMtuHtml(); if (which !== 'df'){ const e = $(`[data-wi=${which}]`); if (e) e.focus(); } }
  else { $('#wiMtu').innerHTML = wiMtuHtml(); $('#wiFw').innerHTML = wiFwHtml(); }
}
function wiReplay(kind){
  const S = SCN(); let f;
  if (kind === 'ttl'){ const r = wiTtl(+WI.ttl); if (!r.die) return; f = {id:'wi', at:r.die, type:'ttl', label:'What-if: starting TTL ' + WI.ttl, short:'TTL EXPIRED', title:'TTL runs out at ' + S.nodes[r.die].name, body:`With a starting TTL of ${WI.ttl} the counter reaches zero here. The router drops the packet and returns ICMP Time Exceeded to the sender.`, user:'', d:['rfc792']}; }
  else if (kind === 'mtu'){ const c = wiMtuCalc(); if (!c.big || !+WI.df) return; f = {id:'wi', at:c.k, type:'mtu', label:'What-if: MTU ' + WI.mtu, short:'MTU', title:'A ' + c.size + '-byte packet does not fit', body:`Effective MTU after ${c.over} bytes of encapsulation is ${c.eff}. The packet is too large and Don't Fragment is set, so it is dropped.`, user:'', d:['rfc1191']}; }
  else { const k = Math.min(+WI.node, S.nodes.length - 2), tcp = S.base && S.base.proto === 'tcp', rej = WI.act === 'reject' && tcp;
    f = rej ? {id:'wi', at:k, type:'l7', label:'What-if: REJECT at ' + S.nodes[k].name, short:'RST', title:S.nodes[k].name + ' rejects the connection', resp:{title:'TCP reset (REJECT)', hdr:[['Flags', 'RST, ACK'], ['App sees', 'Connection refused, instantly']]}, rep:{flags:0x14, seq:0, ack:(S.base.seq + 1) >>> 0}, body:'A REJECT rule answers with a reset. The sender learns immediately that something said no.', user:'', d:['rfc9293']}
      : {id:'wi', at:k, type:'drop', label:'What-if: DROP at ' + S.nodes[k].name, short:'DROP', title:S.nodes[k].name + ' silently drops it', body:'A DROP rule discards the packet without telling anyone. The sender retries and eventually times out.', user:'', d:['rfc9293']}; }
  const J = SC[app.j]; J.faults = J.faults.filter(x => x.id !== 'wi').concat([f]);
  stopPlay(); app.f = 'wi'; CACHE.clear(); drawMap(); app.s = 0; app.t = 0; renderAll(false); startPlay();
}
function purgeWi(){ Object.values(SC).forEach(j => { if (j.faults.some(f => f.id === 'wi')) j.faults = j.faults.filter(f => f.id !== 'wi'); }); }
function bindWhatIf(){
  const b = $('#ibody');
  b.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.wi; if (!k || e.target.type === 'radio' || e.target.tagName === 'SELECT') return; WI[k] = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : +e.target.value; if (k === 'ttl') wiUpdate('ttl'); else wiUpdate(k); });
  b.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.wi; if (!k) return; if (k === 'node'){ WI.node = +e.target.value; wiUpdate('node'); } else if (k === 'act'){ WI.act = e.target.value; wiUpdate('act'); } });
  b.addEventListener('click', e => { const g = e.target.closest('[data-wi-go]'); if (g) wiReplay(g.dataset.wiGo); });
}

/* ---------- story mode ---------- */
let storySaved = null;
const firstSent = x => { const i = x.search(/[.!?](\s|$)/); return i > 0 ? x.slice(0, i + 1) : x; };
function storyEntry(s){
  const g = geom(), o = view(s), nd = g.S.nodes[o.info.j], arr = (typeof STORY !== 'undefined' && STORY[app.j]) || [];
  if (g.f && s === g.F) return {k:'Where it goes wrong', t:g.f.title, h:g.f.body, bad:true};
  if (o.info.dir === 'r'){
    if (s === g.count - 1) return {k:'Round trip complete', t:'Home again', h:'The reply made it all the way back. Every translation on the way out was undone on the way in.'};
    return {k:'The way back', t:'The reply passes ' + nd.name, h:nd.nat ? nd.name + ' finds its notes from the trip out and undoes the translation, so the reply reaches the right sender.' : 'Same road in reverse: new addresses at each link, and the hop counter ticks down once more.'};
  }
  const e = arr[o.info.j];
  return {k:`Chapter ${o.info.j + 1} of ${g.F + 1}`, t:e ? e[0] : nd.name, h:e ? e[1] : firstSent(nd.does)};
}
function storyDelay(){ const e = storyEntry(app.s), w = (e.t + ' ' + e.h).split(/\s+/).length; return Math.max(2800, 1600 + w * 260) / app.speed; }
function drawStory(){
  if (!app.story) return; const g = geom(), e = storyEntry(app.s);
  $('#sKick').textContent = e.k; $('#sTitle').textContent = e.t; $('#sText').textContent = e.h; $('#storycap').classList.toggle('bad', !!e.bad);
  const c = $('#storycap'); c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap');
  $('#sPips').innerHTML = Array.from({length:g.count}, (_, s) => `<i class="${s === app.s ? 'on' : s < app.s ? 'past' : ''}${s > g.F ? ' r' : ''}"></i>`).join('');
  $('#sAuto').textContent = app.playing ? 'Pause' : 'Auto'; $('#sPrev').disabled = app.s <= 0; $('#sNext').disabled = app.s >= g.count - 1;
}
function storyOn(){
  if (app.story) return; stopPlay(); ambStop();
  storySaved = {zoom:app.zoom, view:app.view, page:app.page}; app.story = true; app.page = 'journey'; app.view = 'map'; app.zoom = 'follow';
  document.body.classList.add('story'); $('#storycap').hidden = false; closeMenu(); app.s = 0; app.t = 0; renderAll(false); $('#bStory').classList.add('on');
}
function storyOff(){
  if (!app.story) return; stopPlay(); app.story = false; document.body.classList.remove('story'); $('#storycap').hidden = true; $('#bStory').classList.remove('on');
  if (storySaved){ app.zoom = storySaved.zoom; app.view = storySaved.view; } renderAll(false);
}
function bindStory(){
  $('#bStory').addEventListener('click', () => app.story ? storyOff() : storyOn());
  $('#sExit').addEventListener('click', storyOff);
  $('#sPrev').addEventListener('click', () => { stopPlay(); goto(app.s - 1); });
  $('#sNext').addEventListener('click', () => { stopPlay(); goto(app.s + 1); });
  $('#sAuto').addEventListener('click', () => { if (app.playing) stopPlay(); else startPlay(); drawStory(); });
  document.addEventListener('keydown', e => { if (app.story && e.key === 'Escape' && TI < 0) storyOff(); });
}

let celT = null;
function celebrate(){
  clearTimeout(celT); const g = geom(), s = app.s;
  celT = setTimeout(() => { if (app.s !== s || app.page !== 'journey' || !scene) return; const fx = $('#fx');
    if (!g.f && s === g.F && g.count > 1) bloom(g.F, true); else if (!g.f && s === g.count - 1 && g.count > 1) bloom(0, false);
    setTimeout(() => $$('#fx .bloom').forEach(b => b.remove()), 2600); }, reduced ? 0 : 650);
}
/* ---------- explode labels ---------- */
function layerLabel(l, v, o){
  const st = o.st;
  if (l.c === 'sl-out') return 'Tunnel · ' + ((v.outer || '').split(' · ')[1] || 'outer header');
  if (l.c === 'sl-eth') return 'Ethernet · ' + String(v.ethDst || '').slice(-8);
  if (l.c === 'sl-ip') return `IPv4 · ${v.ipSrc} → ${v.ipDst}`;
  if (l.c === 'sl-l4') return st.proto === 'icmp' ? 'ICMP · type ' + st.type : `${st.proto.toUpperCase()} · ${v.sport} → ${v.dport}`;
  return 'Payload · ' + (o.st.payName || 'data');
}
function bindFx2(){
  bindDev(); bindGeo(); bindWhatIf(); bindStory();
  $('#lanes').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b){ stopPlay(); goto(+b.dataset.s); } });
  $('#bExplode').addEventListener('click', () => toggleExplode());
}
function toggleExplode(v){
  app.explode = v == null ? !app.explode : !!v; $('#bExplode').classList.toggle('on', app.explode); scene.ex = app.explode;
  if (app.page === 'journey' && app.view === 'map'){ const o = view(app.s), prev = app.s > 0 ? view(app.s - 1) : null; drawPacketBody(o, prev, true); placePacket(); }
}
