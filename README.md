# Hop by Hop — hopbyhop.eknathalabs.com
Follow one packet across the network: real bytes, real checksums, every rewrite explained. Single file, offline, no backend, nothing uploaded.

## What is inside
- 22 journeys: internet, DNS, ping/traceroute, AWS (NAT, Transit Gateway, peering, PrivateLink, ALB), Kubernetes (Service, NodePort, Ingress, NetworkPolicy), API gateway, firewall rule trace, attack replays (ARP spoofing, SYN flood, DNS poisoning), hybrid VPN and cross-region, incident replays (BGP leak, MTU black hole, stale DNS).
- 50+ faults, each with the real commands that confirm it.
- "Why is it failing?" symptom finder and fault library.
- PCAP viewer (pcap / pcapng, decoded in the browser, checksum verification, conversation ladder).
- Traceroute decoder, sequence view, layer focus, PNG export, EN/TE/HI, light/dark, mobile layout.

## Deploy (GitHub Pages)
1. Push `index.html` and `CNAME` to repo `eknatha/hopbyhop` (branch main, root).
2. Settings → Pages → deploy from main. DNS: CNAME `hopbyhop` → `eknatha.github.io`.

## Develop
`src/`: style.css, data.js + data2.js (journeys, faults, docs registry, command metadata), engine.js (packet model), pages.js (Why page, PCAP viewer), ui.js, template.html.
`node build.js` concatenates them into `index.html`.
Add a journey: add an entry to `SC` in data2.js (nodes, faults), and optional `FMETA` commands. Animation, X-ray, bytes and docs follow automatically.
Docs links must come from official sources only (see `DOCS`).
