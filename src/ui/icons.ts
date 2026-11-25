/** Inline line icons (24x24, stroke = currentColor). No emoji, no external files. */
const wrap = (d: string, extra = ''): string =>
  `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  model: wrap('<path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>'),
  assemble: wrap(
    '<path d="M9 3h6v3a2 2 0 1 0 4 0V3h2v6h-3a2 2 0 1 0 0 4h3v8h-6v-3a2 2 0 1 0-4 0v3H3v-8h3a2 2 0 1 0 0-4H3V3z"/>',
  ),
  drawing: wrap(
    '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M6 15h7M6 15V9M6 9l1.5 1.5M6 9 4.5 10.5M13 15l-1.5-1.5M13 15l-1.5 1.5"/><path d="M15 16h3v-3h-3z"/>',
  ),
  theory: wrap('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>'),
  play: wrap('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  pause: wrap('<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>'),
  explode: wrap('<path d="M9 9h6v6H9z"/><path d="M4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3"/><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>'),
  section: wrap('<path d="M12 3a9 9 0 1 0 0 18"/><path d="M12 3v18" stroke-dasharray="2.5 2.5"/><path d="M5 8h7M4 12h8M5 16h7"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  close: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
  lock: wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  star: wrap('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>'),
  starFill: wrap('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor"/>'),
  timer: wrap('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>'),
  alert: wrap('<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>'),
  reset: wrap('<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
  moon: wrap('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  chevronRight: wrap('<path d="m9 5 7 7-7 7"/>'),
  chevronLeft: wrap('<path d="m15 5-7 7 7 7"/>'),
  check: wrap('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  ccw: wrap('<path d="M18.5 9A7.5 7.5 0 1 0 19.5 13"/><path d="M19 3.5V9h-5.5"/>'),
  cw: wrap('<path d="M5.5 9A7.5 7.5 0 1 1 4.5 13"/><path d="M5 3.5V9h5.5"/>'),
  mesh: wrap('<circle cx="8" cy="12" r="5"/><circle cx="18" cy="12" r="3.5"/><path d="M8 4.5v-1.5M8 21v-1.5M1.5 12H3M13 9.5l1.5-.6M13 14.5l1.5.6"/><path d="M11.5 16.5l6-9" stroke-dasharray="2 1.6"/>'),
  mount: wrap('<rect x="9" y="3.5" width="6" height="7" rx="1"/><path d="M2 7h7M15 7h7"/><path d="M2 20 22 14.5"/><path d="M2 17h20" stroke-dasharray="1.8 1.8"/>'),
  stress: wrap('<path d="M3 20 12 4l9 16z"/><path d="M7.5 12h9M12 4v16M7.5 12 12 20l4.5-8"/>'),
  forces: wrap('<path d="M12 12V3.5M12 3.5 9 6.5M12 3.5l3 3M12 12h8.5M20.5 12l-3-3M20.5 12l-3 3"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M5 19l3.5-3.5" stroke-dasharray="2 2"/>'),
  sliders: wrap('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>'),
  expand: wrap('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
};

export type IconName = keyof typeof icons;
