"use strict";
/* ================= Why is it failing? + fault library ================= */
const WHY = {sym:null};
function cmdBlock(cmds){
  if (!cmds.length) return '';
  return `<div class="cmds"><h4>Confirm it with</h4>${cmds.map(c => `<div class="cmd"><code>${esc(c)}</code><button class="btn" data-cmd="${esc(c)}">Copy</button></div>`).join('')}</div>`;
}
function drawWhy(){
  const sy = WHY.sym;
  let h = `<h2>Why is my request failing?</h2><p class="hint">Pick what you see. Each match is a fault you can replay hop by hop, with the real commands that confirm it. With nothing selected this is the full fault library.</p><div class="symrow">`
    + SYMPTOMS.map(s => `<button class="sym ${sy === s.id ? 'on' : ''}" data-sym="${s.id}">${esc(s.t)}</button>`).join('')
    + `<button class="sym ${!sy ? 'on' : ''}" data-sym="">All faults</button></div>`;
  if (sy) h += `<p class="symhint">${esc(SYMPTOMS.find(x => x.id === sy).h)}</p>`;
  const rows = [];
  Object.entries(SC).forEach(([jk, J]) => J.faults.forEach(f => { const m = FMETA[jk + '/' + f.id] || {}; if (!sy || (m.sym || []).includes(sy)) rows.push({jk, J, f, m}); }));
  h += `<div class="fcount">${rows.length} fault${rows.length === 1 ? '' : 's'}${sy ? '' : ' in ' + Object.keys(SC).length + ' journeys'}</div><div class="fgrid">`;
  h += rows.map(r => `<div class="fcard"><div class="fh"><b>${esc(r.f.label)}</b><small>${esc(r.J.group)} · ${esc(r.J.short)}</small></div>
    <p>${esc(r.f.body.split('. ')[0])}.</p>${cmdBlock((r.m.cmd || []).slice(0, 3))}
    <div class="fa"><button class="btn pri" data-rj="${r.jk}" data-rf="${r.f.id}">Replay this fault</button></div></div>`).join('');
  return h + '</div>';
}

/* ================= PCAP viewer (all local) ================= */
const PC = {pk:[], sel:-1, name:'', filter:'', conv:null, convs:[]};
const MAXPK = 20000, MAXBYTES = 25 * 1024 * 1024;

function parsePcap(buf){
  if (buf.byteLength < 24) throw new Error('File is too small to be a capture');
  const dv = new DataView(buf), u8 = new Uint8Array(buf), m = dv.getUint32(0, false), out = [];
  if ([0xa1b2c3d4, 0xa1b23c4d, 0xd4c3b2a1, 0x4d3cb2a1].includes(m)){
    const le = m === 0xd4c3b2a1 || m === 0x4d3cb2a1, nano = m === 0xa1b23c4d || m === 0x4d3cb2a1, lt = dv.getUint32(20, le) & 0x0fffffff;
    let o = 24;
    while (o + 16 <= u8.length && out.length < MAXPK){
      const sec = dv.getUint32(o, le), fr = dv.getUint32(o + 4, le), cl = dv.getUint32(o + 8, le), ol = dv.getUint32(o + 12, le);
      if (o + 16 + cl > u8.length) break;
      out.push({ts:sec + fr / (nano ? 1e9 : 1e6), d:u8.subarray(o + 16, o + 16 + cl), lt, orig:ol}); o += 16 + cl;
    }
    return out;
  }
  if (m === 0x0a0d0d0a){
    let o = 0, le = true; const ifs = [];
    while (o + 12 <= u8.length && out.length < MAXPK){
      if (o === 0 || dv.getUint32(o, true) === 0x0a0d0d0a || dv.getUint32(o, false) === 0x0a0d0d0a){ if (dv.getUint32(o + 8, true) === 0x1a2b3c4d) le = true; else if (dv.getUint32(o + 8, false) === 0x1a2b3c4d) le = false; }
      const ty = dv.getUint32(o, le), bl = dv.getUint32(o + 4, le);
      if (bl < 12 || o + bl > u8.length) break;
      if (ty === 1){
        let res = 1e-6; const lt = dv.getUint16(o + 8, le); let q = o + 16;
        while (q + 4 <= o + bl - 4){ const oc = dv.getUint16(q, le), ol = dv.getUint16(q + 2, le); if (oc === 0) break; if (oc === 9){ const v = u8[q + 4]; res = v & 0x80 ? Math.pow(2, -(v & 0x7f)) : Math.pow(10, -v); } q += 4 + ((ol + 3) & ~3); }
        ifs.push({lt, res});
      } else if (ty === 6){
        const ifc = ifs[dv.getUint32(o + 8, le)] || {lt:1, res:1e-6}, hi = dv.getUint32(o + 12, le), lo = dv.getUint32(o + 16, le), cl = dv.getUint32(o + 20, le), ol = dv.getUint32(o + 24, le);
        if (o + 28 + cl <= u8.length) out.push({ts:(hi * 4294967296 + lo) * ifc.res, d:u8.subarray(o + 28, o + 28 + cl), lt:ifc.lt, orig:ol});
      } else if (ty === 3){
        const ifc = ifs[0] || {lt:1}, ol = dv.getUint32(o + 8, le), cl = Math.min(ol, bl - 16);
        out.push({ts:0, d:u8.subarray(o + 12, o + 12 + cl), lt:ifc.lt, orig:ol});
      }
      o += (bl + 3) & ~3;
    }
    return out;
  }
  throw new Error('Not a pcap or pcapng file');
}

