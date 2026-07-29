/* ------------------------------------------------------------------
   utils.js — tiny math / drawing helpers shared by the whole demo
------------------------------------------------------------------- */
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

/** shortest squared distance from a point to a line segment */
function pointSegDistSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return distSq(px, py, x1 + dx * t, y1 + dy * t);
}

/** lighten (amt > 0) or darken (amt < 0) a #rrggbb colour */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => clamp(Math.round(c + 255 * amt), 0, 255);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** rounded-rect path helper (older Safari lacks ctx.roundRect) */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** star polygon, used for hero badges and sparkles */
function starPath(ctx, x, y, spikes, outer, inner, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / spikes - Math.PI / 2;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

/**
 * Builds a polyline path with cumulative lengths so entities can be
 * positioned by "distance travelled" instead of raw coordinates.
 */
function buildPath(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = dist(a.x, a.y, b.x, b.y);
    segs.push({ a, b, len, start: total, ux: (b.x - a.x) / len, uy: (b.y - a.y) / len });
    total += len;
  }
  return {
    points,
    segs,
    length: total,
    /** world position at a distance along the path */
    at(d) {
      d = clamp(d, 0, total);
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (d <= s.start + s.len || i === segs.length - 1) {
          const k = d - s.start;
          return { x: s.a.x + s.ux * k, y: s.a.y + s.uy * k, ang: Math.atan2(s.uy, s.ux) };
        }
      }
      return { x: segs[0].a.x, y: segs[0].a.y, ang: 0 };
    },
    /** squared distance from an arbitrary point to the track */
    distanceTo(px, py) {
      let best = Infinity;
      for (const s of segs) {
        const d2 = pointSegDistSq(px, py, s.a.x, s.a.y, s.b.x, s.b.y);
        if (d2 < best) best = d2;
      }
      return Math.sqrt(best);
    },
  };
}

/** deterministic RNG so procedural maps look the same on every load */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
