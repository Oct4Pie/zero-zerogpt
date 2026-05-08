// Copies the pdf.js worker into public/ at build/dev time so the app can serve
// it from its own origin instead of pulling it from a CDN at runtime.
const fs = require('fs');
const path = require('path');

const candidates = [
  'pdf.worker.min.mjs',
  'pdf.worker.mjs',
  'pdf.worker.min.js',
  'pdf.worker.js',
];

const fromDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');
const toDir = path.join(__dirname, '..', 'public');

const found = candidates.find((name) => fs.existsSync(path.join(fromDir, name)));
if (!found) {
  console.error('[copy-pdf-worker] no pdf.worker.* found in', fromDir);
  process.exit(1);
}

const src = path.join(fromDir, found);
const dst = path.join(toDir, found);
fs.mkdirSync(toDir, { recursive: true });
fs.copyFileSync(src, dst);
console.log(`[copy-pdf-worker] ${src} -> ${dst}`);
