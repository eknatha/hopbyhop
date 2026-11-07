"use strict";
/* ================= official documentation registry =================
   k: Standard | Vendor | Tool.  Only official sources are linked. scripts/check-links.js verifies every URL. */
const R = n => 'https://www.rfc-editor.org/rfc/rfc' + n;
const DOCS = {
  rfc791:{l:'RFC 791 · IPv4',u:R(791),k:'Standard',s:'STD 5'},
  rfc768:{l:'RFC 768 · UDP',u:R(768),k:'Standard',s:'STD 6'},
  rfc9293:{l:'RFC 9293 · TCP',u:R(9293),k:'Standard',s:'STD 7'},
  rfc792:{l:'RFC 792 · ICMP',u:R(792),k:'Standard',s:'STD 5'},
  rfc826:{l:'RFC 826 · ARP',u:R(826),k:'Standard',s:'STD 37'},
  rfc1071:{l:'RFC 1071 · Internet checksum',u:R(1071),k:'Standard',s:'Informational'},
  rfc1812:{l:'RFC 1812 · IPv4 routers',u:R(1812),k:'Standard',s:'Proposed Standard'},
  rfc1918:{l:'RFC 1918 · Private addresses',u:R(1918),k:'Standard',s:'BCP 5'},
  rfc3022:{l:'RFC 3022 · Traditional NAT',u:R(3022),k:'Standard',s:'Informational'},
  rfc6598:{l:'RFC 6598 · Shared address space',u:R(6598),k:'Standard',s:'BCP 153'},
  rfc1191:{l:'RFC 1191 · Path MTU discovery',u:R(1191),k:'Standard',s:'Draft Standard'},
  rfc4821:{l:'RFC 4821 · Packetization-layer PMTUD',u:R(4821),k:'Standard',s:'Proposed Standard'},
  rfc7348:{l:'RFC 7348 · VXLAN',u:R(7348),k:'Standard',s:'Informational'},
  rfc9110:{l:'RFC 9110 · HTTP semantics',u:R(9110),k:'Standard',s:'STD 97'},
  rfc7239:{l:'RFC 7239 · Forwarded header',u:R(7239),k:'Standard',s:'Proposed Standard'},
  rfc1035:{l:'RFC 1035 · DNS',u:R(1035),k:'Standard',s:'STD 13'},
  rfc8446:{l:'RFC 8446 · TLS 1.3',u:R(8446),k:'Standard',s:'Proposed Standard'},
  rfc6750:{l:'RFC 6750 · Bearer tokens',u:R(6750),k:'Standard',s:'Proposed Standard'},
  rfc7519:{l:'RFC 7519 · JWT',u:R(7519),k:'Standard',s:'Proposed Standard'},
  rfc8693:{l:'RFC 8693 · Token exchange',u:R(8693),k:'Standard',s:'Proposed Standard'},
  w3tc:{l:'W3C Trace Context',u:'https://www.w3.org/TR/trace-context/',k:'Standard',s:'W3C Recommendation'},
  k8svip:{l:'Kubernetes · Virtual IPs and service proxies',u:'https://kubernetes.io/docs/reference/networking/virtual-ips/',k:'Vendor'},
  k8ssvc:{l:'Kubernetes · Service',u:'https://kubernetes.io/docs/concepts/services-networking/service/',k:'Vendor'},
  k8snet:{l:'Kubernetes · Cluster networking',u:'https://kubernetes.io/docs/concepts/cluster-administration/networking/',k:'Vendor'},
  k8spol:{l:'Kubernetes · Network policies',u:'https://kubernetes.io/docs/concepts/services-networking/network-policies/',k:'Vendor'},
  nf:{l:'netfilter documentation',u:'https://www.netfilter.org/documentation/',k:'Tool'},
  tcpdump:{l:'tcpdump manual',u:'https://www.tcpdump.org/manpages/tcpdump.1.html',k:'Tool'},
  awsrt:{l:'AWS · Route tables',u:'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html',k:'Vendor'},
  awsnat:{l:'AWS · NAT gateways',u:'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html',k:'Vendor'},
  awsigw:{l:'AWS · Internet gateways',u:'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html',k:'Vendor'},
  awssg:{l:'AWS · Security groups',u:'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html',k:'Vendor'},
  awsacl:{l:'AWS · Network ACLs',u:'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html',k:'Vendor'}
};

/* ================= field explanations (passport tree) ================= */
const FINFO = {
  ethDst:{l:'Eth dst MAC',n:'Next hop on this link. A new value at every L3 hop, found with ARP.',d:['rfc826'],eg:1},
  ethSrc:{l:'Eth src MAC',n:'The interface that sent the frame on this link.',d:['rfc826'],eg:1},
  ipSrc:{l:'IP source',n:'Original sender. Only NAT, proxies and tunnels change it.',d:['rfc791','rfc3022'],eg:1},
  ipDst:{l:'IP destination',n:'Final target. Only DNAT, load balancers and proxies change it.',d:['rfc791'],eg:1},
  ttl:{l:'TTL',n:'Hop limit. Each router subtracts 1; at 0 the packet is dropped and ICMP Time Exceeded is sent.',d:['rfc791','rfc1812','rfc792']},
  ipCk:{l:'IP checksum',n:'Covers the IPv4 header only, so it is recomputed whenever TTL or an address changes.',d:['rfc1071'],der:1},
  sport:{l:'Source port',n:'Chosen by the sender. NAT may remap it so replies can be told apart.',d:['rfc9293','rfc768'],eg:1},
  dport:{l:'Dest port',n:'The service being addressed (443 = HTTPS, 53 = DNS). Only DNAT or a load balancer changes it.',d:['rfc9293','rfc768'],eg:1},
  flags:{l:'TCP flags',n:'SYN opens a connection; SYN,ACK is the reply that completes the first half of the handshake.',d:['rfc9293']},
  tcpCk:{l:'TCP checksum',n:'Covers the TCP segment plus a pseudo-header of the IP addresses, so any NAT forces a recompute.',d:['rfc9293','rfc1071'],der:1},
  udpCk:{l:'UDP checksum',n:'Covers the datagram plus a pseudo-header of the IP addresses, so NAT forces a recompute.',d:['rfc768','rfc1071'],der:1},
  icmpType:{l:'ICMP type',n:'8 = echo request, 0 = echo reply, 11 = time exceeded (TTL hit 0).',d:['rfc792']},
  icmpId:{l:'Echo identifier',n:'Matches replies to the request. NAT treats it like a port and may rewrite it.',d:['rfc792'],eg:1},
  icmpCk:{l:'ICMP checksum',n:'Covers the whole ICMP message.',d:['rfc792','rfc1071'],der:1}
};

