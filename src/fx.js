"use strict";
/* ================= fx.js: motion, sound, tour, overlays, empty states ================= */
const FXD = {lat:1, q:1, cam:1, snd:0, amb:0};
function loadFx(){ app.fx = Object.assign({}, FXD); try{ Object.assign(app.fx, JSON.parse(localStorage.getItem('hbh-fx') || '{}')); }catch(_){} app.fx.amb = 0; }
function saveFx(){ try{ const o = Object.assign({}, app.fx); delete o.amb; localStorage.setItem('hbh-fx', JSON.stringify(o)); }catch(_){} }
function fxUI(){ $$('#fxPop [data-fx]').forEach(c => { c.checked = !!app.fx[c.dataset.fx]; }); }

/* ---------- sound (opt-in, WebAudio, no files) ---------- */
let AC = null;
function sfx(k){
  if (!app.fx.snd) return;
  try{ AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); }catch(_){ return; }
  const t0 = AC.currentTime;
  const tone = (f, d, ty = 'sine', v = 0.045, dl = 0, f2) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = ty; o.frequency.setValueAtTime(f, t0 + dl);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dl + d);
    g.gain.setValueAtTime(0.0001, t0 + dl); g.gain.exponentialRampToValueAtTime(v, t0 + dl + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dl + d);
    o.connect(g); g.connect(AC.destination); o.start(t0 + dl); o.stop(t0 + dl + d + 0.03);
  };
  if (k === 'tick') tone(720, 0.06);
  else if (k === 'rewrite'){ tone(520, 0.09, 'triangle', 0.05); tone(780, 0.13, 'triangle', 0.05, 0.08); }
  else if (k === 'drop') tone(190, 0.38, 'sawtooth', 0.05, 0, 55);
  else if (k === 'done') [523, 659, 784].forEach((f, i) => tone(f, 0.28, 'sine', 0.05, i * 0.09));
  else if (k === 'syn') tone(440, 0.12);
  else if (k === 'synack') tone(587, 0.12);
  else if (k === 'ack') tone(740, 0.14);
}

/* ---------- latency physics ---------- */
function latK(t){
  if (!app.fx.lat || !scene) return 1;
  const g = geom(), d = app.s - app.t, s0 = d < 0 ? Math.ceil(t) - 1 : Math.floor(t);
  const a = nodePos(Math.max(0, s0), g), b = nodePos(Math.min(g.count - 1, Math.max(0, s0) + 1), g);
  if (a === b) return 1;
  const N = g.S.nodes, dm = Math.abs(N[b].ms - N[a].ms);
  return 1.5 - 0.95 * Math.sqrt(Math.min(1, dm / (scene.maxD || 1)));
}
function msAt(t, g){
  const N = g.S.nodes, m = s => { const p = nodePos(s, g); return s <= g.F ? N[p].ms : N[nodePos(g.F, g)].ms * 2 - N[p].ms; };
  const s0 = Math.max(0, Math.min(g.count - 1, Math.floor(t))), s1 = Math.min(g.count - 1, s0 + 1), fr = Math.max(0, Math.min(1, t - s0));
  return m(s0) + (m(s1) - m(s0)) * fr;
}

/* ---------- queues ---------- */
const QTYPES = ['router', 'switch', 'nat', 'lb', 'proxy', 'tunnel'];
const qBase = (nd, k) => (nd.name.length * 7 + k * 3 + Math.round(nd.ms * 10)) % 3;
function updateQueues(g, pos){
  const on = !!app.fx.q;
  $$('#map .q').forEach(q => { q.style.display = on ? '' : 'none'; });
  if (!on) return;
  g.S.nodes.forEach((nd, k) => {
    const q = $('#Q' + k); if (!q) return;
    let lv = qBase(nd, k), red = false;
    if (k === pos) lv = Math.min(6, lv + 2);
    if (g.f && (g.f.type === 'drop' || g.f.type === 'mtu') && k === g.F && app.s >= g.F){ lv = 6; red = true; }
    const cs = q.children; for (let i = 0; i < 6; i++) cs[i].setAttribute('class', 'qc' + (i < lv ? ' on' : '') + (red ? ' full' : ''));
    cs[6].setAttribute('class', 'qpop' + (red && k === pos ? ' on' : ''));
  });
}