const onesSum = (b, init = 0) => { let s = init; for (let i = 0; i < b.length; i += 2) s += (b[i] << 8) | (b[i + 1] || 0); while (s >>> 16) s = (s & 0xffff) + (s >>> 16); return s; };
const ICMPT = {0:'Echo reply', 3:'Destination unreachable', 5:'Redirect', 8:'Echo request', 11:'Time exceeded', 12:'Parameter problem'};
const ICMPU = {0:'net', 1:'host', 2:'protocol', 3:'port', 4:'fragmentation needed (DF set)', 13:'administratively prohibited'};
const tcpFlagStr = f => [[0x80, 'CWR'], [0x40, 'ECE'], [0x20, 'URG'], [0x10, 'ACK'], [0x08, 'PSH'], [0x04, 'RST'], [0x02, 'SYN'], [0x01, 'FIN']].filter(x => f & x[0]).map(x => x[1]).join(', ');
function ip6str(d, o){ const g = []; for (let i = 0; i < 8; i++) g.push(((d[o + 2 * i] << 8) | d[o + 2 * i + 1]).toString(16)); return g.join(':').replace(/(^|:)0(:0)+(:|$)/, '::').replace(/:{3,}/, '::'); }

function decodePkt(p){
  const d = p.d, L = [], R = {layers:L, src:'', dst:'', proto:'?', info:'', len:p.orig || d.length, ttl:null, key:null, bad:0, d};
  const u16 = o => (d[o] << 8) | d[o + 1], u32 = o => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
  const mac = o => [...d.slice(o, o + 6)].map(h2).join(':'), ip4 = o => `${d[o]}.${d[o + 1]}.${d[o + 2]}.${d[o + 3]}`;
  const F = (l, v, o, n, note) => ({l, v, o, n, note});
  let off = 0, et = null;
  if (p.lt === 1){
    if (d.length < 14){ R.info = 'Truncated frame'; return R; }
    const f = [F('Destination', mac(0), 0, 6), F('Source', mac(6), 6, 6)]; et = u16(12); off = 14;
    while ((et === 0x8100 || et === 0x88a8) && off + 4 <= d.length){ f.push(F('VLAN ID', u16(off) & 0xfff, off, 2)); et = u16(off + 2); off += 4; }
    f.push(F('EtherType', '0x' + et.toString(16).padStart(4, '0'), off - 2, 2, et === 0x0800 ? 'IPv4' : et === 0x86dd ? 'IPv6' : et === 0x0806 ? 'ARP' : ''));
    L.push({name:'Ethernet II', c:'eth', s:0, e:off, f}); R.src = mac(6); R.dst = mac(0); R.proto = 'Ethernet'; R.mac = {s:mac(6), d:mac(0)};
  } else if (p.lt === 113){ et = u16(14); off = 16; L.push({name:'Linux cooked capture', c:'eth', s:0, e:16, f:[F('Protocol', '0x' + et.toString(16), 14, 2)]}); }
  else if (p.lt === 101 || p.lt === 12){ et = (d[0] >> 4) === 6 ? 0x86dd : 0x0800; }
  else { R.info = 'Unsupported link type ' + p.lt; return R; }

  if (et === 0x0806 && off + 28 <= d.length){
    const op = u16(off + 6), sm = mac(off + 8), si = ip4(off + 14), tm = mac(off + 18), ti = ip4(off + 24);
    L.push({name:'ARP', c:'eth', s:off, e:off + 28, f:[F('Operation', op === 1 ? 'request' : op === 2 ? 'reply' : op, off + 6, 2), F('Sender MAC', sm, off + 8, 6), F('Sender IP', si, off + 14, 4), F('Target MAC', tm, off + 18, 6), F('Target IP', ti, off + 24, 4)]});
    R.proto = 'ARP'; R.src = si; R.dst = ti; R.info = op === 1 ? `Who has ${ti}? Tell ${si}` : `${si} is at ${sm}`; R.key = 'arp ' + [si, ti].sort().join(' '); return R;
  }
  let proto = null, l4 = 0, end = d.length, v6 = false, sIP = '', dIP = '', pseudo = null;
  if (et === 0x0800 && off + 20 <= d.length){
    const ihl = (d[off] & 15) * 4, tot = u16(off + 2), fl = u16(off + 6), fo = fl & 0x1fff, mf = !!(fl & 0x2000), df = !!(fl & 0x4000); proto = d[off + 9]; sIP = ip4(off + 12); dIP = ip4(off + 16);
    const ok = ihl >= 20 && off + ihl <= d.length && onesSum(d.subarray(off, off + ihl)) === 0xffff; if (!ok) R.bad++;
    R.ttl = d[off + 8];
    L.push({name:'IPv4', c:'ip', s:off, e:off + ihl, f:[F('Header length', ihl + ' bytes', off, 1), F('Total length', tot, off + 2, 2), F('Identification', '0x' + u16(off + 4).toString(16).padStart(4, '0'), off + 4, 2), F('Flags', (df ? 'DF ' : '') + (mf ? 'MF' : '') || 'none', off + 6, 2), F('Fragment offset', fo * 8, off + 6, 2), F('TTL', d[off + 8], off + 8, 1, 'Initial value guess: ' + ([32, 64, 128, 255].find(x => x >= d[off + 8]) || 255)), F('Protocol', proto, off + 9, 1, {1:'ICMP', 6:'TCP', 17:'UDP'}[proto] || ''), F('Header checksum', hx4(u16(off + 10)) + (ok ? '  ✓ valid' : '  ✗ invalid'), off + 10, 2, ok ? '' : 'May be checksum offload if captured on the sending host.'), F('Source', sIP, off + 12, 4), F('Destination', dIP, off + 16, 4)]});
    R.src = sIP; R.dst = dIP; R.proto = {1:'ICMP', 6:'TCP', 17:'UDP'}[proto] || 'IP ' + proto;
    l4 = off + ihl; end = Math.min(d.length, off + tot); const trunc = off + tot > d.length;
    if (fo > 0 || mf){ R.info = (fo ? 'Fragment at offset ' + fo * 8 : 'First fragment (more follow)') + ', not reassembled'; R.key = `ip ${sIP} ${dIP}`; return R; }
    pseudo = (len) => { const ph = new Uint8Array(12); ph.set(d.subarray(off + 12, off + 20), 0); ph[9] = proto; ph[10] = len >> 8; ph[11] = len & 255; return ph; };
    R.trunc = trunc; R.l4len = tot - ihl;
  } else if (et === 0x86dd && off + 40 <= d.length){
    v6 = true; proto = d[off + 6]; sIP = ip6str(d, off + 8); dIP = ip6str(d, off + 24); R.ttl = d[off + 7];
    L.push({name:'IPv6', c:'ip', s:off, e:off + 40, f:[F('Payload length', u16(off + 4), off + 4, 2), F('Next header', proto, off + 6, 1, {6:'TCP', 17:'UDP', 58:'ICMPv6'}[proto] || ''), F('Hop limit', d[off + 7], off + 7, 1), F('Source', sIP, off + 8, 16), F('Destination', dIP, off + 24, 16)]});
    R.src = sIP; R.dst = dIP; R.proto = {6:'TCP', 17:'UDP', 58:'ICMPv6'}[proto] || 'IPv6'; l4 = off + 40; end = Math.min(d.length, l4 + u16(off + 4)); R.l4len = u16(off + 4);
  } else { R.info = 'EtherType 0x' + (et || 0).toString(16); R.key = 'l2 ' + R.src; return R; }

  const fullL4 = !v6 && !R.trunc && l4 + R.l4len <= d.length;
  const ckState = (sum, label) => !fullL4 ? ` (${label}: not verifiable)` : sum === 0xffff ? '  ✓ valid' : (R.bad++, '  ✗ invalid');
  let pay = end;
  if (proto === 6 && l4 + 20 <= d.length){
    const sp = u16(l4), dp = u16(l4 + 2), sq = u32(l4 + 4), ak = u32(l4 + 8), hl = (d[l4 + 12] >> 4) * 4, fg = d[l4 + 13], win = u16(l4 + 14), ck = u16(l4 + 16);
    let sum = 0; if (fullL4){ const seg = d.subarray(l4, l4 + R.l4len); sum = onesSum(seg, onesSum(pseudo(R.l4len))); }
    const opts = []; for (let q = l4 + 20; q < Math.min(l4 + hl, d.length);){ const k = d[q]; if (k === 0) break; if (k === 1){ q++; continue; } const ln = d[q + 1]; if (!ln) break; if (k === 2) opts.push('MSS ' + u16(q + 2)); else if (k === 3) opts.push('WScale ' + d[q + 2]); else if (k === 4) opts.push('SACK permitted'); else if (k === 8) opts.push('Timestamps'); q += ln; }
    pay = l4 + hl; const plen = Math.max(0, end - pay);
    L.push({name:'TCP', c:'l4', s:l4, e:Math.min(pay, d.length), f:[F('Source port', sp, l4, 2), F('Destination port', dp, l4 + 2, 2), F('Sequence', sq, l4 + 4, 4), F('Acknowledgment', ak, l4 + 8, 4), F('Header length', hl + ' bytes', l4 + 12, 1), F('Flags', tcpFlagStr(fg) || 'none', l4 + 13, 1), F('Window', win, l4 + 14, 2), F('Checksum', hx4(ck) + ckState(sum, 'tcp'), l4 + 16, 2, 'Covers a pseudo-header (addresses), so NAT must recompute it.'), ...(opts.length ? [F('Options', opts.join(', '), l4 + 20, hl - 20)] : [])]});
    R.sport = sp; R.dport = dp; R.src = (v6 ? `[${sIP}]` : sIP) + ':' + sp; R.dst = (v6 ? `[${dIP}]` : dIP) + ':' + dp;
    R.key = `tcp ${[R.src, R.dst].sort().join(' ')}`; R.m = {proto:'tcp', sport:sp, dport:dp, seq:sq, ack:ak, flags:fg, plen}; R.sig = `t|${sq}|${ak}|${fg}|${plen}`; R.info = `${sp} → ${dp} [${tcpFlagStr(fg) || 'none'}] Seq=${sq}${fg & 0x10 ? ' Ack=' + ak : ''} Win=${win} Len=${plen}`;
    app_payload(R, d, pay, end, sp, dp, 'tcp', L);
  } else if (proto === 17 && l4 + 8 <= d.length){
    const sp = u16(l4), dp = u16(l4 + 2), ul = u16(l4 + 4), ck = u16(l4 + 6); let sum = 0;
    if (fullL4 && ck) sum = onesSum(d.subarray(l4, l4 + R.l4len), onesSum(pseudo(R.l4len)));
    pay = l4 + 8; const up = d.subarray(pay, end); R.m = {proto:'udp', sport:sp, dport:dp, pay:up}; R.sig = 'u|' + up.length + '|' + [...up.subarray(0, 48)].map(h2).join('');
    L.push({name:'UDP', c:'l4', s:l4, e:pay, f:[F('Source port', sp, l4, 2), F('Destination port', dp, l4 + 2, 2), F('Length', ul, l4 + 4, 2), F('Checksum', ck ? hx4(ck) + ckState(sum, 'udp') : '0x0000 (not used)', l4 + 6, 2)]});
    R.src = (v6 ? `[${sIP}]` : sIP) + ':' + sp; R.dst = (v6 ? `[${dIP}]` : dIP) + ':' + dp; R.key = `udp ${[R.src, R.dst].sort().join(' ')}`; R.info = `${sp} → ${dp} Len=${ul - 8}`;
    app_payload(R, d, pay, end, sp, dp, 'udp', L);
  } else if ((proto === 1 || proto === 58) && l4 + 8 <= d.length){
    const ty = d[l4], cd = d[l4 + 1]; let sum = 0; if (!v6 && fullL4) sum = onesSum(d.subarray(l4, l4 + R.l4len));
    const f = [F('Type', ty + ' ' + (ICMPT[ty] || ''), l4, 1), F('Code', cd + (ty === 3 && ICMPU[cd] ? ' ' + ICMPU[cd] : ''), l4 + 1, 1), F('Checksum', hx4(u16(l4 + 2)) + (v6 ? '' : ckState(sum, 'icmp')), l4 + 2, 2)];
    if (ty === 0 || ty === 8){ f.push(F('Identifier', u16(l4 + 4), l4 + 4, 2, 'NAT rewrites this to keep echo flows apart.'), F('Sequence', u16(l4 + 6), l4 + 6, 2)); }
    L.push({name:v6 ? 'ICMPv6' : 'ICMP', c:'l4', s:l4, e:Math.min(l4 + 8, d.length), f}); pay = l4 + 8;
    R.key = `icmp ${[sIP, dIP].sort().join(' ')}`; if (!v6 && (ty === 0 || ty === 8)){ const ip_ = d.subarray(l4 + 8, end); R.m = {proto:'icmp', type:ty, code:cd, id:u16(l4 + 4), iseq:u16(l4 + 6), pay:ip_}; R.sig = `i|${ty}|${u16(l4 + 6)}|` + [...ip_.subarray(0, 32)].map(h2).join(''); }
    R.info = (ICMPT[ty] || 'Type ' + ty) + (ty === 3 && ICMPU[cd] ? ': ' + ICMPU[cd] : '') + ((ty === 0 || ty === 8) ? `  id=${u16(l4 + 4)} seq=${u16(l4 + 6)}` : '') + (ty === 11 ? ' (a router dropped the packet: TTL reached 0)' : '');
  } else R.key = `ip ${sIP} ${dIP}`;
  if (R.m && !v6){ Object.assign(R.m, {ethSrc:R.mac && R.mac.s, ethDst:R.mac && R.mac.d, ipSrc:sIP, ipDst:dIP, ttl:R.ttl}); }
  if (pay < end && !L.some(x => x.c === 'pay')) L.push({name:'Payload', c:'pay', s:pay, e:end, f:[F('Length', end - pay + ' bytes', pay, end - pay)]});
  return R;
}
function app_payload(R, d, pay, end, sp, dp, tp, L){
  if (pay >= end) return;
  const txt = () => String.fromCharCode(...d.subarray(pay, Math.min(end, pay + 80))).split(/\r?\n/)[0].replace(/[^\x20-\x7e]/g, '·');
  const u16 = o => (d[o] << 8) | d[o + 1];
  if ((sp === 53 || dp === 53 || sp === 5353 || dp === 5353) && tp === 'udp' && end - pay >= 12){
    const id = u16(pay), fl = u16(pay + 2), qr = fl >> 15, rc = fl & 15, qd = u16(pay + 4), an = u16(pay + 6); let o = pay + 12, name = '';
    while (o < end && d[o]){ const n = d[o]; if (n >= 192) break; name += (name ? '.' : '') + String.fromCharCode(...d.subarray(o + 1, o + 1 + n)); o += n + 1; }
    const qt = qd && o + 3 < end ? u16(o + 1) : 0, TY = {1:'A', 2:'NS', 5:'CNAME', 15:'MX', 16:'TXT', 28:'AAAA', 65:'HTTPS'};
    R.proto = 'DNS'; R.info = `${qr ? 'Response' : 'Query'} 0x${id.toString(16)} ${TY[qt] || qt} ${name}${qr ? ` (${['NOERROR', 'FORMERR', 'SERVFAIL', 'NXDOMAIN', 'NOTIMP', 'REFUSED'][rc] || 'rcode ' + rc}, ${an} answer${an === 1 ? '' : 's'})` : ''}`;
    L.push({name:'DNS', c:'pay', s:pay, e:end, f:[{l:'Transaction ID', v:'0x' + id.toString(16), o:pay, n:2}, {l:'Type', v:qr ? 'response' : 'query', o:pay + 2, n:2}, {l:'Question', v:name + ' ' + (TY[qt] || qt), o:pay + 12, n:Math.max(0, o - pay - 12 + 5)}, {l:'Answers', v:an, o:pay + 6, n:2}]}); return;
  }
  if (/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) /.test(txt()) || /^HTTP\/1\.[01] /.test(txt())){ R.proto = 'HTTP'; R.info = txt(); L.push({name:'HTTP (clear text)', c:'pay', s:pay, e:end, f:[{l:'First line', v:txt(), o:pay, n:Math.min(80, end - pay)}]}); return; }
  if (d[pay] === 0x16 && end - pay > 9 && d[pay + 1] === 3){
    const hs = d[pay + 5]; let sni = '';
    if (hs === 1){ try{ let o = pay + 9 + 2 + 32; o += 1 + d[o]; o += 2 + u16(o); o += 1 + d[o]; const eEnd = o + 2 + u16(o); o += 2; while (o + 4 <= eEnd && o + 4 <= end){ const ty = u16(o), ln = u16(o + 2); if (ty === 0){ const nl = u16(o + 7); sni = String.fromCharCode(...d.subarray(o + 9, o + 9 + nl)); break; } o += 4 + ln; } }catch(_){} }
    R.proto = 'TLS'; R.info = hs === 1 ? 'Client Hello' + (sni ? ' · SNI ' + sni : '') : hs === 2 ? 'Server Hello' : 'Handshake type ' + hs;
    L.push({name:'TLS handshake', c:'pay', s:pay, e:end, f:[{l:'Message', v:R.info, o:pay + 5, n:1}, ...(sni ? [{l:'Server name (SNI)', v:sni, o:pay, n:0, note:'Visible even with encryption, unless ECH is used.'}] : [])]}); return;
  }
  if (d[pay] === 0x17 && d[pay + 1] === 3){ R.proto = 'TLS'; R.info = `Application data (${end - pay} bytes, encrypted)`; L.push({name:'TLS record', c:'pay', s:pay, e:end, f:[{l:'Content', v:'encrypted application data', o:pay, n:end - pay}]}); return; }
  L.push({name:'Payload', c:'pay', s:pay, e:end, f:[{l:'Length', v:(end - pay) + ' bytes', o:pay, n:end - pay}]});
}