/* ================= UI strings (English, Telugu, Hindi). TE/HI are drafts: please proofread. ================= */
const I18N = {
  en:{tagline:'Follow one packet. See every hop.',nowLearning:'Now learning',layerFocus:'Layer focus',all:'All',progress:'Learning progress',complete:'complete',inProgress:'in progress',
    journeys:'Journeys',tools:'Tools',traceTool:'Traceroute decoder',map:'Map',sequence:'Sequence',fit:'Fit',follow:'Follow',breakIt:'Break it',noFault:'No fault (happy path)',
    play:'Play',pause:'Pause',step:'Step',reset:'Reset',speed:'Speed',copyLink:'Copy link',export:'Export PNG',theme:'Theme',passport:'Passport',l7:'L7',how:'How',xray:'X-ray',docs:'Docs',
    flow:'Packet flow',bytes:'Packet bytes',before:'Before',after:'After this hop',forward:'Forward',ret:'Return',hop:'Hop',no:'No.',time:'Time',device:'Device',src:'Source',dst:'Destination',proto:'Protocol',info:'Info',size:'Size',
    loadSample:'Load sample',pasteHere:'Paste traceroute output',egNote:'an example value: it differs in every real capture',clickRow:'Click a row to find its bytes in the dump.',linkCopied:'Link copied',
    rewritten:'rewritten',recomputed:'recomputed',added:'added',removed:'removed',changed:'changed',illus:'Addresses and MACs are illustrative sample values. Checksums are computed from the bytes shown.'},
  te:{tagline:'ఒక ప్యాకెట్‌ను అనుసరించండి. ప్రతి హాప్‌ను చూడండి.',nowLearning:'ఇప్పుడు నేర్చుకుంటున్నది',layerFocus:'లేయర్',all:'అన్నీ',progress:'అభ్యాస పురోగతి',complete:'పూర్తి',inProgress:'కొనసాగుతోంది',
    journeys:'ప్రయాణాలు',tools:'సాధనాలు',traceTool:'ట్రేస్‌రూట్ డీకోడర్',map:'మ్యాప్',sequence:'క్రమం',fit:'ఫిట్',follow:'అనుసరించు',breakIt:'లోపం చేర్చు',noFault:'లోపం లేదు',
    play:'ప్లే',pause:'పాజ్',step:'స్టెప్',reset:'రీసెట్',speed:'వేగం',copyLink:'లింక్ కాపీ',export:'PNG ఎగుమతి',theme:'థీమ్',passport:'పాస్‌పోర్ట్',l7:'L7',how:'ఎలా',xray:'ఎక్స్-రే',docs:'డాక్స్',
    flow:'ప్యాకెట్ ప్రవాహం',bytes:'ప్యాకెట్ బైట్లు',before:'ముందు',after:'ఈ హాప్ తర్వాత',forward:'ముందుకు',ret:'తిరుగు',hop:'హాప్',no:'సం.',time:'సమయం',device:'పరికరం',src:'మూలం',dst:'గమ్యం',proto:'ప్రోటోకాల్',info:'వివరం',size:'పరిమాణం',
    loadSample:'నమూనా లోడ్',pasteHere:'ట్రేస్‌రూట్ అవుట్‌పుట్ అతికించండి',clickRow:'బైట్లను చూడటానికి వరుసను క్లిక్ చేయండి.',linkCopied:'లింక్ కాపీ అయింది'},
  hi:{tagline:'एक पैकेट का पीछा करें। हर हॉप देखें।',nowLearning:'अभी सीख रहे हैं',layerFocus:'लेयर',all:'सभी',progress:'सीखने की प्रगति',complete:'पूर्ण',inProgress:'जारी',
    journeys:'यात्राएँ',tools:'टूल',traceTool:'ट्रेसरूट डिकोडर',map:'मैप',sequence:'क्रम',fit:'फ़िट',follow:'अनुसरण',breakIt:'गड़बड़ी जोड़ें',noFault:'कोई गड़बड़ी नहीं',
    play:'चलाएँ',pause:'रोकें',step:'स्टेप',reset:'रीसेट',speed:'गति',copyLink:'लिंक कॉपी',export:'PNG निर्यात',theme:'थीम',passport:'पासपोर्ट',l7:'L7',how:'कैसे',xray:'एक्स-रे',docs:'दस्तावेज़',
    flow:'पैकेट प्रवाह',bytes:'पैकेट बाइट्स',before:'पहले',after:'इस हॉप के बाद',forward:'आगे',ret:'वापसी',hop:'हॉप',no:'क्र.',time:'समय',device:'डिवाइस',src:'स्रोत',dst:'गंतव्य',proto:'प्रोटोकॉल',info:'जानकारी',size:'आकार',
    loadSample:'नमूना लोड करें',pasteHere:'ट्रेसरूट आउटपुट चिपकाएँ',clickRow:'बाइट्स देखने के लिए पंक्ति पर क्लिक करें।',linkCopied:'लिंक कॉपी हुआ'}
};

/* ================= payload helpers ================= */
function dnsName(){const o=[];for(const l of ['www','example','com']){o.push(l.length);for(const ch of l)o.push(ch.charCodeAt(0));}o.push(0);return o;}
const DNSQ=[0xb7,0xa1,0x01,0x00,0,1,0,0,0,0,0,0,...dnsName(),0,1,0,1];
const DNSR=[0xb7,0xa1,0x81,0x80,0,1,0,1,0,0,0,0,...dnsName(),0,1,0,1,0xc0,0x0c,0,1,0,1,0,0,0x01,0x2c,0,4,203,0,113,10];
const ECHO=[0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68];

/* ================= journeys =================
   node.set  = fields this device rewrites (cumulative)      node.router = decrements TTL      node.reset = terminates and re-originates (proxy)
   node.nat  = {mode:'src'|'dst', a, b}                       node.l7ops / node.l7rops = header changes on the forward / return trip
   node.x    = x-ray blocks                                    node.how  = "how it was computed" blocks
   fault.type: ttl (ICMP Time Exceeded returns) | mtu | drop (no reply) | l7 (error response returns)                                     */