/* ---------- zone sweep ---------- */
function zoneSweep(zi, name){
  const z = $('#Z' + zi); if (z){ z.classList.remove('zflash'); void z.getBoundingClientRect(); z.classList.add('zflash'); }
  const t = $('#ztoast'); if (t){ t.textContent = '→ ' + name; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
}
function fxOnStep(g, o, prev, pos){
  ovStop();
  const dead = !!(g.f && app.s === g.F), sig = !!tagText(app.s);
  scene.slow = !!(app.fx.cam && (dead || sig));
  if (prev){ const pp = nodePos(app.s - 1, g); if (scene.zoneOf[pp] !== scene.zoneOf[pos]) zoneSweep(scene.zoneOf[pos], g.S.nodes[pos].zone); }
  sfx(dead ? 'drop' : app.s === g.count - 1 ? 'done' : sig ? 'rewrite' : 'tick');
}

/* ---------- camera: eased fly + bullet time ---------- */
let camRaf = null;
function camTo(vb){
  scene.camT = vb;
  if (!scene.cam || reduced || !app.fx.cam){ scene.cam = Object.assign({}, vb); camApply(); return; }
  if (!camRaf) camRaf = requestAnimationFrame(camStep);
}
function camStep(){
  camRaf = null; const c = scene && scene.cam, t = scene && scene.camT; if (!c || !t) return; let mv = false;
  ['x', 'y', 'w', 'h'].forEach(k => { const d = t[k] - c[k]; if (Math.abs(d) > 0.2){ c[k] += d * 0.16; mv = true; } else c[k] = t[k]; });
  camApply(); if (mv) camRaf = requestAnimationFrame(camStep);
}
function camApply(){
  const vb = scene.cam; $('#map').setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  const mv = $('#mv'); if (mv){ mv.setAttribute('x', vb.x); mv.setAttribute('y', vb.y); mv.setAttribute('width', vb.w); mv.setAttribute('height', vb.h); }
  applyLod();
}
function bindTilt(){
  const st = $('#stage'); if (!st || reduced) return;
  st.addEventListener('pointermove', e => {
    if (!app.fx.cam || e.pointerType === 'touch') return; const r = st.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    $('#map').style.transform = `perspective(1100px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
  });
  st.addEventListener('pointerleave', () => { $('#map').style.transform = ''; });
}

/* ---------- overlays: handshake and stream ---------- */
const OV = {tok:0};
function ovStop(){
  OV.tok++; const o = $('#ov'); if (o) o.innerHTML = '';
  const m = $('#ovmsg'); if (m) m.classList.remove('on');
  $$('#map .node.est, #map .node.rcv, #map .node.lock').forEach(n => n.classList.remove('est', 'rcv', 'lock'));
}
function ovPt(u){ const S = scene.scr, i = Math.max(0, Math.min(S.length - 1, Math.floor(u))), j = Math.min(S.length - 1, i + 1), f = u - i; return [S[i][0] + (S[j][0] - S[i][0]) * f, S[i][1] + (S[j][1] - S[i][1]) * f - 40]; }
function mkDot(label, cls){ const g = SV('g', {class:'od ' + cls}, $('#ov')); SV('circle', {r:7, class:'odc'}, g); const t = SV('text', {y:-12, class:'odt'}, g); t.textContent = label; return g; }
function setDot(d, u){ const [x, y] = ovPt(u); d.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`); }
function ovMsg(m){ const e = $('#ovmsg'); e.textContent = m; e.classList.add('on'); }
function burst(k){ const [x, y] = ovPt(k); const g = SV('g', {class:'burst', transform:`translate(${x},${y})`}, $('#ov')); SV('circle', {r:10, class:'bc'}, g); const t = SV('text', {y:5, class:'bx'}, g); t.textContent = '✕'; }
function timerRing(k, ms){ const [x, y] = ovPt(k); const c = SV('circle', {cx:x, cy:y + 40 - 6, r:15, class:'tring', pathLength:100, style:`--d:${ms}ms`}, $('#ov')); return c; }
function ovGate(){
  const g = geom(); if (app.page !== 'journey') return null;
  if (!g.S.base || g.S.base.proto !== 'tcp'){ toast('Handshake and stream apply to TCP journeys'); return null; }
  if (app.view !== 'map'){ toast('Switch to the Map view'); return null; }
  return g;
}
async function playHandshake(){
  const g = ovGate(); if (!g) return; stopPlay(); ovStop();
  const tok = OV.tok, alive = () => tok === OV.tok, N = g.S.nodes.length, dead = !!(g.f && g.f.type !== 'l7'), end = dead ? g.F : N - 1, tls = view(0).pk.v.dport === 443;
  const sleep = ms => new Promise(r => setTimeout(r, ms / app.speed));
  const leg = (label, cls, a, b, ms) => new Promise(res => {
    const d = mkDot(label, cls), t0 = performance.now(), D = ms / app.speed;
    (function f(now){ if (!alive()){ res(false); return; } const k = Math.min(1, (now - t0) / D), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; setDot(d, a + (b - a) * e); if (k < 1) requestAnimationFrame(f); else { d.remove(); res(true); } })(t0);
  });
  const mark = (k, c) => { const n = $('#nd' + k); if (n) n.classList.add(c); };
  if (dead){
    const rto = [1, 2];
    for (let a = 0; a < 3; a++){
      ovMsg(a ? `SYN retransmit #${a}, sent after the ${rto[a - 1]} s timeout` : 'SYN sent: connect() starts the handshake'); sfx('syn');
      if (!await leg('SYN', 'syn', 0, end, 1500)) return;
      burst(end); sfx('drop'); ovMsg(`SYN lost at ${g.S.nodes[end].name}: ${g.f.short}`);
      if (a < 2){ const r = timerRing(0, rto[a] * 900 / app.speed); await sleep(rto[a] * 900); if (!alive()) return; r.remove(); }
    }
    ovMsg('connect() timed out. The SYN never got an answer, so find where it dies (see the fault commands below).'); await sleep(3200); if (alive()) ovStop(); return;
  }
  ovMsg('1 of 3 · SYN: the client asks to talk and picks a sequence number'); sfx('syn');
  if (!await leg('SYN', 'syn', 0, end, 1600)) return; mark(end, 'rcv');
  ovMsg('2 of 3 · SYN-ACK: the server agrees and acknowledges'); sfx('synack');
  if (!await leg('SYN-ACK', 'synack', end, 0, 1600)) return;
  ovMsg('3 of 3 · ACK: the client confirms'); sfx('ack');
  if (!await leg('ACK', 'ack', 0, end, 1600)) return;
  mark(0, 'est'); mark(end, 'est'); ovMsg('ESTABLISHED: both ends agree on the sequence numbers. Data can flow.'); sfx('done');
  if (tls){
    await sleep(900); if (!alive()) return; ovMsg('TLS · ClientHello: supported ciphers and the server name (SNI)');
    if (!await leg('Hello', 'tls', 0, end, 1000)) return; ovMsg('TLS · ServerHello and certificate come back');
    if (!await leg('Cert', 'tls', end, 0, 1000)) return; ovMsg('TLS · both sides derive the same session keys');
    if (!await leg('Finished', 'tls', 0, end, 900)) return; mark(0, 'lock'); mark(end, 'lock'); ovMsg('🔒 TLS established: everything after this point is encrypted'); sfx('done');
  }
  await sleep(2600); if (alive()) ovStop();
}
function playStream(){
  const g = ovGate(); if (!g) return; stopPlay(); ovStop();
  const tok = OV.tok, N = g.S.nodes.length, dead = !!(g.f && g.f.type !== 'l7'), end = dead ? g.F : N - 1, T = 1100 / app.speed, R = 1.3 * T, pk = [];
  let n = 0;
  [1, 2, 4, 8].forEach((c, r) => { for (let i = 0; i < c; i++){ n++; pk.push({n, r, at:r * R + i * 0.12 * T, f:mkDot(String(n), 'syn sm'), a:mkDot('', 'ack sm')}); } });
  pk.forEach(p => { p.f.style.display = p.a.style.display = 'none'; });
  const total = 3 * R + 0.84 * T + (dead ? T : 2 * T) + 400, t0 = performance.now();
  (function f(now){
    if (tok !== OV.tok) return; const tau = now - t0; let acked = 0, fl = 0, rr = 0;
    pk.forEach(p => {
      if (tau >= p.r * R) rr = Math.max(rr, p.r);
      const u = (tau - p.at) / T;
      if (u < 0){ p.f.style.display = p.a.style.display = 'none'; return; }
      if (u < 1){ p.f.style.display = ''; p.a.style.display = 'none'; setDot(p.f, end * u); fl++; }
      else if (dead){ p.f.style.display = ''; p.f.classList.add('dead'); setDot(p.f, end); p.a.style.display = 'none'; }
      else { p.f.style.display = 'none'; const u2 = (tau - p.at - T) / T; if (u2 < 1){ p.a.style.display = ''; setDot(p.a, end * (1 - u2)); } else { p.a.style.display = 'none'; acked++; } }
    });
    ovMsg(dead ? `Slow start sends ${2 ** rr} segments, but no ACK ever returns: the sender stalls until its timer fires.` : `Slow start · window ${2 ** rr} · in flight ${fl} · ACKed ${acked} of ${n}`);
    if (tau < total) requestAnimationFrame(f);
    else { ovMsg(dead ? 'Every segment died at the fault. Nothing was acknowledged.' : 'The window grew 1 → 2 → 4 → 8: each ACK lets the sender release more segments.'); setTimeout(() => { if (tok === OV.tok) ovStop(); }, 2800 / app.speed); }
  })(t0);
}

/* ---------- ambient demo ---------- */
let AMB = null;
function ambNext(){
  const keys = Object.keys(SC).filter(k => k !== 'pcap' && k !== app.j); if (!keys.length) return;
  setJourney(keys[(Math.random() * keys.length) | 0]);
  const fs = SCN().faults; if (fs.length && Math.random() < 0.4){ app.f = fs[(Math.random() * fs.length) | 0].id; CACHE.clear(); drawMap(); app.s = 0; app.t = 0; renderAll(false); }
}
function ambLoop(){
  if (!app.fx.amb) return; const g = geom();
  if (app.playing){ AMB = setTimeout(ambLoop, 500); return; }
  if (app.s >= g.count - 1){ AMB = setTimeout(() => { if (!app.fx.amb) return; ambNext(); AMB = setTimeout(ambLoop, 400); }, 2600); return; }
  startPlay(); AMB = setTimeout(ambLoop, 500);
}
function ambStart(){ app.fx.amb = 1; closeMenu(); if (app.page !== 'journey'){ app.page = 'journey'; renderAll(false); } document.body.classList.add('amb'); $('#ambBadge').hidden = false; fxUI(); clearTimeout(AMB); if (app.s >= geom().count - 1){ app.s = 0; app.t = 0; renderAll(false); } ambLoop(); }
function ambStop(){ if (!app.fx.amb) return; app.fx.amb = 0; clearTimeout(AMB); document.body.classList.remove('amb'); $('#ambBadge').hidden = true; stopPlay(); fxUI(); }

/* ---------- guided tour ---------- */
const TOUR = [
  {s:['#rail', '#bMenu'], t:'Pick a journey', d:'Each journey follows one real packet end to end: a web request, DNS, cloud paths, Kubernetes. On a phone, the ☰ button opens the list.'},
  {s:['.stagewrap'], t:'Follow the packet', d:'The stack of slabs is the packet. Each slab is a header layer, and the ones that change at a device light up. Click any device to jump to it.'},
  {s:['.ctl'], t:'Step, play or scrub', d:'Use ◀ ▶ or the arrow keys. Marks on the slider show NAT, tunnels, faults and the return path. Handshake and Stream replay TCP setup and slow start.'},
  {s:['#right'], t:'What changed here', d:'Simple mode lists only what this device changed, in plain words. Switch to Detailed (key d) for every field, with links to the official RFC or cloud docs.'},
  {s:['#selF'], t:'Break it on purpose', d:'Choose a fault to see how real failures look: TTL expiry, MTU black holes, firewall drops. Each one comes with the commands to diagnose it.'},
  {s:['#bFx'], t:'Effects', d:'Turn latency physics, queues and camera effects on or off, enable sound, or start the hands-free ambient demo (key a).'}
];
let TI = -1;
const vis = e => e && e.getClientRects().length > 0;
function tourShow(i){
  let k = i; while (k < TOUR.length && !TOUR[k].s.map(s => $(s)).some(vis)) k++;
  if (k >= TOUR.length){ tourEnd(); return; }
  TI = k; const st = TOUR[k], el = TOUR[k].s.map(s => $(s)).find(vis); el.scrollIntoView({block:'nearest'});
  const r = el.getBoundingClientRect(), h = $('#thole'), c = $('#tcard'), pad = 6;
  Object.assign(h.style, {left:r.left - pad + 'px', top:r.top - pad + 'px', width:r.width + pad * 2 + 'px', height:r.height + pad * 2 + 'px'});
  $('#tstep').textContent = `${k + 1} / ${TOUR.length}`; $('#tt').textContent = st.t; $('#td').textContent = st.d; $('#tnext').textContent = k === TOUR.length - 1 ? 'Done' : 'Next';
  $('#tback').style.visibility = k ? 'visible' : 'hidden';
  const cw = Math.min(340, innerWidth - 24), ch = c.offsetHeight || 170;
  let top = r.bottom + 14; if (top + ch > innerHeight - 10) top = r.top - ch - 14; if (top < 10) top = Math.max(10, Math.min(innerHeight - ch - 10, r.top + 20));
  let left = Math.max(12, Math.min(innerWidth - cw - 12, r.left));
  if (r.height > innerHeight * 0.6 && r.width < innerWidth * 0.5){ top = Math.max(12, Math.min(innerHeight - ch - 12, r.top + 24)); left = r.right + 16 + cw < innerWidth ? r.right + 16 : Math.max(12, r.left - cw - 16); }
  else if (r.width > innerWidth * 0.6 && r.height > innerHeight * 0.6) left = (innerWidth - cw) / 2;
  Object.assign(c.style, {width:cw + 'px', left:left + 'px', top:top + 'px'});
}
function tourStart(){ $('#tour').hidden = false; tourShow(0); $('#tnext').focus(); }
function tourEnd(){ $('#tour').hidden = true; TI = -1; try{ localStorage.setItem('hbh-tour', '1'); }catch(_){} }
function bindTour(){
  $('#tnext').addEventListener('click', () => { if (TI >= TOUR.length - 1) tourEnd(); else tourShow(TI + 1); });
  $('#tback').addEventListener('click', () => tourShow(Math.max(0, TI - 1)));
  $('#tskip').addEventListener('click', tourEnd);
  addEventListener('resize', () => { if (TI >= 0) tourShow(TI); });
  document.addEventListener('keydown', e => { if (TI < 0) return; if (e.key === 'Escape') tourEnd(); else if (e.key === 'ArrowRight' || e.key === 'Enter'){ e.preventDefault(); $('#tnext').click(); } else if (e.key === 'ArrowLeft') $('#tback').click(); });
}
function maybeTour(){
  if (navigator.webdriver || location.hash.includes('j=') || /[?&]tour=0/.test(location.search)) return;
  let seen = false; try{ seen = localStorage.getItem('hbh-tour') === '1'; }catch(_){}
  if (!seen) setTimeout(tourStart, 900);
}

/* ---------- scrubber markers ---------- */
function markEvents(){
  const g = geom(), ev = [];
  for (let s = 0; s < g.count; s++){
    const o = view(s), p = s ? view(s - 1) : null, v = o.pk.v, pv = p && p.pk.v; let type = null, label = '';
    if (s === 0){ type = 'start'; label = 'Start'; }
    if (p){
      if ((pv.outer || '') !== (v.outer || '')){ type = 'tun'; label = v.outer ? 'Encapsulated in a tunnel' : 'Tunnel removed'; }
      else if (pv.ipSrc !== v.ipSrc || pv.ipDst !== v.ipDst || pv.sport !== v.sport || pv.dport !== v.dport){ type = 'nat'; label = 'Addresses or ports rewritten'; }
    }
    if (g.kind && s === g.F + 1 && !type){ type = 'ret'; label = 'Return path begins'; }
    if (s === g.count - 1 && !(g.f && g.F === s)){ type = 'end'; label = 'Delivered'; }
    if (g.f && s === g.F){ type = 'fault'; label = g.f.short || 'Fault'; }
    if (type) ev.push({s, type, label});
  }
  return ev;
}
function drawMarks(){
  const m = $('#marks'); if (!m) return; const g = geom(), den = Math.max(1, g.count - 1);
  m.innerHTML = markEvents().map(e => `<button class="mk ${e.type}" style="left:calc(8px + (100% - 16px) * ${(e.s / den).toFixed(4)})" data-s="${e.s}" title="Step ${e.s + 1}: ${esc(e.label)}" aria-label="Step ${e.s + 1}: ${esc(e.label)}"></button>`).join('');
}

/* ---------- empty and error states ---------- */
const ES_ART = {
  nocap:'<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="12" y="14" width="66" height="46" rx="6" class="esf"/><path d="M24 30h42M24 39h28M24 48h34" class="esl"/><circle cx="90" cy="54" r="17" class="esf2"/><path d="M90 46v13M84 53l6 6 6-6" class="esl2"/></svg>',
  bad:'<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M14 22h40l8 10 10-10 8 14 10-14h16v36H14z" class="esf"/><path d="M62 32l-6 12 10 4-6 12" class="esl2"/><path d="M26 34h24M26 44h18M78 50h16" class="esl"/></svg>',
  nomatch:'<svg viewBox="0 0 120 80" aria-hidden="true"><circle cx="52" cy="38" r="22" class="esf"/><path d="M68 54l24 18" class="esl2"/><path d="M44 30l16 16M60 30L44 46" class="esl"/></svg>',
  notrace:'<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M16 58C34 20 52 66 66 38S96 22 106 28" class="esl" stroke-dasharray="4 6"/><circle cx="16" cy="58" r="7" class="esf2"/><circle cx="106" cy="28" r="7" class="esf"/></svg>'
};
function emptyState(kind, title, text, actions){ return `<div class="es ${kind}"><div class="esa">${ES_ART[kind] || ''}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actions ? `<div class="esb">${actions}</div>` : ''}</div>`; }

/* ---------- live traceroute animation ---------- */
let TRTOK = 0;
function drawTraceAnim(hops, animate){
  const box = $('#tanim'), sv = $('#tsvg'); TRTOK++; const tok = TRTOK;
  if (!hops.length){ box.hidden = true; return; } box.hidden = false;
  const n = hops.length, W = Math.max(860, n * 74 + 60), H = 210, X = i => 40 + i * ((W - 80) / Math.max(1, n - 1)), Y = i => 98 + Math.sin(i * 0.9) * 16;
  const resp = hops.filter(h => h.avg != null), mx = Math.max(...resp.map(h => h.avg), 1);
  sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.style.width = W + 'px'; sv.innerHTML = '';
  const lines = [], nodes = [];
  for (let i = 0; i < n - 1; i++) lines.push(SV('line', {x1:X(i), y1:Y(i), x2:X(i + 1), y2:Y(i + 1), class:'tl' + (!hops[i].ip || !hops[i + 1].ip ? ' gap' : ''), pathLength:100}, sv));
  hops.forEach((h, i) => {
    const hot = h.notes.some(x => x.hot), g = SV('g', {class:'tn ' + (h.c ? h.c.c : 'star') + (hot ? ' hot' : ''), transform:`translate(${X(i)},${Y(i)})`}, sv);
    if (hot) SV('circle', {r:16, class:'thot'}, g);
    SV('circle', {r:8, class:'tc'}, g);
    const lbl = SV('text', {y:-18, class:'tt1'}, g); lbl.textContent = h.avg != null ? h.avg.toFixed(1) + ' ms' : '* * *';
    const ip = SV('text', {y:28, class:'tt2'}, g); ip.textContent = h.ip || 'no reply';
    const nn = SV('text', {y:3.5, class:'tt3'}, g); nn.textContent = h.n;
    if (h.avg != null){ const bh = Math.max(2, h.avg / mx * 38); SV('rect', {x:-4, y:84 - bh, width:8, height:bh, rx:2, class:'tbarv'}, g); }
    nodes.push(g);
  });
  const dot = SV('circle', {r:6, class:'tdot', cx:X(0), cy:Y(0)}, sv);
  if (!animate || reduced){ dot.remove(); return; }
  nodes.forEach((g, i) => { g.classList.add('hid'); if (lines[i]) lines[i].classList.add('hid'); }); nodes[0].classList.remove('hid');
  let i = 0;
  const hop = () => {
    if (tok !== TRTOK || i >= n - 1){ if (tok === TRTOK) dot.remove(); return; }
    const a = hops[i], b = hops[i + 1], d = a.avg != null && b.avg != null ? Math.max(0, b.avg - a.avg) : 6, D = Math.min(1500, 260 + d * 24) / Math.max(0.5, app.speed), t0 = performance.now(), x0 = X(i), y0 = Y(i), x1 = X(i + 1), y1 = Y(i + 1);
    lines[i].classList.remove('hid'); lines[i].classList.add('draw'); lines[i].style.animationDuration = D + 'ms';
    (function f(now){ if (tok !== TRTOK) return; const k = Math.min(1, (now - t0) / D); dot.setAttribute('cx', x0 + (x1 - x0) * k); dot.setAttribute('cy', y0 + (y1 - y0) * k); if (k < 1) requestAnimationFrame(f); else { nodes[i + 1].classList.remove('hid'); nodes[i + 1].classList.add('pop'); i++; setTimeout(hop, 120 / Math.max(0.5, app.speed)); } })(t0);
  };
  setTimeout(hop, 350);
}

/* ---------- binders ---------- */
function bindFx(){
  const pop = $('#fxPop'); fxUI();
  $('#bFx').addEventListener('click', () => { pop.hidden = !pop.hidden; });
  document.addEventListener('pointerdown', e => {
    if (!pop.hidden && !e.target.closest('#fxPop,#bFx')) pop.hidden = true;
    app.touched = true;
    if (app.fx.amb && !e.target.closest('#fxPop,#bFx')) ambStop();
  }, true);
  document.addEventListener('keydown', e => { app.touched = true; if (app.fx.amb && e.key.toLowerCase() !== 'a') ambStop(); }, true);
  pop.addEventListener('change', e => {
    const k = e.target.dataset.fx; if (!k) return; app.fx[k] = e.target.checked ? 1 : 0; saveFx();
    if (k === 'snd' && app.fx.snd) sfx('tick');
    if (k === 'amb'){ if (app.fx.amb){ app.fx.amb = 0; ambStart(); } else { app.fx.amb = 1; ambStop(); } }
    if (k === 'q' && app.page === 'journey') updateMap(false);
    if (k === 'cam' && !app.fx.cam) $('#map').style.transform = '';
  });
  $('#fxTour').addEventListener('click', () => { pop.hidden = true; tourStart(); });
  $('#bHs').addEventListener('click', playHandshake);
  $('#bStream').addEventListener('click', playStream);
  $('#ambBadge').addEventListener('click', ambStop);
  $('#marks').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b){ stopPlay(); goto(+b.dataset.s); } });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-es]'); if (!b) return;
    const m = {sample:'#psample', sample6:'#psample6', trsample:'#tsample'}[b.dataset.es]; if (m) $(m).click();
  });
  bindTilt(); bindTour();
  addEventListener('error', e => { if (e && e.message && !/ResizeObserver/.test(e.message)) toast('Something went wrong: ' + e.message); });
}
