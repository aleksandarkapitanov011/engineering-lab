import type { TabSpec } from '../app/context';
import { h } from '../ui/dom';

export const theoryTab: TabSpec = {
  id: 'theory',
  label: 'tabTheory',
  icon: 'theory',
  create: () => ({ el: h('section', null, 'TODO'), activate() {}, deactivate() {}, dispose() {} }),
};
