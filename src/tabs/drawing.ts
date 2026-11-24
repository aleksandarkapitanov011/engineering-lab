import type { TabSpec } from '../app/context';
import { h } from '../ui/dom';

export const drawingTab: TabSpec = {
  id: 'drawing',
  label: 'tabDrawing',
  icon: 'drawing',
  create: () => ({ el: h('section', null, 'TODO'), activate() {}, deactivate() {}, dispose() {} }),
};
