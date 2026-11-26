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
  catModels: 'Модели',
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
  switchLang: 'Switch to English',
  rotCcw: 'обратно на часовниковата стрелка (гледано отпред)',
  rotCw: 'по часовниковата стрелка (гледано отпред)',
  stressAllow100: '100 % σдоп',
  measScaleAria: 'Скала на микрометъра',

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
  stress: 'FEM',
  stressScale: 'Цветна скала',
  stressPaused: 'Анимацията е спряна по време на статичния анализ',
  stressUtil: 'Използване σ/σдоп',
  stressAbs: 'Напрежение, MPa',
  stressOver: 'над допустимото',
  stressPlot: 'Мрежа от крайни елементи',
  stressPlotNote: 'Три зъба на общ венец (натоварен е средният), разделени на триъгълни елементи. Основата на зъбите е истинската крива, която рейката-инструмент изрязва (вкл. подрязване при малък брой зъби). Сивите точки са закрепените възли, бялата стрелка е силата Fₙ, кръгчето – най-голямото напрежение в основата. Скалата тук е относителна (червено ≈ максимумът), за да се види разпределението.',
  stressChecks: 'Проверка на елементите',
  stressValues: 'Данни от анализа',
  cuPairs: 'двойки зъби в контакт в момента',
  cuActive: 'активна част A–E',
  cuContact: 'точка на контакт',
  cuBase: 'основни окръжности',
  cuPitch: 'делителни окръжности',
  cuFacts: 'Числа',
  mount: 'Монтаж',
  mountPattern: 'Отпечатък на контакта върху зъба на малкото колело',
  mountMean: 'средно',
  mountInterference: 'интерференция',
  mountBacklash: 'луфт',
  mountNoContact: 'без контакт',
  measure: 'Измерване',
  measPlaceholder: 'напр. 12,34',
  measReading: 'Отчитане, mm',
  measCheck: 'Провери',
  measContact: 'Щрак! Накрайниците опират в зъбите – отчети скалата.',
  measOpen: 'Микрометърът е отворен. Завърти барабана или натисни „Трещотка“.',
  measOpenHalf: 'Отвори с 0,5 mm (един оборот)',
  measCloseHalf: 'Затвори с 0,5 mm (един оборот)',
  measRatchet: 'Трещотка',
  measPiece: 'Колело',
  measPoints: 'Точки',
  measPointsOf: 'точки',
  measBest: 'Най-добър резултат',
  measNewBatch: 'Нова партида',
  measCloseFirst: 'Първо затвори микрометъра до щракване – отворен той не мери детайла.',
  measFillIn: 'Въведи отчитането и избери решение.',
  measReadOk: 'Отчитането е вярно:',
  measReadBad: 'Отчитането не е вярно. Правилно:',
  measSleeve: 'по гилзата',
  measVerdictOk: 'Решението е вярно:',
  measVerdictBad: 'Решението не е вярно. Правилно:',
  measNext: 'Следващо колело',
  measResult: 'Резултат',
  measDecision: 'Решение',
  mountPatternNote: 'Така изглежда зъбът, ако фланковете се намажат с туш и предавката се завърти под товар – стандартната проверка при монтаж. Цветът е натоварването спрямо средното: зелено = равномерно, червено = двойно. Добрият отпечатък покрива поне 80 % от ширината. Пунктирът е началото на активния профил (точка A); при по-голямо междуосие контактът се качва към върха.',

  forcesValues: 'Моменти, сили, реакции',
  forcesChecks: 'Якостна проверка',
  required: 'нужно',
  limit: 'граница',
  reactions: 'Реакции в лагерите',
  labChecks: 'Проверки',
  labValues: 'Изчислени размери',
  labReset: 'Върни стандартния модел',

  asmTitle: 'Сглобете механизма',
  asmIntro: 'Плъзнете детайл към модела или го докоснете и после докоснете маркираното място. За лагерите, колелата и шпонките изберете и как да се монтират.',
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
  asmMode: 'Режим на играта',
  asmModeAssemble: 'Сглоби',
  asmModeDisassemble: 'Разглоби',
  asmTitleDis: 'Разглобете механизма',
  asmIntroDis: 'Докоснете детайл на модела или картата му, за да го свалите. Разглобява се отвън навътре – обратно на сглобяването.',
  asmRemoveHere: 'Свали',
  asmSkipped: 'пропусната',
  asmWrongTool: 'Неправилно.',
  asmHowMount: 'Как ще монтирате',
  asmHowRemove: 'Как ще свалите',
  asmCancel: 'Отказ',
  asmCovers: 'вече е монтирано и покрива мястото',
  asmTooLate: 'Шпонката не може да влезе, когато колелото вече е на вала. Механизмът ще остане без нея – виж какво става, когато тръгне.',
  asmFirstRemove: 'Първо свалете',
  asmBlocked: 'Детайлът е притиснат от други детайли.',
  asmSlipTitle: 'Нещо не се върти!',
  asmForgotten: 'Пропусната',
  asmDoneDis: 'Механизмът е разглобен!',
  asmDoneBroken: 'Сглобено, но не работи',

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

