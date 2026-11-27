/**
 * Draws the app icons (PNG, no dependencies): an orange gear on the dark app colour.
 *   node scripts/icons.mjs   → public/icons/icon-192.png, icon-512.png, maskable-512.png
 * "maskable" fills the whole square and keeps the gear inside the 80 % safe zone (Android crops it).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [21, 23, 27];
const ORANGE = [255, 122, 26];
const LIGHT = [255, 177, 110];

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Colour of a point (u, v in −1…1) or null for the background; `k` scales the gear. */
function shade(u, v, k) {
  const r = Math.hypot(u, v) / k;
  const a = Math.atan2(v, u);
  const z = 10;
  // Tooth profile: trapezoidal teeth between the root and tip radius.
  const f = (((a / (2 * Math.PI)) * z) % 1 + 1) % 1;
  const rise = 0.12;
  let t;
  if (f < 0.1) t = 0;
  else if (f < 0.1 + rise) t = (f - 0.1) / rise;
  else if (f < 0.5) t = 1;
  else if (f < 0.5 + rise) t = 1 - (f - 0.5) / rise;
  else t = 0;
  const R = 0.66 + 0.16 * t;
  if (r > R) return null;
  if (r < 0.26) return r < 0.12 ? LIGHT : null; // bore with a small hub dot
  // Soft highlight towards the top left.
  const lit = 0.5 + 0.5 * (-(u + v) / (Math.SQRT2 * k));
  return ORANGE.map((c, i) => Math.round(c + (LIGHT[i] - c) * Math.max(0, lit - 0.55) * 0.9));
}

function draw(size, { maskable }) {
  const out = Buffer.alloc(size * size * 4);
  const ss = 4;
  const k = maskable ? 0.62 : 0.78;
  const corner = maskable ? 0 : 0.22; // rounded square for the normal icon
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = ((x + (sx + 0.5) / ss) / size) * 2 - 1;
          const v = ((y + (sy + 0.5) / ss) / size) * 2 - 1;
          // Background square (rounded unless maskable).
          const qx = Math.max(Math.abs(u) - (1 - corner * 2), 0);
          const qy = Math.max(Math.abs(v) - (1 - corner * 2), 0);
          const inBg = corner === 0 || Math.hypot(qx, qy) <= corner * 2;
          if (!inBg) continue;
          const c = shade(u, v, k) ?? BG;
          acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2], acc[3] + 255];
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      const alpha = acc[3] / n;
      out[i + 3] = Math.round(alpha);
      const cov = acc[3] / 255 || 1;
      out[i] = Math.round(acc[0] / cov);
      out[i + 1] = Math.round(acc[1] / cov);
      out[i + 2] = Math.round(acc[2] / cov);
    }
  }
  return png(size, out);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192, { maskable: false }));
writeFileSync('public/icons/icon-512.png', draw(512, { maskable: false }));
writeFileSync('public/icons/maskable-512.png', draw(512, { maskable: true }));
writeFileSync('public/icons/apple-touch-icon.png', draw(180, { maskable: true }));
console.log('icons written to public/icons');
