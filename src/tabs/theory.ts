/**
 * TAB 4 — Теория: a spiral notebook with handwritten, highlighted notes.
 * Pages turn like a real book (drag with a finger, tap the page edge, buttons or arrow keys).
 * Leaves: cover, contents, one page per theory topic, and the self-check quiz.
 */
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '../styles/notebook.css';
import type { TabSpec, TabView } from '../app/context';
import type { IllustrationHandle, Mechanism, TheoryPage } from '../core/types';
import { storage } from '../core/storage';
import { fmt, lt, t } from '../i18n';
import { transmissionRatio } from '../core/kinematics';
import { coverPreview, thumbnail } from '../three/thumbs';
import { h, fromHTML, capturePointer } from '../ui/dom';
import { icons } from '../ui/icons';
import {
  arrowRight,
  arrowUpLeft,
  checkDoodle,
  circleDoodle,
  crossDoodle,
  exclaimDoodle,
  notebookMarkup,
  starDoodle,
  titleUnderline,
} from '../ui/notebook';

const LINE = 30; // ruled line spacing, px

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Adds bottom margins so every block after `.nb-snap` starts on a ruled line again. */
function snapToLines(paper: HTMLElement): void {
  const blocks = paper.querySelectorAll<HTMLElement>('.nb-snap');
  blocks.forEach((el) => (el.style.marginBottom = ''));
  blocks.forEach((el) => {
    const base = parseFloat(getComputedStyle(el).marginBottom) || 0;
    const bottom = el.offsetTop + el.offsetHeight + base;
    const extra = (LINE - (bottom % LINE)) % LINE;
    el.style.marginBottom = `${base + extra}px`;
  });
}

interface Leaf {
  el: HTMLElement;
  paper: HTMLElement | null;
  shade: HTMLElement;
  under: HTMLElement;
  label: string;
  theoryIndex: number | null;
  illusHost?: HTMLElement;
}