const SC = {

/* ---------------------------------------------------------------- 1. website */
web:{
  group:'Internet',short:'Website over the internet',sub:'TCP SYN :443 · NAT, CGNAT, LB',title:'Laptop → web server (TCP SYN to :443)',ttl:64,
  base:{proto:'tcp',flags:0x02,seq:0x6e2f1a90,ack:0},reply:{flags:0x12,seq:0x2a4b8c10,ack:0x6e2f1a91},
  l7:{title:'HTTP/1.1 request (sent after the TCP and TLS handshakes)',note:'On the wire this is encrypted by TLS. This tab shows what the application sends once the connection is up.',hdr:[['Host','www.example.com'],['User-Agent','Mozilla/5.0'],['Accept','text/html'],['Connection','keep-alive']]},
  l7r:{title:'HTTP/1.1 200 OK',hdr:[['Content-Type','text/html; charset=utf-8'],['Content-Length','12800']]},
  docs:['rfc9293','rfc791','rfc3022','rfc8446'],
  nodes:[
   {name:'Laptop',code:'PC',type:'host',zone:'Home',tag:'ORIGIN',ms:0,addr:'192.168.1.23',
    does:'Builds the TCP SYN. It does not know the server\'s MAC, only its default gateway\'s, so the Ethernet frame is addressed to the router while the IP header names the far-away server.',
    set:{ethSrc:'3C:22:FB:A1:09:23',ethDst:'F4:F2:6D:5E:11:A0',ipSrc:'192.168.1.23',ipDst:'142.250.195.46',sport:52144,dport:443},docs:['rfc9293','rfc826'],
    how:[{t:'Why the frame goes to the router',c:'dst IP 142.250.195.46 is not in 192.168.1.0/24\n→ use default route via 192.168.1.1\nARP who-has 192.168.1.1 → F4:F2:6D:5E:11:A0\nframe dst MAC = gateway MAC, IP dst unchanged',d:['rfc826']}],
    x:[{kind:'flow',title:'Host network stack',items:['connect()','TCP: build SYN','IP: route lookup','ARP: gateway MAC','NIC: frame out'],hit:[0,1,2,3,4]},
       {kind:'table',title:'Routing table (longest prefix wins)',cols:['Destination','Gateway','Iface'],rows:[['192.168.1.0/24','—','wlan0'],['0.0.0.0/0','192.168.1.1','wlan0']],hit:[1],note:'142.250.195.46 matches only the default route, so the frame goes to the gateway.'}]},
   {name:'Home router',code:'NAT',type:'nat',router:true,zone:'Home',tag:'SOURCE NAT',ms:2,addr:'192.168.1.1',
    does:'Source NAT. The private source 192.168.1.23:52144 is replaced with the router\'s WAN address and a fresh port, and a translation entry is stored so replies can find their way back. TTL drops by one and both MACs are rewritten for the next link.',
    set:{ethSrc:'F4:F2:6D:5E:11:A1',ethDst:'00:1B:54:C2:7A:01',ipSrc:'100.72.18.5',sport:40012},nat:{mode:'src',a:'192.168.1.23:52144',b:'100.72.18.5:40012'},docs:['rfc3022','rfc1918'],
    x:[{kind:'table',title:'NAT table (conntrack)',cols:['Proto','Inside','Outside','State'],rows:[['tcp','192.168.1.23:52144','100.72.18.5:40012','SYN_SENT']],hit:[0],note:'Created by the first packet; the reply is matched against it.'}]},
   {name:'ISP CGNAT',code:'CG',type:'nat',router:true,zone:'ISP',tag:'CGNAT · 2ND NAT',ms:9,addr:'100.72.0.1',
    does:'The ISP translates again. Your "WAN" address was only 100.64.0.0/10 shared space, so the source is rewritten to a public IP shared with many subscribers. This is why inbound port-forwarding fails behind CGNAT.',
    set:{ethSrc:'00:1B:54:C2:7A:02',ethDst:'00:1B:54:C2:7B:10',ipSrc:'117.200.45.9',sport:21877},nat:{mode:'src',a:'100.72.18.5:40012',b:'117.200.45.9:21877'},docs:['rfc6598','rfc3022'],
    x:[{kind:'table',title:'CGNAT table (shared public IP)',cols:['Proto','Inside','Outside','State'],rows:[['tcp','100.72.18.5:40012','117.200.45.9:21877','SYN_SENT'],['tcp','100.72.31.9:51000','117.200.45.9:21878','ESTABLISHED']],hit:[0],note:'One public IP serves many subscribers; the port tells them apart.'}]},
   {name:'Backbone',code:'R',type:'router',router:true,zone:'Transit',tag:'L3 FORWARD',ms:14,addr:'198.51.100.1',
    does:'Pure routing. Longest-prefix match picks the next hop, TTL drops by one, the IP checksum is recomputed and both MACs change. Addresses and ports are untouched.',
    set:{ethSrc:'A4:7B:2C:00:19:01',ethDst:'A4:7B:2C:00:19:77'},docs:['rfc1812','rfc791'],
    how:[{t:'Longest-prefix match',c:'dst 142.250.195.46\n142.250.0.0/15  → matches (15 bits)\n0.0.0.0/0       → matches (0 bits)\n/15 wins → next hop 198.51.100.2 via ge-0/0/2\nARP next hop → new dst MAC; src MAC = ge-0/0/2',d:['rfc1812']}],
    x:[{kind:'table',title:'Routing table',cols:['Prefix','Next hop','Iface'],rows:[['117.200.45.0/24','connected','ge-0/0/1'],['142.250.0.0/15','198.51.100.2','ge-0/0/2'],['0.0.0.0/0','198.51.100.9','ge-0/0/3']],hit:[1],note:'The /15 is the most specific match, so it beats the default route.'}]},
   {name:'IX peering',code:'IX',type:'router',router:true,zone:'Transit',tag:'L3 FORWARD',ms:22,addr:'198.51.100.2',
    does:'Hand-off between networks at an internet exchange. Same story as any router: new MAC pair, TTL minus one. Most long-haul latency has accumulated before this point.',
    set:{ethSrc:'7C:AD:74:11:30:02',ethDst:'D8:C4:97:63:0A:05'},docs:['rfc1812']},
   {name:'Edge LB',code:'LB',type:'lb',router:true,zone:'Destination',tag:'LB · DNAT',ms:24,addr:'142.250.195.46',
    does:'A layer-4 load balancer picks a backend and rewrites the destination (DNAT) to the backend\'s private address and service port. Real edge fleets differ; this is a generic illustration.',
    set:{ethSrc:'42:01:0A:80:04:01',ethDst:'42:01:0A:80:04:11',ipDst:'10.128.4.17',dport:8443},nat:{mode:'dst',a:'142.250.195.46:443',b:'10.128.4.17:8443'},docs:['rfc3022'],
    x:[{kind:'table',title:'Backend pool',cols:['Backend','Health','Conns'],rows:[['10.128.4.16:8443','UP','412'],['10.128.4.17:8443','UP','397'],['10.128.4.18:8443','DOWN','0']],hit:[1],note:'Algorithm (illustrative): least connections among healthy backends.'}]},
   {name:'Web server',code:'SRV',type:'server',zone:'Destination',tag:'DELIVERED',ms:25,addr:'10.128.4.17',
    does:'The frame\'s MAC matches, the IP matches, the port is listening. The kernel answers with a SYN-ACK that retraces the path in reverse, translated back by each stored entry.',
    set:{},docs:['rfc9293'],x:[{kind:'flow',title:'Server network stack',items:['NIC','IP: dst is me','TCP: port 8443 LISTEN','SYN-ACK queued'],hit:[0,1,2,3]}]}
  ],
  faults:[
   {id:'ttl',at:3,type:'ttl',label:'TTL expires at Backbone',short:'TTL = 0',title:'TTL reached 0 at hop 3',
    body:'The packet left the laptop with a TTL just large enough to die at the backbone router. The router discards it and returns ICMP Time Exceeded (type 11) to the sender, quoting the start of the original packet. This is exactly how traceroute discovers each hop: it sends probes with TTL 1, 2, 3… and listens for those replies. Step forward to watch the ICMP message travel back and get un-NATed.',
    user:'$ traceroute -n 142.250.195.46\n 1  192.168.1.1    1.2 ms\n 2  100.72.0.1      6.8 ms\n 3  198.51.100.1    8.1 ms   <- ICMP Time Exceeded',d:['rfc792','rfc791','rfc1812']},
   {id:'mtu',at:4,type:'mtu',label:'MTU black hole at IX',short:'MTU 1400',title:'Full-size packets vanish at hop 4',
    body:'A link here has MTU 1400. Full 1500-byte segments with DF set must be dropped, and the router should return ICMP "Fragmentation needed". This network filters that ICMP, so the sender never learns and keeps retrying. Small packets (like this SYN) pass, which makes the fault confusing: the connection opens, then large responses stall.',
    user:'$ curl -sv https://example.test\n* Connected to example.test\n* TLS handshake started ... (hangs)\n# small pages work, large responses stall',d:['rfc1191','rfc4821']},
   {id:'drop',at:5,type:'drop',label:'Firewall DROP at Edge LB',short:'DROP',title:'Silently dropped at hop 5',
    body:'A firewall rule uses DROP rather than REJECT, so nothing is sent back. The client waits and retransmits the SYN until it gives up. With REJECT you would get an instant TCP RST or ICMP unreachable, which is much easier to debug.',
    user:'$ curl -m 5 https://example.test\ncurl: (28) Connection timed out after 5001 milliseconds\n$ traceroute -n -T -p 443 example.test\n 6  * * *\n 7  * * *',d:['rfc9293']}
  ]
},

/* ---------------------------------------------------------------- 2. DNS */
dns:{
  group:'Internet',short:'DNS lookup',sub:'UDP :53 · query and answer',title:'Laptop → public resolver (DNS query over UDP)',ttl:64,
  base:{proto:'udp',payload:DNSQ,payName:'DNS query'},reply:{payload:DNSR,payName:'DNS response'},
  msg:{f:'Standard query A www.example.com',r:'Standard query response A 203.0.113.10'},
  l7:{title:'DNS query',note:'DNS over UDP is cleartext: anyone on the path can read the name being looked up (see DoT/DoH for encrypted alternatives).',hdr:[['ID','0xb7a1'],['Flags','0x0100 (standard query, recursion desired)'],['Question','www.example.com IN A']]},
  l7r:{title:'DNS response',hdr:[['ID','0xb7a1'],['Flags','0x8180 (response, recursion available)'],['Answer','www.example.com. 300 IN A 203.0.113.10']]},
  docs:['rfc1035','rfc768','rfc3022'],
  nodes:[
   {name:'Laptop',code:'PC',type:'host',zone:'Home',tag:'ORIGIN',ms:0,addr:'192.168.1.23',
    does:'The stub resolver builds a DNS query for www.example.com (type A) and sends it in a single UDP datagram to the configured resolver. UDP has no handshake: one datagram out, one back.',
    set:{ethSrc:'3C:22:FB:A1:09:23',ethDst:'F4:F2:6D:5E:11:A0',ipSrc:'192.168.1.23',ipDst:'8.8.8.8',sport:41873,dport:53},docs:['rfc1035','rfc768'],
    x:[{kind:'flow',title:'Stub resolver',items:['getaddrinfo()','cache miss','build query','UDP :53'],hit:[0,1,2,3]}]},
   {name:'Home router',code:'NAT',type:'nat',router:true,zone:'Home',tag:'SOURCE NAT',ms:2,addr:'192.168.1.1',
    does:'Many home routers advertise themselves as the DNS server; here the query is simply forwarded and source-NATed like any other UDP flow. The NAT entry is short-lived: UDP has no FIN to say the exchange is over, so it expires on a timer.',
    set:{ethSrc:'F4:F2:6D:5E:11:A1',ethDst:'00:1B:54:C2:7A:01',ipSrc:'100.72.18.5',sport:33011},nat:{mode:'src',a:'192.168.1.23:41873',b:'100.72.18.5:33011'},docs:['rfc3022'],
    x:[{kind:'table',title:'NAT table',cols:['Proto','Inside','Outside','Timeout'],rows:[['udp','192.168.1.23:41873','100.72.18.5:33011','30 s']],hit:[0],note:'UDP entries expire on a timer instead of at connection close.'}]},
   {name:'ISP CGNAT',code:'CG',type:'nat',router:true,zone:'ISP',tag:'CGNAT · 2ND NAT',ms:9,addr:'100.72.0.1',
    does:'Carrier-grade NAT translates the shared 100.64.0.0/10 address into a public one.',
    set:{ethSrc:'00:1B:54:C2:7A:02',ethDst:'00:1B:54:C2:7B:10',ipSrc:'117.200.45.9',sport:21877},nat:{mode:'src',a:'100.72.18.5:33011',b:'117.200.45.9:21877'},docs:['rfc6598']},
   {name:'Backbone',code:'R',type:'router',router:true,zone:'Transit',tag:'L3 FORWARD',ms:14,addr:'198.51.100.1',
    does:'Routes towards the resolver\'s network: TTL minus one, new MAC pair, checksum recomputed.',set:{ethSrc:'A4:7B:2C:00:19:01',ethDst:'A4:7B:2C:00:19:77'},docs:['rfc1812']},
   {name:'Public resolver',code:'DNS',type:'server',zone:'Resolver',tag:'RECURSIVE RESOLVER',ms:18,addr:'8.8.8.8',
    does:'The recursive resolver checks its cache. On a miss it would walk root → .com TLD → authoritative servers; here it answers from cache with the A record 203.0.113.10 (TTL 300 s).',
    set:{ethSrc:'42:01:0A:F0:00:01',ethDst:'42:01:0A:F0:00:09'},docs:['rfc1035'],
    x:[{kind:'flow',title:'Recursive resolution',items:['cache lookup','miss → root','→ .com TLD','→ authoritative','answer cached'],hit:[0],note:'Highlighted: the cache hit this example takes. On a miss the other steps run.'}]}
  ],
  faults:[
   {id:'drop',at:3,type:'drop',label:'UDP/53 filtered at Backbone',short:'DROP :53',title:'DNS datagrams silently dropped at hop 3',
    body:'A filter drops DNS. UDP has no retransmission built in, so the stub resolver waits for its timeout (often 5 s), retries, then tries the next server. Users see slow page loads rather than a clean error, which is why DNS problems look like "the internet is slow".',
    user:'$ dig @8.8.8.8 www.example.com +time=2 +tries=1\n;; communications error to 8.8.8.8#53: timed out',d:['rfc1035','rfc768']}
  ]
},

/* ---------------------------------------------------------------- 3. ping */
ping:{
  group:'Internet',short:'Ping and traceroute',sub:'ICMP echo · TTL and ICMP errors',title:'Laptop → server (ICMP echo request)',ttl:64,
  base:{proto:'icmp',type:8,code:0,id:0x1a2b,seq:1,payload:ECHO,payName:'Echo data'},reply:{type:0},
  msg:{f:'Echo (ping) request',r:'Echo (ping) reply'},
  l7:null,l7r:null,docs:['rfc792','rfc791','rfc1812'],
  nodes:[
   {name:'Laptop',code:'PC',type:'host',zone:'Home',tag:'ORIGIN',ms:0,addr:'192.168.1.23',
    does:'ping builds an ICMP echo request (type 8) with an identifier and sequence number. ICMP rides directly on IP, with no ports, so NAT matches replies using the identifier instead.',
    set:{ethSrc:'3C:22:FB:A1:09:23',ethDst:'F4:F2:6D:5E:11:A0',ipSrc:'192.168.1.23',ipDst:'203.0.113.10'},docs:['rfc792']},
   {name:'Home router',code:'NAT',type:'nat',router:true,zone:'Home',tag:'SOURCE NAT',ms:2,addr:'192.168.1.1',
    does:'Rewrites the source address and also the echo identifier, which plays the role of a port for ICMP. TTL minus one.',
    set:{ethSrc:'F4:F2:6D:5E:11:A1',ethDst:'00:1B:54:C2:7A:01',ipSrc:'100.72.18.5',id:0x4c11},nat:{mode:'src',a:'192.168.1.23 id 0x1a2b',b:'100.72.18.5 id 0x4c11'},docs:['rfc3022']},
   {name:'ISP CGNAT',code:'CG',type:'nat',router:true,zone:'ISP',tag:'CGNAT · 2ND NAT',ms:9,addr:'100.72.0.1',
    does:'A second translation to a public address, again remapping the identifier.',
    set:{ethSrc:'00:1B:54:C2:7A:02',ethDst:'00:1B:54:C2:7B:10',ipSrc:'117.200.45.9',id:0x5d02},nat:{mode:'src',a:'100.72.18.5 id 0x4c11',b:'117.200.45.9 id 0x5d02'},docs:['rfc6598']},
   {name:'Backbone',code:'R',type:'router',router:true,zone:'Transit',tag:'L3 FORWARD',ms:14,addr:'198.51.100.1',
    does:'Plain forwarding. This is hop 4 of the path: traceroute would show this router when it sends a probe with TTL 4.',set:{ethSrc:'A4:7B:2C:00:19:01',ethDst:'A4:7B:2C:00:19:77'},docs:['rfc1812']},
   {name:'IX peering',code:'IX',type:'router',router:true,zone:'Transit',tag:'L3 FORWARD',ms:22,addr:'198.51.100.2',
    does:'Another router hop towards the destination network.',set:{ethSrc:'7C:AD:74:11:30:02',ethDst:'D8:C4:97:63:0A:05'},docs:['rfc1812']},
   {name:'Server',code:'SRV',type:'server',zone:'Destination',tag:'ECHO REPLY',ms:25,addr:'203.0.113.10',
    does:'The kernel answers every echo request with an echo reply (type 0), copying the identifier, sequence number and data.',set:{ethSrc:'42:01:0A:80:04:01',ethDst:'42:01:0A:80:04:11'},docs:['rfc792']}
  ],
  faults:[
   {id:'ttl',at:3,type:'ttl',label:'TTL expires at hop 4 (traceroute)',short:'TTL = 0',title:'TTL reached 0 at the Backbone router',
    body:'Traceroute sends probes with increasing TTL. This one starts with a TTL that runs out at the Backbone router, which returns ICMP Time Exceeded. The source address of that error is what traceroute prints as the hop. Step forward to see it travel back.',
    user:'$ traceroute -n -I 203.0.113.10\n 1  192.168.1.1    1.2 ms\n 2  100.72.0.1      6.8 ms\n 3  198.51.100.1    8.1 ms   <- this router',d:['rfc792','rfc791']},
   {id:'drop',at:4,type:'drop',label:'ICMP echo blocked at IX',short:'DROP ICMP',title:'Echo requests dropped at hop 5',
    body:'A firewall blocks ICMP echo. Ping shows 100% loss even though TCP connections to the same host may work, so "ping fails" does not always mean "host down". Test the real service port instead.',
    user:'$ ping -c 3 203.0.113.10\n3 packets transmitted, 0 received, 100% packet loss\n$ curl -sI https://203.0.113.10   # works',d:['rfc792']}
  ]
},

/* ---------------------------------------------------------------- 4. AWS */
aws:{
  group:'Cloud',short:'AWS: private subnet to internet',sub:'Route table · NAT gateway · IGW',title:'EC2 in a private subnet → internet (via NAT gateway)',ttl:64,
  base:{proto:'tcp',flags:0x02,seq:0x7a1c0e44,ack:0},reply:{flags:0x12,seq:0x31d0aa05,ack:0x7a1c0e45},
  l7:{title:'HTTPS request (encrypted in flight)',note:'Illustrative: the packet shown is the TCP SYN that precedes TLS.',hdr:[['Host','api.example.com'],['Accept','application/json']]},
  l7r:{title:'HTTP/1.1 200 OK',hdr:[['Content-Type','application/json']]},
  docs:['awsrt','awsnat','awsigw','awssg','awsacl'],
  nodes:[
   {name:'EC2 instance',code:'EC2',type:'host',zone:'Private subnet 10.0.1.0/24',tag:'ORIGIN',ms:0,addr:'10.0.1.25',
    does:'The instance has only a private address. Its default route points at the subnet\'s VPC router, so the frame goes there first. The security group is stateful: allowing outbound 443 automatically allows the reply.',
    set:{ethSrc:'0A:77:0E:A4:3D:10',ethDst:'0A:C3:5E:1B:90:01',ipSrc:'10.0.1.25',ipDst:'203.0.113.10',sport:50122,dport:443},docs:['awssg'],
    x:[{kind:'table',title:'Security group (outbound)',cols:['Type','Destination','Action'],rows:[['HTTPS 443','0.0.0.0/0','ALLOW']],hit:[0],note:'Stateful: return traffic is allowed automatically.'}]},
   {name:'VPC router',code:'RT',type:'router',router:true,zone:'Private subnet 10.0.1.0/24',tag:'ROUTE TABLE',ms:1,addr:'10.0.1.1',
    does:'The VPC router consults the subnet\'s route table. The default route targets the NAT gateway, so the next hop is the NAT gateway\'s network interface. The subnet\'s network ACL is checked here too, and is stateless.',
    set:{ethSrc:'0A:C3:5E:1B:90:01',ethDst:'0A:77:0E:A4:3D:12'},docs:['awsrt','awsacl'],
    how:[{t:'Route table lookup',c:'dst 203.0.113.10\n10.0.0.0/16  local            (no match)\n0.0.0.0/0    nat-0a1b2c3d4e5f (match)\n→ forward to the NAT gateway interface',d:['awsrt']}],
    x:[{kind:'table',title:'Route table (private subnet)',cols:['Destination','Target'],rows:[['10.0.0.0/16','local'],['0.0.0.0/0','nat-0a1b2c3d4e5f']],hit:[1],note:'The most specific match wins; only the default route matches the internet address.'},
       {kind:'table',title:'Network ACL (outbound, stateless)',cols:['Rule','Action','Match'],rows:[['100','ALLOW','tcp 443 → 0.0.0.0/0'],['*','DENY','everything else']],hit:[0],note:'Stateless: the return path (ephemeral ports) needs its own inbound rule.'}]},
   {name:'NAT gateway',code:'NAT',type:'nat',router:true,zone:'Public subnet 10.0.0.0/24',tag:'SOURCE NAT',ms:2,addr:'10.0.0.50',
    does:'The NAT gateway replaces the instance\'s private source with its own private address and a new port, and remembers the mapping. Outside the VPC its Elastic IP will stand in for that address.',
    set:{ethSrc:'0A:77:0E:A4:3D:12',ethDst:'0A:C3:5E:1B:90:02',ipSrc:'10.0.0.50',sport:1024},nat:{mode:'src',a:'10.0.1.25:50122',b:'10.0.0.50:1024'},docs:['awsnat']},
   {name:'Internet gateway',code:'IGW',type:'nat',router:true,zone:'VPC edge',tag:'1:1 NAT TO EIP',ms:3,addr:'igw-0f1e2d3c',
    does:'The internet gateway performs one-to-one NAT between a private address and its public (Elastic) IP, without changing ports. After this hop the source is the public address the internet sees.',
    set:{ethSrc:'0A:C3:5E:1B:90:02',ethDst:'0A:C3:5E:1B:90:03',ipSrc:'198.51.100.77'},nat:{mode:'src',a:'10.0.0.50',b:'198.51.100.77 (Elastic IP)'},docs:['awsigw']},
   {name:'Internet server',code:'SRV',type:'server',zone:'Internet',tag:'DELIVERED',ms:18,addr:'203.0.113.10',
    does:'The server sees the NAT gateway\'s Elastic IP as the client. The reply goes to that address and is translated back at the IGW and the NAT gateway.',set:{ethSrc:'42:01:0A:80:00:01',ethDst:'42:01:0A:80:00:09'},docs:['rfc9293']}
  ],
  faults:[
   {id:'noroute',at:1,type:'drop',label:'No route to the NAT gateway',short:'BLACKHOLE',title:'Route table blackhole at the VPC router',
    body:'The private subnet\'s route table has no 0.0.0.0/0 entry (or it points at a deleted NAT gateway, shown as "blackhole"). Traffic to the internet has nowhere to go and is dropped. The instance just times out: there is no ICMP error.',
    user:'$ curl -m 5 https://api.example.com\ncurl: (28) Connection timed out\n$ aws ec2 describe-route-tables ...   # 0.0.0.0/0  State: blackhole',d:['awsrt']},
   {id:'noigw',at:2,type:'drop',label:'Public subnet has no route to IGW',short:'NO IGW ROUTE',title:'NAT gateway cannot reach the internet',
    body:'The NAT gateway lives in a public subnet whose route table lacks 0.0.0.0/0 → internet gateway. The private instance\'s route and the NAT translation are fine, yet packets die after the NAT gateway. A very common mistake is putting the NAT gateway in a private subnet.',
    user:'$ curl -m 5 https://api.example.com\ncurl: (28) Connection timed out\n# check: public subnet route table must contain 0.0.0.0/0 → igw-…',d:['awsnat','awsigw']}
  ]
},

/* ---------------------------------------------------------------- 5. Kubernetes */
k8s:{
  group:'Kubernetes',short:'Pod → Service → Pod',sub:'kube-proxy DNAT · VXLAN overlay',title:'Pod → Service → Pod on another node (VXLAN overlay)',ttl:64,
  base:{proto:'tcp',flags:0x02,seq:0x5c3a9e21,ack:0},reply:{flags:0x12,seq:0x1f6d7a30,ack:0x5c3a9e22},
  l7:{title:'HTTP request (cleartext inside the cluster)',note:'Service traffic is usually plain HTTP unless a mesh adds mTLS.',hdr:[['Host','web-svc'],['User-Agent','curl/8.5.0'],['Accept','*/*']]},
  l7r:{title:'HTTP/1.1 200 OK',hdr:[['Content-Type','application/json'],['Content-Length','42']]},
  docs:['k8ssvc','k8svip','k8snet','rfc7348','nf'],
  nodes:[
   {name:'Pod web',code:'POD',type:'pod',zone:'Node 1',tag:'ORIGIN',ms:0,addr:'10.244.1.5',
    does:'The app calls the Service name. DNS returns the ClusterIP 10.96.0.20, a virtual address that no interface owns. The frame goes to the node\'s bridge or veth peer.',
    set:{ethSrc:'AA:3E:19:7C:42:05',ethDst:'B2:55:0C:98:11:01',ipSrc:'10.244.1.5',ipDst:'10.96.0.20',sport:48822,dport:80},docs:['k8ssvc'],
    x:[{kind:'flow',title:'Inside the pod',items:['app','eth0 (veth)','host bridge / CNI'],hit:[0,1,2]}]},
   {name:'Node 1 iptables',code:'NF',type:'nat',router:true,zone:'Node 1',tag:'KUBE-PROXY DNAT',ms:0.2,addr:'10.0.0.11',
    does:'netfilter PREROUTING matches KUBE-SERVICES for 10.96.0.20:80, jumps to the Service chain, picks an endpoint at random and DNATs to the pod 10.244.2.9:8080. conntrack records the pairing so the reply is translated back.',
    set:{ethSrc:'C6:90:4A:11:D3:08',ethDst:'7E:21:A4:CB:03:2F',ipDst:'10.244.2.9',dport:8080},nat:{mode:'dst',a:'10.96.0.20:80',b:'10.244.2.9:8080'},docs:['k8svip','nf'],
    x:[{kind:'flow',title:'iptables chains traversed',items:['PREROUTING','KUBE-SERVICES','KUBE-SVC-XXXX','KUBE-SEP-YYYY (DNAT)','POSTROUTING'],hit:[0,1,2,3,4],note:'The Service chain picks one endpoint with a probability rule.'}]},
   {name:'VXLAN encap',code:'VX',type:'tunnel',zone:'Node 1',tag:'ENCAPSULATED',ms:0.4,addr:'flannel.1',
    does:'The overlay device wraps the entire original frame inside UDP/VXLAN addressed to Node 2\'s real IP. The inner packet is unchanged; the extra outer headers (about 50 bytes) are what the physical network will see.',
    set:{outer:'10.0.0.11 → 10.0.0.12 · UDP 8472 · VNI 1  (+50 B)'},docs:['rfc7348','k8snet'],
    x:[{kind:'table',title:'Outer headers added',cols:['Layer','Value'],rows:[['Outer Ethernet','Node 1 → fabric'],['Outer IPv4','10.0.0.11 → 10.0.0.12'],['Outer UDP','dst port 8472'],['VXLAN','VNI 1'],['Inner frame','as sent by the pod']],hit:[1,2,3],note:'50 bytes of overhead: why the pod MTU must be about 1450 on a 1500 underlay.'}]},
   {name:'Underlay',code:'SW',type:'switch',zone:'Fabric',tag:'OUTER HEADERS ONLY',ms:0.7,addr:'ToR switch',
    does:'The datacenter network forwards on the outer headers only. It cannot see pod IPs, so pod-level ACLs there do nothing, but it must allow UDP 8472 and carry the extra 50 bytes without fragmenting.',set:{},docs:['rfc7348']},
   {name:'VXLAN decap',code:'VX',type:'tunnel',router:true,zone:'Node 2',tag:'DECAPSULATED',ms:1.0,addr:'flannel.1',
    does:'Node 2 strips the outer headers, routes the inner packet to its local bridge and rewrites the MACs toward the destination pod. TTL drops once more.',
    set:{outer:'',ethSrc:'0A:58:0A:F4:02:01',ethDst:'0A:58:0A:F4:02:09'},docs:['rfc7348']},
   {name:'Pod api',code:'POD',type:'pod',zone:'Node 2',tag:'DELIVERED',ms:1.1,addr:'10.244.2.9',
    does:'The pod sees the original source (10.244.1.5) and its own address and port. The reply is un-DNATed on Node 1 so the client still thinks it talked to 10.96.0.20:80.',set:{},docs:['k8ssvc']}
  ],
  faults:[
   {id:'vxlan',at:3,type:'drop',label:'Underlay blocks UDP 8472',short:'DROP 8472',title:'VXLAN traffic dropped at the underlay',
    body:'A firewall or cloud security group does not allow UDP 8472 between nodes. Pods on the same node talk fine, but every cross-node call times out. The Service looks healthy and kube-proxy rules are correct, which is what makes this fault expensive to find.',
    user:'$ kubectl exec web -- curl -m 3 web-svc\ncurl: (28) Connection timed out\n$ kubectl exec web -- curl -m 3 10.244.1.8:8080   # same node\nok',d:['k8snet','rfc7348']},
   {id:'mtu',at:3,type:'mtu',label:'Overlay MTU too big',short:'MTU',title:'Encapsulated packet exceeds the underlay MTU',
    body:'Underlay MTU is 1500 but the pod interface also allows 1500. Adding 50 bytes of VXLAN overhead makes full-size packets 1550, so they are dropped or fragmented. Tiny requests work and large responses hang. Fix: set the CNI/pod MTU to about 1450.',
    user:'$ kubectl exec web -- curl -s web-svc/health     # works\n$ kubectl exec web -- curl -s web-svc/big.json   # hangs\n$ ip link show flannel.1 | grep mtu\n... mtu 1500   <- should be 1450',d:['rfc7348','rfc1191']}
  ]
},

/* ---------------------------------------------------------------- 6. API gateway (L7 lens) */
api:{
  group:'API & Auth',short:'API through CDN and gateway',sub:'L7 hop-by-hop headers · auth at the hop',title:'Client → CDN → WAF → API gateway → service',ttl:64,
  base:{proto:'tcp',flags:0x02,seq:0x3b8f21c6,ack:0},reply:{flags:0x12,seq:0x6a02e1d9,ack:0x3b8f21c7},
  l7:{title:'HTTP request headers at this hop',note:'Each proxy terminates the connection and opens a new one, so L2–L4 are rebuilt at every proxy while headers are added, stripped or rewritten.',
      hdr:[['Host','api.example.com'],['Authorization','Bearer eyJhbGciOiJSUzI1NiJ9…'],['Cookie','sid=9f2c41…'],['Connection','keep-alive'],['Keep-Alive','timeout=5'],['Accept','application/json']]},
  l7r:{title:'HTTP response headers at this hop',hdr:[['Content-Type','application/json'],['Cache-Control','no-store'],['Server','orders-svc/1.4']]},
  docs:['rfc9110','rfc7239','w3tc','rfc8693','rfc6750','rfc7519'],
  nodes:[
   {name:'Client',code:'PC',type:'host',zone:'Home',tag:'ORIGIN',ms:0,addr:'192.168.1.23',
    does:'The client opens a TCP connection to the CDN\'s anycast address and will send an HTTPS request carrying a bearer token and a session cookie. Connection and Keep-Alive are hop-by-hop headers: they describe this single connection only.',
    set:{ethSrc:'3C:22:FB:A1:09:23',ethDst:'F4:F2:6D:5E:11:A0',ipSrc:'192.168.1.23',ipDst:'203.0.113.80',sport:52144,dport:443},docs:['rfc9110']},
   {name:'Home router',code:'NAT',type:'nat',router:true,zone:'Home',tag:'SOURCE NAT',ms:2,addr:'192.168.1.1',
    does:'Source NAT as before. Nothing at layer 7 changes: a NAT never reads or edits HTTP.',
    set:{ethSrc:'F4:F2:6D:5E:11:A1',ethDst:'00:1B:54:C2:7A:01',ipSrc:'117.200.45.9',sport:40012},nat:{mode:'src',a:'192.168.1.23:52144',b:'117.200.45.9:40012'},docs:['rfc3022']},
   {name:'CDN edge',code:'CDN',type:'proxy',reset:true,zone:'CDN',tag:'TLS TERMINATION · PROXY',ms:9,addr:'203.0.113.80',
    does:'The CDN terminates TLS and the client\'s TCP connection, then opens a new one to the origin. It strips the hop-by-hop headers (Connection, Keep-Alive), records the client address in X-Forwarded-For and adds a Via header. Note the new source IP, ports and a fresh TTL.',
    set:{ethSrc:'42:01:0A:E1:00:01',ethDst:'42:01:0A:E1:00:07',ipSrc:'203.0.113.81',ipDst:'198.51.100.20',sport:38201,dport:443},
    l7ops:{del:['Connection','Keep-Alive'],add:[['X-Forwarded-For','117.200.45.9'],['Via','1.1 cdn-edge']]},l7rops:{add:[['Via','1.1 cdn-edge']]},docs:['rfc9110','rfc7239','rfc8446'],
    x:[{kind:'table',title:'Header policy at the CDN',cols:['Header','Action'],rows:[['Connection, Keep-Alive','strip (hop-by-hop)'],['X-Forwarded-For','append client IP'],['Via','add'],['Authorization, Cookie','pass through']],hit:[0,1,2]}]},
   {name:'WAF / LB',code:'WAF',type:'proxy',reset:true,zone:'Cloud edge',tag:'WAF · LOAD BALANCER',ms:14,addr:'198.51.100.20',
    does:'The WAF inspects the request against its rules, assigns a request ID and propagates trace context so one request can be followed across services, then forwards to the API gateway on yet another connection.',
    set:{ethSrc:'42:01:0A:80:00:14',ethDst:'42:01:0A:80:00:0A',ipSrc:'10.20.0.5',ipDst:'10.20.0.10',sport:44110,dport:8080},
    l7ops:{add:[['X-Request-Id','7f3a91c2'],['traceparent','00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01']]},l7rops:{del:['Server']},docs:['w3tc','rfc9110'],
    x:[{kind:'table',title:'WAF rule evaluation',cols:['Rule','Result'],rows:[['SQL injection signatures','pass'],['Request size < 1 MB','pass'],['Rate limit 100/min per IP','pass'],['Geo block list','pass']],hit:[0,1,2,3]}]},
   {name:'API gateway',code:'GW',type:'proxy',reset:true,zone:'Platform',tag:'AUTHN · TOKEN EXCHANGE',ms:16,addr:'10.20.0.10',
    does:'The gateway validates the JWT (signature, expiry, audience), then replaces the external token with a short-lived internal one (token exchange), drops the browser cookie and tells the service who the caller is. The network never sees these decisions: only the headers do.',
    set:{ethSrc:'0A:20:00:0A:00:01',ethDst:'0A:20:01:0F:00:01',ipSrc:'10.20.0.10',ipDst:'10.20.1.15',sport:51022,dport:9000},
    l7ops:{del:['Cookie'],mod:{Authorization:'Bearer <internal-token>'},add:[['X-User-Id','u-1842']]},l7rops:{add:[['X-RateLimit-Remaining','98']]},docs:['rfc7519','rfc8693','rfc6750'],
    how:[{t:'JWT validation (RFC 7519)',c:'1. split token into header.payload.signature\n2. fetch the issuer\'s public key (kid)\n3. verify RS256 signature\n4. check exp > now, aud == api.example.com, iss trusted\n5. allow → exchange for internal token (RFC 8693)',d:['rfc7519','rfc8693']}],
    x:[{kind:'flow',title:'Gateway pipeline',items:['TLS / mTLS','validate JWT','rate limit','token exchange','route to service'],hit:[1,3,4],note:'On failure the gateway answers 401 itself; the request never reaches the service.'}]},
   {name:'Orders service',code:'SVC',type:'pod',zone:'Platform',tag:'DELIVERED',ms:17,addr:'10.20.1.15',
    does:'The service receives a clean request: internal token, caller identity, trace context and no cookie. It never sees the client\'s address except through X-Forwarded-For, which is why logs must read that header and not the TCP source.',set:{},docs:['rfc7239','w3tc']}
  ],
  faults:[
   {id:'jwt',at:4,type:'l7',label:'JWT rejected at the gateway',short:'401',title:'The gateway answers 401: nothing is wrong with the network',
    resp:{title:'HTTP/1.1 401 Unauthorized',hdr:[['WWW-Authenticate','Bearer error="invalid_token"'],['Content-Type','application/json']]},
    body:'Layer 2–4 look perfect and the packet reaches the gateway. The gateway checks the JWT (signature, exp, aud), finds it expired and answers 401 itself. A network-only view would show a healthy path, which is exactly why the L7 tab matters. Step forward to see the error travel back.',
    user:'$ curl -i https://api.example.com/orders\nHTTP/2 401\nwww-authenticate: Bearer error="invalid_token", error_description="The token expired"',d:['rfc6750','rfc7519']},
   {id:'waf',at:3,type:'drop',label:'WAF drops the request',short:'DROP',title:'WAF rule silently drops the request',
    body:'A WAF rule matches and drops the connection without a response. The client sees a timeout or reset rather than an HTTP error, so application logs stay empty: check the WAF logs first.',
    user:'$ curl -m 5 https://api.example.com/orders\ncurl: (28) Operation timed out\n# service logs: nothing. WAF logs: rule 942100 blocked',d:['rfc9110']}
  ]
}
};
