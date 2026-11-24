/**
 * All UI strings of the app shell, in one place.
 * Mechanism content (part names, hints, theory text) lives in each mechanism module as LText {bg, en?}
 * and is resolved with `lt()`, falling back to Bulgarian when a translation is missing.
 */
import type { LText } from '../core/types';

export type Lang = 'bg' | 'en';

const bg = {
  appName: 'Engineering Lab',
  appTagline: 'Интерактивна лаборатория за механизми',
  catalogue: 'Каталог',
  open: 'Отвори',
  soon: 'Скоро',
  pro: 'Pro',
  lockedTitle: 'Очаквайте скоро',
  lockedBody: 'Този механизъм е в разработка и ще бъде част от Pro версията. Плащанията все още не са активни.',
  ok: 'Добре',
  close: 'Затвори',
  back: 'Назад',
  themeLight: 'Светла тема',
  themeDark: 'Тъмна тема',

  tabModel: 'Модел',
  tabAssemble: 'Сглоби',
  tabDrawing: 'Чертеж',
  tabTheory: 'Теория',

  play: 'Пусни',
  pause: 'Пауза',
  inputSpeed: 'Входяща скорост',
  rpm: 'min⁻¹',
  visualSlowed: 'анимацията е забавена ×30',
  explode: 'Разглоби',
  assemble: 'Сглоби',
  section: 'Разрез',
  viewIso: 'Изометрия',
  viewFront: 'Отпред',
  viewTop: 'Отгоре',
  viewSide: 'Отстрани',
  material: 'Материал',
  function: 'Функция',
  keyDims: 'Основни размери',
  tapHint: 'Докоснете детайл за информация',
  lab: 'Параметри',
  forces: 'Сили',
  closeUp: 'Зацепване',
  cuPairs: 'двойки зъби в контакт в момента',
  cuActive: 'активна част A–E',
  cuContact: 'точка на контакт',
  cuBase: 'основни окръжности',
  cuPitch: 'делителни окръжности',
  cuSound: 'Звук',
  cuSoundOn: 'Пусни звука',
  cuSoundOff: 'Спри звука',
  cuVolume: 'Сила на звука',
  cuSoundNote: 'Звукът е с реалната честота на зацепване f = z₁·n₁/60 и следва плъзгача на оборотите. Анимацията тук е забавена още 10 пъти (общо ×300), за да се вижда как контактът се движи.',
  cuFacts: 'Числа',
  forcesValues: 'Моменти, сили, реакции',
  forcesChecks: 'Якостна проверка',
  required: 'нужно',
  limit: 'граница',
  reactions: 'Реакции в лагерите',
  labChecks: 'Проверки',
  labValues: 'Изчислени размери',
  labReset: 'Върни стандартния модел',

  asmTitle: 'Сглобете механизма',
  asmIntro: 'Плъзнете детайл към модела или го докоснете и после докоснете маркираното място.',
  asmTime: 'Време',
  asmMistakes: 'Грешки',
  asmBest: 'Рекорд',
  asmNone: 'няма',
  asmPlaceHere: 'Постави тук',
  asmMissing: 'Липсва',
  asmDone: 'Механизмът е сглобен!',
  asmNewBest: 'Нов рекорд!',
  asmAgain: 'Започни отначало',
  asmToModel: 'Към модела',
  asmSelected: 'Избран',
  asmReset: 'Отначало',

  drawShaft: 'Вал 1',
  drawPinion: 'Зъбно колело z₁',
  drawHint: 'Щипнете за мащаб, плъзнете за преместване. Докоснете размер или знак за обяснение.',
  drawReset: 'Цял лист',

  theoryPage: 'Страница',
  theoryOf: 'от',
  theoryFormula: 'Формула',
  next: 'Напред',
  prev: 'Назад',
  toQuiz: 'Към теста',
  quiz: 'Тест',
  quizQuestion: 'Въпрос',
  quizCheck: 'Провери',
  quizNext: 'Следващ въпрос',
  quizResult: 'Резултат',
  quizRetry: 'Опитай пак',
  quizCorrect: 'Вярно',
  quizWrong: 'Грешно',
  quizBest: 'Най-добър резултат',
  quizBackToTheory: 'Обратно към теорията',

  nbNotes: 'ЗАПИСКИ',
  nbSubject: 'по Машинни елементи',
  nbOpenHint: 'плъзни, за да разлистиш',
  nbContents: 'Съдържание',
  nbLecture: 'Лекция',
  nbRemember: 'Запомни!',
  nbWarning: 'Внимание',
  nbSelfCheck: 'Самопроверка',
  nbCover: 'Корица',
  nbPage: 'стр.',
  nbGrade6: 'Отличен 6!',
  nbGrade5: 'Много добър 5',
  nbGrade4: 'Добър 4',
  nbGrade3: 'Среден 3',
  nbGrade2: 'Прочети пак записките :)',

  notFound: 'Механизмът не е намерен.',
  webglError: 'Устройството не поддържа WebGL, затова 3D моделът не може да се покаже.',
};

export type StringKey = keyof typeof bg;

const en: Partial<Record<StringKey, string>> = {
  appTagline: 'Interactive mechanism lab',
  catalogue: 'Catalogue',
  open: 'Open',
  soon: 'Soon',
  lockedTitle: 'Coming soon',
  lockedBody: 'This mechanism is in development and will be part of Pro. Payments are not active yet.',
  ok: 'OK',
  close: 'Close',
  back: 'Back',
  themeLight: 'Light theme',
  themeDark: 'Dark theme',
  tabModel: 'Model',
  tabAssemble: 'Assemble',
  tabDrawing: 'Drawing',
  tabTheory: 'Theory',
  play: 'Play',
  pause: 'Pause',
  inputSpeed: 'Input speed',
  rpm: 'rpm',
  visualSlowed: 'animation slowed ×30',
  explode: 'Explode',
  assemble: 'Assemble',
  section: 'Section',
  viewIso: 'Isometric',
  viewFront: 'Front',
  viewTop: 'Top',
  viewSide: 'Side',
  material: 'Material',
  function: 'Function',
  keyDims: 'Key dimensions',
  tapHint: 'Tap a part for details',
  // Remaining keys fall back to Bulgarian until translated.
};

const tables: Record<Lang, Partial<Record<StringKey, string>>> = { bg, en };

let current: Lang = 'bg';

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function lang(): Lang {
  return current;
}

export function t(key: StringKey): string {
  return tables[current][key] ?? bg[key];
}

/** Resolves mechanism content text. */
export function lt(text: LText): string {
  return (current === 'en' ? text.en : undefined) ?? text.bg;
}

/** Number formatting with the locale decimal separator. */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString(current === 'bg' ? 'bg-BG' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