function createTheoryTab(mech: Mechanism): TabView {
  const pages = mech.theory;
  const leaves: Leaf[] = [];
  const handles: (IllustrationHandle | null)[] = pages.map(() => null);

  const book = h('div', { class: 'nb-book', tabindex: '0', 'aria-roledescription': 'book' });
  const spiral = h('div', { class: 'nb-spiral', 'aria-hidden': 'true' });
  const desk = h('div', { class: 'nb-desk' }, h('div', { class: 'nb-book-wrap' }, strays(), book, spiral, h('div', { class: 'nb-ribbon', 'aria-hidden': 'true' })));

  const addLeaf = (front: HTMLElement, label: string, opts: { paper?: HTMLElement; theoryIndex?: number; illusHost?: HTMLElement; cover?: boolean } = {}): void => {
    const shade = h('div', { class: 'nb-shade' });
    const under = h('div', { class: 'nb-under' });
    const back = h('div', { class: `nb-back${opts.cover ? ' cover' : ''}` });
    const el = h('section', { class: `nb-leaf${opts.cover ? ' is-cover' : ''}`, 'aria-label': label }, h('div', { class: 'nb-front' }, front, under), back, shade);
    book.appendChild(el);
    leaves.push({ el, paper: opts.paper ?? null, shade, under, label, theoryIndex: opts.theoryIndex ?? null, illusHost: opts.illusHost });
  };

  // ----- Cover -----
  // (the photo is the rendered 3D model, the same picture as on the catalogue card)
  const cover = h(
    'div',
    { class: `nb-cover ${mech.category === 'mechanisms' ? 'burgundy' : 'blue'}` },
    h('div', { class: 'nb-elastic', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'nb-label' },
      h('span', { class: 'nb-tape left', 'aria-hidden': 'true' }),
      h('span', { class: 'nb-tape right', 'aria-hidden': 'true' }),
      h('div', { class: 'nb-label-title' }, t('nbNotes')),
      h('div', { class: 'nb-label-line' }, t('nbSubject')),
      h('div', { class: 'nb-label-topic' }, lt(mech.title)),
      h('div', { class: 'nb-label-line small' }, 'Engineering Lab'),
    ),
    mech.coverSketch ? coverSketchCard(mech) : coverPhoto(mech),
    // Signs of use: creases, a coffee ring, gel-pen doodles, a dog-eared corner.
    h('div', { class: 'nb-wear', 'aria-hidden': 'true' }),
    h('div', { class: 'nb-stain', 'aria-hidden': 'true' }),
    h('div', { class: 'nb-doodles', 'aria-hidden': 'true', html: COVER_DOODLES }),
    h('div', { class: 'nb-dogear', 'aria-hidden': 'true' }),
    h('div', { class: 'nb-cover-hint' }, h('span', null, t('nbOpenHint')), fromHTML(arrowRight)),
  );
  addLeaf(cover, t('nbCover'), { cover: true });

  // ----- Contents -----
  const toc = h('ol', { class: 'nb-toc' });
  const tocPaper = h(
    'div',
    { class: 'nb-paper' },
    h('div', { class: 'nb-head' }, h('span', null, lt(mech.title)), h('span', null, '')),
    h('h2', { class: 'nb-title nb-snap' }, t('nbContents'), h('span', { html: titleUnderline })),
    toc,
    h('div', { class: 'nb-doodle-corner', html: starDoodle }),
  );
  addLeaf(tocPaper, t('nbContents'), { paper: tocPaper });

  // ----- Theory pages -----
  const renderPage = (p: TheoryPage, i: number): void => {
    const a = p.annotations ?? {};
    const illus = h('div', { class: 'illus' });
    const fig = h(
      'figure',
      { class: 'nb-fig nb-snap' },
      h('span', { class: 'nb-tape left', 'aria-hidden': 'true' }),
      h('span', { class: 'nb-tape right', 'aria-hidden': 'true' }),
      illus,
      a.caption ? h('figcaption', null, lt(a.caption)) : null,
    );
    const list = h('ul', { class: 'nb-list nb-snap' }, ...p.sentences.map((s) => h('li', { html: notebookMarkup(lt(s)) })));
    const formula = h(
      'div',
      { class: 'nb-formula-wrap nb-snap' },
      h('div', { class: 'nb-formula', html: p.formula }),
      a.formulaNote ? h('div', { class: 'nb-fnote' }, fromHTML(arrowUpLeft), h('span', null, lt(a.formulaNote))) : null,
    );
    const sticky = a.sticky
      ? h('aside', { class: 'nb-sticky nb-snap' }, h('div', { class: 'nb-sticky-head' }, t('nbRemember')), h('div', { html: notebookMarkup(lt(a.sticky)) }))
      : null;
    const warning = a.warning
      ? h('div', { class: 'nb-warning nb-snap' }, fromHTML(exclaimDoodle), h('span', { html: notebookMarkup(lt(a.warning)) }))
      : null;
    const paper = h(
      'div',
      { class: 'nb-paper' },
      h('div', { class: 'nb-head' }, h('span', null, `${t('nbLecture')} ${i + 1}`), h('span', null, t('nbSubject').replace(/^по /, ''))),
      h('h2', { class: 'nb-title nb-snap' }, lt(p.title), h('span', { html: titleUnderline })),
      fig,
      list,
      formula,
      sticky,
      warning,
      h('div', { class: 'nb-pageno' }, String(i + 1)),
    );
    addLeaf(paper, `${t('nbLecture')} ${i + 1}: ${lt(p.title)}`, { paper, theoryIndex: i, illusHost: illus });
  };
  pages.forEach(renderPage);

  // ----- Self-check quiz -----
  const quizBox = h('div', { class: 'nb-quiz' });
  const quizPaper = h(
    'div',
    { class: 'nb-paper' },
    h('div', { class: 'nb-head' }, h('span', null, t('nbSelfCheck')), h('span', null, '')),
    h('h2', { class: 'nb-title nb-snap' }, t('nbSelfCheck'), h('span', { html: titleUnderline })),
    quizBox,
    h('div', { class: 'nb-pageno' }, String(pages.length + 1)),
  );
  addLeaf(quizPaper, t('nbSelfCheck'), { paper: quizPaper });

  // Contents entries jump to their leaf.
  const tocEntries: [string, number, string][] = [
    ...pages.map((p, i) => [lt(p.title), i + 2, String(i + 1)] as [string, number, string]),
    [t('nbSelfCheck'), leaves.length - 1, String(pages.length + 1)],
  ];
  for (const [title, leafIndex, num] of tocEntries) {
    toc.appendChild(
      h(
        'li',
        null,
        h('button', { class: 'nb-toc-item', onclick: () => flipTo(leafIndex) }, h('span', { class: 'nb-toc-title' }, title), h('span', { class: 'nb-toc-dots' }), h('span', { class: 'nb-toc-num' }, num)),
      ),
    );
  }

  // ----- Quiz logic -----
  let qi = 0;
  let score = 0;
  let order = shuffled(mech.quiz.map((_, i) => i));

  const renderQuestion = (): void => {
    const q = mech.quiz[order[qi]];
    const opts = shuffled(q.options.map((o, i) => ({ o, i })));
    let chosen: number | null = null;
    let checked = false;
    const explain = h('div', { class: 'nb-explain', hidden: true });
    const btn = h('button', { class: 'nb-btn', disabled: true }, t('quizCheck'));
    const optEls = opts.map(({ o, i }) => {
      const mark = h('span', { class: 'nb-box', 'aria-hidden': 'true' });
      const b = h('button', { class: 'nb-opt', 'data-i': i, role: 'radio', 'aria-checked': 'false' }, mark, h('span', { class: 'nb-opt-text' }, lt(o)));
      b.addEventListener('click', () => {
        if (checked) return;
        chosen = i;
        optEls.forEach((e) => {
          const on = e === b;
          e.classList.toggle('chosen', on);
          e.setAttribute('aria-checked', String(on));
          e.querySelector('.nb-box')!.innerHTML = on ? checkDoodle : '';
        });
        btn.disabled = false;
      });
      return b;
    });
    btn.addEventListener('click', () => {
      if (!checked) {
        if (chosen === null) return;
        checked = true;
        const ok = chosen === q.correct;
        if (ok) score++;
        optEls.forEach((e) => {
          const i = Number(e.dataset.i);
          if (i === q.correct) {
            e.classList.add('correct');
            e.querySelector('.nb-box')!.innerHTML = checkDoodle;
          } else if (i === chosen) {
            e.classList.add('wrong');
            e.querySelector('.nb-box')!.innerHTML = crossDoodle;
          }
        });
        explain.hidden = false;
        explain.replaceChildren(h('strong', null, ok ? t('quizCorrect') : t('quizWrong')), ' ', lt(q.explain));
        btn.textContent = qi < mech.quiz.length - 1 ? t('quizNext') : t('quizResult');
      } else {
        qi++;
        if (qi < mech.quiz.length) renderQuestion();
        else renderResult();
      }
      snapQuiz();
    });
    quizBox.replaceChildren(
      h('div', { class: 'nb-qnum' }, `${t('quizQuestion')} ${qi + 1} ${t('theoryOf')} ${mech.quiz.length}`),
      h('div', { class: 'nb-q' }, lt(q.q)),
      h('div', { class: 'nb-opts', role: 'radiogroup' }, ...optEls),
      explain,
      h('div', { class: 'nb-quiz-actions' }, btn),
    );
    snapQuiz();
  };

  const grade = (s: number, n: number): string => {
    const r = s / n;
    if (r >= 1) return t('nbGrade6');
    if (r >= 0.8) return t('nbGrade5');
    if (r >= 0.6) return t('nbGrade4');
    if (r >= 0.4) return t('nbGrade3');
    return t('nbGrade2');
  };

  const renderResult = (): void => {
    const prev = storage.quizBest(mech.id) ?? 0;
    if (score > prev) storage.setQuizBest(mech.id, score);
    quizBox.replaceChildren(
      h('div', { class: 'nb-score' }, h('span', null, `${score}/${mech.quiz.length}`), fromHTML(circleDoodle)),
      h('div', { class: 'nb-grade' }, grade(score, mech.quiz.length)),
      h('div', { class: 'nb-qnum' }, `${t('quizBest')}: ${Math.max(prev, score)}/${mech.quiz.length}`),
      h(
        'div',
        { class: 'nb-quiz-actions' },
        h('button', { class: 'nb-btn ghost', onclick: () => flipTo(1) }, t('quizBackToTheory')),
        h(
          'button',
          {
            class: 'nb-btn',
            onclick: () => {
              qi = 0;
              score = 0;
              order = shuffled(mech.quiz.map((_, i) => i));
              renderQuestion();
            },
          },
          t('quizRetry'),
        ),
      ),
    );
    snapQuiz();
  };
  function snapQuiz(): void {
    requestAnimationFrame(() => snapToLines(quizPaper));
  }
  renderQuestion();

  // ----- Navigation bar -----
  const prevBtn = h('button', { class: 'btn', 'aria-label': t('prev') }, fromHTML(icons.chevronLeft));
  const nextBtn = h('button', { class: 'btn primary', 'aria-label': t('next') }, fromHTML(icons.chevronRight));
  const where = h('div', { class: 'nb-where' });
  const nav = h('nav', { class: 'pager-nav nb-nav' }, prevBtn, where, nextBtn);
  const el = h('section', { class: 'theory-tab notebook-tab' }, desk, nav);

  // ----- Page-flip engine -----
  let cur = 0;
  let active = false;
  let anim = 0;

  const setAngle = (leaf: Leaf, deg: number): void => {
    leaf.el.style.transform = `rotateY(${deg}deg)`;
    const a = Math.abs(deg) / 180;
    leaf.shade.style.opacity = String(Math.sin(Math.PI * a) * 0.55);
  };

  const layout = (): void => {
    leaves.forEach((leaf, j) => {
      leaf.el.style.zIndex = String(leaves.length - j);
      leaf.el.classList.toggle('gone', j < cur);
      leaf.el.classList.remove('turning');
      leaf.el.classList.toggle('current', j === cur);
      leaf.el.setAttribute('aria-hidden', String(j !== cur));
      leaf.under.style.opacity = '0';
      setAngle(leaf, j < cur ? -180 : 0);
    });
    where.textContent =
      cur === 0 ? t('nbCover') : cur === 1 ? t('nbContents') : `${t('nbPage')} ${cur - 1} / ${leaves.length - 2}`;
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === leaves.length - 1;
    book.classList.toggle('closed', cur === 0);
    // At rest the pages are flat (no 3D): touch scrolling over 3D-transformed layers is unreliable on phones.
    book.classList.add('at-rest');
  };

  const ensureIllus = (leafIndex: number): IllustrationHandle | null => {
    const leaf = leaves[leafIndex];
    if (!leaf || leaf.theoryIndex === null) return null;
    const ti = leaf.theoryIndex;
    if (!handles[ti]) {
      handles[ti] = pages[ti].illustration(leaf.illusHost!);
      requestAnimationFrame(() => leaf.paper && snapToLines(leaf.paper));
      // The figure grows the page once drawn: the phone layout must take the new height.
      if (active) ro.observe(leaf.illusHost!);
    }
    return handles[ti];
  };

  const onSettled = (): void => {
    if (phone.matches && desk.scrollTop > 0) desk.scrollTo({ top: 0 });
    handles.forEach((hd) => hd?.stop());
    ensureIllus(cur + 1);
    const hd = ensureIllus(cur);
    if (active) hd?.start();
    layout();
  };

  /** dir: +1 forward (turn current leaf away), -1 back (bring previous leaf back). */
  type Turn = { dir: 1 | -1; leaf: Leaf; under: Leaf | null; p: number };

  const applyTurn = (turn: Turn): void => {
    const p = Math.min(1, Math.max(0, turn.p));
    if (turn.dir === 1) {
      setAngle(turn.leaf, -180 * p);
      if (turn.under) turn.under.under.style.opacity = String(0.5 * (1 - p) * Math.min(1, p * 6));
    } else {
      setAngle(turn.leaf, -180 * (1 - p));
      if (turn.under) turn.under.under.style.opacity = String(0.5 * p * Math.min(1, (1 - p) * 6));
    }
  };

  const beginTurn = (dir: 1 | -1): Turn | null => {
    if (dir === 1 && cur >= leaves.length - 1) return null;
    if (dir === -1 && cur <= 0) return null;
    const leaf = dir === 1 ? leaves[cur] : leaves[cur - 1];
    const under = dir === 1 ? leaves[cur + 1] : leaves[cur];
    book.classList.remove('at-rest');
    leaf.el.classList.remove('gone');
    leaf.el.classList.add('turning');
    // Make sure the page revealed underneath is already drawn.
    ensureIllus(dir === 1 ? cur + 1 : cur - 1);
    return { dir, leaf, under, p: 0 };
  };

  const finishTurn = (turn: Turn, complete: boolean, onDone?: () => void): void => {
    cancelAnimationFrame(anim);
    const from = turn.p;
    const to = complete ? 1 : 0;
    const dur = 140 + 520 * Math.abs(to - from);
    const t0 = performance.now();
    let done = false;
    const settle = (): void => {
      if (done) return;
      done = true;
      cancelAnimationFrame(anim);
      window.clearTimeout(fallback);
      turn.p = to;
      applyTurn(turn);
      anim = 0;
      if (complete) cur += turn.dir;
      onSettled();
      onDone?.();
    };
    const step = (now: number): void => {
      if (done) return;
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      turn.p = from + (to - from) * e;
      applyTurn(turn);
      if (k < 1) anim = requestAnimationFrame(step);
      else settle();
    };
    // Animation frames pause when the app is in the background; never leave a page half-turned.
    const fallback = window.setTimeout(settle, dur + 250);
    anim = requestAnimationFrame(step);
  };

  const flip = (dir: 1 | -1, onDone?: () => void): void => {
    if (anim) return;
    const turn = beginTurn(dir);
    if (turn) finishTurn(turn, true, onDone);
  };

  /** Flips page by page to a target leaf (fast). */
  function flipTo(target: number): void {
    if (anim || target === cur) return;
    const dir = target > cur ? 1 : -1;
    flip(dir, () => {
      if (cur !== target) flipTo(target);
    });
  }

  prevBtn.addEventListener('click', () => flip(-1));
  nextBtn.addEventListener('click', () => flip(1));
  book.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') flip(1);
    if (e.key === 'ArrowLeft') flip(-1);
  });

  // Finger / mouse dragging.
  let drag: { x: number; y: number; t: number; id: number; mode: 'none' | 'scroll' | 'turn'; turn: Turn | null; lastX: number; lastT: number; v: number } | null = null;
  book.addEventListener('pointerdown', (e) => {
    if (anim || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Mouse: prevent text selection / native drag so the page can be dragged like paper.
    if (e.pointerType === 'mouse' && !(e.target as Element).closest('button')) e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, mode: 'none', turn: null, lastX: e.clientX, lastT: performance.now(), v: 0 };
  });
  book.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.mode === 'none') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        drag.turn = beginTurn(dx < 0 ? 1 : -1);
        drag.mode = 'turn';
        if (drag.turn) capturePointer(book, e.pointerId);
      } else if (Math.abs(dy) > 10) {
        drag.mode = 'scroll';
      }
    }
    if (drag.mode === 'turn' && drag.turn) {
      const w = book.clientWidth * 0.95;
      drag.turn.p = drag.turn.dir === 1 ? -dx / w : dx / w;
      applyTurn(drag.turn);
      const now = performance.now();
      if (now - drag.lastT > 16) {
        drag.v = (e.clientX - drag.lastX) / (now - drag.lastT);
        drag.lastX = e.clientX;
        drag.lastT = now;
      }
    }
  });
  const endDrag = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.mode === 'turn' && d.turn) {
      const flick = d.turn.dir === 1 ? d.v < -0.45 : d.v > 0.45;
      finishTurn(d.turn, e.type !== 'pointercancel' && (d.turn.p > 0.33 || flick));
      return;
    }
    if (d.mode === 'none' && e.type === 'pointerup' && performance.now() - d.t < 400) {
      // Tap on the outer edges turns the page, unless an interactive element was tapped.
      if ((e.target as Element).closest('button, a, input')) return;
      const r = book.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x > 0.8 || (cur === 0 && x > 0.3)) flip(1);
      else if (x < 0.14) flip(-1);
    }
  };
  book.addEventListener('pointerup', endDrag);
  book.addEventListener('pointercancel', endDrag);

  // Phones: the page does not scroll inside the book (scrolling inside a 3D-turned leaf is unreliable on
  // mobile browsers); instead the book is as tall as its longest page and the whole desk scrolls.
  const phone = window.matchMedia('(max-width: 720px)');
  const bookWrap = desk.firstElementChild as HTMLElement;
  const fitHeight = (): void => {
    if (!phone.matches) {
      if (bookWrap.style.height) bookWrap.style.height = '';
      return;
    }
    bookWrap.style.height = '';
    let hmax = bookWrap.clientHeight;
    for (const leaf of leaves) if (leaf.paper) hmax = Math.max(hmax, leaf.paper.scrollHeight);
    bookWrap.style.height = `${Math.ceil(hmax)}px`;
  };
  phone.addEventListener?.('change', () => fitHeight());

  const snapAll = (): void => {
    for (const leaf of leaves) if (leaf.paper) snapToLines(leaf.paper);
    fitHeight();
  };
  const ro = new ResizeObserver(() => snapAll());

  layout();

  return {
    el,
    activate() {
      active = true;
      ro.observe(book);
      for (const leaf of leaves) if (leaf.illusHost) ro.observe(leaf.illusHost);
      void document.fonts?.ready.then(snapAll);
      onSettled();
    },
    deactivate() {
      active = false;
      ro.disconnect();
      handles.forEach((hd) => hd?.stop());
    },
    dispose() {
      cancelAnimationFrame(anim);
      handles.forEach((hd) => hd?.dispose());
    },
  };
}

