#!/usr/bin/env node
/* Renders the bastion crest to PNG app icons with headless Chromium.
   Run: node tools/make-icons.js   (needs playwright + a chromium build) */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'docs');
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const page = (size, maskable) => `<!doctype html><html><head><style>
  html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}
  canvas{display:block}
</style></head><body><canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const s = ${size}, mask = ${maskable};
const ctx = document.getElementById('c').getContext('2d');
const TAU = Math.PI * 2;
/* ground */
const bg = ctx.createLinearGradient(0, 0, 0, s);
bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#0b1020');
ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);
/* a few stars */
for (let i = 0; i < 26; i++) {
  ctx.fillStyle = 'rgba(200,225,255,' + (0.25 + Math.random() * 0.5) + ')';
  ctx.beginPath();
  ctx.arc(Math.random() * s, Math.random() * s * 0.6, s * 0.004 + Math.random() * s * 0.004, 0, TAU);
  ctx.fill();
}
/* maskable icons need everything inside the safe circle */
const k = mask ? 0.62 : 0.80;
const cx = s / 2, cy = s / 2, r = (s / 2) * k;
const hex = (rad) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * TAU / 6;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
};
/* glow */
const gl = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.5);
gl.addColorStop(0, 'rgba(90,170,255,.55)'); gl.addColorStop(1, 'rgba(90,170,255,0)');
ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, TAU); ctx.fill();
/* outer ring */
ctx.strokeStyle = 'rgba(150,205,255,.85)'; ctx.lineWidth = s * 0.035;
hex(r); ctx.stroke();
/* core */
const cg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
cg.addColorStop(0, '#a8dcff'); cg.addColorStop(.5, '#3f7ee8'); cg.addColorStop(1, '#1b3a86');
ctx.fillStyle = cg; hex(r * 0.66); ctx.fill();
/* highlight */
ctx.fillStyle = 'rgba(255,255,255,.28)';
ctx.beginPath();
ctx.ellipse(cx - r * 0.2, cy - r * 0.28, r * 0.32, r * 0.16, -0.5, 0, TAU);
ctx.fill();
</script></body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [size, maskable, name] of [
    [180, false, 'icon-180.png'],
    [192, false, 'icon-192.png'],
    [512, false, 'icon-512.png'],
    [512, true, 'icon-512-maskable.png'],
  ]) {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(size, maskable));
    await p.waitForTimeout(120);
    await p.screenshot({ path: path.join(OUT, name), omitBackground: false });
    await p.close();
    console.log('docs/' + name);
  }
  await browser.close();
})();
