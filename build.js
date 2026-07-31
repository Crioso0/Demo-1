#!/usr/bin/env node
/* ------------------------------------------------------------------
   build.js — bundles the game into a single self-contained page.

     node build.js            → dist/void-bastion.html   (one file, opens anywhere)
     node build.js --pwa      → also writes docs/ as an installable web app

   The docs/ build is what GitHub Pages serves: same single file plus a
   manifest, icons and a service worker, so iOS can "Add to Home Screen"
   and launch it full screen and offline.
------------------------------------------------------------------- */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SCRIPTS = ['js/utils.js', 'js/data.js', 'js/save.js', 'js/audio.js',
                 'js/game.js', 'js/ui.js', 'js/main.js'];

function buildBody() {
  const html = read('index.html');
  let body = html.split('<body>')[1].split('</body>')[0];
  return body.replace(/\s*<script src="[^"]+"><\/script>/g, '').trim();
}

function buildPage({ standalone, sidecar }) {
  const css = read('css/styles.css');
  const js = SCRIPTS.map(read).join('\n');
  const head = standalone ? `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<title>Void Bastion</title>
<meta name="description" content="A 30-mission tower-defense campaign across six cities." />
<meta name="theme-color" content="#0b1020" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Void Bastion" />
${sidecar ? `<link rel="manifest" href="manifest.webmanifest" />
<link rel="apple-touch-icon" href="icon-180.png" />
<link rel="icon" href="icon-192.png" />` : '<!-- single file: no sidecar manifest or icons to link -->'}
<style>
html,body{background:#0b1020;color-scheme:dark}
${css}
</style>
</head>
<body>
` : `<title>Void Bastion — Hero Collector Demo</title>
<style>
/* the game commits to one dark look — pin the ground in either viewer theme */
html, :root[data-theme="light"], :root[data-theme="dark"]{ background:#0b1020; color-scheme:dark; }
${css}
</style>
`;

  const tail = standalone ? `
<script>
${js}
</script>
<script>
/* offline support wherever the browser allows it (https, or localhost) */
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* fine without it */ });
  });
}
</script>
</body>
</html>
` : `
<script>
${js}
</script>
`;

  return head + buildBody() + tail;
}

/* ---------- single file, works from anywhere ---------- */
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const single = buildPage({ standalone: true });
fs.writeFileSync(path.join(ROOT, 'dist/void-bastion.html'), single);
console.log('dist/void-bastion.html', (single.length / 1024).toFixed(1) + ' KB');

/* the docs/ copy sits next to a manifest and icons, so it links them */
const app = buildPage({ standalone: true, sidecar: true });

/* ---------- installable web app for GitHub Pages ---------- */
if (process.argv.includes('--pwa')) {
  const docs = path.join(ROOT, 'docs');
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, 'index.html'), app);
  fs.writeFileSync(path.join(docs, '.nojekyll'), '');

  fs.writeFileSync(path.join(docs, 'manifest.webmanifest'), JSON.stringify({
    name: 'Void Bastion',
    short_name: 'Bastion',
    description: 'A 30-mission tower-defense campaign across six cities.',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2));

  /* cache the shell so it runs with no signal at all */
  const VERSION = 'vb-' + Date.now().toString(36);
  fs.writeFileSync(path.join(docs, 'sw.js'), `/* Void Bastion offline shell */
const CACHE = '${VERSION}';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* network first so a new build lands, cache as the fallback when offline */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
`);
  console.log('docs/ written — index.html, manifest, service worker');
  console.log('(icons are generated by tools/make-icons.js)');
}