const PCS = [];
function makeCap(name, pkts){
  const t0 = pkts.length ? pkts[0].ts : 0;
  const pk = pkts.map((p, i) => { const r = decodePkt(p); r.n = i + 1; r.t = p.ts - t0; r.ts = p.ts; return r; });
  const cm = new Map();
  pk.forEach(r => { if (!r.key) return; let c = cm.get(r.key); if (!c){ c = {key:r.key, proto:r.proto, a:r.src, b:r.dst, n:0, bytes:0, ttl:{}, first:r.t, last:r.t, idx:[]}; cm.set(r.key, c); } c.n++; c.bytes += r.len; c.last = r.t; c.idx.push(r.n - 1); if (r.ttl != null && r.src && c.ttl[r.src] === undefined) c.ttl[r.src] = r.ttl; if (r.proto !== 'TCP' && r.proto !== 'UDP' && r.proto !== 'ICMP') c.proto = r.proto; });
  return {name, pk, convs:[...cm.values()].sort((x, y) => y.n - x.n)};
}
function useCap(i){ const c = PCS[i]; PC.active = i; PC.pk = c.pk; PC.convs = c.convs; PC.name = c.name; PC.sel = -1; PC.conv = null; PC.filter = ''; }
function pcapLoad(name, pkts, append){ if (!append) PCS.length = 0; PCS.push(makeCap(name, pkts)); useCap(PCS.length - 1); }
function hopsFromTTL(t){ const init = [32, 64, 128, 255].find(x => x >= t) || 255; return {init, hops:init - t}; }

