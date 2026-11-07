"use strict";
/* ============ extra docs (official sources only) ============ */
Object.assign(DOCS, {
  rfc4271:{l:'RFC 4271 · BGP-4',u:R(4271),k:'Standard',s:'Draft Standard'},
  rfc7908:{l:'RFC 7908 · BGP route leaks',u:R(7908),k:'Standard',s:'Informational'},
  rfc7454:{l:'RFC 7454 · BGP operations and security',u:R(7454),k:'Standard',s:'BCP 194'},
  rfc4301:{l:'RFC 4301 · IPsec architecture',u:R(4301),k:'Standard',s:'Proposed Standard'},
  rfc4303:{l:'RFC 4303 · IPsec ESP',u:R(4303),k:'Standard',s:'Proposed Standard'},
  rfc4987:{l:'RFC 4987 · TCP SYN flooding and mitigations',u:R(4987),k:'Standard',s:'Informational'},
  rfc2827:{l:'RFC 2827 · Network ingress filtering (BCP 38)',u:R(2827),k:'Standard',s:'BCP 38'},
  rfc5452:{l:'RFC 5452 · DNS resilience against forged answers',u:R(5452),k:'Standard',s:'Proposed Standard'},
  rfc8767:{l:'RFC 8767 · Serving stale data in DNS',u:R(8767),k:'Standard',s:'Proposed Standard'},
  rfc1034:{l:'RFC 1034 · DNS concepts',u:R(1034),k:'Standard',s:'STD 13'},
  rfc2923:{l:'RFC 2923 · TCP problems with PMTU discovery',u:R(2923),k:'Standard',s:'Informational'},
  k8sing:{l:'Kubernetes · Ingress',u:'https://kubernetes.io/docs/concepts/services-networking/ingress/',k:'Vendor'},
  awstgw:{l:'AWS · Transit gateways',u:'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',k:'Vendor'},
  awstgwp:{l:'AWS · Transit gateway peering',u:'https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html',k:'Vendor'},
  awspeer:{l:'AWS · VPC peering',u:'https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html',k:'Vendor'},
  awspl:{l:'AWS · PrivateLink',u:'https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html',k:'Vendor'},
  awsalb:{l:'AWS · Application Load Balancer',u:'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html',k:'Vendor'},
  awsvpn:{l:'AWS · Site-to-Site VPN',u:'https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html',k:'Vendor'}
});

/* ============ builders ============ */
const MKM = n => ['02', '00', '5E', (n * 37 + 11) & 255, (n * 91 + 5) & 255, (n * 13 + 7) & 255].map(v => typeof v === 'string' ? v : v.toString(16).toUpperCase().padStart(2, '0')).join(':');
const N = (name, code, type, zone, tag, ms, addr, does, o) => Object.assign({name, code, type, zone, tag, ms, addr, does, set:{}, docs:[]}, o || {});
function fillL2(list){
  list.forEach((n, i) => {
    if (n.type === 'switch' || i === list.length - 1) return;
    n.set = Object.assign({ethSrc:MKM(2 * i + 10), ethDst:MKM(2 * i + 11)}, n.set);
  });
  return list;
}
const TCP = {base:{proto:'tcp', flags:0x02, seq:0x4a7c0e91, ack:0}, reply:{flags:0x12, seq:0x2b90de10, ack:0x4a7c0e92}};
const HTTPQ = h => ({title:'HTTP request (illustrative: the packet shown is the TCP SYN)', note:'TLS would encrypt this in practice; shown in clear to explain what proxies can read.', hdr:h});
function J(group, short, sub, title, docs, nodes, faults, o){
  return Object.assign({group, short, sub, title, ttl:64, docs}, TCP, {l7:HTTPQ([['Host','app.example.com'], ['Accept','*/*']]), l7r:{title:'HTTP/1.1 200 OK', hdr:[['Content-Type','application/json']]}}, o || {}, {nodes:fillL2(nodes), faults});
}
const TBL = (title, cols, rows, hit, note, hitF) => ({kind:'table', title, cols, rows, hit, note, hitF});