const en: Record<StringKey, string> = {
  appName: 'Engineering Lab',
  appTagline: 'Interactive mechanism lab',
  catalogue: 'Catalogue',
  catModels: 'Models',
  open: 'Open',
  soon: 'Soon',
  pro: 'Pro',
  lockedTitle: 'Coming soon',
  lockedBody: 'This mechanism is in development and will be part of the Pro version. Payments are not active yet.',
  ok: 'OK',
  close: 'Close',
  back: 'Back',
  themeLight: 'Light theme',
  themeDark: 'Dark theme',
  switchLang: 'Превключи на български',
  rotCcw: 'counter-clockwise (seen from the front)',
  rotCw: 'clockwise (seen from the front)',
  stressAllow100: '100 % σallow',
  measScaleAria: 'Micrometer scale',

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
  lab: 'Parameters',
  forces: 'Forces',
  closeUp: 'Mesh',
  stress: 'FEM',
  stressScale: 'Colour scale',
  stressPaused: 'The animation is paused during the static analysis',
  stressUtil: 'Utilisation σ/σallow',
  stressAbs: 'Stress, MPa',
  stressOver: 'above the allowable',
  stressPlot: 'Finite element mesh',
  stressPlotNote:
    'Three teeth on a common rim (the middle one is loaded), divided into triangular elements. The tooth root is the true curve cut by the rack cutter (including undercut for few teeth). Grey dots are fixed nodes, the white arrow is the force Fₙ, the circle marks the highest root stress. The scale here is relative (red ≈ the maximum) to show the distribution.',
  stressChecks: 'Element checks',
  stressValues: 'Analysis data',
  cuPairs: 'tooth pairs in contact right now',
  cuActive: 'active path A–E',
  cuContact: 'contact point',
  cuBase: 'base circles',
  cuPitch: 'pitch circles',
  cuFacts: 'Numbers',
  mount: 'Mounting',
  mountPattern: 'Contact pattern on a pinion tooth',
  mountMean: 'mean',
  mountInterference: 'interference',
  mountBacklash: 'backlash',
  mountNoContact: 'no contact',
  measure: 'Measure',
  measPlaceholder: 'e.g. 12.34',
  measReading: 'Reading, mm',
  measCheck: 'Check',
  measContact: 'Click! The anvils touch the teeth – read the scale.',
  measOpen: 'The micrometer is open. Turn the thimble or press “Ratchet”.',
  measOpenHalf: 'Open by 0.5 mm (one turn)',
  measCloseHalf: 'Close by 0.5 mm (one turn)',
  measRatchet: 'Ratchet',
  measPiece: 'Gear',
  measPoints: 'Points',
  measPointsOf: 'points',
  measBest: 'Best result',
  measNewBatch: 'New batch',
  measCloseFirst: 'Close the micrometer until it clicks first – open, it does not measure the part.',
  measFillIn: 'Enter the reading and choose a decision.',
  measReadOk: 'The reading is right:',
  measReadBad: 'The reading is wrong. Correct:',
  measSleeve: 'on the sleeve',
  measVerdictOk: 'The decision is right:',
  measVerdictBad: 'The decision is wrong. Correct:',
  measNext: 'Next gear',
  measResult: 'Result',
  measDecision: 'Decision',
  mountPatternNote:
    'This is how the tooth looks when the flanks are painted with marking blue and the gears are turned under load – the standard check after mounting. The colour is the load relative to the mean: green = even, red = double. A good pattern covers at least 80 % of the face width. The dashed line is the start of the active profile (point A); with a larger centre distance the contact climbs towards the tip.',

  forcesValues: 'Torques, forces, reactions',
  forcesChecks: 'Strength check',
  required: 'required',
  limit: 'limit',
  reactions: 'Bearing reactions',
  labChecks: 'Checks',
  labValues: 'Calculated dimensions',
  labReset: 'Back to the standard model',

  asmTitle: 'Assemble the mechanism',
  asmIntro:
    'Drag a part onto the model, or tap it and then tap the highlighted place. For bearings, gears and keys also choose how they are mounted.',
  asmTime: 'Time',
  asmMistakes: 'Mistakes',
  asmBest: 'Best',
  asmNone: 'none',
  asmPlaceHere: 'Place here',
  asmMissing: 'Missing',
  asmDone: 'The mechanism is assembled!',
  asmNewBest: 'New best!',
  asmAgain: 'Start again',
  asmToModel: 'To the model',
  asmSelected: 'Selected',
  asmReset: 'Restart',
  asmMode: 'Game mode',
  asmModeAssemble: 'Assemble',
  asmModeDisassemble: 'Disassemble',
  asmTitleDis: 'Take the mechanism apart',
  asmIntroDis: 'Tap a part on the model or its card to take it off. Work from the outside in – the reverse of assembly.',
  asmRemoveHere: 'Remove',
  asmSkipped: 'skipped',
  asmWrongTool: 'Wrong.',
  asmHowMount: 'How will you mount',
  asmHowRemove: 'How will you remove',
  asmCancel: 'Cancel',
  asmCovers: 'is already mounted and covers the place',
  asmTooLate: 'The key cannot go in once the gear is on the shaft. The mechanism will stay without it – see what happens when it runs.',
  asmFirstRemove: 'Remove first',
  asmBlocked: 'Other parts hold this part in place.',
  asmSlipTitle: 'Something is not turning!',
  asmForgotten: 'Skipped',
  asmDoneDis: 'The mechanism is taken apart!',
  asmDoneBroken: 'Assembled, but it does not work',

  drawShaft: 'Shaft 1',
  drawPinion: 'Gear z₁',
  drawHint: 'Pinch to zoom, drag to pan. Tap a dimension or symbol for an explanation.',
  drawReset: 'Whole sheet',

  theoryPage: 'Page',
  theoryOf: 'of',
  theoryFormula: 'Formula',
  next: 'Next',
  prev: 'Back',
  toQuiz: 'To the quiz',
  quiz: 'Quiz',
  quizQuestion: 'Question',
  quizCheck: 'Check',
  quizNext: 'Next question',
  quizResult: 'Result',
  quizRetry: 'Try again',
  quizCorrect: 'Correct',
  quizWrong: 'Wrong',
  quizBest: 'Best result',
  quizBackToTheory: 'Back to the theory',

  nbNotes: 'NOTES',
  nbSubject: 'Machine Elements',
  nbOpenHint: 'swipe to turn the page',
  nbContents: 'Contents',
  nbLecture: 'Lecture',
  nbRemember: 'Remember!',
  nbWarning: 'Careful',
  nbSelfCheck: 'Self-check',
  nbCover: 'Cover',
  nbPage: 'p.',
  nbGrade6: 'Excellent!',
  nbGrade5: 'Very good',
  nbGrade4: 'Good',
  nbGrade3: 'Satisfactory',
  nbGrade2: 'Read the notes again :)',

  notFound: 'Mechanism not found.',
  webglError: 'This device does not support WebGL, so the 3D model cannot be shown.',
};

