// Copies the pdf.js worker into public/ at build/dev time so the app can serve
// it from its own origin instead of pulling it from a CDN at runtime.
//
// pdfjs-dist's layout has shifted across major versions, so we discover
// whatever pdf.worker.* file exists rather than hardcoding one name.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const searchDirs = [
  path.join(root, 'node_modules', 'pdfjs-dist', 'build'),
  path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build'),
];

// Higher = better. We prefer the minified .mjs, then any .mjs, then .min.js,
// then .js. Only files starting with `pdf.worker` are considered.
function score(name) {
  if (!name.startsWith('pdf.worker')) return -1;
  if (name.endsWith('.min.mjs')) return 4;
  if (name.endsWith('.mjs')) return 3;
  if (name.endsWith('.min.js')) return 2;
  if (name.endsWith('.js')) return 1;
  return 0;
}

let best = null;
for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const s = score(name);
    if (s <= 0) continue;
    if (!best || s > best.score) {
      best = { dir, name, score: s };
    }
  }
}

if (!best) {
  console.error(
    '[copy-pdf-worker] could not find pdf.worker.* in any of:\n  ' +
      searchDirs.join('\n  ') +
      '\nIs pdfjs-dist installed?'
  );
  process.exit(1);
}

const dstDir = path.join(root, 'public');
// Always write to a deterministic name; runtime references this exact path.
const dstName = 'pdf.worker.mjs';
const src = path.join(best.dir, best.name);
const dst = path.join(dstDir, dstName);
fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(src, dst);
console.log(`[copy-pdf-worker] ${path.relative(root, src)} -> ${path.relative(root, dst)}`);
