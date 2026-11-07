const fs = require('fs'), p = require('path');
const d = __dirname, r = f => fs.readFileSync(p.join(d, 'src', f), 'utf8');
const js = ['data.js', 'engine.js', 'ui.js'].map(r).join('\n').replace(/<\/script>/g, '<\\/script>');
const out = r('template.html').replace('/*CSS*/', () => r('style.css')).replace('/*JS*/', () => js);
fs.writeFileSync(p.join(d, 'index.html'), out);
console.log('index.html', (out.length / 1024).toFixed(1) + ' KB');
