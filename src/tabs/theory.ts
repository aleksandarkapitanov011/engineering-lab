/**
 * TAB 4 — Теория: swipeable illustrated booklet followed by a multiple-choice quiz.
 */
import type { TabSpec, TabView } from '../app/context';
import type { IllustrationHandle, Mechanism } from '../core/types';
import { storage } from '../core/storage';
import { lt, t } from '../i18n';
import { h, fromHTML } from '../ui/dom';
import { icons } from '../ui/icons';

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createTheoryTab(mech: Mechanism): TabView {
  const pages = mech.theory;
  const total = pages.length + 1; // + quiz
  const pager = h('div', { class: 'pager' });
  const handles: (IllustrationHandle | null)[] = [];
  const pageEls: HTMLElement[] = [];

  pages.forEach((p, i) => {
    const illus = h('div', { class: 'illus' });
    const el = h(
      'article',
      { class: 'page', 'aria-label': lt(p.title) },
      h(
        'div',
        { class: 'page-inner' },
        h('div', { class: 'page-kicker' }, `${t('theoryPage')} ${i + 1} ${t('theoryOf')} ${pages.length}`),
        h('h2', null, lt(p.title)),
        illus,
        h('ul', null, ...p.sentences.map((s) => h('li', null, lt(s)))),
        h('div', { class: 'formula' }, h('small', null, t('theoryFormula')), h('span', { html: p.formula })),
      ),
    );
    pageEls.push(el);
    pager.appendChild(el);
    handles.push(null);
    (el as HTMLElement & { _illus?: HTMLElement })._illus = illus;
  });

  // ----- Quiz page -----
  const quizBox = h('div', { class: 'quiz' });
  const quizPage = h('article', { class: 'page', 'aria-label': t('quiz') }, quizBox);
  pageEls.push(quizPage);
  pager.appendChild(quizPage);

  let qi = 0;
  let score = 0;
  let order = shuffled(mech.quiz.map((_, i) => i));

  const renderQuestion = (): void => {
    const q = mech.quiz[order[qi]];
    const opts = shuffled(q.options.map((o, i) => ({ o, i })));
    let chosen: number | null = null;
    let checked = false;
    const explain = h('div', { class: 'quiz-explain', hidden: true });
    const btn = h('button', { class: 'btn primary', disabled: true }, t('quizCheck'));
    const optEls = opts.map(({ o, i }, n) => {
      const b = h(
        'button',
        { class: 'quiz-opt', 'data-i': i },
        h('span', { class: 'letter' }, 'АБВГ'[n] ?? String(n + 1)),
        h('span', null, lt(o)),
      );
      b.addEventListener('click', () => {
        if (checked) return;
        chosen = i;
        optEls.forEach((e) => e.classList.toggle('chosen', e === b));
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
          if (i === q.correct) e.classList.add('correct');
          else if (i === chosen) e.classList.add('wrong');
        });
        explain.hidden = false;
        explain.replaceChildren(h('strong', null, ok ? t('quizCorrect') : t('quizWrong')), lt(q.explain));
        btn.textContent = qi < mech.quiz.length - 1 ? t('quizNext') : t('quizResult');
      } else {
        qi++;
        if (qi < mech.quiz.length) renderQuestion();
        else renderResult();
      }
    });
    quizBox.replaceChildren(
      h('div', { class: 'page-kicker' }, t('quiz')),
      h('div', { class: 'quiz-progress' }, `${t('quizQuestion')} ${qi + 1} ${t('theoryOf')} ${mech.quiz.length}`),
      h('div', { class: 'quiz-q' }, lt(q.q)),
      h('div', { class: 'quiz-options' }, ...optEls),
      explain,
      h('div', { class: 'quiz-actions' }, btn),
    );
  };

  const renderResult = (): void => {
    const prev = storage.quizBest(mech.id) ?? 0;
    if (score > prev) storage.setQuizBest(mech.id, score);
    quizBox.replaceChildren(
      h('div', { class: 'page-kicker' }, t('quiz')),
      h('div', { class: 'quiz-score' }, `${score} / ${mech.quiz.length}`),
      h('p', { style: 'text-align:center;color:var(--text-dim)' }, `${t('quizBest')}: ${Math.max(prev, score)} / ${mech.quiz.length}`),
      h(
        'div',
        { class: 'quiz-actions', style: 'justify-content:center' },
        h('button', { class: 'btn', onclick: () => goTo(0) }, t('quizBackToTheory')),
        h(
          'button',
          {
            class: 'btn primary',
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
  };
  renderQuestion();

  // ----- Navigation -----
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
  for (let i = 0; i < total; i++) dots.appendChild(h('span', { class: 'dot' }));
  const prevBtn = h('button', { class: 'btn', 'aria-label': t('prev') }, fromHTML(icons.chevronLeft));
  const nextBtn = h('button', { class: 'btn primary' }, h('span'), fromHTML(icons.chevronRight));
  const nav = h('nav', { class: 'pager-nav' }, prevBtn, dots, nextBtn);
  const el = h('section', { class: 'theory-tab' }, pager, nav);

  let current = 0;
  const goTo = (i: number): void => {
    pager.scrollTo({ left: i * pager.clientWidth, behavior: 'smooth' });
  };
  prevBtn.addEventListener('click', () => goTo(Math.max(0, current - 1)));
  nextBtn.addEventListener('click', () => goTo(Math.min(total - 1, current + 1)));

  const updateNav = (): void => {
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    (nextBtn.firstChild as HTMLElement).textContent = current === pages.length - 1 ? t('toQuiz') : t('next');
    nextBtn.style.visibility = current === total - 1 ? 'hidden' : 'visible';
  };

  // Lazily create illustrations and only animate the visible page.
  const ensure = (i: number): IllustrationHandle | null => {
    if (i >= pages.length) return null;
    if (!handles[i]) {
      const host = (pageEls[i] as HTMLElement & { _illus?: HTMLElement })._illus!;
      handles[i] = pages[i].illustration(host);
    }
    return handles[i];
  };
  let active = false;
  const onScroll = (): void => {
    const i = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
    if (i === current && handles[i]) return;
    handles[current]?.stop();
    current = Math.min(total - 1, Math.max(0, i));
    ensure(current + 1);
    const hnd = ensure(current);
    if (active) hnd?.start();
    updateNav();
  };
  let scrollTimer = 0;
  pager.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(onScroll, 60);
  });
  const ro = new ResizeObserver(() => {
    pager.scrollLeft = current * pager.clientWidth;
  });

  return {
    el,
    activate() {
      active = true;
      ro.observe(pager);
      ensure(current);
      ensure(current + 1);
      handles[current]?.start();
      updateNav();
    },
    deactivate() {
      active = false;
      ro.disconnect();
      handles.forEach((hd) => hd?.stop());
    },
    dispose() {
      handles.forEach((hd) => hd?.dispose());
    },
  };
}

export const theoryTab: TabSpec = {
  id: 'theory',
  label: 'tabTheory',
  icon: 'theory',
  create: (mech) => createTheoryTab(mech),
};
