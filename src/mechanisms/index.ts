/**
 * Catalogue: folders and the entries in them. To add a mechanism: create a folder next to `spur-gear/`
 * that exports a `Mechanism` (with its `category`), import it here and register it (replacing its
 * teaser if it had one). The app shell never needs to change.
 */
import { registerCategory, registerEntry } from '../core/registry';
import { spurGear } from './spur-gear';
import { helicalBevel } from './helical-bevel';
import { bevelPreview, planetaryPreview, spurPairPreview, wormPreview } from './previews';
import { mechanismPreview } from '../three/thumbs';

const line = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const thin = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';

/** A gear outline (polygon of teeth) for the small schematic thumbnails. */
function gear(cx: number, cy: number, r: number, z: number, attrs = line): string {
  const pts: string[] = [];
  const h = Math.max(2.2, r * 0.16);
  for (let i = 0; i < z; i++) {
    for (const [f, rr] of [
      [0, r - h / 2],
      [0.18, r + h / 2],
      [0.5, r + h / 2],
      [0.68, r - h / 2],
    ] as [number, number][]) {
      const a = ((i + f) / z) * Math.PI * 2;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
  }
  return `<polygon ${attrs} points="${pts.join(' ')}"/>`;
}

// ---------------------------------------------------------------- Folders

registerCategory({
  id: 'gears',
  title: { bg: 'Предавки', en: 'Gear drives' },
  subtitle: {
    bg: 'Двойки елементи, които предават въртене: зъбни, конични, червячни',
    en: 'Pairs of elements that transmit rotation: spur, bevel, worm',
  },
  thumbnail: `<svg viewBox="0 0 120 80" aria-hidden="true">${gear(44, 40, 20, 14)}${gear(81, 40, 13, 9)}
    <circle ${line} cx="44" cy="40" r="5"/><circle ${line} cx="81" cy="40" r="4"/></svg>`,
  preview: spurPairPreview,
});

registerCategory({
  id: 'mechanisms',
  title: { bg: 'Механизми', en: 'Mechanisms' },
  subtitle: {
    bg: 'Цели възли от много детайли: редуктори с корпус, валове и лагери',
    en: 'Complete assemblies: gearboxes with housing, shafts and bearings',
  },
  thumbnail: `<svg viewBox="0 0 120 80" aria-hidden="true">
    <path ${line} d="M22 18 H92 a6 6 0 0 1 6 6 V58 a6 6 0 0 1 -6 6 H22 a6 6 0 0 1 -6 -6 V24 a6 6 0 0 1 6 -6 Z"/>
    <path ${line} d="M30 64 V72 H44 V64 M74 64 V72 H88 V64"/>
    ${gear(42, 38, 9, 9, thin)}${gear(66, 38, 15, 14, thin)}
    <path ${line} d="M4 38 H33 M66 38 H116" stroke-dasharray="5 3 1.5 3"/>
  </svg>`,
  preview: { ...mechanismPreview(helicalBevel), dir: [1.25, 0.8, 0.9] },
});

// ---------------------------------------------------------------- Gear drives

const bevelThumb = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <path ${line} d="M20 62 L56 26 L56 62 Z"/><path ${line} d="M56 26 L100 26 L56 62"/>
  <path ${line} d="M28 54 L50 54 M34 48 L50 48 M40 42 L50 42"/><path ${line} d="M64 34 L90 34 M64 40 L80 40"/>
  <path ${line} stroke-dasharray="6 3 1.5 3" d="M8 62 L56 62 M56 70 L56 10"/>
</svg>`;

const wormThumb = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <circle ${line} cx="60" cy="30" r="22"/><circle ${line} cx="60" cy="30" r="6"/>
  <rect ${line} x="18" y="56" width="84" height="16" rx="3"/>
  <path ${line} d="M28 56 L36 72 M40 56 L48 72 M52 56 L60 72 M64 56 L72 72 M76 56 L84 72 M88 56 L96 72"/>
</svg>`;

registerEntry(spurGear);
registerEntry({
  kind: 'teaser',
  id: 'bevel-gear',
  category: 'gears',
  title: { bg: 'Конична предавка', en: 'Bevel gear pair' },
  subtitle: { bg: 'Предаване между пресичащи се валове', en: 'Intersecting shafts' },
  thumbnail: bevelThumb,
  preview: bevelPreview,
  pro: true,
});
registerEntry({
  kind: 'teaser',
  id: 'worm-gear',
  category: 'gears',
  title: { bg: 'Червячна предавка', en: 'Worm gear' },
  subtitle: { bg: 'Голямо предавателно отношение в едно стъпало', en: 'High ratio in one stage' },
  thumbnail: wormThumb,
  preview: wormPreview,
  pro: true,
});

// ---------------------------------------------------------------- Mechanisms

const planetThumb = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <circle ${line} cx="60" cy="40" r="34"/><circle ${line} cx="60" cy="40" r="10"/>
  <circle ${line} cx="60" cy="18" r="10"/><circle ${line} cx="79" cy="51" r="10"/><circle ${line} cx="41" cy="51" r="10"/>
  <path ${line} stroke-dasharray="4 3" d="M60 18 L79 51 L41 51 Z"/>
</svg>`;

registerEntry(helicalBevel);
registerEntry({
  kind: 'teaser',
  id: 'planetary',
  category: 'mechanisms',
  title: { bg: 'Планетарен редуктор', en: 'Planetary gearbox' },
  subtitle: { bg: 'Слънчево колело, сателити и венец', en: 'Sun, planets and ring' },
  thumbnail: planetThumb,
  preview: planetaryPreview,
  pro: true,
});
