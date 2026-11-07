"use strict";
/* ================= isometric scene ================= */
const K = 0.866, NS = 'http://www.w3.org/2000/svg';
const Pj = (x, y, z = 0) => [(x - y) * K, (x + y) * 0.5 - z];
const SV = (tag, a = {}, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ZC = ['#4cc9f0', '#ffb020', '#c792ea', '#3ddc97', '#ff7a90', '#8b9cff'];
const TOPH = {host:32, pod:26, server:30, router:36, switch:14, nat:20, lb:24, proxy:24, tunnel:18};
const PZ = 52;
let scene = null, raf = null, lastT = 0, playTimer = null;

function boxAt(p, cx, cy, w, d, h, z0, cls){
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, za = z0, zb = z0 + h;
  const mk = (pts, c) => SV('polygon', {points:pts.map(q => q.map(n => n.toFixed(1)).join(',')).join(' '), class:c + ' ' + cls}, p);
  mk([Pj(x0, y1, za), Pj(x1, y1, za), Pj(x1, y1, zb), Pj(x0, y1, zb)], 'lf');
  mk([Pj(x1, y0, za), Pj(x1, y1, za), Pj(x1, y1, zb), Pj(x1, y0, zb)], 'rf');
  mk([Pj(x0, y0, zb), Pj(x1, y0, zb), Pj(x1, y1, zb), Pj(x0, y1, zb)], 'top');
}
function cylAt(p, cx, cy, rx, ry, h, z0){
  const [sx, sy] = Pj(cx, cy, z0);
  SV('path', {d:`M${sx - rx},${sy} L${sx - rx},${sy - h} A${rx},${ry} 0 0 0 ${sx + rx},${sy - h} L${sx + rx},${sy} A${rx},${ry} 0 0 1 ${sx - rx},${sy} Z`, class:'lf'}, p);
  SV('ellipse', {cx:sx, cy:sy - h, rx, ry, class:'top'}, p);
  SV('ellipse', {cx:sx, cy:sy - h, rx:rx * 0.5, ry:ry * 0.5, class:'top acc'}, p);
}
function device(p, type, gx, gy){
  const b = (w, d, h, z, c = '') => boxAt(p, gx, gy, w, d, h, z, c);
  if (type === 'host'){ b(34, 26, 6, 0); boxAt(p, gx, gy - 9, 32, 3, 24, 6, 'scr'); }
  else if (type === 'router'){ b(36, 36, 12, 0); const [x0, y0] = Pj(gx, gy, 12), [x1, y1] = Pj(gx, gy, 32); SV('line', {x1:x0, y1:y0, x2:x1, y2:y1}, p); SV('circle', {cx:x1, cy:y1, r:3, class:'acc top', style:'stroke:var(--ink)'}, p); }
  else if (type === 'switch'){ b(46, 28, 8, 0); for (let i = -2; i <= 2; i++){ const [x, y] = Pj(gx + i * 7, gy + 14, 4); SV('circle', {cx:x, cy:y, r:1.6, class:'led'}, p); } }
  else if (type === 'nat'){ b(36, 36, 12, 0); boxAt(p, gx, gy, 22, 22, 4, 12, 'acc'); }
  else if (type === 'lb'){ b(40, 40, 12, 0); [-11, 0, 11].forEach(dx => boxAt(p, gx + dx, gy, 6, 6, 10, 12, 'acc')); }
  else if (type === 'proxy'){ b(40, 32, 18, 0); boxAt(p, gx, gy, 26, 18, 4, 18, 'acc'); }
  else if (type === 'server'){ [0, 9, 18].forEach(z => { b(30, 26, 7, z); const [x, y] = Pj(gx + 9, gy + 13, z + 3.5); SV('circle', {cx:x, cy:y, r:1.7, class:'led'}, p); }); }
  else if (type === 'pod'){ cylAt(p, gx, gy, 17, 10, 18, 0); }
  else if (type === 'tunnel'){ const [x, y] = Pj(gx, gy, 0); SV('ellipse', {cx:x, cy:y, rx:34, ry:19.5, class:'ring'}, p); b(18, 18, 14, 0, 'acc'); }
}

function drawMap(){
  const g = geom(), S = g.S, svg = $('#map'); svg.innerHTML = '';
  const A = 92, B = 30, PADZ = 40, n = S.nodes.length;
  const pts = S.nodes.map((_, i) => ({gx:i * A, gy:-i * B}));
  const zones = []; let i = 0;
  while (i < n){ let j = i; while (j + 1 < n && S.nodes[j + 1].zone === S.nodes[i].zone) j++; zones.push({name:S.nodes[i].zone, i, j, x0:pts[i].gx - PADZ, x1:pts[j].gx + PADZ, y0:pts[j].gy - PADZ, y1:pts[i].gy + PADZ}); i = j + 1; }
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  zones.forEach(z => [[z.x0, z.y0], [z.x1, z.y0], [z.x1, z.y1], [z.x0, z.y1]].forEach(([x, y]) => { const [sx, sy] = Pj(x, y, -6); minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy); }));
  const fit = {x:minX - 34, y:minY - 104, w:maxX - minX + 68, h:maxY - minY + 104 + 70};
  const scr = pts.map(p => Pj(p.gx, p.gy, 0));
  const root = SV('g', {class:'iso'}, svg);
  zones.forEach((z, zi) => {
    const zg = SV('g', {style:`--zc:${ZC[zi % ZC.length]}`}, root);
    boxAt(zg, (z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, z.x1 - z.x0, z.y1 - z.y0, 6, -6, 'zp');
    const [lx, ly] = Pj(z.x0, z.y1, 0); const tx = SV('text', {x:lx + 16, y:ly - 6, class:'zl'}, zg); tx.textContent = z.name;
  });
  const maxD = Math.max(...S.nodes.map((nd, k) => k ? nd.ms - S.nodes[k - 1].ms : 0), 1);
  for (let k = 0; k < n - 1; k++){
    const [x0, y0] = scr[k], [x1, y1] = scr[k + 1], dm = S.nodes[k + 1].ms - S.nodes[k].ms;
    SV('line', {x1:x0, y1:y0 - 2, x2:x1, y2:y1 - 2, class:'lnk', id:'L' + k, 'stroke-width':(2 + 3.5 * dm / maxD).toFixed(1)}, root);
    SV('line', {x1:x0, y1:y0 - 2, x2:x1, y2:y1 - 2, class:'lnk flow', id:'F' + k, style:'display:none'}, root);
    const lb = SV('text', {x:(x0 + x1) / 2, y:(y0 + y1) / 2 - 8, class:'lbl'}, root); lb.textContent = '+' + (Math.round(dm * 10) / 10) + ' ms';
  }
  S.nodes.forEach((nd, k) => {
    const ng = SV('g', {class:'node', id:'nd' + k, tabindex:0, role:'button', 'aria-label':`Hop ${k}: ${nd.name}`}, root);
    SV('ellipse', {cx:scr[k][0], cy:scr[k][1], rx:36, ry:20.5, class:'nglow'}, ng);
    device(ng, nd.type, pts[k].gx, pts[k].gy);
    const [sx, sy] = scr[k];
    const c = SV('text', {x:sx, y:sy - TOPH[nd.type] - 6, class:'ncode'}, ng); c.textContent = nd.code;
    const nm = SV('text', {x:sx, y:sy + 36, class:'nname'}, ng); nm.textContent = nd.name;
    const ad = SV('text', {x:sx, y:sy + 49, class:'naddr'}, ng); ad.textContent = nd.addr || '';
    ng.addEventListener('click', () => goto(nodeFirstStep(k)));
    ng.addEventListener('keydown', e => { if (e.key === 'Enter') goto(nodeFirstStep(k)); });
  });
  SV('g', {id:'fx'}, svg); SV('g', {id:'tag'}, svg);
  const pk = SV('g', {id:'pkt'}, svg); SV('g', {id:'pbody', class:'pk'}, pk); SV('text', {id:'ptxt', class:'ptxt', x:0, y:-4}, pk);
  scene = {pts, scr, zones, fit, vb:Object.assign({}, fit)};
  svg.setAttribute('viewBox', `${fit.x} ${fit.y} ${fit.w} ${fit.h}`);
  // minimap
  const mi = $('#mini'); mi.innerHTML = ''; mi.setAttribute('viewBox', `${fit.x} ${fit.y} ${fit.w} ${fit.h}`);
  scr.forEach((s, k) => SV('circle', {cx:s[0], cy:s[1], r:9, class:'mn', id:'mn' + k}, mi));
  SV('rect', {id:'mv', class:'mv', x:fit.x, y:fit.y, width:fit.w, height:fit.h}, mi);
}
const nodeFirstStep = k => k <= geom().F ? k : 0;

function drawPacketBody(o, prev){
  const pb = $('#pbody'); pb.innerHTML = '';
  const v = o.pk.v, pv = prev && prev.info.dir === o.info.dir ? prev.pk.v : null;
  const chg = {
    eth: pv && (pv.ethDst !== v.ethDst || pv.ethSrc !== v.ethSrc),
    ip: pv && (pv.ipSrc !== v.ipSrc || pv.ipDst !== v.ipDst || pv.ttl !== v.ttl),
    l4: pv && (pv.sport !== v.sport || pv.dport !== v.dport || pv.flags !== v.flags || pv.icmpType !== v.icmpType || pv.icmpId !== v.icmpId),
    out: pv && pv.outer !== v.outer
  };
  const layers = [];
  if (v.outer) layers.push({c:'sl-out', w:36, d:24, L:'L2', f:chg.out});
  layers.push({c:'sl-eth', w:28, d:20, L:'L2', f:chg.eth}, {c:'sl-ip', w:28, d:20, L:'L3', f:chg.ip}, {c:'sl-l4', w:28, d:20, L:'L4', f:chg.l4});
  if ((o.st.payload || []).length) layers.push({c:'sl-pay', w:28, d:20, L:'L7', f:false});
  let z = 0;
  layers.forEach(l => {
    const gg = SV('g', {opacity:app.layer === 'all' || app.layer === l.L ? 1 : 0.28}, pb);
    boxAt(gg, 0, 0, l.w, l.d, 4.5, z, 'sl ' + l.c + (l.f ? ' flash' : '')); z += 5.5;
  });
  $('#ptxt').setAttribute('y', -(z + 8)); $('#ptxt').textContent = (o.info.dir === 'r' ? '↩ ' : '') + 'TTL ' + v.ttl;
  pb.setAttribute('class', 'pk' + (o.info.dir === 'r' ? ' ret' : ''));
}

function placePacket(){
  if (!scene) return;
  const g = geom(), t0 = Math.max(0, Math.min(g.count - 1, app.t)), s0 = Math.floor(t0), s1 = Math.min(g.count - 1, s0 + 1), fr = t0 - s0;
  const a = scene.scr[nodePos(s0, g)], b = scene.scr[nodePos(s1, g)];
  const rev = Math.round(t0) > g.F, x = a[0] + (b[0] - a[0]) * fr + (rev ? 10 : 0), y = a[1] + (b[1] - a[1]) * fr - PZ + (rev ? 12 : 0);
  $('#pkt').setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  const f = scene.fit; let vb = f;
  if (app.zoom === 'follow'){ const w = f.w * 0.46, h = f.h * 0.46; vb = {x:Math.max(f.x, Math.min(f.x + f.w - w, x - w / 2)), y:Math.max(f.y, Math.min(f.y + f.h - h, y + 30 - h / 2)), w, h}; }
  $('#map').setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  const mv = $('#mv'); if (mv){ mv.setAttribute('x', vb.x); mv.setAttribute('y', vb.y); mv.setAttribute('width', vb.w); mv.setAttribute('height', vb.h); }
  $('#scrub').value = t0;
}

function updateMap(animate){
  const g = geom(), o = view(app.s), prev = app.s > 0 ? view(app.s - 1) : null, pos = nodePos(app.s, g);
  g.S.nodes.forEach((nd, k) => {
    const e = $('#nd' + k); if (!e) return;
    e.classList.toggle('cur', k === pos); e.classList.toggle('future', k > g.F);
    e.classList.toggle('dim', app.layer !== 'all' && !LAYERS[nd.type].includes(app.layer));
    $('#mn' + k) && $('#mn' + k).classList.toggle('on', k === pos);
  });
  for (let k = 0; k < g.S.nodes.length - 1; k++){
    const fwdDone = o.info.dir === 'f' ? k < pos : k < g.F;
    $('#L' + k).classList.toggle('done', fwdDone);
    const fl = $('#F' + k); const showFlow = o.info.dir === 'r' && k >= pos && k < g.F;
    fl.style.display = showFlow ? '' : 'none'; fl.classList.toggle('rv', showFlow);
  }
  // fault marker
  const fx = $('#fx'); fx.innerHTML = '';
  if (g.f && app.s >= g.F){
    const [x, y] = scene.scr[g.F];
    SV('ellipse', {cx:x, cy:y, rx:36, ry:20.5, class:'fring'}, fx);
    if (g.f.type !== 'l7'){ SV('line', {x1:x - 11, y1:y - 52, x2:x + 11, y2:y - 30, class:'xmark'}, fx); SV('line', {x1:x + 11, y1:y - 52, x2:x - 11, y2:y - 30, class:'xmark'}, fx); }
    const ft = SV('text', {x, y:y + 62, class:'ftxt'}, fx); ft.textContent = g.f.short;
  }
  // change tag
  const tg = $('#tag'); tg.innerHTML = '';
  const tx = tagText(app.s);
  if (tx){
    const [x, y] = scene.scr[pos], wd = Math.max(...tx.map(l => l.length)) * 5.6 + 14, h = 8 + tx.length * 12, ty = y - PZ - 64 - tx.length * 2;
    const w = SV('g', {class:'tagwrap'}, tg);
    SV('rect', {x:x - wd / 2, y:ty, width:wd, height:h, rx:3, class:'tagbg'}, w);
    tx.forEach((l, i) => { const e = SV('text', {x:x - wd / 2 + 7, y:ty + 14 + i * 12, class:'tagtx'}, w); e.textContent = l; });
  }
  drawPacketBody(o, prev);
  if (animate) kick(); else { app.t = app.s; placePacket(); }
}
function stepAnim(now){
  const dt = Math.min(50, now - (lastT || now)); lastT = now;
  const d = app.s - app.t;
  if (Math.abs(d) < 0.002){ app.t = app.s; placePacket(); raf = null; lastT = 0; return; }
  app.t += Math.sign(d) * Math.min(Math.abs(d), dt * Math.max(1, Math.abs(d)) * app.speed / 550);
  placePacket(); raf = requestAnimationFrame(stepAnim);
}
function kick(){ if (reduced){ app.t = app.s; placePacket(); return; } if (!raf){ lastT = 0; raf = requestAnimationFrame(stepAnim); } }

/* ================= sequence view ================= */
function drawSeq(){
  const g = geom(), S = g.S, n = S.nodes.length, dx = 112, W = 40 + n * dx, rowH = 34, H = 96 + g.count * rowH;
  const X = i => 40 + dx / 2 + i * dx;
  let h = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Sequence diagram"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>`;
  S.nodes.forEach((nd, i) => {
    h += `<line x1="${X(i)}" y1="64" x2="${X(i)}" y2="${H - 10}" class="life"/>`;
    h += `<rect x="${X(i) - 46}" y="14" width="92" height="40" rx="4" class="sbox"/><text x="${X(i)}" y="31" class="sn">${esc(nd.name)}</text><text x="${X(i)}" y="46" class="sa2">${esc(nd.addr || '')}</text>`;
  });
  for (let s = 1; s < g.count; s++){
    const o = view(s), y = 84 + s * rowH, x1 = X(nodePos(s - 1, g)), x2 = X(nodePos(s, g));
    const cls = 'sarr' + (s === app.s ? ' cur' : '') + (s > app.s ? ' fut' : '') + (o.info.dir === 'r' ? ' r' : '');
    let txt = infoText(s); if (txt.length > 46) txt = txt.slice(0, 44) + '…';
    if (x1 === x2){ h += `<g class="${cls}" data-s="${s}"><path d="M${x1} ${y - 10} h26 v20 h-26" fill="none" marker-end="url(#ah)"/><text x="${x1 + 32}" y="${y + 4}" class="sl2">${esc(txt)}</text></g>`; }
    else h += `<g class="${cls}" data-s="${s}"><line x1="${x1}" y1="${y}" x2="${x2 + (x2 > x1 ? -3 : 3)}" y2="${y}" marker-end="url(#ah)"/><text x="${(x1 + x2) / 2}" y="${y - 7}" class="sl2 c">${esc(txt)}</text></g>`;
  }
  $('#seq').innerHTML = h + '</svg>';
  $$('#seq g[data-s]').forEach(e => e.addEventListener('click', () => goto(+e.dataset.s)));
}

/* ================= panels ================= */
function drawNarration(){
  const g = geom(), o = view(app.s), nd = g.S.nodes[o.info.j];
  $('#sdots').innerHTML = Array.from({length:g.count}, (_, s) => `<i class="${s === app.s ? 'on' : s < app.s ? 'past' : ''}${s > g.F ? ' r' : ''}" data-s="${s}" title="${esc(infoText(s))}"></i>`).join('');
  $('#stepTxt').textContent = `${app.s + 1} / ${g.count} · ${o.info.dir === 'f' ? t('forward') : t('ret')} · ${nd.name}`;
  $('#cap').innerHTML = `<b>${esc(nd.name)}</b> — ${esc(narration(app.s))}`;
  $('#capDocs').innerHTML = docsFor(app.s).slice(0, 6).map(docChip).join('');
  $('#bPrev').disabled = $('#bFirst').disabled = app.s <= 0; $('#bNext').disabled = $('#bLast').disabled = app.s >= g.count - 1;
  $('#bPlay').textContent = app.playing ? t('pause') : t('play');
  $('#scrub').max = g.count - 1;
  $$('#spdSel button').forEach(b => b.classList.toggle('on', +b.dataset.v === app.speed));
}
function drawFault(){
  const g = geom(), el = $('#faultBox');
  if (!g.f){ el.innerHTML = ''; return; }
  if (app.s < g.F){ el.innerHTML = `<div class="faultbox"><h3>⚠ ${esc(g.f.label)}</h3><p style="margin:0;color:var(--dim)">Fault armed at hop ${g.F}. Step forward to see what happens there.</p></div>`; return; }
  el.innerHTML = `<div class="faultbox"><h3>${esc(g.f.title)}</h3><p>${esc(g.f.body)}</p><pre>${esc(g.f.user)}</pre><div class="chips" style="margin-top:8px">${(g.f.d || []).map(docChip).join('')}</div></div>`;
}
const badge = (c, s) => `<span class="bg ${c}">${s}</span>`;
function drawPassport(){
  const g = geom(), o = view(app.s), p = app.s > 0 ? view(app.s - 1) : null, nd = g.S.nodes[o.info.j];
  const dead = g.f && app.s === g.F, dir = o.info.dir === 'f' ? t('forward') : t('ret');
  const why = !dead ? esc(nd.tag) : g.f.type === 'ttl' ? 'DROPPED · TTL EXPIRED' : g.f.type === 'mtu' ? 'DROPPED · MTU EXCEEDED' : g.f.type === 'l7' ? 'REJECTED · ' + esc(g.f.short) : 'DROPPED · FILTERED';
  let h = `<div class="stamp ${dead ? 'bad' : ''}">${t('hop').toUpperCase()} ${o.info.j} · ${esc(nd.name.toUpperCase())}<small>${dir.toUpperCase()} · ${why}</small></div><p class="does">${esc(dead ? g.f.title : narration(app.s))}</p>`;
  const sizes = {}; o.pk.regions.forEach(r => { sizes[r.c] = r.e - r.s; });
  let shown = 0;
  groupsFor(o.st.proto).forEach(gr => {
    if (app.layer !== 'all' && app.layer !== gr.L) return; shown++;
    h += `<div class="grp"><div class="gh"><span class="lay ${gr.L}">${gr.L}</span>${gr.n}<small>${sizes[gr.k] || ''} bytes</small></div>`;
    gr.f.forEach(k => {
      const F = FINFO[k], now = o.pk.v[k], was = p ? (p.pk.v[k] === undefined ? '—' : p.pk.v[k]) : '', ch = p && was !== now;
      const cls = ['fr']; if (ch) cls.push(F.der ? 'der' : 'chg'); if (app.sel === k) cls.push('sel');
      h += `<div class="${cls.join(' ')}" data-k="${k}"><span class="f">${F.l}</span><span class="o">${ch ? esc(was) : ''}</span><span class="n">${esc(now)}</span>
        <div class="note">${esc(F.n)} ${F.eg ? badge('e', 'E.G.') : ''}${ch ? (F.der ? badge('d', t('recomputed')) : badge('', t('rewritten'))) : ''}${ch || app.sel === k ? F.d.map(docChip).join('') : ''}</div></div>`;
    });
    h += '</div>';
  });
  if (o.pk.v.outer || (p && p.pk.v.outer)){
    const was = p ? (p.pk.v.outer || 'none') : '', now = o.pk.v.outer || 'none', ch = p && was !== now;
    h += `<div class="grp"><div class="gh"><span class="lay L2">+</span>Tunnel (outer headers)</div><div class="fr ${ch ? 'chg' : ''}"><span class="f">Outer</span><span class="o">${ch ? esc(was) : ''}</span><span class="n">${esc(now)}</span><div class="note">Wrapped around the whole original frame. The network between the tunnel ends sees only these. ${ch ? badge('', now === 'none' ? t('removed') : t('added')) : ''}${(nd.docs || []).includes('rfc7348') ? docChip('rfc7348') : ''}</div></div></div>`;
  }
  if (!shown) h += `<p class="hint">Layer 7 has no fixed header fields: open the L7 tab.</p>`;
  else h += `<p class="hint">${t('clickRow')}</p>`;
  return h;
}
function drawL7(){
  const d = l7Diff(app.s);
  if (!d) return `<p class="hint">This journey has no application-layer message. ICMP and many network tools work below layer 7.</p>`;
  if (d.none) return `<p class="hint">ICMP carries no application data. The quoted start of the original packet is in the bytes view below.</p>`;
  let h = `<div class="gh"><span class="lay L7">L7</span>${esc(d.title)}</div>${d.note ? `<p class="hint" style="margin:0 0 8px">${esc(d.note)}</p>` : ''}`;
  d.rows.forEach(r => { h += `<div class="l7r ${r.st}"><span class="k">${esc(r.k)}</span><span>${esc(r.v)}${r.old ? ` <small>(was ${esc(r.old)})</small>` : ''}${r.st === 'new' ? ' ' + badge('', t('added')) : r.st === 'chg' ? ' ' + badge('e', t('changed')) : r.st === 'del' ? ' ' + badge('x', t('removed')) : ''}</span></div>`; });
  const g = geom(); if (g.S.id !== 'api' && app.j === 'api') h += '';
  h += `<p class="hint">${app.j === 'api' ? 'Hop-by-hop headers (Connection, Keep-Alive) apply to one connection only, so every proxy removes them. End-to-end headers travel on.' : ''}</p>${[ 'rfc9110' ].map(docChip).join('')}`;
  return h;
}
function drawHow(){
  const bl = howBlocks(app.s);
  return bl.map((b, i) => `<div class="blk2"><div class="bh"><span>${esc(b.t)}</span><button class="btn" data-copy="${i}">Copy</button></div><pre>${esc(b.c)}</pre>${(b.d || []).length ? `<div class="bd chips">${b.d.map(docChip).join('')}</div>` : ''}</div>`).join('');
}
function drawXray(){
  const nd = geom().S.nodes[view(app.s).info.j];
  if (!nd.x) return `<p class="hint">No internals are modeled for ${esc(nd.name)}: it only forwards the packet. Devices with tables or rules (routers, NAT, load balancers, gateways) have an X-ray view.</p>`;
  return `<div class="gh">${esc(nd.name)} <small>${esc(nd.addr || '')}</small></div>` + nd.x.map(b => {
    let h = `<div class="blk2"><div class="bh"><span>${esc(b.title)}</span></div><div class="bd">`;
    if (b.kind === 'table') h += `<table class="xt"><thead><tr>${b.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r, i) => `<tr class="${(b.hit || []).includes(i) ? 'hit' : ''}">${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    else h += `<div class="fl">${b.items.map((it, i) => `<span class="${(b.hit || []).includes(i) ? 'hit' : ''}">${esc(it)}</span>`).join('<i>→</i>')}</div>`;
    if (b.note) h += `<div class="hint" style="margin:4px 0 0">${esc(b.note)}</div>`;
    return h + '</div></div>';
  }).join('');
}
function drawDocsTab(){
  const ids = docsFor(app.s);
  return `<p class="hint" style="margin:0 0 8px">Only official sources are linked: standards bodies, project and cloud-vendor documentation.</p><div class="dl">${ids.map(id => { const d = DOCS[id]; return `<a href="${d.u}" target="_blank" rel="noopener"><span>${esc(d.l)}</span><em>${d.k}</em><small>${esc(d.s ? d.s + ' · ' : '')}${esc(d.u.replace(/^https?:\/\//, ''))}</small></a>`; }).join('')}</div>`;
}
function drawInspector(){
  const tabs = [['passport', t('passport')], ['l7', t('l7')], ['how', t('how')], ['xray', t('xray')], ['docs', t('docs')]];
  $('#itabs').innerHTML = tabs.map(([k, l]) => `<button data-t="${k}" class="${app.itab === k ? 'on' : ''}">${esc(l)}</button>`).join('');
  $('#ibody').innerHTML = app.itab === 'passport' ? drawPassport() : app.itab === 'l7' ? drawL7() : app.itab === 'how' ? drawHow() : app.itab === 'xray' ? drawXray() : drawDocsTab();
}
function drawHops(){
  const g = geom(); let h = `<table><thead><tr><th>${t('no')}</th><th>${t('time')}</th><th>${t('device')}</th><th>${t('src')}</th><th>${t('dst')}</th><th>${t('proto')}</th><th>${t('info')}</th><th>${t('size')}</th></tr></thead><tbody>`;
  for (let s = 0; s < g.count; s++){
    const o = view(s), nd = g.S.nodes[o.info.j], st = o.st, ms = o.info.dir === 'f' ? nd.ms : g.S.nodes[g.R].ms + (g.S.nodes[g.R].ms - nd.ms);
    const pn = protoName(st), pc = pn === 'DNS' ? 'dns' : st.proto;
    const ep = (ip, pt) => pt !== undefined && st.proto !== 'icmp' ? `${ip}:${pt}` : ip;
    h += `<tr class="hr ${s === app.s ? 'on' : ''} ${s > app.s ? 'fut' : ''}" data-s="${s}"><td><span class="no ${o.info.dir === 'r' ? 'r' : ''}">${s + 1}</span></td><td>${ms.toFixed(1)} ms</td><td>${esc(nd.name)}${o.info.dir === 'r' ? ' ↩' : ''}</td><td>${esc(ep(st.ipSrc, st.sport))}</td><td>${esc(ep(st.ipDst, st.dport))}</td><td class="pt-${pc}">${pn}</td><td class="info">${esc(infoText(s))}</td><td>${14 + o.pk.ipLen} B</td></tr>`;
  }
  $('#hops').innerHTML = h + '</tbody></table>';
  const on = $('#hops tr.on'); if (on && on.scrollIntoView && false) on.scrollIntoView({block:'nearest'});
}
function asciiOf(b){ return b >= 32 && b < 127 ? String.fromCharCode(b) : '·'; }
function drawBytes(){
  const o = view(app.s), p = app.s > 0 ? view(app.s - 1) : null, pk = o.pk, sameLen = p && p.pk.bytes.length === pk.bytes.length && p.info.dir === o.info.dir;
  const tot = pk.bytes.length, colors = {eth:'var(--eth)', ip:'var(--ipc)', l4:'var(--l4)', pay:'var(--pay)'};
  let h = `<div class="lbar">${pk.regions.map(r => `<i style="width:${(r.e - r.s) / tot * 100}%;background:${colors[r.c]};opacity:${app.layer === 'all' || app.layer === r.L ? 1 : .25}"></i>`).join('')}</div>`;
  h += `<div class="lbl2">${pk.regions.map(r => `<span style="width:${(r.e - r.s) / tot * 100}%">${esc(r.n)} ${r.e - r.s}</span>`).join('')}</div>`;
  const F = FINFO[app.sel] && pk.rng[app.sel] ? pk.rng[app.sel] : null;
  const names = new Array(tot).fill(''); pk.regions.forEach(r => { for (let i = r.s; i < r.e; i++) names[i] = r.n; });
  Object.entries(pk.rng).forEach(([k, [a, b]]) => { for (let i = a; i < b; i++) names[i] = (FINFO[k] || {}).l || k; });
  h += '<div class="hexw">';
  for (let r = 0; r < tot; r += 16){
    h += `<div class="hrow"><span class="hoff">${r.toString(16).padStart(4, '0')}</span><span>`;
    let asc = '';
    for (let k = r; k < Math.min(r + 16, tot); k++){
      const reg = pk.regions.find(x => k >= x.s && k < x.e), ch = sameLen && p.pk.bytes[k] !== pk.bytes[k], sel = F && k >= F[0] && k < F[1], dim = app.layer !== 'all' && reg.L !== app.layer;
      h += `<span class="hb ${reg.c}${ch ? ' chg' : ''}${sel ? ' sel' : ''}${dim ? ' dim' : ''}" title="${esc(names[k])}">${h2(pk.bytes[k])}</span>`; asc += asciiOf(pk.bytes[k]);
    }
    h += `</span><span class="hasc">${esc(asc)}</span></div>`;
  }
  h += `</div><div class="legend"><span style="color:var(--eth)">Ethernet</span><span style="color:var(--ipc)">IPv4</span><span style="color:var(--l4)">${pk.regions[2].n}</span>${pk.regions[3] ? `<span style="color:var(--pay)">${esc(pk.regions[3].n)}</span>` : ''}<span style="color:var(--accent)">bytes rewritten at this hop</span></div>`;
  $('#bytes').innerHTML = h;
}

/* ================= header / rail ================= */
function drawHeader(){
  const g = geom(), pos = nodePos(app.s, g);
  $('#nowTitle').textContent = g.S.short;
  $('#nowDots').innerHTML = g.S.nodes.map((_, i) => `<i class="${i <= pos ? 'on' : ''}"></i>`).join('');
  $('#layerSel').innerHTML = ['all', 'L2', 'L3', 'L4', 'L7'].map(l => `<button data-l="${l}" class="${app.layer === l ? 'on' : ''}">${l === 'all' ? t('all') : l}</button>`).join('');
  const keys = Object.keys(SC), done = keys.filter(k => (app.prog[k] || {}).done).length, prog = keys.filter(k => !(app.prog[k] || {}).done && (app.prog[k] || {}).max > 0).length;
  $('#progPct').textContent = Math.round(done / keys.length * 100) + '%';
  $('#progBar').innerHTML = keys.map(k => `<i class="${(app.prog[k] || {}).done ? 'done' : (app.prog[k] || {}).max > 0 ? 'prog' : ''}"></i>`).join('');
  $('#progTxt').textContent = `${done}/${keys.length} ${t('complete')} · ${prog} ${t('inProgress')}`;
  $('#viewSel').innerHTML = [['map', t('map')], ['seq', t('sequence')]].map(([k, l]) => `<button data-v="${k}" class="${app.view === k ? 'on' : ''}">${l}</button>`).join('');
  $('#zoomSel').innerHTML = [['fit', t('fit')], ['follow', t('follow')]].map(([k, l]) => `<button data-z="${k}" class="${app.zoom === k ? 'on' : ''}">${l}</button>`).join('');
  $('#zoomSel').style.visibility = app.view === 'map' ? 'visible' : 'hidden';
  $('#stage').style.display = app.view === 'map' ? '' : 'none'; $('#seq').style.display = app.view === 'seq' ? 'block' : 'none';
  $('#mini').style.display = app.view === 'map' && app.zoom === 'follow' ? '' : 'none';
  const sf = $('#selF'); sf.innerHTML = `<option value="none">${t('noFault')}</option>` + g.S.faults.map(f => `<option value="${f.id}">${esc(f.label)}</option>`).join(''); sf.value = app.f;
}
function drawRail(){
  const cur = nodePos(app.s, geom()); let h = '';
  [...new Set(Object.values(SC).map(s => s.group))].forEach(gr => {
    h += `<div class="rg">${esc(gr)}</div>`;
    Object.entries(SC).filter(([, s]) => s.group === gr).forEach(([k, s]) => {
      const pr = app.prog[k] || {}, dot = pr.done ? 'done' : pr.max > 0 ? 'prog' : '', act = k === app.j && app.page === 'journey';
      h += `<button class="ri ${act ? 'act' : ''}" data-j="${k}"><i class="dot ${dot}"></i><b>${esc(s.short)}</b><span>${esc(s.sub)}</span></button>`;
      if (act) h += '<div class="steps">' + s.nodes.map((n, i) => `<button class="rs ${i === cur ? 'on' : ''}" data-n="${i}"><i>${i + 1}</i><b>${esc(n.name)}</b><span>${esc(n.tag)}</span></button>`).join('') + '</div>';
    });
  });
  h += `<div class="rg">${t('tools')}</div><button class="ri ${app.page === 'trace' ? 'act' : ''}" data-page="trace"><i class="dot"></i><b>${t('traceTool')}</b><span>Paste output, get annotated hops</span></button>`;
  $('#rail').innerHTML = h;
}
function applyI18n(){
  $$('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  document.documentElement.lang = app.lang; document.documentElement.dir = 'ltr';
}

/* ================= render orchestration ================= */
function syncHash(){
  const p = new URLSearchParams({p:app.page, j:app.j, s:app.s, f:app.f, v:app.view, l:app.layer, i:app.itab, z:app.zoom, g:app.lang});
  try{ history.replaceState(null, '', '#' + p.toString()); }catch(_){}
}
function renderPanels(){
  drawHeader(); drawRail(); drawNarration(); drawFault(); drawInspector(); drawHops(); drawBytes();
  if (app.view === 'seq') drawSeq();
  syncHash();
}
function renderAll(animate){
  $('#app').classList.toggle('trace', app.page === 'trace');
  $('#center').hidden = $('#right').hidden = app.page === 'trace'; $('#tracepane').hidden = app.page !== 'trace';
  applyI18n();
  if (app.page === 'trace'){ drawHeader(); drawRail(); syncHash(); return; }
  renderPanels(); updateMap(animate);
}
function goto(s){ const g = geom(); app.s = Math.max(0, Math.min(g.count - 1, s)); markProg(); renderAll(true); }
function stopPlay(){ app.playing = false; clearTimeout(playTimer); if (app.page === 'journey') drawNarration(); }
function playTick(){ if (!app.playing) return; const g = geom(); if (app.s >= g.count - 1){ stopPlay(); return; } goto(app.s + 1); playTimer = setTimeout(playTick, 1800 / app.speed); }
function startPlay(){ const g = geom(); if (app.s >= g.count - 1){ app.s = 0; app.t = 0; } app.playing = true; playTick(); }
function setJourney(j){ stopPlay(); app.j = j; app.f = 'none'; app.s = 0; app.t = 0; app.sel = null; app.page = 'journey'; CACHE.clear(); drawMap(); markProg(); renderAll(false); }
function setFault(f){ stopPlay(); app.f = f; const g = geom(); app.s = f === 'none' ? 0 : Math.min(g.F, app.s); CACHE.clear(); drawMap(); renderAll(false); if (f !== 'none') goto(g.F); }

/* ================= export PNG ================= */
function exportPNG(){
  const svg = $('#map'), vb = svg.getAttribute('viewBox').split(' ').map(Number), clone = svg.cloneNode(true);
  const src = [...svg.querySelectorAll('*')], dst = [...clone.querySelectorAll('*')];
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap', 'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'letter-spacing'];
  src.forEach((e, i) => { const cs = getComputedStyle(e); dst[i].setAttribute('style', props.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';') + (e.style.display === 'none' ? ';display:none' : '')); dst[i].removeAttribute('class'); });
  const W = 1800, H = Math.round(W * vb[3] / vb[2]);
  clone.setAttribute('xmlns', NS); clone.setAttribute('width', W); clone.setAttribute('height', H);
  const bg = document.createElementNS(NS, 'rect'); ['x', 'y'].forEach((a, i) => bg.setAttribute(a, vb[i])); bg.setAttribute('width', vb[2]); bg.setAttribute('height', vb[3]); bg.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b1020');
  clone.insertBefore(bg, clone.firstChild);
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0); c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `hopbyhop-${app.j}-step${app.s + 1}.png`; a.click(); toast('PNG saved'); window.__lastPng = b.size; }); };
  img.onerror = () => toast('Export failed in this browser');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
function toast(m){ const e = $('#toast'); e.textContent = m; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1600); }