Object.assign(SC, {

/* ================================================================ Kubernetes extras */
k8snp: J('Kubernetes', 'NodePort from outside', 'Node port · DNAT + SNAT', 'Internet client → NodePort → Pod', ['k8ssvc', 'k8svip', 'nf'], [
  N('Client', 'PC', 'host', 'Internet', 'ORIGIN', 0, '203.0.113.50', 'A client outside the cluster calls a node\'s public address on the NodePort (30080). Every node opens this port for the Service, whether or not a pod runs there.',
    {set:{ipSrc:'203.0.113.50', ipDst:'198.51.100.40', sport:51200, dport:30080}, docs:['k8ssvc']}),
  N('Cloud firewall', 'SG', 'switch', 'Cloud edge', 'FIREWALL', 4, 'security group', 'The cloud firewall must allow the NodePort range (30000-32767) from the client. Kubernetes cannot open this for you: it is outside the cluster.',
    {x:[TBL('Inbound rules', ['Port', 'Source', 'Action'], [['30080 (NodePort)', '0.0.0.0/0', 'ALLOW'], ['22', 'office /32', 'ALLOW']], [0], 'Rule is missing = silent drop.', {sg:[]})], docs:['awssg']}),
  N('Node 2', 'NF', 'nat', 'Node 2', 'NODEPORT DNAT + SNAT', 5, '198.51.100.40', 'kube-proxy matches the NodePort, picks a pod and DNATs to its address. Because the pod may be on another node, the source is also masqueraded to this node\'s address so the reply comes back through the same node (externalTrafficPolicy: Cluster). The client IP is lost to the pod.',
    {router:true, set:{ipDst:'10.244.1.9', dport:8080, ipSrc:'10.0.0.12'}, nat:{mode:'dst', a:'198.51.100.40:30080', b:'10.244.1.9:8080'}, docs:['k8svip', 'nf'],
     x:[{kind:'flow', title:'iptables chains', items:['PREROUTING', 'KUBE-NODEPORTS', 'KUBE-SVC-XXXX', 'KUBE-SEP-YYYY (DNAT)', 'KUBE-POSTROUTING (MASQUERADE)'], hit:[0, 1, 2, 3, 4], note:'With externalTrafficPolicy: Local the masquerade is skipped and the client IP is preserved, but only nodes with a local pod answer.'}]}),
  N('Pod web', 'POD', 'pod', 'Node 1', 'DELIVERED', 6, '10.244.1.9', 'The pod sees the node\'s address as the client. To log real client IPs use externalTrafficPolicy: Local or a Layer 7 proxy that adds X-Forwarded-For.', {docs:['k8ssvc']})
], [
  {id:'sg', at:1, type:'drop', label:'Cloud firewall blocks the NodePort', short:'DROP 30080', title:'The NodePort is closed at the cloud firewall', body:'The Service is fine and kube-proxy rules exist, but the security group or firewall does not allow 30000-32767. Curl from inside the VPC works; from the internet it times out.', user:'$ curl -m 5 http://198.51.100.40:30080\ncurl: (28) Connection timed out after 5001 milliseconds\n$ kubectl get svc web   # PORT(S) 80:30080/TCP', d:['k8ssvc', 'awssg']},
  {id:'noep', at:2, type:'drop', label:'Service has no ready endpoints', short:'REJECT', title:'No endpoints: kube-proxy rejects the connection', body:'The selector matches no Ready pods, so there is no DNAT target. kube-proxy installs a REJECT rule: the client gets an immediate refusal, not a timeout. That difference (instant vs slow) is a useful clue.', user:'$ curl http://198.51.100.40:30080\ncurl: (7) Failed to connect: Connection refused\n$ kubectl get endpoints web   # <none>', d:['k8ssvc', 'k8svip']}
]),

k8sing: J('Kubernetes', 'Ingress (Layer 7)', 'Host and path routing', 'Internet → cloud LB → Ingress controller → Pod', ['k8sing', 'rfc9110', 'rfc7239', 'k8ssvc'], [
  N('Client', 'PC', 'host', 'Internet', 'ORIGIN', 0, '203.0.113.50', 'The browser requests shop.example.com/cart. DNS points the name at the cloud load balancer.',
    {set:{ipSrc:'203.0.113.50', ipDst:'198.51.100.60', sport:52330, dport:443}, docs:['rfc9110']}),
  N('Cloud LB', 'LB', 'lb', 'Cloud edge', 'L4 LOAD BALANCER', 6, '198.51.100.60', 'A Layer 4 load balancer picks a node running the ingress controller and forwards the connection, rewriting only the destination address and port.',
    {router:true, set:{ipDst:'10.244.3.4', dport:8443}, nat:{mode:'dst', a:'198.51.100.60:443', b:'10.244.3.4:8443'}, docs:['k8ssvc']}),
  N('Ingress controller', 'ING', 'proxy', 'Cluster', 'TLS END · HOST/PATH ROUTE', 7, '10.244.3.4', 'The controller (for example NGINX) terminates TLS, reads Host and path, matches an Ingress rule and opens a new connection straight to a pod. It adds X-Forwarded-* headers because the pod will see the controller as the client.',
    {router:true, reset:true, set:{ipSrc:'10.244.3.4', ipDst:'10.244.1.9', sport:41822, dport:8080}, l7ops:{del:['Connection'], add:[['X-Forwarded-For', '203.0.113.50'], ['X-Forwarded-Proto', 'https'], ['X-Request-ID', 'b1e0c4f2']]}, l7rops:{del:['Server']}, docs:['k8sing', 'rfc7239'],
     x:[TBL('Ingress rules', ['Host', 'Path', 'Backend'], [['shop.example.com', '/cart', 'cart-svc:80'], ['shop.example.com', '/', 'web-svc:80']], [0], 'Most specific path wins. No match = default backend (404).', {notfound:[], noep:[0]})]}),
  N('Pod cart', 'POD', 'pod', 'Node 1', 'DELIVERED', 8, '10.244.1.9', 'The pod receives a plain HTTP request from the controller, with the real client in X-Forwarded-For.', {docs:['k8ssvc']})
], [
  {id:'notfound', at:2, type:'l7', label:'No Ingress rule matches (404)', short:'404', title:'The controller answers 404: no rule for this host or path', resp:{title:'HTTP/1.1 404 Not Found', hdr:[['Server', 'nginx'], ['Content-Type', 'text/html']]}, body:'Everything below layer 7 works: DNS, the load balancer and TLS all succeed and the controller replies. The Host header or path did not match any Ingress rule, so the default backend answers. Typical causes: wrong host, missing ingressClassName, path type mismatch.', user:'$ curl -i https://shop.example.com/cart\nHTTP/2 404\nserver: nginx\n$ kubectl describe ingress shop', d:['k8sing', 'rfc9110']},
  {id:'noep', at:2, type:'l7', label:'No ready pods behind the Service (503)', short:'503', title:'The controller answers 503: the rule matches but nothing is ready', resp:{title:'HTTP/1.1 503 Service Temporarily Unavailable', hdr:[['Server', 'nginx'], ['Content-Type', 'text/html']]}, body:'The Ingress rule matched, but the Service has no Ready endpoints (readiness probe failing, or a selector typo). The controller has nowhere to send the request and returns 503 itself.', user:'$ curl -i https://shop.example.com/cart\nHTTP/2 503\n$ kubectl get endpoints cart-svc   # <none>', d:['k8sing', 'k8ssvc']}
]),

k8spol: J('Kubernetes', 'NetworkPolicy deny', 'Ingress and egress rules', 'Pod frontend → Pod db (with NetworkPolicy)', ['k8spol', 'k8snet'], [
  N('Pod frontend', 'POD', 'pod', 'Node 1 · ns frontend', 'ORIGIN', 0, '10.244.1.5', 'The frontend pod connects to the database pod on 5432. Policies are enforced by the CNI plugin (Calico, Cilium and so on), not by Kubernetes itself.',
    {set:{ipSrc:'10.244.1.5', ipDst:'10.244.2.8', sport:47110, dport:5432}, docs:['k8spol']}),
  N('Egress policy', 'POL', 'switch', 'Node 1', 'EGRESS CHECK', 0.2, 'CNI on Node 1', 'If the namespace has a default-deny egress policy, the packet is allowed only when a rule permits this destination and port.',
    {x:[TBL('Egress policies for pod frontend', ['Rule', 'To', 'Port', 'Result'], [['default-deny', 'all', 'all', 'deny'], ['allow-db', 'ns db / app=postgres', '5432', 'allow']], [1], 'Egress is open when no policy selects the pod.', {egress:[0]})], docs:['k8spol']}),
  N('Cluster routing', 'RT', 'router', 'Fabric', 'ROUTED', 0.5, 'CNI routes', 'Between nodes the CNI routes pod CIDRs (or tunnels them). TTL drops by one.', {router:true, docs:['k8snet']}),
  N('Ingress policy', 'POL', 'switch', 'Node 2', 'INGRESS CHECK', 0.8, 'CNI on Node 2', 'The receiving node checks ingress policies for the db pod. The source namespace must carry the label the policy selects.',
    {x:[TBL('Ingress policies for pod postgres', ['From', 'Port', 'Result'], [['ns with label team=shop', '5432', 'allow'], ['everything else', 'all', 'deny']], [0], 'namespaceSelector matches labels on the namespace, not its name.', {deny:[1]})], docs:['k8spol']}),
  N('Pod postgres', 'POD', 'pod', 'Node 2 · ns db', 'DELIVERED', 0.9, '10.244.2.8', 'The database sees a normal connection from the frontend pod.', {docs:['k8spol']})
], [
  {id:'egress', at:1, type:'drop', label:'Default-deny egress blocks the call', short:'EGRESS DENY', title:'Egress policy denies the connection', body:'A default-deny egress policy selects the frontend pod and no rule allows the database. Remember to allow DNS (UDP/TCP 53 to kube-dns) too, or name lookups fail first and the symptom looks like a DNS problem.', user:'$ kubectl exec frontend -- nc -vz 10.244.2.8 5432\nnc: connect to 10.244.2.8 port 5432 (tcp) timed out\n$ kubectl get netpol -A', d:['k8spol']},
  {id:'deny', at:3, type:'drop', label:'Ingress policy denies the source', short:'INGRESS DENY', title:'Ingress policy on the database drops the packet', body:'The db namespace allows ingress only from namespaces labelled team=shop. The frontend namespace lacks that label, so packets are silently dropped. Pods on the same node behave the same, which rules out the network fabric.', user:'$ kubectl exec frontend -- nc -vz postgres.db 5432\ntimed out\n$ kubectl get ns frontend --show-labels', d:['k8spol']}
]),

/* ================================================================ AWS extras */
awstgw: J('Cloud', 'AWS: Transit Gateway', 'Hub and spoke VPC routing', 'EC2 in VPC A → Transit Gateway → EC2 in VPC B', ['awstgw', 'awsrt', 'awssg'], [
  N('EC2 in VPC A', 'EC2', 'host', 'VPC A 10.1.0.0/16', 'ORIGIN', 0, '10.1.1.10', 'The instance calls a private address in VPC B. The route table sends 10.2.0.0/16 to the Transit Gateway attachment.',
    {set:{ipSrc:'10.1.1.10', ipDst:'10.2.1.20', sport:50410, dport:8443}, docs:['awsrt']}),
  N('VPC A router', 'RT', 'router', 'VPC A', 'ROUTE TABLE', 0.5, '10.1.1.1', 'The subnet route table has a route for the other VPC pointing at the TGW attachment.',
    {router:true, docs:['awsrt'], x:[TBL('Subnet route table (VPC A)', ['Destination', 'Target'], [['10.1.0.0/16', 'local'], ['10.2.0.0/16', 'tgw-0abc123']], [1], 'Both directions need routes: VPC B needs one back to 10.1.0.0/16.')]}),
  N('Transit Gateway', 'TGW', 'router', 'AWS network', 'TGW ROUTE TABLE', 1.2, 'tgw-0abc123', 'The TGW looks up its own route table (separate from the VPC ones). Routes arrive by propagation from attachments or are added statically.',
    {router:true, docs:['awstgw'], x:[TBL('TGW route table', ['CIDR', 'Attachment', 'Type'], [['10.1.0.0/16', 'vpc-a', 'propagated'], ['10.2.0.0/16', 'vpc-b', 'propagated']], [1], 'No match = blackhole: the packet is dropped without an ICMP error.', {noprop:[]})]}),
  N('VPC B router', 'RT', 'router', 'VPC B 10.2.0.0/16', 'LOCAL DELIVERY', 1.8, '10.2.1.1', 'The TGW ENI in VPC B hands the packet to the VPC router, which delivers it locally. Return traffic needs the matching route back to the TGW.', {router:true, docs:['awsrt']}),
  N('EC2 in VPC B', 'EC2', 'server', 'VPC B', 'DELIVERED', 2, '10.2.1.20', 'The security group must allow the source CIDR of VPC A on port 8443.',
    {docs:['awssg'], x:[TBL('Security group (inbound)', ['Port', 'Source', 'Result'], [['8443', '10.1.0.0/16', 'ALLOW']], [0], '', {sg:[]})]})
], [
  {id:'noprop', at:2, type:'drop', label:'TGW has no route to VPC B', short:'BLACKHOLE', title:'Transit Gateway route table has no matching route', body:'The VPC B attachment is not associated or propagated into the route table this attachment uses, so the TGW drops the packet. Ping and TCP simply hang. Check the association and propagation of both attachments.', user:'$ curl -m 5 http://10.2.1.20:8443\ncurl: (28) Connection timed out', d:['awstgw']},
  {id:'sg', at:4, type:'drop', label:'Security group blocks VPC A', short:'SG DROP', title:'Destination security group has no rule for VPC A', body:'Routing is perfect and the packet arrives, but the instance\'s security group allows only its own VPC. Security groups drop silently, so it looks like a routing fault.', user:'$ curl -m 5 http://10.2.1.20:8443\ncurl: (28) Connection timed out\n# VPC Reachability Analyzer: Blocked by security group', d:['awssg']}
]),

awspeer: J('Cloud', 'AWS: VPC peering', 'Direct, non-transitive link', 'EC2 in VPC A → peering → EC2 in VPC B', ['awspeer', 'awsrt', 'awssg'], [
  N('EC2 in VPC A', 'EC2', 'host', 'VPC A 10.1.0.0/16', 'ORIGIN', 0, '10.1.1.10', 'The instance talks to a private address in the peered VPC.', {set:{ipSrc:'10.1.1.10', ipDst:'10.2.1.20', sport:50510, dport:5432}, docs:['awspeer']}),
  N('VPC A router', 'RT', 'router', 'VPC A', 'ROUTE TABLE', 0.4, '10.1.1.1', 'A peering connection does nothing until both route tables point the other CIDR at it.',
    {router:true, docs:['awsrt'], x:[TBL('Route table (VPC A)', ['Destination', 'Target'], [['10.1.0.0/16', 'local'], ['10.2.0.0/16', 'pcx-0a1b2c']], [1], 'CIDR blocks of peered VPCs must not overlap.', {overlap:[0]})]}),
  N('Peering connection', 'PCX', 'switch', 'AWS network', 'ONE-TO-ONE LINK', 0.9, 'pcx-0a1b2c', 'Traffic crosses AWS\'s private network with no gateway or appliance. Peering is not transitive: a VPC reachable only through B is not reachable from A.', {docs:['awspeer'], x:[TBL('Peering rules', ['Property', 'Value'], [['Transitive routing', 'no'], ['Overlapping CIDRs', 'not allowed'], ['Edge-to-edge (VPN, IGW)', 'not supported']], [0], 'Use Transit Gateway for hub-and-spoke.', {transit:[0]})]}),
  N('EC2 in VPC B', 'DB', 'server', 'VPC B 10.2.0.0/16', 'DELIVERED', 1, '10.2.1.20', 'Delivered after the security group allows VPC A\'s CIDR.', {docs:['awssg']})
], [
  {id:'overlap', at:1, type:'drop', label:'Overlapping CIDRs', short:'OVERLAP', title:'Overlapping CIDR blocks: the route cannot exist', body:'Both VPCs use 10.1.0.0/16. A peering cannot be created between overlapping ranges, and a route for the other VPC would be shadowed by the local route. Fix by renumbering, or use PrivateLink, which does not care about overlap.', user:'$ aws ec2 create-vpc-peering-connection ...\nInvalidParameterValue: overlapping CIDR blocks', d:['awspeer']},
  {id:'transit', at:2, type:'drop', label:'Destination is in a third VPC (transit)', short:'NOT TRANSITIVE', title:'Peering does not forward to a third VPC', body:'A peers with B and B peers with C. A cannot reach C through B: packets arriving over a peering connection can only be delivered to that VPC\'s own resources. Use a Transit Gateway.', user:'$ curl -m 5 http://10.3.1.30   # VPC C via B\ntimed out', d:['awspeer', 'awstgw']}
]),

awspl: J('Cloud', 'AWS: PrivateLink', 'Interface endpoint to a service', 'Consumer EC2 → interface endpoint → provider service', ['awspl', 'awssg', 'awsrt'], [
  N('Consumer EC2', 'EC2', 'host', 'Consumer VPC', 'ORIGIN', 0, '10.0.1.25', 'The instance resolves the service name to the endpoint\'s private address (private DNS) and connects as if it were local.', {set:{ipSrc:'10.0.1.25', ipDst:'10.0.1.80', sport:50330, dport:443}, docs:['awspl']}),
  N('VPC router', 'RT', 'router', 'Consumer VPC', 'LOCAL ROUTE', 0.3, '10.0.1.1', 'The endpoint address is inside the consumer\'s own subnet, so the local route is enough. No peering, route or gateway is needed, which is why PrivateLink works with overlapping CIDRs.', {router:true, docs:['awsrt']}),
  N('Interface endpoint', 'VPCE', 'nat', 'Consumer VPC', 'PRIVATELINK NAT', 0.6, '10.0.1.80', 'The endpoint ENI hands the connection to the provider. The provider never sees the consumer\'s address: it sees an address owned by the service network. Proxy Protocol v2 can pass the original source.',
    {router:true, set:{ipSrc:'10.9.3.14', ipDst:'10.9.2.50'}, nat:{mode:'src', a:'10.0.1.25', b:'10.9.3.14 (PrivateLink)'}, docs:['awspl'], x:[TBL('Endpoint security group (inbound)', ['Port', 'Source', 'Result'], [['443', '10.0.0.0/16', 'ALLOW']], [0], 'The endpoint has its own security group.', {sg:[]})]}),
  N('Provider NLB', 'NLB', 'lb', 'Provider VPC', 'NETWORK LOAD BALANCER', 1.1, '10.9.2.50', 'The provider\'s NLB forwards to a healthy target. Targets must pass health checks or the NLB has nowhere to send traffic.',
    {router:true, set:{ipDst:'10.9.4.8', dport:8443}, nat:{mode:'dst', a:'10.9.2.50:443', b:'10.9.4.8:8443'}, docs:['awspl'], x:[TBL('Target group health', ['Target', 'Port', 'Health'], [['10.9.4.8', '8443', 'healthy'], ['10.9.4.9', '8443', 'unhealthy']], [0], '', {unhealthy:[]})]}),
  N('Provider target', 'SRV', 'server', 'Provider VPC', 'DELIVERED', 1.4, '10.9.4.8', 'The service answers. The reply retraces the same translations.', {docs:['awspl']})
], [
  {id:'sg', at:2, type:'drop', label:'Endpoint security group blocks 443', short:'SG DROP', title:'Interface endpoint security group denies the consumer', body:'The endpoint ENI has its own security group. If it does not allow the consumer\'s CIDR on 443, connections time out even though DNS and routing are right.', user:'$ curl -m 5 https://vpce-0abc.example.vpce.amazonaws.com\ncurl: (28) Connection timed out', d:['awspl', 'awssg']},
  {id:'unhealthy', at:3, type:'drop', label:'NLB has no healthy targets', short:'NO HEALTHY TARGET', title:'Provider NLB has nothing healthy to forward to', body:'All targets fail health checks (wrong port, security group, app down). The NLB cannot forward, and the consumer sees a hang or reset. Only the provider can fix this, which is why consumers should ask for health status.', user:'$ curl -m 5 https://svc.internal\ncurl: (28) Connection timed out', d:['awspl']}
]),

awsalb: J('Cloud', 'AWS: Application Load Balancer', 'Layer 7 · target health', 'Internet → IGW → ALB → EC2 target', ['awsalb', 'awsigw', 'awssg', 'rfc9110'], [
  N('Client', 'PC', 'host', 'Internet', 'ORIGIN', 0, '203.0.113.50', 'The client connects to the ALB\'s DNS name, which resolves to one public address per Availability Zone.', {set:{ipSrc:'203.0.113.50', ipDst:'198.51.100.30', sport:51720, dport:443}, docs:['awsalb']}),
  N('Internet gateway', 'IGW', 'nat', 'VPC edge', '1:1 NAT TO ALB ENI', 8, 'igw-0f1e2d3c', 'The IGW translates the ALB\'s public address to the private address of its network interface in the subnet.', {router:true, set:{ipDst:'10.0.0.21'}, nat:{mode:'dst', a:'198.51.100.30', b:'10.0.0.21'}, docs:['awsigw']}),
  N('Application LB', 'ALB', 'proxy', 'Public subnets', 'TLS END · RULES · TARGETS', 9, '10.0.0.21', 'The ALB terminates TLS, evaluates listener rules and opens a new connection to a healthy target. It adds X-Forwarded-For and X-Amzn-Trace-Id. Its source address is the ALB\'s, so target security groups should reference the ALB\'s security group.',
    {router:true, reset:true, set:{ipSrc:'10.0.0.21', ipDst:'10.0.2.30', sport:44012, dport:8080}, l7ops:{add:[['X-Forwarded-For', '203.0.113.50'], ['X-Forwarded-Proto', 'https'], ['X-Amzn-Trace-Id', 'Root=1-6740a1b2-3f9c']]}, docs:['awsalb', 'rfc9110'], x:[TBL('Target group', ['Target', 'Health check', 'State'], [['10.0.2.30:8080', 'GET /health → 200', 'healthy'], ['10.0.2.31:8080', 'GET /health → 500', 'unhealthy']], [0], 'Only healthy targets receive traffic. With none healthy the ALB returns 503.', {unhealthy:[], slow:[0]})]}),
  N('EC2 target', 'EC2', 'server', 'Private subnet', 'DELIVERED', 10, '10.0.2.30', 'The target\'s security group must allow port 8080 from the ALB\'s security group. The app sees the ALB as the client.', {docs:['awssg'], x:[TBL('Security group (inbound)', ['Port', 'Source', 'Result'], [['8080', 'sg-alb', 'ALLOW']], [0], '', {sg:[]})]})
], [
  {id:'unhealthy', at:2, type:'l7', label:'No healthy targets (503)', short:'503', title:'The ALB answers 503: every target failed its health check', resp:{title:'HTTP/1.1 503 Service Temporarily Unavailable', hdr:[['Server', 'awselb/2.0'], ['Content-Type', 'text/html']]}, body:'The ALB itself is fine and responds, but the health check fails (wrong path or port, app down, or security group blocking the ALB). With zero healthy targets it returns 503. Look at the target group health reason code.', user:'$ curl -i https://app.example.com\nHTTP/2 503\nserver: awselb/2.0\n$ aws elbv2 describe-target-health --target-group-arn ...', d:['awsalb']},
  {id:'slow', at:2, type:'l7', label:'Target too slow (504)', short:'504', title:'The ALB answers 504: the target did not respond in time', resp:{title:'HTTP/1.1 504 Gateway Time-out', hdr:[['Server', 'awselb/2.0'], ['Content-Type', 'text/html']]}, body:'The connection to the target opened but no response arrived within the idle timeout (60 seconds by default). The network is fine; the application is slow or stuck. Compare the ALB idle timeout with the app\'s keep-alive timeout.', user:'$ curl -i https://app.example.com/report\nHTTP/2 504\n$ # CloudWatch: TargetResponseTime high, HTTPCode_ELB_504_Count', d:['awsalb', 'rfc9110']},
  {id:'sg', at:3, type:'drop', label:'Target security group blocks the ALB', short:'SG DROP', title:'The target never receives the ALB\'s connection', body:'The target\'s security group does not allow the ALB. Health checks fail, the target goes unhealthy, and clients see 503 (or 504 until the first checks complete).', user:'$ aws elbv2 describe-target-health ...\nState: unhealthy  Reason: Target.Timeout', d:['awssg', 'awsalb']}
]),

/* ================================================================ Security / firewall */
sgnacl: J('Security', 'Firewall rule trace', 'Security group vs network ACL', 'Internet → IGW → NACL → security group → EC2', ['awsacl', 'awssg', 'awsigw'], [
  N('Client', 'PC', 'host', 'Internet', 'ORIGIN', 0, '203.0.113.50', 'A client connects to a public instance on port 8443.', {set:{ipSrc:'203.0.113.50', ipDst:'198.51.100.77', sport:51920, dport:8443}, docs:['awssg']}),
  N('Internet gateway', 'IGW', 'nat', 'VPC edge', '1:1 NAT TO EIP', 6, 'igw-0f1e2d3c', 'The IGW translates the Elastic IP to the instance\'s private address.', {router:true, set:{ipDst:'10.0.1.25'}, nat:{mode:'dst', a:'198.51.100.77', b:'10.0.1.25'}, docs:['awsigw']}),
  N('Network ACL', 'NACL', 'switch', 'Subnet boundary', 'STATELESS · FIRST MATCH', 6.1, 'acl-0a1b2c', 'The NACL checks rules in numeric order and stops at the first match. It is stateless: the reply needs its own outbound rule, including ephemeral ports 1024-65535.',
    {docs:['awsacl'], x:[TBL('NACL inbound', ['Rule', 'Match', 'Action'], [['90', 'tcp 8443 from 203.0.113.0/24', 'DENY'], ['100', 'tcp 8443 from 0.0.0.0/0', 'ALLOW'], ['*', 'all', 'DENY']], [1], 'Lowest rule number wins. A DENY at 90 beats the ALLOW at 100.', {nacl:[0]}), TBL('NACL outbound (reply path)', ['Rule', 'Match', 'Action'], [['100', 'tcp 1024-65535 to 0.0.0.0/0', 'ALLOW']], [0], 'Forgetting this rule breaks replies even though inbound is open.')]}),
  N('Security group', 'SG', 'switch', 'Instance', 'STATEFUL · ALLOW ONLY', 6.2, 'sg-0d4e5f', 'The security group has only allow rules and is stateful: a permitted request automatically permits its reply. Nothing matches means deny.',
    {docs:['awssg'], x:[TBL('Security group inbound', ['Port', 'Source', 'Action'], [['443', '0.0.0.0/0', 'ALLOW'], ['8443', '10.0.0.0/8', 'ALLOW']], [1], 'Source 10.0.0.0/8 does not include a public client.', {sgdeny:[]})]}),
  N('EC2 instance', 'EC2', 'server', 'Public subnet', 'DELIVERED', 6.5, '10.0.1.25', 'After both layers allow the packet, the application receives it. The reply skips the security group check (stateful) but is evaluated by the NACL (stateless).', {docs:['awssg']})
], [
  {id:'nacl', at:2, type:'drop', label:'NACL rule 90 denies the client', short:'NACL DENY', title:'An earlier NACL rule denies the packet', body:'Rule 90 denies a range that includes the client, and evaluation stops there, so rule 100 never runs. NACLs have explicit deny, security groups do not. VPC Flow Logs show the packet as REJECT.', user:'$ curl -m 5 https://198.51.100.77:8443\ntimed out\n$ # flow log: ... 8443 TCP REJECT OK', d:['awsacl']},
  {id:'sgdeny', at:3, type:'drop', label:'Security group has no matching rule', short:'SG DENY', title:'The security group does not allow this source', body:'The only 8443 rule is limited to private addresses. Anything not explicitly allowed is dropped. Security groups cannot deny, so the fix is to add an allow rule, not to remove a deny.', user:'$ curl -m 5 https://198.51.100.77:8443\ntimed out\n$ aws ec2 describe-security-groups --group-ids sg-0d4e5f', d:['awssg']}
], {banner:'Rule trace: the highlighted row is the rule that decides this packet.'}),

/* ================================================================ Attack replays */
arp: J('Attack replays', 'ARP spoofing (MITM)', 'Poisoned ARP cache', 'Victim → attacker → gateway (man in the middle)', ['rfc826', 'rfc791'], [
  N('Victim', 'PC', 'host', 'Office LAN', 'ORIGIN', 0, '192.168.1.23', 'Forged ARP replies told the victim that the gateway 192.168.1.1 is at the attacker\'s MAC. The frame therefore carries the attacker\'s MAC as destination, while the IP header still says the real destination.',
    {set:{ethSrc:'3C:22:FB:A1:09:23', ethDst:'02:00:5E:66:66:66', ipSrc:'192.168.1.23', ipDst:'203.0.113.10', sport:52144, dport:80}, docs:['rfc826'], x:[TBL('Victim ARP cache', ['IP', 'MAC', 'Note'], [['192.168.1.1', '02:00:5E:66:66:66', 'POISONED: should be the router'], ['192.168.1.50', '3C:22:FB:00:11:50', 'normal']], [0], 'ARP has no authentication: the last reply wins.')]}),
  N('Attacker host', 'MITM', 'host', 'Office LAN', 'FORWARDS A COPY', 0.3, '192.168.1.66', 'With IP forwarding on, the attacker can read or change cleartext traffic and then pass it on, so the victim notices nothing. Only the Ethernet addresses change; the IP header is untouched apart from TTL.',
    {router:true, set:{ethSrc:'02:00:5E:66:66:66', ethDst:'F4:F2:6D:5E:11:A0'}, docs:['rfc826']}),
  N('Gateway', 'RT', 'router', 'Office LAN', 'NORMAL ROUTING', 0.8, '192.168.1.1', 'The real router sees a perfectly normal frame and forwards it. Its logs show the victim\'s IP, so nothing looks wrong here.', {router:true, set:{ethSrc:'F4:F2:6D:5E:11:A1', ethDst:'00:1B:54:C2:7A:01'}, docs:['rfc791']}),
  N('Web server', 'SRV', 'server', 'Internet', 'DELIVERED', 9, '203.0.113.10', 'The server answers the victim as usual. The attacker also poisons the gateway, so replies pass through it in the other direction.', {docs:['rfc826']})
], [
  {id:'pvlan', at:1, type:'drop', label:'Client isolation drops host-to-host frames', short:'ISOLATED', title:'Port isolation stops the frame at the switch', body:'Private VLAN or client isolation forbids a host-to-host frame, so the victim\'s traffic never reaches the attacker. Dynamic ARP Inspection goes further: it drops the forged ARP replies, so the cache is never poisoned.', user:'$ ip neigh show 192.168.1.1\n192.168.1.1 dev eth0 lladdr f4:f2:6d:5e:11:a0 REACHABLE   # correct MAC', d:['rfc826']}
], {banner:'Educational replay of a known attack: shows what an attacker changes so you can detect and block it.'}),

synflood: J('Attack replays', 'SYN flood', 'Spoofed sources · backlog', 'Spoofed SYN → edge → server backlog', ['rfc4987', 'rfc2827', 'rfc9293'], [
  N('Botnet host', 'BOT', 'host', 'Internet', 'SPOOFED SOURCE', 0, '198.51.100.201', 'The sender forges the source address, so the SYN-ACK goes to an innocent host and the handshake never completes. Thousands of these per second fill the server\'s half-open queue.', {set:{ipSrc:'198.51.100.201', ipDst:'203.0.113.10', sport:34812, dport:443}, docs:['rfc4987']}),
  N('ISP edge router', 'RT', 'router', 'ISP', 'BCP 38 CHECK', 7, '198.51.100.1', 'A provider doing ingress filtering (BCP 38 / uRPF) drops packets whose source is not reachable via the interface they arrived on. Many networks still do not.', {router:true, docs:['rfc2827'], x:[TBL('uRPF check', ['Source', 'Expected interface', 'Result'], [['198.51.100.201', 'customer port', 'pass'], ['10.1.2.3', 'customer port', 'fail (not routed here)']], [0], 'A source the customer does not own fails and is dropped.', {ingress:[1]})]}),
  N('Firewall / LB', 'FW', 'lb', 'Server edge', 'RATE LIMIT · SYN PROXY', 9, '203.0.113.2', 'A SYN proxy or SYN cookies answer the handshake on behalf of the server, so no state is stored until the client proves it exists with the final ACK.', {router:true, docs:['rfc4987']}),
  N('Web server', 'SRV', 'server', 'Server', 'SYN QUEUE', 10, '203.0.113.10', 'Each SYN makes the server allocate a half-open entry. When the backlog is full and cookies are off, new SYNs are dropped, real users included.',
    {docs:['rfc9293'], x:[TBL('Listen socket', ['Item', 'Value'], [['SYN backlog', '4096 entries'], ['Half-open now', '4096 (full)'], ['tcp_syncookies', '0 (off)']], [1, 2], 'With tcp_syncookies=1 the queue is bypassed under pressure.', {backlog:[1, 2]})]})
], [
  {id:'ingress', at:1, type:'drop', label:'ISP drops spoofed source (BCP 38)', short:'BCP 38', title:'Ingress filtering kills the spoofed packet at the source network', body:'The ISP checks that the source belongs to the customer port. A forged address fails and the packet never leaves. This is the real fix for spoofing, but it must be deployed by the sender\'s network, not the victim\'s.', user:'$ # victim side: SYN rate normal, no flood', d:['rfc2827']},
  {id:'backlog', at:3, type:'drop', label:'SYN backlog full', short:'BACKLOG FULL', title:'The server drops new SYNs because the queue is full', body:'The half-open queue is exhausted by forged SYNs. Real clients retry SYNs with growing delays and eventually time out. Enable SYN cookies, increase the backlog and rate limit at the edge.', user:'$ ss -ant state syn-recv | wc -l\n4096\n$ nstat -az | grep -Ei "listen(drops|overflows)"', d:['rfc4987']}
], {banner:'Educational replay of a known attack: shows what an attacker changes so you can detect and block it.'}),

dnsspoof: J('Attack replays', 'DNS cache poisoning', 'Forged answer · defences', 'Resolver → authoritative (forged answer race)', ['rfc5452', 'rfc1035', 'rfc2827'], [
  N('Recursive resolver', 'RES', 'server', 'Resolver', 'ORIGIN · CACHE MISS', 0, '10.0.0.53', 'On a cache miss the resolver asks the authoritative server. It picks a random source port and a random 16-bit transaction ID. An attacker must guess both, and arrive before the real answer.',
    {set:{ipSrc:'10.0.0.53', ipDst:'192.0.2.53', sport:41872, dport:53}, docs:['rfc5452'], x:[TBL('What a forged answer must match', ['Field', 'Space'], [['Source IP', 'the authoritative server'], ['Destination port', 'random, 16 bits'], ['Transaction ID', 'random, 16 bits'], ['Question (0x20 case)', 'extra bits']], [1, 2, 3], 'Port and ID randomisation make blind guessing impractical.')]}),
  N('Resolver edge', 'RT', 'router', 'Resolver network', 'EGRESS', 0.3, '10.0.0.1', 'Normal routing. Egress filtering keeps spoofed packets out of the network but does nothing for forged answers arriving from outside.', {router:true, docs:['rfc2827']}),
  N('Internet path', 'NET', 'router', 'Internet', 'THE RACE', 18, 'many hops', 'Anyone able to send packets with the authoritative server\'s source address can race the real answer. This is why spoofing prevention (BCP 38) matters to everyone.', {router:true, docs:['rfc5452']}),
  N('Authoritative server', 'NS', 'server', 'Authority', 'DELIVERED', 20, '192.0.2.53', 'The real server answers with the same transaction ID and port. If a forged answer arrived first and matched, the resolver caches it and ignores this one.', {docs:['rfc1034']})
], [
  {id:'forged', at:2, type:'l7', label:'Forged answer wins the race', short:'FORGED', title:'The resolver accepts a forged answer and caches it', resp:{title:'DNS response (forged)', hdr:[['Source IP', '192.0.2.53 (spoofed)'], ['Answer', 'www.example.com. 86400 IN A 198.51.100.66'], ['Result', 'cached for 24 h: every user of this resolver is redirected']]}, body:'Only the Layer 7 content is wrong: every network header looks right. This is why transport randomisation, DNSSEC validation and short cache limits exist.', user:'$ dig +short www.example.com @10.0.0.53\n198.51.100.66   # not the real address', d:['rfc5452']},
  {id:'dnssec', at:0, type:'l7', label:'DNSSEC validation rejects it', short:'SERVFAIL', title:'A validating resolver rejects the unsigned or wrongly signed answer', resp:{title:'DNS response (SERVFAIL)', hdr:[['Result', 'SERVFAIL: signature check failed'], ['Cache', 'nothing stored'], ['ad flag', 'not set']]}, body:'With DNSSEC the answer carries a signature chaining up to the root. A forged answer has no valid signature, so the resolver refuses it and returns SERVFAIL instead of a poisoned address.', user:'$ dig +dnssec www.example.com @10.0.0.53\nstatus: SERVFAIL', d:['rfc5452', 'rfc1035']}
], {base:{proto:'udp', payload:DNSQ, payName:'DNS query'}, reply:{payload:DNSR, payName:'DNS response'}, msg:{f:'Standard query A www.example.com', r:'Standard query response A 203.0.113.10'}, l7:{title:'DNS query', hdr:[['ID', '0x4f2a'], ['Question', 'www.example.com IN A'], ['Source port', '41872 (random)']]}, l7r:{title:'DNS response', hdr:[['ID', '0x4f2a'], ['Answer', 'www.example.com. 300 IN A 203.0.113.10']]}, banner:'Educational replay of a known attack: shows what an attacker changes so you can detect and block it.'}),

/* ================================================================ Hybrid & cross-region */
hybrid: J('Hybrid & multi-region', 'On-prem → AWS over VPN', 'IPsec tunnel · MTU', 'Office laptop → site-to-site VPN → EC2', ['rfc4301', 'rfc4303', 'awsvpn', 'rfc1191'], [
  N('Laptop', 'PC', 'host', 'Office 10.20.0.0/16', 'ORIGIN', 0, '10.20.5.15', 'A private address talks to a private address in AWS. No NAT is involved; both sides must have non-overlapping ranges and routes.', {set:{ipSrc:'10.20.5.15', ipDst:'10.0.1.25', sport:50612, dport:443}, docs:['rfc1918']}),
  N('Office router', 'RT', 'router', 'Office', 'ROUTE TO VPN', 1, '10.20.0.1', 'The route for 10.0.0.0/16 points to the VPN gateway.', {router:true, docs:['rfc1812']}),
  N('VPN gateway (office)', 'VPN', 'tunnel', 'Office edge', 'ESP ENCAPSULATION', 2, '203.0.113.9', 'IPsec in tunnel mode wraps the whole packet in a new one addressed to the AWS endpoint and encrypts it. The ESP header, padding and extra IP header cost roughly 50-70 bytes, so the usable MTU shrinks.',
    {router:true, set:{outer:'203.0.113.9 → 198.51.100.200 · ESP (+~60 B)'}, docs:['rfc4303', 'rfc4301'], x:[TBL('IPsec security association', ['Item', 'Value'], [['IKE', 'up (phase 1)'], ['ESP SA', 'up, AES-GCM'], ['Tunnel MTU', '~1400'], ['Selectors', '10.20.0.0/16 ↔ 10.0.0.0/16']], [1, 2], 'Both ends must agree on the selectors or traffic is dropped.', {sa:[0, 1], mtu:[2]})]}),
  N('Internet', 'NET', 'router', 'Internet', 'OUTER HEADERS ONLY', 28, 'many hops', 'The internet sees only the ESP packet between the two VPN endpoints. Inner addresses and ports are hidden, and middleboxes cannot read or fix them.', {router:true, docs:['rfc4303']}),
  N('AWS VPN endpoint', 'VGW', 'tunnel', 'AWS edge', 'DECAPSULATION', 30, '198.51.100.200', 'AWS decrypts and strips the outer headers, then routes the inner packet into the VPC.', {router:true, set:{outer:''}, docs:['awsvpn']}),
  N('VPC router', 'RT', 'router', 'VPC 10.0.0.0/16', 'ROUTE TABLE', 30.5, '10.0.1.1', 'The VPC route table must also have a route back to the office range (static or propagated), or replies are lost.', {router:true, docs:['awsrt']}),
  N('EC2 instance', 'EC2', 'server', 'VPC', 'DELIVERED', 31, '10.0.1.25', 'The security group must allow the office CIDR, not just the VPC CIDR.', {docs:['awssg']})
], [
  {id:'sa', at:2, type:'drop', label:'IPsec tunnel is down', short:'TUNNEL DOWN', title:'No security association: nothing can be encrypted', body:'Phase 1 or 2 negotiation fails (mismatched proposals, pre-shared key, or selectors). The route still points at the tunnel, so packets are silently discarded. Check the tunnel state first.', user:'$ ipsec statusall   # no ESTABLISHED SA\n$ aws ec2 describe-vpn-connections   # VgwTelemetry: DOWN', d:['rfc4301', 'awsvpn']},
  {id:'mtu', at:3, type:'mtu', label:'ESP overhead exceeds the path MTU', short:'MTU', title:'Large packets vanish after encapsulation', body:'Small packets (ping, SYN, login) work, but full-size packets exceed the path MTU after encryption. If ICMP "fragmentation needed" is filtered, TCP stalls. Clamp MSS on the tunnel (about 1350-1380) instead of relying on PMTUD.', user:'$ ping -M do -s 1472 10.0.1.25   # fails\n$ ping -M do -s 1300 10.0.1.25   # works', d:['rfc1191', 'rfc4303']},
  {id:'sg', at:6, type:'drop', label:'Security group allows only the VPC CIDR', short:'SG DROP', title:'The office range is not allowed at the instance', body:'The tunnel is up and routing works, but the instance\'s security group allows 10.0.0.0/16 only. The packet arrives and is dropped. Flow Logs show REJECT.', user:'$ curl -m 5 https://10.0.1.25\ntimed out   # while a same-VPC host works', d:['awssg']}
]),

xregion: J('Hybrid & multi-region', 'Cross-region (TGW peering)', 'us-east-1 ↔ eu-west-1', 'EC2 in us-east-1 → Transit Gateway peering → EC2 in eu-west-1', ['awstgwp', 'awstgw', 'awssg'], [
  N('EC2 us-east-1', 'EC2', 'host', 'VPC 10.1.0.0/16 (N. Virginia)', 'ORIGIN', 0, '10.1.1.10', 'The instance calls a private address in another region. Latency, not bandwidth, is now the main cost.', {set:{ipSrc:'10.1.1.10', ipDst:'10.2.1.20', sport:50720, dport:8443}, docs:['awstgwp']}),
  N('VPC router', 'RT', 'router', 'us-east-1', 'ROUTE TABLE', 0.4, '10.1.1.1', 'Sends 10.2.0.0/16 to the regional Transit Gateway.', {router:true, docs:['awsrt']}),
  N('TGW us-east-1', 'TGW', 'router', 'us-east-1', 'STATIC ROUTE TO PEER', 1, 'tgw-use1', 'A TGW peering attachment does not propagate routes. A static route for the remote CIDR must be added on both sides.',
    {router:true, docs:['awstgwp'], x:[TBL('TGW route table (us-east-1)', ['CIDR', 'Attachment', 'Type'], [['10.1.0.0/16', 'vpc-a', 'propagated'], ['10.2.0.0/16', 'peering-euw1', 'static']], [1], 'Without the static route the packet is a blackhole.', {static:[]})]}),
  N('AWS backbone', 'BB', 'switch', 'AWS global network', '~70 ms ROUND TRIP', 38, 'private fibre', 'Traffic between peered TGWs stays on the AWS backbone and is encrypted. Distance sets the delay: roughly 70-80 ms round trip here.', {docs:['awstgwp']}),
  N('TGW eu-west-1', 'TGW', 'router', 'eu-west-1', 'STATIC ROUTE BACK', 76, 'tgw-euw1', 'The remote TGW needs a static route to 10.1.0.0/16 for the replies.', {router:true, docs:['awstgwp']}),
  N('VPC router', 'RT', 'router', 'eu-west-1', 'ROUTE TABLE', 76.5, '10.2.1.1', 'Delivers locally in the destination VPC.', {router:true, docs:['awsrt']}),
  N('EC2 eu-west-1', 'EC2', 'server', 'VPC 10.2.0.0/16 (Ireland)', 'DELIVERED', 77, '10.2.1.20', 'Delivered when the security group allows the source CIDR.', {docs:['awssg']})
], [
  {id:'static', at:2, type:'drop', label:'No static route to the peer', short:'BLACKHOLE', title:'TGW peering needs static routes: none exist', body:'Peering attachments are static-only. Without a route for 10.2.0.0/16 pointing at the peering attachment, the TGW drops the packet. Add routes on both TGWs.', user:'$ curl -m 5 http://10.2.1.20:8443\ntimed out\n$ aws ec2 search-transit-gateway-routes ...', d:['awstgwp']},
  {id:'sg', at:6, type:'drop', label:'Remote security group blocks the source', short:'SG DROP', title:'The destination security group does not include the other region\'s CIDR', body:'Security groups can reference other security groups only within a VPC or a peering; across regions use CIDR ranges. Packets arrive and are dropped.', user:'$ curl -m 5 http://10.2.1.20:8443\ntimed out', d:['awssg']}
]),

/* ================================================================ Incident replays */
bgpleak: J('Incident replays', 'BGP route leak', 'More-specific prefix wins', 'Client → ISP → backbone → content edge (with a leaked prefix)', ['rfc7908', 'rfc4271', 'rfc7454'], [
  N('Client', 'PC', 'host', 'Eyeball ISP', 'ORIGIN', 0, '192.0.2.10', 'A normal user opens a site hosted in 203.0.113.0/24.', {set:{ipSrc:'192.0.2.10', ipDst:'203.0.113.10', sport:52144, dport:443}, docs:['rfc4271']}),
  N('ISP router', 'RT', 'router', 'AS 64496', 'DEFAULT TO TRANSIT', 4, '192.0.2.1', 'The access ISP has a default route to its transit provider.', {router:true, docs:['rfc4271']}),
  N('Transit backbone', 'BB', 'router', 'AS 64497', 'BEST PATH SELECTION', 12, '198.51.100.1', 'BGP picks the longest matching prefix first, whatever the AS path length. If a small network leaks a /25 that falls inside the content provider\'s /24, every router that accepts it prefers the leak.',
    {router:true, docs:['rfc4271', 'rfc7908'], x:[TBL('BGP table for 203.0.113.0/24', ['Prefix', 'AS path', 'Result'], [['203.0.113.0/24', '64497 64500', 'legitimate'], ['203.0.113.0/25', '64497 64511 64500', 'LEAKED more-specific'], ['203.0.113.128/25', '64497 64511 64500', 'LEAKED more-specific']], [0], 'Longest prefix wins: the /25 beats the /24 even though the path is longer.', {leak:[1, 2]})]}),
  N('Content edge', 'EDGE', 'router', 'AS 64500', 'LEGITIMATE PATH', 20, '203.0.113.1', 'The route the traffic should take. It was bypassed by the leaked more-specifics.', {router:true, docs:['rfc4271']}),
  N('Web server', 'SRV', 'server', 'AS 64500', 'DELIVERED', 21, '203.0.113.10', 'Normal delivery.', {docs:['rfc4271']})
], [
  {id:'leak', at:2, type:'drop', label:'Leaked /25 pulls traffic into the wrong network', short:'LEAK', title:'Traffic follows a leaked more-specific route into a network that cannot carry it', body:'A small network re-announced routes it should not have. The backbone accepted them and started sending traffic for the whole prefix toward that network, which dropped or could not carry it. Users see timeouts from many places at once. Mitigations: prefix filters, max-prefix limits, RPKI origin validation and the route-leak communities in RFC 9234.', user:'$ mtr -rwzc 20 203.0.113.10\n  ... AS64497  198.51.100.1\n  ... AS64511  ???   ← unexpected AS, loss 100%\n$ whois -h whois.radb.net 203.0.113.0/24', d:['rfc7908', 'rfc7454']}
], {banner:'Simplified reconstruction of a common route-leak pattern using documentation addresses and ASNs. Not a specific incident.'}),

pmtud: J('Incident replays', 'MTU black hole', 'ICMP filtered · stalls', 'Client → firewall → WAN tunnel → server', ['rfc1191', 'rfc2923', 'rfc4821'], [
  N('Client', 'PC', 'host', 'Office', 'ORIGIN', 0, '10.0.0.5', 'The TCP handshake works and a login prompt appears, then the session freezes when the server sends a large screen of output.', {set:{ipSrc:'10.0.0.5', ipDst:'10.8.0.20', sport:52210, dport:22}, docs:['rfc1191']}),
  N('Office router', 'RT', 'router', 'Office', 'ROUTE', 1, '10.0.0.1', 'Normal forwarding.', {router:true, docs:['rfc1812']}),
  N('Firewall', 'FW', 'router', 'Office edge', 'DROPS ALL ICMP', 2, '10.0.0.2', 'A well-meaning rule blocks every ICMP type. That includes "fragmentation needed" (type 3, code 4), the message path MTU discovery depends on.', {router:true, docs:['rfc2923'], x:[TBL('Firewall rules', ['Rule', 'Action'], [['allow tcp 22 to 10.8.0.0/16', 'allow'], ['deny icmp any any', 'deny (breaks PMTUD)']], [1], 'Allow at least ICMP type 3 code 4.', {})]}),
  N('WAN tunnel', 'TUN', 'tunnel', 'WAN', 'MTU 1400', 12, '10.8.0.1', 'The tunnel can carry only 1400-byte packets. A full 1500-byte packet with Don\'t Fragment set must be dropped and the sender told to shrink it, but the notice never arrives.', {router:true, docs:['rfc1191'], x:[TBL('Tunnel interface', ['Item', 'Value'], [['MTU', '1400'], ['MSS clamp', 'none'], ['DF bit', 'set (TCP default)']], [0, 1], 'Clamp MSS to about 1360 on the tunnel to avoid the problem entirely.')]}),
  N('Server', 'SRV', 'server', 'Data centre', 'DELIVERED', 13, '10.8.0.20', 'Small packets get through, so the handshake and short commands work.', {docs:['rfc1191']})
], [
  {id:'blackhole', at:3, type:'mtu', label:'Full-size packets vanish, no ICMP error', short:'BLACK HOLE', title:'A PMTU black hole: big packets disappear without a trace', body:'The tunnel drops oversized DF packets and sends ICMP type 3 code 4, but the firewall removes it. The sender never learns the limit, keeps retransmitting the same big segment and the connection stalls. Typical sign: SSH or HTTPS connects, then hangs.', user:'$ ping -M do -s 1372 10.8.0.20   # ok\n$ ping -M do -s 1472 10.8.0.20   # no reply, no error\n$ tracepath 10.8.0.20', d:['rfc1191', 'rfc2923']}
], {banner:'Simplified teaching reconstruction of a common outage pattern.'}),

dnsttl: J('Incident replays', 'Stale DNS after migration', 'TTL not lowered', 'Client → resolver cache vs authoritative', ['rfc1034', 'rfc1035', 'rfc8767'], [
  N('Client', 'PC', 'host', 'Office', 'ORIGIN', 0, '10.0.0.5', 'After a server migration to 203.0.113.20, some users still reach the old server.', {set:{ipSrc:'10.0.0.5', ipDst:'10.0.0.53', sport:53011, dport:53}, docs:['rfc1034']}),
  N('Office router', 'RT', 'router', 'Office', 'ROUTE', 0.5, '10.0.0.1', 'Normal forwarding.', {router:true, docs:['rfc1812']}),
  N('Recursive resolver', 'RES', 'server', 'Office', 'CACHE', 1, '10.0.0.53', 'If the name is cached, the resolver answers without asking anyone, and keeps doing so until the record\'s TTL runs out. A TTL of 86400 set before the change means up to a day of stale answers.',
    {docs:['rfc1034', 'rfc8767'], x:[TBL('Resolver cache', ['Name', 'Type', 'Value', 'TTL left'], [['api.example.com', 'A', '203.0.113.10 (old)', '81 000 s'], ['api.example.com', 'A', '203.0.113.20 (new)', 'not cached']], [0], 'The authoritative zone has the new value; this cache does not know yet.', {stale:[0]})]}),
  N('Authoritative server', 'NS', 'server', 'Authority', 'DELIVERED', 14, '192.0.2.53', 'If asked, it would return the new address with a short TTL.', {docs:['rfc1035']})
], [
  {id:'stale', at:2, type:'l7', label:'Resolver serves the old cached address', short:'STALE', title:'The resolver answers from its cache with the pre-migration address', resp:{title:'DNS response (from cache)', hdr:[['rcode', 'NOERROR'], ['Answer', 'api.example.com. 81000 IN A 203.0.113.10  (old address)'], ['Authoritative zone', 'now says 203.0.113.20']]}, body:'Nothing is broken in the network: the resolver does exactly what the old TTL told it to do. The standard practice is to lower the TTL (for example to 60 s) at least one old-TTL period before a change, then raise it again afterwards.', user:'$ dig +noall +answer api.example.com @10.0.0.53\napi.example.com. 81000 IN A 203.0.113.10\n$ dig +noall +answer api.example.com @192.0.2.53\napi.example.com. 60 IN A 203.0.113.20', d:['rfc1034', 'rfc8767']}
], {base:{proto:'udp', payload:DNSQ, payName:'DNS query'}, reply:{payload:DNSR, payName:'DNS response'}, msg:{f:'Standard query A api.example.com', r:'Standard query response A 203.0.113.20'}, l7:{title:'DNS query', hdr:[['Question', 'api.example.com IN A']]}, l7r:{title:'DNS response', hdr:[['rcode', 'NOERROR'], ['Answer', 'api.example.com. 60 IN A 203.0.113.20']]}, banner:'Simplified teaching reconstruction of a common outage pattern.'})

});

