# Hop by Hop — hopbyhop.eknathalabs.com
Follow one packet across the network: real bytes, real checksums, every rewrite explained. Single file, offline, no backend.

## Deploy (GitHub Pages)
1. Push `index.html` and `CNAME` to repo `eknatha/hopbyhop` (branch main, root).
2. Settings → Pages → deploy from main. DNS: CNAME `hopbyhop` → `eknatha.github.io`.

## Develop
`src/` holds style.css, data.js (journeys + docs registry), engine.js (packet model), ui.js, template.html.
`node build.js` concatenates them into `index.html`.
Add a journey: add an entry to `SC` in data.js (nodes, faults, docs). Animation, X-ray, bytes and docs follow automatically.
Docs links must come from official sources only (see `DOCS`).