/* ================= traceroute decoder ================= */
const SAMPLE_TR = `traceroute to 142.250.195.46 (142.250.195.46), 30 hops max, 60 byte packets
 1  192.168.1.1  1.204 ms  1.118 ms  1.390 ms
 2  100.72.0.1  6.842 ms  6.911 ms  7.003 ms
 3  117.200.45.1  8.120 ms  8.301 ms  8.044 ms
 4  * * *
 5  125.17.28.69  14.552 ms  14.610 ms  14.488 ms
 6  182.79.153.88  58.311 ms  58.402 ms  58.290 ms
 7  72.14.205.110  59.020 ms  58.980 ms  59.112 ms
 8  142.250.195.46  59.455 ms  59.301 ms  59.388 ms`;
function parseTrace(txt){
  const hops = [];
  for (const line of txt.split('\n')){
    const m = line.match(/^\s*(\d+)\s+(.*)$/); if (!m) continue;
    const rest = m[2], ips = [...new Set(rest.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [])], rtts = [...rest.matchAll(/([\d.]+)\s*ms/g)].map(x => parseFloat(x[1]));
    hops.push({n:+m[1], ip:ips[0] || null, avg:rtts.length ? rtts.reduce((a, b) => a + b, 0) / rtts.length : null});
  }
  return hops;
}
function classify(ip){
  if (!ip) return null; const [a, b] = ip.split('.').map(Number);
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return {t:'private', c:'priv'};
  if (a === 100 && b >= 64 && b <= 127) return {t:'CGNAT', c:'cg'};
  if (a === 169 && b === 254) return {t:'link-local', c:'priv'};
  return {t:'public', c:'pub'};
}
function annotate(hops){
  let prev = null, last = -1; hops.forEach((h, i) => { if (h.ip) last = i; });
  const out = hops.map((h, i) => {
    const notes = [], c = classify(h.ip);
    if (!h.ip) notes.push({k:'warn', t:'No reply (* * *). The router ignores or rate-limits probes. Harmless if later hops answer.'});
    else {
      if (i === 0 && c.c === 'priv') notes.push({k:'info', t:'Your default gateway (home or office router).'});
      else if (c.c === 'cg') notes.push({k:'info', t:'ISP carrier-grade NAT. You share a public IP, so inbound port-forwarding will not work.'});
      else if (c.c === 'priv') notes.push({k:'info', t:'Private address mid-path: ISP internal network or a tunnel.'});
      if (prev != null && h.avg != null){
        const d = h.avg - prev;
        if (d >= 25 && h.avg >= 2 * prev) notes.push({k:'bad', hot:true, t:`Latency jumps +${d.toFixed(0)} ms here: long-haul or undersea link, or congestion. Check whether later hops stay high.`});
        else if (d < -5) notes.push({k:'info', t:`RTT is ${Math.abs(d).toFixed(0)} ms lower than the previous hop. That router answers ICMP slowly. Not a real problem.`});
      }
      if (i === last && i === hops.length - 1) notes.push({k:'ok', t:'Last hop answered: most likely the destination.'});
    }
    if (h.avg != null) prev = h.avg;
    return Object.assign({}, h, {c, notes});
  });
  if (hops.length && last < hops.length - 1) out[out.length - 1].notes.push({k:'bad', t:'Trace ends in stars. The destination filters probes, or packets die here. Try a TCP trace: traceroute -T -p 443 <host>.'});
  return out;
}
function drawTrace(){
  const hops = annotate(parseTrace($('#tin').value)), T = $('#ttiles'), O = $('#tout'); T.innerHTML = ''; O.innerHTML = '';
  if (!hops.length){ O.innerHTML = '<p class="hint">Paste traceroute output above.</p>'; return; }
  const resp = hops.filter(h => h.avg != null), mx = Math.max(...resp.map(h => h.avg), 1);
  let jump = 0, jh = null, pv = null; resp.forEach(h => { if (pv != null && h.avg - pv > jump){ jump = h.avg - pv; jh = h.n; } pv = h.avg; });
  [[hops.length, 'hops'], [resp.length ? resp[resp.length - 1].avg.toFixed(1) + ' ms' : '—', 'final RTT'], [jump > 0 ? '+' + jump.toFixed(0) + ' ms' : '—', jh ? `biggest jump (hop ${jh})` : 'biggest jump'], [hops.filter(h => !h.ip).length, 'silent hops'], [hops.filter(h => h.c && h.c.c !== 'pub').length, 'private / CGNAT hops']]
    .forEach(([v, l]) => { const d = document.createElement('div'); d.className = 'tile'; d.innerHTML = `<b>${esc(v)}</b><span>${esc(l)}</span>`; T.appendChild(d); });
  hops.forEach(h => {
    const hot = h.notes.some(n => n.hot), r = document.createElement('div'); r.className = 'trow';
    r.innerHTML = `<span class="n">${h.n}</span><div><span class="mono">${h.ip ? esc(h.ip) : '* * *'}</span>${h.c ? `<span class="chip ${h.c.c}">${h.c.t}</span>` : ''}</div>
      <div class="bars">${h.notes.map(n => `<p class="note2 ${n.k}">${esc(n.t)}</p>`).join('')}${h.avg != null ? `<div class="tbar"><span class="${hot ? 'hot' : ''}" style="width:${Math.max(2, h.avg / mx * 100)}%"></span></div>` : ''}</div><span class="tavg">${h.avg != null ? h.avg.toFixed(1) + ' ms' : '—'}</span>`;
    O.appendChild(r);
  });
}