/* ============ fault metadata: symptom tags + real commands ============ */
const SYMPTOMS = [
  {id:'timeout', t:'Request hangs, then times out', h:'No error at all: a drop somewhere. Find where packets stop.'},
  {id:'refused', t:'Connection refused or reset', h:'Something answered quickly with a refusal: a reachable host with no listener or a REJECT rule.'},
  {id:'http', t:'I get an HTTP error (401, 404, 502, 503, 504)', h:'The network works; a Layer 7 device decided. Read its logs, not packet captures.'},
  {id:'big', t:'Small requests work, large ones hang', h:'Classic MTU / PMTUD black hole. Test with the do-not-fragment ping.'},
  {id:'dns', t:'Wrong, stale or failing DNS answers', h:'Compare the cache, the authoritative server and any filtering on UDP/TCP 53.'},
  {id:'scope', t:'Works from one place but not another', h:'Think security groups, ACLs, routes and policy: rules that depend on the source.'},
  {id:'cross', t:'Works inside a VPC / cluster but not across', h:'A hop between two networks has no route, no policy or no rule.'},
  {id:'trace', t:'Traceroute stops or shows * * *', h:'Find the last responding hop; the fault is at or after the next one.'}
];
const FMETA = {
  'web/ttl':{sym:['trace'], cmd:['traceroute -n 142.250.195.46', 'mtr -rwzc 20 142.250.195.46']},
  'web/mtu':{sym:['big', 'timeout'], cmd:['ping -M do -s 1472 142.250.195.46', 'tracepath 142.250.195.46', 'ip link show | grep mtu']},
  'web/drop':{sym:['timeout'], cmd:['curl -v -m 5 https://142.250.195.46', 'nc -vz 142.250.195.46 443', 'sudo tcpdump -ni any host 142.250.195.46 and tcp port 443']},
  'dns/drop':{sym:['dns', 'timeout'], cmd:['dig +time=2 +tries=1 www.example.com @8.8.8.8', 'dig +tcp www.example.com @8.8.8.8', 'resolvectl status']},
  'ping/ttl':{sym:['trace'], cmd:['traceroute -I -n 203.0.113.10', 'ping -t 3 203.0.113.10   # macOS: -m 3', 'mtr -rwzc 10 203.0.113.10']},
  'ping/drop':{sym:['timeout', 'trace'], cmd:['ping -c 3 203.0.113.10', 'curl -sI https://203.0.113.10', 'traceroute -T -p 443 203.0.113.10']},
  'aws/noroute':{sym:['timeout', 'cross'], cmd:['aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-0abc', 'aws ec2 describe-nat-gateways --filter Name=state,Values=available']},
  'aws/noigw':{sym:['timeout'], cmd:['aws ec2 describe-route-tables --filters Name=route.gateway-id,Values=igw-*', 'aws ec2 describe-nat-gateways']},
  'k8s/vxlan':{sym:['timeout', 'cross'], cmd:['ip -d link show flannel.1', 'bridge fdb show dev flannel.1', 'sudo tcpdump -ni eth0 udp port 8472']},
  'k8s/mtu':{sym:['big'], cmd:['ip link show | grep mtu', 'kubectl exec web -- ping -M do -s 1422 10.244.2.9', 'kubectl -n kube-system get cm kube-flannel-cfg -o yaml']},
  'api/jwt':{sym:['http'], cmd:['curl -i -H "Authorization: Bearer $TOK" https://api.example.com/orders', 'cut -d. -f2 <<<"$TOK" | tr _- /+ | base64 -d 2>/dev/null | jq .exp', 'date +%s']},
  'api/waf':{sym:['timeout', 'scope'], cmd:['curl -v -m 5 https://api.example.com/orders', 'curl -v -m 5 -A "Mozilla/5.0" https://api.example.com/orders']},
  'k8snp/sg':{sym:['timeout', 'scope'], cmd:['kubectl get svc web', 'curl -m 5 http://NODE_IP:30080', 'aws ec2 describe-security-groups --group-ids sg-NODES']},
  'k8snp/noep':{sym:['refused'], cmd:['kubectl get endpoints web', 'kubectl get pods -l app=web -o wide', 'kubectl describe svc web']},
  'k8sing/notfound':{sym:['http'], cmd:['curl -i -H "Host: shop.example.com" http://INGRESS_IP/cart', 'kubectl describe ingress shop', 'kubectl get ingressclass']},
  'k8sing/noep':{sym:['http'], cmd:['kubectl get endpoints cart-svc', 'kubectl describe pod -l app=cart | grep -A5 Readiness', 'kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --tail=50']},
  'k8spol/egress':{sym:['timeout', 'scope'], cmd:['kubectl get netpol -A', 'kubectl exec frontend -- nc -vz 10.244.2.8 5432', 'kubectl exec frontend -- nslookup kubernetes.default']},
  'k8spol/deny':{sym:['timeout', 'scope'], cmd:['kubectl get netpol -n db -o yaml', 'kubectl get ns frontend --show-labels', 'kubectl exec frontend -- nc -vz postgres.db 5432']},
  'awstgw/noprop':{sym:['timeout', 'cross'], cmd:['aws ec2 search-transit-gateway-routes --transit-gateway-route-table-id tgw-rtb-0abc --filters Name=state,Values=active,blackhole', 'aws ec2 get-transit-gateway-route-table-associations --transit-gateway-route-table-id tgw-rtb-0abc']},
  'awstgw/sg':{sym:['timeout', 'scope', 'cross'], cmd:['aws ec2 describe-security-groups --group-ids sg-0abc', 'aws ec2 create-network-insights-path --source i-SRC --destination i-DST --protocol tcp --destination-port 8443']},
  'awspeer/overlap':{sym:['cross'], cmd:['aws ec2 describe-vpcs --query "Vpcs[].CidrBlock"', 'aws ec2 describe-vpc-peering-connections']},
  'awspeer/transit':{sym:['cross', 'timeout'], cmd:['aws ec2 describe-vpc-peering-connections --query "VpcPeeringConnections[].[VpcPeeringConnectionId,Status.Code]"', 'aws ec2 describe-route-tables']},
  'awspl/sg':{sym:['timeout', 'cross'], cmd:['aws ec2 describe-vpc-endpoints --vpc-endpoint-ids vpce-0abc', 'dig +short service.region.vpce.amazonaws.com', 'curl -v -m 5 https://vpce-0abc.example.vpce.amazonaws.com']},
  'awspl/unhealthy':{sym:['timeout', 'refused'], cmd:['aws elbv2 describe-target-health --target-group-arn ARN', 'aws elbv2 describe-target-group-attributes --target-group-arn ARN']},
  'awsalb/unhealthy':{sym:['http'], cmd:['aws elbv2 describe-target-health --target-group-arn ARN', 'curl -i http://10.0.2.30:8080/health', 'aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name HealthyHostCount ...']},
  'awsalb/slow':{sym:['http'], cmd:['curl -w "%{time_total}\\n" -o /dev/null -s https://app.example.com/report', 'aws elbv2 describe-load-balancer-attributes --load-balancer-arn ARN | grep idle']},
  'awsalb/sg':{sym:['http', 'timeout'], cmd:['aws elbv2 describe-target-health --target-group-arn ARN', 'aws ec2 describe-security-groups --group-ids sg-TARGET']},
  'sgnacl/nacl':{sym:['timeout', 'scope'], cmd:['aws ec2 describe-network-acls --filters Name=association.subnet-id,Values=subnet-0abc', 'aws logs filter-log-events --log-group-name vpc-flow-logs --filter-pattern REJECT']},
  'sgnacl/sgdeny':{sym:['timeout', 'scope'], cmd:['aws ec2 describe-security-groups --group-ids sg-0d4e5f', 'aws ec2 authorize-security-group-ingress --group-id sg-0d4e5f --protocol tcp --port 8443 --cidr 203.0.113.0/24']},
  'arp/pvlan':{sym:['scope'], cmd:['ip neigh show', 'arp -an', 'sudo arping -I eth0 192.168.1.1', 'sudo tcpdump -nn -e arp']},
  'synflood/ingress':{sym:['scope'], cmd:['ss -ant state syn-recv | wc -l', 'sysctl net.ipv4.tcp_syncookies']},
  'synflood/backlog':{sym:['timeout'], cmd:['ss -ant state syn-recv | wc -l', 'sysctl net.ipv4.tcp_syncookies net.ipv4.tcp_max_syn_backlog', 'nstat -az | grep -Ei "listen(drops|overflows)|syncookies"']},
  'dnsspoof/forged':{sym:['dns'], cmd:['dig +short www.example.com @10.0.0.53', 'dig +short www.example.com @192.0.2.53', 'dig +dnssec www.example.com @10.0.0.53']},
  'dnsspoof/dnssec':{sym:['dns'], cmd:['dig +dnssec www.example.com @10.0.0.53', 'dig +cd www.example.com @10.0.0.53   # skip validation to compare', 'delv www.example.com']},
  'hybrid/sa':{sym:['timeout', 'cross'], cmd:['ipsec statusall', 'aws ec2 describe-vpn-connections --query "VpnConnections[].VgwTelemetry"', 'sudo tcpdump -ni eth0 esp or udp port 500 or udp port 4500']},
  'hybrid/mtu':{sym:['big'], cmd:['ping -M do -s 1372 10.0.1.25', 'tracepath 10.0.1.25', 'sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu']},
  'hybrid/sg':{sym:['timeout', 'scope', 'cross'], cmd:['aws ec2 describe-security-groups --group-ids sg-0abc', 'aws logs filter-log-events --log-group-name vpc-flow-logs --filter-pattern "10.20.5.15 REJECT"']},
  'xregion/static':{sym:['timeout', 'cross'], cmd:['aws ec2 search-transit-gateway-routes --transit-gateway-route-table-id tgw-rtb-0abc --filters Name=state,Values=active,blackhole --region us-east-1', 'aws ec2 describe-transit-gateway-peering-attachments --region us-east-1']},
  'xregion/sg':{sym:['timeout', 'scope', 'cross'], cmd:['aws ec2 describe-security-groups --group-ids sg-0abc --region eu-west-1', 'ping -c 5 10.2.1.20']},
  'bgpleak/leak':{sym:['timeout', 'scope'], cmd:['mtr -rwzc 20 203.0.113.10', 'traceroute -A 203.0.113.10', 'whois -h whois.radb.net 203.0.113.0/24']},
  'pmtud/blackhole':{sym:['big', 'timeout'], cmd:['ping -M do -s 1372 10.8.0.20', 'ping -M do -s 1472 10.8.0.20', 'tracepath 10.8.0.20', 'sudo tcpdump -ni any icmp and icmp[0]=3']},
  'dnsttl/stale':{sym:['dns'], cmd:['dig +noall +answer api.example.com @10.0.0.53', 'dig +noall +answer api.example.com @192.0.2.53', 'unbound-control flush api.example.com']}
};