function toPcap(frames, t0){
  const total = 24 + frames.reduce((a, b) => a + 16 + b.d.length, 0), buf = new ArrayBuffer(total), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint32(0, 0xa1b2c3d4, true); dv.setUint16(4, 2, true); dv.setUint16(6, 4, true); dv.setUint32(16, 65535, true); dv.setUint32(20, 1, true);
  let o = 24; frames.forEach(f => { const sec = Math.floor(f.t), us = Math.round((f.t - sec) * 1e6); dv.setUint32(o, sec, true); dv.setUint32(o + 4, us, true); dv.setUint32(o + 8, f.d.length, true); dv.setUint32(o + 12, f.d.length, true); u8.set(f.d, o + 16); o += 16 + f.d.length; });
  return buf;
}
function samplePcap(){
  const keep = {j:app.j, f:app.f}, frames = [];
  ['web', 'dns', 'ping'].forEach(j => { app.j = j; app.f = 'none'; CACHE.clear(); const c = geom().count; for (let s = 0; s < c; s++) frames.push({d:Uint8Array.from(view(s).pk.bytes), t:1730000000 + s * 0.02}); });
  app.j = keep.j; app.f = keep.f; CACHE.clear();
  return toPcap(frames);
}
/* the web journey seen from six capture points, one file per point */
function samplePoints(){
  const keep = {j:app.j, f:app.f}; app.j = 'web'; app.f = 'none'; CACHE.clear();
  const g = geom(), S = g.S, pts = [[0, 'laptop'], [1, 'home-router-wan'], [2, 'isp-cgnat'], [4, 'exchange-point'], [5, 'edge-lb'], [6, 'web-server']], out = [];
  pts.forEach(([k, nm]) => {
    const fr = [];
    for (let s = 0; s < g.count; s++) if (nodePos(s, g) === k) fr.push({d:Uint8Array.from(view(s).pk.bytes), t:1730000000 + S.nodes[k].ms / 1000 + (s > g.F ? 0.002 : 0)});
    out.push({name:nm + '.pcap', buf:toPcap(fr)});
  });
  app.j = keep.j; app.f = keep.f; CACHE.clear(); return out;
}