/* ================= events ================= */
function bind(){
  $('#rail').addEventListener('click', e => {
    const j = e.target.closest('[data-j]'), n = e.target.closest('[data-n]'), pg = e.target.closest('[data-page]');
    if (j){ if (j.dataset.j === app.j && app.page === 'journey') return; setJourney(j.dataset.j); }
    else if (n){ stopPlay(); goto(nodeFirstStep(+n.dataset.n)); }
    else if (pg){ stopPlay(); app.page = 'trace'; renderAll(false); drawTrace(); }
  });
  $('#layerSel').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; app.layer = b.dataset.l; if (app.layer === 'L7') app.itab = 'l7'; else if (app.itab === 'l7' && app.layer !== 'all') app.itab = 'passport'; if (app.page === 'journey'){ renderPanels(); updateMap(false); } else renderAll(false); });
  $('#viewSel').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; app.view = b.dataset.v; renderPanels(); if (app.view === 'map') updateMap(false); });
  $('#zoomSel').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; app.zoom = b.dataset.z; renderPanels(); placePacket(); });
  $('#selF').addEventListener('change', e => setFault(e.target.value));
  $('#itabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; app.itab = b.dataset.t; drawInspector(); syncHash(); });
  $('#ibody').addEventListener('click', e => {
    const fr = e.target.closest('.fr[data-k]'); if (fr && !e.target.closest('a')){ app.sel = app.sel === fr.dataset.k ? null : fr.dataset.k; drawInspector(); drawBytes(); return; }
    const cp = e.target.closest('[data-copy]'); if (cp){ const b = howBlocks(app.s)[+cp.dataset.copy]; try{ navigator.clipboard.writeText(b.c); toast('Copied'); }catch(_){ toast('Copy not available'); } }
  });
  $('#hops').addEventListener('click', e => { const r = e.target.closest('tr[data-s]'); if (r){ stopPlay(); goto(+r.dataset.s); } });
  $('#sdots').addEventListener('click', e => { const d = e.target.closest('[data-s]'); if (d){ stopPlay(); goto(+d.dataset.s); } });
  $('#bFirst').addEventListener('click', () => { stopPlay(); goto(0); });
  $('#bPrev').addEventListener('click', () => { stopPlay(); goto(app.s - 1); });
  $('#bNext').addEventListener('click', () => { stopPlay(); goto(app.s + 1); });
  $('#bLast').addEventListener('click', () => { stopPlay(); goto(geom().count - 1); });
  $('#bReset').addEventListener('click', () => { stopPlay(); goto(0); });
  $('#bPlay').addEventListener('click', () => { if (app.playing) stopPlay(); else startPlay(); });
  $('#spdSel').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; app.speed = +b.dataset.v; drawNarration(); });
  $('#scrub').addEventListener('input', e => { stopPlay(); cancelAnimationFrame(raf); raf = null; app.t = +e.target.value; const s = Math.round(app.t); if (s !== app.s){ app.s = s; markProg(); renderPanels(); updateMap(false); app.t = +e.target.value; } placePacket(); });
  $('#bShare').addEventListener('click', async () => { syncHash(); try{ await navigator.clipboard.writeText(location.href); toast(t('linkCopied')); }catch(_){ toast('Copy the address bar link'); } });
  $('#bExport').addEventListener('click', () => { if (app.page === 'journey' && app.view === 'map') exportPNG(); else toast('Switch to the Map view to export'); });
  $('#bTheme').addEventListener('click', () => { app.theme = app.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = app.theme; try{ localStorage.setItem('hbh-theme', app.theme); }catch(_){} });
  $('#lang').addEventListener('change', e => { app.lang = e.target.value; try{ localStorage.setItem('hbh-lang', app.lang); }catch(_){} renderAll(false); });
  $('#tin').addEventListener('input', drawTrace);
  $('#tsample').addEventListener('click', () => { $('#tin').value = SAMPLE_TR; drawTrace(); });
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || app.page !== 'journey') return;
    if (e.key === 'ArrowRight'){ stopPlay(); goto(app.s + 1); } else if (e.key === 'ArrowLeft'){ stopPlay(); goto(app.s - 1); }
    else if (e.key === 'Home'){ stopPlay(); goto(0); } else if (e.key === 'End'){ stopPlay(); goto(geom().count - 1); }
    else if (e.key === ' '){ e.preventDefault(); if (app.playing) stopPlay(); else startPlay(); }
    else if (e.key.toLowerCase() === 'x'){ app.itab = 'xray'; drawInspector(); }
  });
}