/** Gel-pen doodles on the cover (white ink on the board). */
const COVER_DOODLES = `<svg class="dd star" viewBox="0 0 40 40"><path d="M20 4 L24 16 L37 16 L26 24 L30 37 L20 29 L10 37 L14 24 L3 16 L16 16 Z"/></svg>
<svg class="dd spiral" viewBox="0 0 50 50"><path d="M25 25 m0 -2 a2 2 0 1 1 -3 3 a6 6 0 1 1 9 -7 a10 10 0 1 1 -16 13 a14 14 0 1 1 22 -18"/></svg>
<svg class="dd gear" viewBox="0 0 50 50"><circle cx="25" cy="25" r="11"/><circle cx="25" cy="25" r="4"/><path d="M25 6v7M25 37v7M6 25h7M37 25h7M12 12l5 5M33 33l5 5M38 12l-5 5M17 33l-5 5"/></svg>
<svg class="dd bang" viewBox="0 0 60 40"><path d="M8 6 L10 26 M10 33 L10 34 M22 6 L24 26 M24 33 L24 34 M36 6 L38 26 M38 33 L38 34"/><path d="M44 30 C50 18 56 22 52 30" /></svg>
<svg class="dd heart" viewBox="0 0 40 36"><path d="M20 32 C2 20 4 6 13 6 C17 6 19 9 20 12 C21 9 23 6 27 6 C36 6 38 20 20 32 Z"/></svg>`;