/* ===== replay one packet, seen at several capture points, as a journey ===== */
const hex2 = a => [...a].map(h2).join('');
function replayFromCaptures(sig){
  const seen = [], missing = [];
  PCS.forEach((c, ci) => { const p = c.pk.find(r => r.sig === sig && r.m); (p ? seen : missing).push({c, ci, p}); });
  if (seen.length < 2){ toast('This packet appears in only ' + seen.length + ' capture. Load the same flow captured at another point.'); return false; }
  seen.sort((a, b) => (b.p.m.ttl - a.p.m.ttl) || (a.ci - b.ci));
  const f0 = seen[0].p.m, isSyn = f0.proto === 'tcp' && (f0.flags & 2) && !(f0.flags & 16);
  const span = (seen[seen.length - 1].p.ts - seen[0].p.ts) * 1000, useT = span >= 0 && span < 5000;
  const nodes = seen.map((x, i) => {
    const m = x.p.m, pm = i ? seen[i - 1].p.m : null, last = i === seen.length - 1, d = [];
    const ch = k => pm && pm[k] !== m[k];
    if (pm){
      if (ch('ipSrc') || ch('ipDst')) d.push(`addresses ${pm.ipSrc} → ${pm.ipDst} became ${m.ipSrc} → ${m.ipDst}`);
      if (ch('sport') || ch('dport')) d.push(`ports ${pm.sport} → ${pm.dport} became ${m.sport} → ${m.dport}`);
      if (m.proto === 'icmp' && ch('id')) d.push(`ICMP id ${pm.id} became ${m.id}`);
      if (ch('ethSrc') || ch('ethDst')) d.push('MAC addresses changed (a router or gateway sits between the two points)');
      const dec = pm.ttl - m.ttl; if (dec > 0) d.push(`TTL fell by ${dec}: about ${dec} router${dec === 1 ? '' : 's'} between the two points`); else if (dec < 0) d.push('TTL went up: the packet was re-created in between');
    }
    const addrCh = pm && (ch('ipSrc') || ch('ipDst') || ch('sport') || ch('dport') || (m.proto === 'icmp' && ch('id')));
    const dec = pm ? Math.max(0, pm.ttl - m.ttl) : 0;
    const set = {ethSrc:m.ethSrc, ethDst:m.ethDst, ipSrc:m.ipSrc, ipDst:m.ipDst}; if (m.proto !== 'icmp'){ set.sport = m.sport; set.dport = m.dport; } else set.id = m.id;
    const nm = x.c.name.replace(/\.(pcapng|pcap|cap)$/i, '');
    return N(nm, 'P' + (i + 1), !i ? 'host' : last ? 'server' : addrCh ? 'nat' : dec ? 'router' : 'switch', nm, !i ? 'ORIGIN' : last ? 'LAST CAPTURE POINT' : addrCh ? 'ADDRESSES REWRITTEN' : dec ? 'ROUTED' : 'UNCHANGED', useT ? Math.max(0, (x.p.ts - seen[0].p.ts) * 1000) : i, `${m.ipSrc}${m.sport != null ? ':' + m.sport : ''}`,
      !i ? 'The first capture point that saw this packet (highest TTL). Everything after it is compared with this.' : d.length ? 'Compared with the previous capture point: ' + d.join('; ') + '.' : 'Nothing changed between the previous capture point and this one.',
      Object.assign({set, router:dec > 0, dec:dec > 1 ? dec : undefined, docs:['rfc791', 'rfc3022'], x:[TBL('Seen at this capture point', ['Field', 'Value'], [['Source', `${m.ipSrc}${m.sport != null ? ':' + m.sport : ''}`], ['Destination', `${m.ipDst}${m.dport != null ? ':' + m.dport : ''}`], ['TTL', m.ttl], ['MACs', `${m.ethSrc} → ${m.ethDst}`]], [], 'Decoded from ' + x.c.name + '.')]}, {}));
  });
  const base = f0.proto === 'tcp' ? {proto:'tcp', flags:f0.flags, seq:f0.seq, ack:f0.ack} : f0.proto === 'udp' ? {proto:'udp', payload:[...f0.pay.subarray(0, 200)], payName:'UDP payload'} : {proto:'icmp', type:f0.type, code:f0.code, id:f0.id, seq:f0.iseq, payload:[...f0.pay.subarray(0, 56)], payName:'Echo data'};
  const reply = f0.proto === 'tcp' ? {flags:isSyn ? 0x12 : 0x10, seq:isSyn ? 0x2b90de10 : f0.ack, ack:(f0.seq + (isSyn ? 1 : f0.plen)) >>> 0} : f0.proto === 'udp' ? {payload:[]} : {type:0};
  SC.pcap = {group:'Your capture', short:'Captured packet', sub:`${seen.length} capture points`, title:`${f0.ipSrc} → ${f0.ipDst}`, ttl:f0.ttl, base, reply, nodes:fillL2(nodes), faults:[], docs:['rfc791', 'rfc3022'],
    banner:'Rebuilt from decoded header fields (options and payload simplified). ' + (missing.length ? 'Not seen at: ' + missing.map(x => x.c.name).join(', ') + ' (dropped, filtered, or captured too late).' : 'Seen at every capture point.')};
  setJourney('pcap'); return true;
}

