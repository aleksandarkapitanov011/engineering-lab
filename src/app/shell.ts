/**
 * App shell: catalogue (home) and the mechanism view with the bottom tab bar.
 * It only uses the registry and the generic Mechanism interface.
 */
import { categories, entriesIn, getCategory, getMechanism } from '../core/registry';
import type { CatalogEntry, CategoryDef, Mechanism, Preview3D } from '../core/types';
import { mechanismPreview, thumbnail } from '../three/thumbs';
import { entitlements } from '../core/entitlements';
import { storage, type Theme } from '../core/storage';
import { lang, lt, saveLang, t } from '../i18n';
import { h, fromHTML } from '../ui/dom';
import { icons } from '../ui/icons';
import { showDialog } from '../ui/sheet';
import type { AppContext, TabId, TabSpec, TabView } from './context';
import { modelTab } from '../tabs/model';
import { assembleTab } from '../tabs/assemble';
import { drawingTab } from '../tabs/drawing';
import { gearLogo } from '../ui/logo';
import { theoryTab } from '../tabs/theory';

const TABS: TabSpec[] = [modelTab, assembleTab, drawingTab, theoryTab];

export class Shell {
  private theme: Theme = storage.theme();
  private readonly themeListeners = new Set<(t: Theme) => void>();
  private current: { mechId: string; views: Map<TabId, TabView>; active: TabId | null; root: HTMLElement } | null =
    null;

  constructor(private readonly root: HTMLElement) {
    this.applyTheme();
    window.addEventListener('hashchange', () => this.route());
    this.route();
  }

  private ctx: AppContext = {
    theme: () => this.theme,
    onThemeChange: (fn) => {
      this.themeListeners.add(fn);
      return () => this.themeListeners.delete(fn);
    },
    goToTab: (id) => {
      if (this.current) location.hash = `#/m/${this.current.mechId}/${id}`;
    },
  };

  private applyTheme(): void {
    document.documentElement.dataset.theme = this.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', this.theme === 'dark' ? '#15171b' : '#eef0f3');
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    storage.setTheme(this.theme);
    this.applyTheme();
    this.themeListeners.forEach((f) => f(this.theme));
  }

