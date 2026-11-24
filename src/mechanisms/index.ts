/**
 * Mechanism registry. To add a mechanism: create a folder next to `spur-gear/` that exports a
 * `Mechanism`, import it here and register it (replacing its teaser if it had one).
 * The app shell never needs to change.
 */
import { registerEntry } from '../core/registry';
import { spurGear } from './spur-gear';

const line = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

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

const planetThumb = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <circle ${line} cx="60" cy="40" r="34"/><circle ${line} cx="60" cy="40" r="10"/>
  <circle ${line} cx="60" cy="18" r="10"/><circle ${line} cx="79" cy="51" r="10"/><circle ${line} cx="41" cy="51" r="10"/>
  <path ${line} stroke-dasharray="4 3" d="M60 18 L79 51 L41 51 Z"/>
</svg>`;

registerEntry(spurGear);
registerEntry({
  kind: 'teaser',
  id: 'bevel-gear',
  title: { bg: 'Конична предавка', en: 'Bevel gear pair' },
  subtitle: { bg: 'Предаване между пресичащи се валове', en: 'Intersecting shafts' },
  thumbnail: bevelThumb,
  pro: true,
});
registerEntry({
  kind: 'teaser',
  id: 'worm-gear',
  title: { bg: 'Червячна предавка', en: 'Worm gear' },
  subtitle: { bg: 'Голямо предавателно отношение в едно стъпало', en: 'High ratio in one stage' },
  thumbnail: wormThumb,
  pro: true,
});
registerEntry({
  kind: 'teaser',
  id: 'planetary',
  title: { bg: 'Планетарен редуктор', en: 'Planetary gearbox' },
  subtitle: { bg: 'Слънчево колело, сателити и венец', en: 'Sun, planets and ring' },
  thumbnail: planetThumb,
  pro: true,
});