function pcapFiltered(){
  const q = PC.filter.trim().toLowerCase(); let idx = PC.pk.map((_, i) => i);
  if (PC.conv != null) idx = PC.convs[PC.conv].idx.slice();
  if (q) idx = idx.filter(i => { const r = PC.pk[i]; return (r.src + ' ' + r.dst + ' ' + r.proto + ' ' + r.info).toLowerCase().includes(q); });
  return idx;
}
function drawPcapTable(){
  const idx = pcapFiltered(), cap = 600;
  let h = `<table><thead><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Proto</th><th>TTL</th><th>Info</th></tr></thead><tbody>`;
  idx.slice(0, cap).forEach(i => { const r = PC.pk[i]; h += `<tr class="hr ${i === PC.sel ? 'on' : ''}" data-pi="${i}"><td><span class="no">${r.n}</span></td><td>${r.t.toFixed(4)}</td><td>${esc(r.src)}</td><td>${esc(r.dst)}</td><td class="pt-${r.proto === 'DNS' ? 'dns' : r.proto.toLowerCase()}">${esc(r.proto)}</td><td>${r.ttl == null ? '' : r.ttl}</td><td class="info">${esc(r.info)}${r.bad ? ' <span class="bg x">checksum</span>' : ''}</td></tr>`; });
  $('#ptable').innerHTML = h + '</tbody></table>' + (idx.length > cap ? `<p class="hint" style="padding:8px">Showing the first ${cap} of ${idx.length} matching packets. Use the filter to narrow down.</p>` : '') + (idx.length ? '' : '<p class="hint" style="padding:8px">No packets match.</p>');
}
function drawPcapDecode(sel){
  const el = $('#pdecode');
  if (PC.sel < 0){ el.innerHTML = '<p class="hint">Select a packet to decode it layer by layer, with checksum verification.</p>'; return; }
  const r = PC.pk[PC.sel], cl = {eth:'L2', ip:'L3', l4:'L4', pay:'L7'};
  let h = `<div class="stamp">PACKET ${r.n} · ${esc(r.proto)}<small>${r.len} BYTES${r.ttl != null ? ' · TTL ' + r.ttl : ''}</small></div>`;
  if (r.sig) h += PCS.length >= 2 ? `<div class="replay"><button class="btn pri" data-replay>Trace this packet across ${PCS.length} captures →</button><span class="hint">Finds the same packet in every loaded capture and replays what changed between them.</span></div>` : `<p class="hint replay">Add a second capture taken elsewhere on the path (same traffic, different place) to replay this packet as a journey.</p>`;
  if (r.ttl != null){ const x = hopsFromTTL(r.ttl); h += `<p class="hint">TTL ${r.ttl} suggests the sender started at ${x.init}, so it is about <b>${x.hops}</b> router hop${x.hops === 1 ? '' : 's'} away (a guess: some systems use other starting values).</p>`; }
  r.layers.forEach((l, li) => {
    h += `<div class="grp"><div class="gh"><span class="lay ${cl[l.c]}">${cl[l.c]}</span>${esc(l.name)}<small>${l.e - l.s} bytes</small></div>`;
    l.f.forEach((f, fi) => { h += `<div class="fr ${sel === li + ':' + fi ? 'sel' : ''}" data-fl="${li}:${fi}"><span class="f">${esc(f.l)}</span><span class="o"></span><span class="n">${esc(f.v)}</span>${f.note ? `<div class="note">${esc(f.note)}</div>` : ''}</div>`; });
    h += '</div>';
  });
  el.innerHTML = h;
}
function drawPcapHex(sel){
  const el = $('#phex'); if (PC.sel < 0){ el.innerHTML = ''; return; }
  const r = PC.pk[PC.sel], d = r.d, cls = new Array(d.length).fill('');
  r.layers.forEach(l => { for (let i = l.s; i < Math.min(l.e, d.length); i++) cls[i] = l.c; });
  let hl = null; if (sel){ const [li, fi] = sel.split(':').map(Number), f = r.layers[li].f[fi]; hl = [f.o, f.o + f.n]; }
  let h = '<div class="hexw">';
  for (let o = 0; o < d.length && o < 512; o += 16){
    h += `<div class="hrow"><span class="hoff">${o.toString(16).padStart(4, '0')}</span><span>`; let asc = '';
    for (let k = o; k < Math.min(o + 16, d.length); k++){ h += `<span class="hb ${cls[k]}${hl && k >= hl[0] && k < hl[1] ? ' sel' : ''}">${h2(d[k])}</span>`; asc += d[k] >= 32 && d[k] < 127 ? String.fromCharCode(d[k]) : '·'; }
    h += `</span><span class="hasc">${esc(asc)}</span></div>`;
  }
  el.innerHTML = h + (d.length > 512 ? '<p class="hint">First 512 bytes shown.</p>' : '') + '</div>';
}
function drawPcapConvs(){
  if (!PC.convs.length){ $('#pconvs').innerHTML = ''; return; }
  let h = `<h3>Conversations</h3><table><thead><tr><th>Protocol</th><th>Endpoints</th><th>Packets</th><th>Bytes</th><th>Distance</th><th></th></tr></thead><tbody>`;
  PC.convs.slice(0, 80).forEach((c, i) => {
    const ts = Object.values(c.ttl); const dist = ts.length ? '≈ ' + ts.map(t => hopsFromTTL(t).hops).join(' / ') + ' hops' : '';
    h += `<tr class="hr ${PC.conv === i ? 'on' : ''}" data-pc="${i}"><td>${esc(c.proto)}</td><td>${esc(c.a)} ↔ ${esc(c.b)}</td><td>${c.n}</td><td>${c.bytes}</td><td>${dist}</td><td><button class="btn" data-ladder="${i}">Ladder</button></td></tr>`;
  });
  $('#pconvs').innerHTML = h + '</tbody></table>';
}
function drawLadder(ci){
  const el = $('#pladder'); if (ci == null){ el.innerHTML = ''; return; }
  const c = PC.convs[ci], pk = c.idx.slice(0, 60).map(i => PC.pk[i]);
  const ends = [...new Set(pk.flatMap(r => [r.src, r.dst]))].slice(0, 2); if (ends.length < 2) ends.push(ends[0] || '?');
  const W = 760, H = 70 + pk.length * 26, X = [150, W - 150];
  let h = `<h3>Ladder · ${esc(c.a)} ↔ ${esc(c.b)}</h3><svg viewBox="0 0 ${W} ${H}" width="100%" class="lad" role="img" aria-label="Packet ladder"><defs><marker id="lah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>`;
  ends.forEach((e, i) => { h += `<line x1="${X[i]}" y1="40" x2="${X[i]}" y2="${H - 8}" class="life"/><text x="${X[i]}" y="26" class="ln">${esc(e.length > 30 ? e.slice(0, 29) + '…' : e)}</text>`; });
  pk.forEach((r, i) => { const y = 62 + i * 26, fw = r.src === ends[0], x1 = X[fw ? 0 : 1], x2 = X[fw ? 1 : 0] + (fw ? -4 : 4); let tx = r.info.length > 58 ? r.info.slice(0, 57) + '…' : r.info; h += `<g class="lar ${fw ? '' : 'r'}" data-pi="${r.n - 1}"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-end="url(#lah)"/><text x="${W / 2}" y="${y - 5}" class="ll">${esc(r.n + '  ' + tx)}</text></g>`; });
  el.innerHTML = h + '</svg>' + (c.idx.length > 60 ? `<p class="hint">First 60 of ${c.idx.length} packets.</p>` : '');
}
function drawPcaps(){
  $('#pcaps').innerHTML = PCS.length ? `<div class="capchips">${PCS.map((c, i) => `<span class="capchip ${i === PC.active ? 'on' : ''}" data-cap="${i}">${esc(c.name)}<em>${c.pk.length}</em><button data-capx="${i}" aria-label="Remove ${esc(c.name)}">×</button></span>`).join('')}</div>` : '<span class="hint">No capture loaded</span>';
}
function drawPcapTiles(){
  const bad = PC.pk.filter(r => r.bad).length, dur = PC.pk.length ? PC.pk[PC.pk.length - 1].t : 0;
  $('#ptiles').innerHTML = [[PC.pk.length, 'packets'], [dur.toFixed(3) + ' s', 'duration'], [PC.convs.length, 'conversations'], [bad, 'bad checksums']].map(([v, l]) => `<div class="tile"><b>${esc(v)}</b><span>${l}</span></div>`).join('');
  drawPcaps();
}
function drawPcap(){ drawPcapTiles(); drawPcapTable(); drawPcapDecode(null); drawPcapHex(null); drawPcapConvs(); drawLadder(null); }