const tables: Record<Lang, Partial<Record<StringKey, string>>> = { bg, en };

const LANG_KEY = 'engineering-lab:lang';

/** Saved language (falls back to Bulgarian). */
export function savedLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'bg';
  } catch {
    return 'bg';
  }
}

let current: Lang = 'bg';

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

/** Saves the choice; the caller re-renders (the app reloads on the same screen). */
export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function lang(): Lang {
  return current;
}

export function t(key: StringKey): string {
  return tables[current][key] ?? bg[key];
}

// ---------------------------------------------------------------- Content translation

/**
 * Mechanism content is written in Bulgarian; English comes from dictionaries registered by each
 * mechanism (Bulgarian sentence → English). Numbers are parameters: the key has {0}, {1}… in place of
 * every number, so sentences with computed values translate too, and the numbers get English decimals.
 */
const NUM = /\d{1,3}(?:[\u00a0\u202f]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)*/g;
const dict = new Map<string, string>();
/** Bulgarian texts that were shown in English mode without a translation (for the coverage test). */
export const missing = new Set<string>();

export function normalise(s: string): { key: string; nums: string[] } {
  const nums: string[] = [];
  const key = s.replace(NUM, (m) => {
    nums.push(m);
    return `{${nums.length - 1}}`;
  });
  return { key, nums };
}

/** Bulgarian number text → English: decimal comma to point, grouping spaces to commas. */
export function enNumber(n: string): string {
  return n.replace(/[\u00a0\u202f](?=\d{3})/g, '#').replace(/,/g, '.').replace(/#/g, ',');
}

/** Adds translations. Keys may contain literal numbers or {0}-style placeholders; both are normalised. */
export function registerDictionary(entries: Record<string, string>): void {
  for (const [k, v] of Object.entries(entries)) dict.set(/\{\d+\}/.test(k) ? k : normalise(k).key, v);
}

const CYR = /[Ѐ-ӿ]/;

/** Translates a Bulgarian content string for the current language. */
export function tr(s: string): string {
  if (current === 'bg' || !s) return s;
  const { key, nums } = normalise(s);
  const en = dict.get(key);
  if (en === undefined) {
    if (CYR.test(s)) missing.add(key);
    return s.replace(NUM, enNumber);
  }
  return en.replace(/\{(\d+)\}/g, (_m, i: string) => enNumber(nums[Number(i)] ?? ''));
}

/** Resolves mechanism content text. */
export function lt(text: LText): string {
  if (current === 'en') return text.en ?? tr(text.bg);
  return text.bg;
}

/** Number formatting with the locale decimal separator. */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString(current === 'bg' ? 'bg-BG' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