/* ================= boot ================= */
(function init(){
  const q = new URLSearchParams(location.hash.slice(1));
  try{ app.theme = localStorage.getItem('hbh-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); app.lang = localStorage.getItem('hbh-lang') || 'en'; }catch(_){}
  document.documentElement.dataset.theme = app.theme;
  loadProg();
  if (SC[q.get('j')]) app.j = q.get('j');
  if (I18N[q.get('g')]) app.lang = q.get('g');
  if (SCN().faults.some(f => f.id === q.get('f'))) app.f = q.get('f');
  if (['map', 'seq'].includes(q.get('v'))) app.view = q.get('v');
  if (['all', 'L2', 'L3', 'L4', 'L7'].includes(q.get('l'))) app.layer = q.get('l');
  if (['passport', 'l7', 'how', 'xray', 'docs'].includes(q.get('i'))) app.itab = q.get('i');
  if (['fit', 'follow'].includes(q.get('z'))) app.zoom = q.get('z');
  if (q.get('p') === 'trace') app.page = 'trace';
  $('#lang').value = app.lang; $('#tin').value = SAMPLE_TR;
  bind(); drawMap();
  app.s = Math.max(0, Math.min(geom().count - 1, parseInt(q.get('s') || '0', 10) || 0)); app.t = app.s;
  markProg(); renderAll(false); drawTrace();
  window.__hbh = {app, geom, view, infoText, howBlocks, l7Of, buildPacket, cksum16, goto, setJourney, setFault, SC, drawSeq, exportPNG};
})();