  private route(): void {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'm' && parts[1]) {
      const mech = getMechanism(parts[1]);
      if (!mech) {
        this.leaveMechanism();
        this.renderNotFound();
        return;
      }
      const tab = (TABS.find((x) => x.id === parts[2])?.id ?? 'model') as TabId;
      this.showMechanism(mech, tab);
    } else if (parts[0] === 'c' && parts[1] && getCategory(parts[1])) {
      this.leaveMechanism();
      this.renderCategory(getCategory(parts[1])!);
    } else {
      this.leaveMechanism();
      this.renderHome();
    }
  }

  // ---------- Home / catalogue ----------

  private themeButton(): HTMLElement {
    const btn = h('button', {
      class: 'icon-btn',
      'aria-label': this.theme === 'dark' ? t('themeLight') : t('themeDark'),
      html: this.theme === 'dark' ? icons.sun : icons.moon,
      onclick: () => {
        this.toggleTheme();
        btn.innerHTML = this.theme === 'dark' ? icons.sun : icons.moon;
        btn.setAttribute('aria-label', this.theme === 'dark' ? t('themeLight') : t('themeDark'));
      },
    });
    return btn;
  }

  /** BG / EN switch: saves the choice and reloads on the same screen, so every text is rebuilt. */
  private langButton(): HTMLElement {
    const other = lang() === 'bg' ? 'en' : 'bg';
    return h(
      'button',
      {
        class: 'icon-btn lang-btn',
        'aria-label': t('switchLang'),
        title: t('switchLang'),
        onclick: () => {
          saveLang(other);
          location.reload();
        },
      },
      other === 'en' ? 'EN' : 'БГ',
    );
  }

  private renderHome(): void {
    const grid = h('div', { class: 'catalogue folders' });
    for (const cat of categories()) grid.appendChild(this.folderCard(cat));
    const page = h(
      'div',
      { class: 'home' },
      h(
        'header',
        { class: 'home-head' },
        h(
          'div',
          { class: 'brand' },
          h('div', { class: 'brand-mark', 'aria-hidden': 'true', html: gearLogo }),
          h('div', null, h('h1', null, t('appName')), h('p', null, t('appTagline'))),
        ),
        h('div', { class: 'head-btns' }, this.langButton(), this.themeButton()),
      ),
      h('h2', { class: 'section-label' }, t('catalogue')),
      grid,
    );
    this.root.replaceChildren(page);
  }

  /** A catalogue folder on the home screen: picture, name, what is inside. */
  private folderCard(cat: CategoryDef): HTMLElement {
    const items = entriesIn(cat.id);
    const ready = items.filter((e) => e.kind === 'mechanism').length;
    const soon = items.length - ready;
    const thumb = this.thumb(`cat:${cat.id}`, cat.thumbnail, cat.preview);
    return h(
      'a',
      { class: 'card folder', href: `#/c/${cat.id}`, 'aria-label': lt(cat.title) },
      thumb,
      h(
        'div',
        { class: 'card-text' },
        h('h3', null, lt(cat.title)),
        h('p', null, lt(cat.subtitle)),
        h('p', { class: 'folder-count' }, `${t('catModels')}: ${ready} · ${t('soon')}: ${soon}`),
      ),
      h('span', { class: 'card-cta', html: icons.chevronRight }),
    );
  }

  /** The entries of one folder. */
  private renderCategory(cat: CategoryDef): void {
    const grid = h('div', { class: 'catalogue' });
    for (const entry of entriesIn(cat.id)) grid.appendChild(this.card(entry));
    this.root.replaceChildren(
      h(
        'div',
        { class: 'home' },
        h(
          'header',
          { class: 'home-head folder-head' },
          h('a', { class: 'icon-btn', href: '#/', 'aria-label': t('back'), html: icons.back }),
          h('div', { class: 'folder-title' }, h('h1', null, lt(cat.title)), h('p', null, lt(cat.subtitle))),
          h('div', { class: 'head-btns' }, this.langButton(), this.themeButton()),
        ),
        grid,
      ),
    );
  }

  /** Card picture: the line drawing at first, replaced by the rendered 3D image when it is ready. */
  private thumb(id: string, svg: string, preview?: Preview3D): HTMLElement {
    const el = h('div', { class: 'card-thumb' });
    el.appendChild(fromHTML(svg));
    if (preview) {
      const instant = thumbnail(id, preview, (url) => {
        const img = h('img', { class: 'card-img', src: url, alt: '', draggable: 'false' });
        el.replaceChildren(img);
        el.classList.add('has-img');
      });
      if (instant) el.classList.add('no-fade');
    }
    return el;
  }

  private card(entry: CatalogEntry): HTMLElement {
    const locked = entry.kind === 'teaser';
    const thumb = this.thumb(`${entry.kind}:${entry.id}`, entry.thumbnail, entry.kind === 'mechanism' ? mechanismPreview(entry) : entry.preview);
    const badges = h('div', { class: 'card-badges' });
    if (locked) {
      badges.append(h('span', { class: 'badge soon' }, t('soon')));
      if (entry.pro) badges.append(h('span', { class: 'badge pro' }, t('pro')));
    }
    const card = h(
      'button',
      { class: `card${locked ? ' locked' : ''}`, 'aria-label': lt(entry.title) },
      thumb,
      badges,
      h(
        'div',
        { class: 'card-text' },
        h('h3', null, lt(entry.title)),
        h('p', null, lt(entry.subtitle)),
      ),
      h('span', { class: 'card-cta', html: locked ? icons.lock : icons.chevronRight }),
    );
    card.addEventListener('click', async () => {
      if (entry.kind === 'mechanism') {
        if (entry.pro && !(await entitlements().isPro())) {
          this.showLocked();
          return;
        }
        location.hash = `#/m/${entry.id}/model`;
      } else {
        this.showLocked();
      }
    });
    return card;
  }

  private showLocked(): void {
    showDialog(t('lockedTitle'), h('p', null, t('lockedBody')), [{ label: t('ok'), primary: true }]);
  }

  private renderNotFound(): void {
    this.root.replaceChildren(
      h(
        'div',
        { class: 'home' },
        h('p', null, t('notFound')),
        h('a', { class: 'btn', href: '#/' }, t('back')),
      ),
    );
  }

  // ---------- Mechanism view ----------

  private showMechanism(mech: Mechanism, tab: TabId): void {
    if (!this.current || this.current.mechId !== mech.id) {
      this.leaveMechanism();
      const content = h('main', { class: 'tab-content' });
      const tabbar = h('nav', { class: 'tabbar', role: 'tablist' });
      for (const spec of TABS) {
        tabbar.appendChild(
          h(
            'a',
            {
              class: 'tab',
              role: 'tab',
              href: `#/m/${mech.id}/${spec.id}`,
              'data-tab': spec.id,
              'aria-selected': 'false',
            },
            fromHTML(icons[spec.icon]),
            h('span', null, t(spec.label)),
          ),
        );
      }
      const header = h(
        'header',
        { class: 'mech-head' },
        h('a', { class: 'icon-btn', href: `#/c/${mech.category}`, 'aria-label': t('back'), html: icons.back }),
        h('div', { class: 'mech-title' }, h('h1', null, lt(mech.title)), h('p', null, lt(mech.subtitle))),
        h('div', { class: 'head-btns' }, this.langButton(), this.themeButton()),
      );
      const root = h('div', { class: 'mech' }, header, content, tabbar);
      this.root.replaceChildren(root);
      this.current = { mechId: mech.id, views: new Map(), active: null, root };
    }
    const cur = this.current!;
    if (cur.active === tab) return;
    if (cur.active) {
      const prev = cur.views.get(cur.active)!;
      prev.deactivate();
      prev.el.hidden = true;
    }
    let view = cur.views.get(tab);
    if (!view) {
      view = TABS.find((x) => x.id === tab)!.create(mech, this.ctx);
      view.el.classList.add('tab-panel');
      cur.root.querySelector('.tab-content')!.appendChild(view.el);
      cur.views.set(tab, view);
    }
    view.el.hidden = false;
    cur.active = tab;
    cur.root.querySelectorAll<HTMLElement>('.tab').forEach((a) => {
      const on = a.dataset.tab === tab;
      a.classList.toggle('active', on);
      a.setAttribute('aria-selected', String(on));
    });
    view.activate();
  }

  private leaveMechanism(): void {
    if (!this.current) return;
    for (const v of this.current.views.values()) {
      v.deactivate();
      v.dispose();
    }
    this.current = null;
  }
}