function readFile(file){ return new Promise((res, rej) => { if (file.size > MAXBYTES) return rej(new Error('File is over 25 MB: trim it first (for example with editcap)')); const fr = new FileReader(); fr.onload = () => { try{ res(parsePcap(fr.result)); }catch(e){ rej(e); } }; fr.onerror = () => rej(new Error('Could not read file')); fr.readAsArrayBuffer(file); }); }
async function pcapFiles(files){
  let n = 0;
  for (const f of files){ try{ pcapLoad(f.name, await readFile(f), true); n++; }catch(e){ toast(f.name + ': ' + e.message); } }
  if (n){ drawPcap(); toast(n + ' capture' + (n === 1 ? '' : 's') + ' decoded locally'); }
}
function bindPcap(){
  $('#pfile').addEventListener('change', e => { pcapFiles([...e.target.files]); e.target.value = ''; });
  $('#psample').addEventListener('click', () => { pcapLoad('sample-journeys.pcap', parsePcap(samplePcap())); drawPcap(); });
  $('#psample6').addEventListener('click', () => { PCS.length = 0; samplePoints().forEach(x => pcapLoad(x.name, parsePcap(x.buf), true)); useCap(0); drawPcap(); toast('6 capture points loaded: select the SYN packet and trace it'); });
  $('#pclear').addEventListener('click', () => { PCS.length = 0; PC.pk = []; PC.convs = []; PC.sel = -1; PC.conv = null; PC.name = ''; drawPcap(); });
  $('#pfilter').addEventListener('input', e => { PC.filter = e.target.value; drawPcapTable(); });
  const dz = $('#pdrop');
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => pcapFiles([...e.dataTransfer.files]));
  $('#pcappane').addEventListener('click', e => {
    const rp = e.target.closest('[data-replay]'), cx = e.target.closest('[data-capx]'), cp = e.target.closest('[data-cap]');
    if (rp){ if (PC.sel >= 0) replayFromCaptures(PC.pk[PC.sel].sig); return; }
    if (cx){ PCS.splice(+cx.dataset.capx, 1); if (PCS.length) useCap(Math.min(PC.active, PCS.length - 1)); else { PC.pk = []; PC.convs = []; PC.name = ''; PC.sel = -1; } drawPcap(); return; }
    if (cp){ useCap(+cp.dataset.cap); drawPcap(); return; }
    const tr = e.target.closest('tr[data-pi]'), lad = e.target.closest('[data-ladder]'), cv = e.target.closest('tr[data-pc]'), fl = e.target.closest('[data-fl]'), lg = e.target.closest('g[data-pi]');
    if (lad){ PC.conv = +lad.dataset.ladder; drawPcapTable(); drawPcapConvs(); drawLadder(PC.conv); return; }
    if (cv){ PC.conv = PC.conv === +cv.dataset.pc ? null : +cv.dataset.pc; drawPcapTable(); drawPcapConvs(); return; }
    const pi = tr ? tr.dataset.pi : lg ? lg.dataset.pi : null;
    if (pi != null){ PC.sel = +pi; drawPcapTable(); drawPcapDecode(null); drawPcapHex(null); const dd = $('#pdecode'); if (dd && dd.scrollIntoView && matchMedia('(max-width:860px)').matches) dd.scrollIntoView({block:'nearest'}); return; }
    if (fl){ drawPcapDecode(fl.dataset.fl); drawPcapHex(fl.dataset.fl); }
  });
}