/** Things sticking out of the notebook: sticky index tabs and loose sheets between the pages. */
function strays(): HTMLElement {
  return h(
    'div',
    { class: 'nb-strays', 'aria-hidden': 'true' },
    h('span', { class: 'nb-flag f1' }),
    h('span', { class: 'nb-flag f2' }),
    h('span', { class: 'nb-flag f3' }),
    h('span', { class: 'nb-sheet s1' }),
    h('span', { class: 'nb-sheet s2' }),
    h('span', { class: 'nb-sheet s3' }),
  );
}

/** Hand-drawn sketch on a piece of squared paper, for mechanisms that have one. */
function coverSketchCard(mech: Mechanism): HTMLElement {
  return h(
    'figure',
    { class: 'nb-photo nb-sketch' },
    h('span', { class: 'nb-photo-tape', 'aria-hidden': 'true' }),
    h('div', { class: 'nb-sketch-paper', html: mech.coverSketch!() }),
  );
}

/** Polaroid photo of the 3D model for the cover (the line drawing until the render is ready). */
function coverPhoto(mech: Mechanism): HTMLElement {
  const img = h('div', { class: 'nb-photo-img', html: mech.thumbnail });
  thumbnail(
    `cover:${mech.id}`,
    coverPreview(mech),
    (url) => {
      img.replaceChildren(h('img', { src: url, alt: '', draggable: 'false' }));
      img.classList.add('has-img');
    },
    { w: 640, h: 440 },
  );
  return h(
    'figure',
    { class: 'nb-photo' },
    h('span', { class: 'nb-photo-tape', 'aria-hidden': 'true' }),
    h('div', { class: 'nb-cover-badge', 'aria-hidden': 'true' }, h('span', null, 'i ='), h('b', null, fmt(transmissionRatio(mech.kinematics), 0))),
    img,
    h('figcaption', null, t('nbPhoto')),
  );
}

export const theoryTab: TabSpec = {
  id: 'theory',
  label: 'tabTheory',
  icon: 'theory',
  create: (mech) => createTheoryTab(mech),
};

