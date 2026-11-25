/**
 * Close-up of a micrometer scale (ISO 3611): sleeve with millimetre lines above the datum line and
 * half-millimetre lines below it, thimble with 50 divisions of 0.01 mm. Drag the thimble to turn it.
 */
import { h } from './dom';

export interface MicrometerReading {
  /** Whole millimetres visible on the sleeve. */
  mm: number;
  /** The half-millimetre line below the datum is visible. */
  half: boolean;
  /** Thimble division on the datum line (0…49). */
  thimble: number;
  value: number;
}

/** Splits a reading into what the scale shows: 15,27 → 15 mm + no half + 27 divisions. */
export function readMicrometer(value: number): MicrometerReading {
  const hundredths = Math.round(value * 100);
  const mm = Math.floor(hundredths / 100);
  const rest = hundredths - mm * 100;
  return { mm, half: rest >= 50, thimble: rest % 50, value: hundredths / 100 };
}

const W = 340;
const H = 150;
const XT = 196; // thimble edge on screen
const YD = 70; // datum line
const PX_MM = 30; // sleeve scale
const PX_DIV = 7; // thimble division spacing
const NS = 'http://www.w3.org/2000/svg';

export interface MicrometerScale {
  el: HTMLElement;
  set(reading: number, contact: boolean): void;
}

/** `onTurn(delta)` gets the change of the opening in mm while the thimble is dragged. */
export function createMicrometerScale(onTurn: (delta: number) => void): MicrometerScale {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'mic-svg');
  svg.setAttribute('role', 'img');
  const el = h('div', { class: 'mic' });
  el.appendChild(svg);

  // Drag on the thimble = turning it. Up = opening, like turning the thimble away from you.
  let lastY: number | null = null;
  svg.addEventListener('pointerdown', (e) => {
    lastY = e.clientY;
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (lastY === null) return;
    const r = svg.getBoundingClientRect();
    const k = H / Math.max(1, r.height); // screen px → svg units
    const dy = (lastY - e.clientY) * k;
    lastY = e.clientY;
    if (dy !== 0) onTurn((dy / PX_DIV) * 0.01);
  });
  const end = (): void => {
    lastY = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  const set = (reading: number, contact: boolean): void => {
    const parts: string[] = [];
    const sx = (v: number): number => XT - (reading - v) * PX_MM;
    // Frame/sleeve body.
    parts.push(`<rect x="0" y="${YD - 26}" width="${XT + 4}" height="52" rx="3" class="mic-sleeve"/>`);
    parts.push(`<line x1="0" y1="${YD}" x2="${XT}" y2="${YD}" class="mic-line"/>`);
    // Sleeve graduations (only those not covered by the thimble).
    const first = Math.max(0, Math.floor(reading - XT / PX_MM) - 1);
    for (let v = first; v <= reading + 1e-9; v++) {
      const x = sx(v);
      if (x < 0) continue;
      const long = v % 5 === 0;
      parts.push(`<line x1="${x}" y1="${YD}" x2="${x}" y2="${YD - (long ? 16 : 11)}" class="mic-line"/>`);
      if (long) parts.push(`<text x="${x}" y="${YD - 19}" class="mic-num">${v}</text>`);
    }
    for (let v = first + 0.5; v <= reading + 1e-9; v += 1) {
      const x = sx(v);
      if (x < 0) continue;
      parts.push(`<line x1="${x}" y1="${YD}" x2="${x}" y2="${YD + 11}" class="mic-line"/>`);
    }
    // Thimble.
    parts.push(`<path d="M${XT} ${YD - 52}L${XT + 12} ${YD - 58}H${W - 34}V${YD + 58}H${XT + 12}L${XT} ${YD + 52}Z" class="mic-thimble"/>`);
    for (let i = 0; i < 9; i++) parts.push(`<line x1="${XT + 70 + i * 7}" y1="${YD - 54}" x2="${XT + 70 + i * 7}" y2="${YD + 54}" class="mic-knurl"/>`);
    const t = (reading * 100) % 50; // thimble position in divisions
    const t0 = Math.floor(t);
    for (let k = -8; k <= 8; k++) {
      const div = (((t0 + k) % 50) + 50) % 50;
      const y = YD + (t - (t0 + k)) * PX_DIV;
      if (y < YD - 50 || y > YD + 50) continue;
      const long = div % 5 === 0;
      parts.push(`<line x1="${XT}" y1="${y}" x2="${XT + (long ? 16 : 10)}" y2="${y}" class="mic-line"/>`);
      if (long) parts.push(`<text x="${XT + 20}" y="${y + 4}" class="mic-num mic-num-t">${div}</text>`);
    }
    // Ratchet.
    parts.push(`<rect x="${W - 32}" y="${YD - 30}" width="30" height="60" rx="4" class="mic-ratchet${contact ? ' on' : ''}"/>`);
    for (let i = 0; i < 4; i++) parts.push(`<line x1="${W - 26 + i * 6}" y1="${YD - 26}" x2="${W - 26 + i * 6}" y2="${YD + 26}" class="mic-knurl"/>`);
    // Datum pointer arrow.
    parts.push(`<path d="M${XT - 2} ${YD}l-7 -4v8z" class="mic-ptr"/>`);
    svg.innerHTML = parts.join('');
    svg.setAttribute('aria-label', 'Скала на микрометъра');
  };
  return { el, set };
}
