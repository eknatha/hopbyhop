/* ================= data5.js: story text and geography ================= */
const STORY = {
  web:[
    ['Your laptop decides who to ask','The laptop wants a web page. The server is far outside your home network, so it does not ask the server directly. It hands the packet to the one neighbour it knows: your router.'],
    ['The home router swaps your name tag','Your laptop only has a private address, which means nothing on the internet. The router writes its own public-facing address on the packet and remembers who asked, like a receptionist logging a call.'],
    ['Your ISP does it again','Your ISP has too few addresses, so many homes share one. Another swap, another note in a ledger. This is why hosting something at home is hard on some connections.'],
    ['Out onto the backbone','Now the packet is just freight. The router reads the destination, picks the best next road and moves on. It does not care what is inside.'],
    ['Handing over at the exchange','Networks meet at internet exchanges and hand traffic across. Most of the distance, and most of the delay, is behind us.'],
    ['The front door picks a server','The company has many servers behind one address. The load balancer chooses a healthy one and rewrites the destination to point at it.'],
    ['Arrival','The right machine, the right door, something listening. It answers, and the reply retraces every step, undoing each swap using the notes left on the way in.']
  ],
  dns:[
    ['A question, not a download','Before anything loads, the laptop has to turn a name into a number. It sends a tiny question over UDP: what is the address of this name?'],
    ['Router remembers the asker','The router rewrites the sender so the answer can find its way back, and keeps a short-lived note of who asked.'],
    ['The ISP translates again','A second swap by the carrier. The question is still only a few dozen bytes.'],
    ['Across the backbone','Plain routing. Each router lowers the hop counter by one and passes it on.'],
    ['The resolver answers','The public resolver looks the name up or finds it in its memory, and replies with the address you needed. The first of many steps to a web page.']
  ],
  ping:[
    ['The shortest message','A ping is the smallest possible question: are you there? It carries no application at all, only an echo request.'],
    ['Home router','The router forwards it and rewrites the sender, just like any other traffic.'],
    ['ISP','Another translation, another note in the ledger.'],
    ['Backbone','Routers count down the hop limit as the request passes.'],
    ['Exchange','Another network, another hand-off.'],
    ['The server answers','It echoes the same bytes back. The time between send and return is the round-trip time you see in the terminal.']
  ],
  aws:[
    ['An instance with a private address','The instance only knows its private VPC address. It sends toward its subnet router.'],
    ['The VPC router','Route tables decide where the packet goes. A route to the internet gateway is the line between a private and a public subnet.'],
    ['NAT gateway','Private instances share one public address through the NAT gateway, which tracks each conversation.'],
    ['Internet gateway','The doorway between the VPC and the public internet, which swaps private and public addresses.'],
    ['The internet server','Delivered. The reply returns the same way and each translation is undone.']
  ],
  k8s:[
    ['One pod calls another','A pod talks to a service as if it were a normal server, with no idea the target lives on a different machine.'],
    ['The node rewrites the destination','iptables rules on the node swap the service address for a real pod address, chosen from the available backends.'],
    ['Wrapped for the trip','The packet is placed inside another packet so it can cross the physical network between nodes.'],
    ['The underlay','The data centre network only sees node-to-node traffic. It has no idea pods exist.'],
    ['Unwrapped','The receiving node strips the outer wrapper and finds the original packet intact.'],
    ['The target pod','Delivered to the right pod. The reply takes the same path home.']
  ],
  api:[
    ['An app calls an API','A client sends a request. Behind that, it is the same packet journey as any other.'],
    ['Home router','NAT as usual before heading out.'],
    ['The CDN edge','The nearest edge location catches the request first. It can answer from cache or pass it on.'],
    ['The firewall','The web application firewall inspects the request and blocks anything that looks like an attack.'],
    ['The API gateway','Authentication, rate limits and routing happen here before any service sees the request.'],
    ['The service','The real work happens here. The answer returns along the same chain.']
  ],
  quic:[
    ['One round trip, not three','QUIC rides on UDP and folds the transport and security handshakes together. The first packet already carries a cryptographic hello.'],
    ['Home router','The router tracks the UDP flow with a short timer. Lose that entry and the connection looks new.'],
    ['ISP','Another translation. UDP flows live as long as the NAT remembers them.'],
    ['A firewall that may say no','Some networks block UDP 443 altogether, and the browser quietly falls back to TCP.'],
    ['Backbone','Plain forwarding.'],
    ['The CDN answers','The server completes the handshake and the page starts flowing sooner than with TCP plus TLS.']
  ],
  wg:[
    ['Inside the tunnel','Traffic for the office is wrapped before it leaves the laptop. The ISP sees only a small UDP stream.'],
    ['The WireGuard peer','Each peer is known by a key. Only addresses on its allowed list may pass.'],
    ['Home NAT','The router sees ordinary UDP and translates it. Keepalives hold the mapping open.'],
    ['The internet','Everything between you and the office sees encrypted packets only.'],
    ['The office gateway','The outer wrapper comes off and the inner packet is routed.'],
    ['The internal server','Delivered, as if you were sitting in the office.']
  ],
  dhcp:[
    ['A shout into the room','The laptop has no address yet, so it broadcasts: is there a DHCP server out there?'],
    ['The switch','A switch forwards a broadcast to every port in the LAN.'],
    ['The relay','Broadcasts do not cross routers. The relay forwards the request to the server as a normal packet.'],
    ['The DHCP server','It picks a free address and offers it, along with a gateway and DNS servers.']
  ],
  netfilter:[
    ['A packet arrives','Inside the Linux box, the story starts at the network card.'],
    ['The NIC','The frame is checked and handed to the kernel.'],
    ['PREROUTING','Destination rewrites happen first, before the kernel decides where the packet goes.'],
    ['The routing decision','Is it for me, or for someone else? The routing table answers.'],
    ['FORWARD','Filter rules decide whether transit traffic is allowed.'],
    ['POSTROUTING','Source rewrites (masquerade) happen last, on the way out.'],
    ['The uplink','The packet leaves with a new source address.'],
    ['The server','Delivered. The reply is matched to the connection tracking entry.']
  ],
  cdn:[
    ['A visitor asks for a page','The visitor wants a file. The nearest CDN edge location catches the request first.'],
    ['The ISP','Normal transit, nothing special.'],
    ['The edge cache','If the file is cached and fresh, it is returned right here. Otherwise the edge asks further back.'],
    ['The shield tier','A second cache layer protects the origin from the whole world asking at once.'],
    ['The origin','Only a miss reaches the origin. The result flows back and is cached for the next visitor.']
  ],
  cftun:[
    ['A visitor asks for a private app','The app has no public address and no open port. The visitor reaches the nearest edge instead.'],
    ['The edge','The edge checks the visitor against policy before anything else.'],
    ['The tunnel','The connector inside the private network dialled out to the edge earlier, so traffic can flow back in over that connection.'],
    ['The connector','It looks up the hostname in its ingress rules to find the local service.'],
    ['The private app','Delivered, without ever opening an inbound port.']
  ]
};
const GEOMASK = {"W":144,"H":64,"LAT0":82,"LAT1":-58,"b64":"AAAAAC/7///AAAAAAAYAAAAAAAAAEz/P//8ABwAAAADAAAAAAAABiP8P//4AAAAAMAD4AAAAAAADAAAAf/8AAAACAD/wAAAAAAADfY/AP/wAAAAEGf//4PAAAf4QfyN4P/4AAPAAG/////8Ig///1v5cH+AAA/8v+///////d/////g6HwPAB7z/////////Ef////AcHgAAH3//////////A////8BgDgAAPn////////74AeD//8ByAAAAPn///////4SAAKAf//B+AAACFv///////gOAAgAP//7/gAAHEP///////AOAAAAH//5/wAALv////////4IAAAAH///9AAACf////////0AAAAAD///84AAD/////////wAAAAAD////AAAA//Xn/////gAAAAAD///wAAAB6+Dv/////EAAAAAD///wAAAPhOZz////8AAAAAAD///AAAAPEp/3////IIAAAAAB//+AAAAOBB/z////kQAAAAAA///AAAAH8Af/////BwAAAAAAf/8AAAAP+IP/////CAAAAAAAH/4AAAAP/v//////gAAAAAAAP4EAAAAf///v////gAAAAAAAD4EAAAA///3z////AAAAAAAAB4AAAAA///3+H//+gAAAAAAAA4CAAAB///7/D/f4AAAAAAAAA4gQAAB///7+B8fAAAAAAAAAAfgAAAA///58B4PggAAAAAAAAB4AAAB///94AwHwgAAAAAAAAAYAAAB////AAwHwwAAAAAAAAAI4AAA///+QAwFgAAAAAAAAAAF/AAAf///wAAEAIAAAAAAAAAB/gAAP///wAICAIAAAAAAAAAB/4AAAL//gAAKCAAAAAAAAAAB/8AAAD//AAAFOAAAAAAAAAAD/8AAAD/+AAADOAAAAAAAAAAD//AAAD/8AAADOhQAAAAAAAAH//4AAB/8AAABAA8AAAAAAAAD//8AAB/8AAAAoAeAAAAAAAAD//8AAB/8AAAAAoIAAAAAAAAB//4AAB/8AAAAAAAAAAAAAAAB//4AAB/8AAAAADgAAAAAAAAA//wAAB/8QAAAAPEAAAAAAAAAf/wAAB/4wAAAAf8AAAAAAAAAP/wAAB/wwAAAA/+AAAAAAAAAP/wAAA/xgAAAD//AgAAAAAAAP+AAAA/xgAAAH//gAAAAAAAAP+AAAA/gAAAAH//gAAAAAAAAf8AAAA/gAAAAD//gAAAAAAAAf8AAAAfAAAAAD//gAAAAAAAAf4AAAAeAAAAADw/gAAAAAAAAfgAAAAAAAAAAAAfAAAAAAAAAfgAAAAAAAAAAAAPAAAAAAAAAeAAAAAAAAAAAAAAACAAAAAAA8AAAAAAAAAAAAACAEAAAAAAAcAAAAAAAAAAAAAAAIAAAAAAA4AAAAAAAAAAAAAAAQAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"};
(function geoPatch(){
  const G = {
    web:[[12.97,77.59],[12.97,77.59],[13.08,80.27],[1.35,103.82],[1.35,103.82],[37.42,-122.08],[37.42,-122.08]],
    dns:[[12.97,77.59],[12.97,77.59],[13.08,80.27],[19.08,72.88],[19.08,72.88]],
    ping:[[12.97,77.59],[12.97,77.59],[13.08,80.27],[19.08,72.88],[50.11,8.68],[50.11,8.68]]
  };
  for (const k in G) G[k].forEach((g, i) => { if (SC[k] && SC[k].nodes[i] && !SC[k].nodes[i].geo) SC[k].nodes[i].geo = g; });
})();
