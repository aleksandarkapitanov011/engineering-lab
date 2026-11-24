import type { Mechanism } from '../core/types';
import type { Theme } from '../core/storage';
import type { StringKey } from '../i18n';
import type { IconName } from '../ui/icons';

export interface AppContext {
  theme(): Theme;
  onThemeChange(fn: (t: Theme) => void): () => void;
  /** Switch to another tab of the current mechanism. */
  goToTab(id: TabId): void;
}

export interface TabView {
  el: HTMLElement;
  /** Called when the tab becomes visible (create heavy resources here). */
  activate(): void;
  /** Called when the tab is hidden (release heavy resources such as WebGL contexts). */
  deactivate(): void;
  dispose(): void;
}

export type TabId = 'model' | 'assemble' | 'drawing' | 'theory';

export interface TabSpec {
  id: TabId;
  label: StringKey;
  icon: IconName;
  create(mech: Mechanism, ctx: AppContext): TabView;
}
