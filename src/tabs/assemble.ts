import type { TabSpec } from '../app/context';
import { h } from '../ui/dom';

export const assembleTab: TabSpec = {
  id: 'assemble',
  label: 'tabAssemble',
  icon: 'assemble',
  create: () => ({ el: h('section', null, 'TODO'), activate() {}, deactivate() {}, dispose() {} }),
};
