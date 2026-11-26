/** Theory pages and quiz of the helical-bevel gearbox (Bulgarian and English). */
import type { LText, QuizQuestion, TheoryPage } from '../../core/types';
import { DELTA3, DELTA4, I1, I2, I_TOTAL, MN, MT, Z1, Z2, Z3, Z4 } from './params';
import { bearingsFig, conesFig, directionsFig, helixFig, stagesFig } from './theoryFigs';

/** Bulgarian text uses a decimal comma: numbers formatted with a point are converted here. */
const L = (bg: string, en: string): LText => ({ bg: bg.replace(/(\d)\.(\d)/g, '$1,$2'), en });
const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1);

export const theory: TheoryPage[] = [
  {
    id: 'stages',
    title: L('Двустъпален редуктор', 'Two-stage gearbox'),
    sentences: [
      L(
        '==Редукторът== намалява оборотите и увеличава момента. Едно стъпало цилиндрични колела дава разумно __до i ≈ 5–6__ – за повече се слагат две стъпала.',
        'A ==gearbox== reduces the speed and increases the torque. One stage of spur or helical gears gives sensibly __up to i ≈ 5–6__ – for more, two stages are used.',
      ),
      L(
        `Тук първото стъпало е **косозъбо** (i₁ = ${Z2}/${Z1} = ${I1}), второто – **конично** (i₂ = ${Z4}/${Z3} = ${I2}).`,
        `Here the first stage is **helical** (i₁ = ${Z2}/${Z1} = ${I1}), the second one **bevel** (i₂ = ${Z4}/${Z3} = ${I2}).`,
      ),
      L(
        `Общото предавателно отношение е ==произведението== на двете: i = ${I1}·${I2} = ((${I_TOTAL})).`,
        `The total gear ratio is the ==product== of the two: i = ${I1}·${I2} = ((${I_TOTAL})).`,
      ),
      L(
        'Бързоходното стъпало е отпред: при високите обороти моментът е малък и колелата са малки и евтини.',
        'The high-speed stage comes first: at high speed the torque is small, so the gears are small and cheap.',
      ),
    ],
    annotations: {
      caption: L('фиг. 1 – кинематична схема на редуктора', 'fig. 1 – kinematic diagram of the gearbox'),
      formulaNote: L('i се умножават, не се събират!', 'ratios multiply, they do not add up!'),
      sticky: L('Изходът е под 90° – удобно за транспортьори и миксери.', 'The output is at 90° – handy for conveyors and mixers.'),
    },
    formula: 'i = i₁ · i₂ = (z₂/z₁) · (z₄/z₃)',
    illustration: stagesFig,
  },
  {
    id: 'helical',
    title: L('Косозъби колела', 'Helical gears'),
    sentences: [
      L(
        'Зъбите са наклонени под ъгъл **β** спрямо оста. Затова всеки зъб влиза в зацепване __постепенно__, а не по цялата ширина наведнъж.',
        'The teeth are inclined at an angle **β** to the axis. So every tooth enters the mesh __gradually__, not across the whole width at once.',
      ),
      L(
        'Резултатът е ==по-тиха и по-натоварваема== предавка – по-голямо общо препокриване.',
        'The result is a ==quieter stage that carries more load== – a larger total contact ratio.',
      ),
      L(
        `Модулът се дава в нормално сечение: mₙ = ${MN} mm. В челно сечение той е по-голям: mₜ = mₙ/cos β ≈ ${MT.toFixed(3)} mm.`,
        `The module is given in the normal section: mₙ = ${MN} mm. In the transverse section it is larger: mₜ = mₙ/cos β ≈ ${MT.toFixed(3)} mm.`,
      ),
      L(
        'Цената е __осовата сила__ Fₐ = Fₜ·tg β – лагерите трябва да я поемат. Двете колела в двойката са с **противоположен** наклон.',
        'The price is the __axial force__ Fₐ = Fₜ·tan β – the bearings must take it. The two gears of a pair have **opposite** hands.',
      ),
    ],
    annotations: {
      caption: L('фиг. 2 – наклон на зъбите β', 'fig. 2 – helix angle β'),
      formulaNote: L('β избран така, че a = 70 mm', 'β chosen so that a = 70 mm'),
      warning: L('По-голям β → по-голяма осова сила!', 'Larger β → larger axial force!'),
    },
    formula: 'mₜ = mₙ / cos β     Fₐ = Fₜ · tg β',
    illustration: helixFig,
  },
  {
    id: 'bevel',
    title: L('Конични колела', 'Bevel gears'),
    sentences: [
      L(
        'Коничните колела предават въртене между ==пресичащи се оси==, най-често под Σ = 90°.',
        'Bevel gears transmit rotation between ==intersecting axes==, most often at Σ = 90°.',
      ),
      L(
        'Делителните повърхнини са __конуси с общ връх__ в пресечната точка на осите; те се търкалят един по друг без плъзгане.',
        'The pitch surfaces are __cones with a common apex__ at the intersection of the axes; they roll on each other without slipping.',
      ),
      L(
        `Ъглите на конусите следват броя на зъбите: tg δ₃ = z₃/z₄ → δ₃ ≈ ${deg(DELTA3)}°, δ₄ = 90° − δ₃ ≈ ${deg(DELTA4)}°.`,
        `The cone angles follow the numbers of teeth: tan δ₃ = z₃/z₄ → δ₃ ≈ ${deg(DELTA3)}°, δ₄ = 90° − δ₃ ≈ ${deg(DELTA4)}°.`,
      ),
      L(
        'Зъбите **се смаляват към върха**. Модулът и диаметрите се дават на ((външния край)); ширината е b ≤ Rₑ/3.',
        'The teeth **get smaller towards the apex**. The module and the diameters are given at the ((outer end)); the face width is b ≤ Rₑ/3.',
      ),
    ],
    annotations: {
      caption: L('фиг. 3 – делителни конуси с общ връх', 'fig. 3 – pitch cones with a common apex'),
      formulaNote: L('δ₃ + δ₄ = 90°', 'δ₃ + δ₄ = 90°'),
      sticky: L('Ако върховете на конусите не съвпадат при монтажа, контактът отива в края на зъба.', 'If the cone apexes do not coincide after mounting, the contact moves to the end of the tooth.'),
    },
    formula: 'tg δ₃ = z₃ / z₄     Rₑ = dₑ / (2·sin δ)',
    illustration: conesFig,
  },
  {
    id: 'directions',
    title: L('Посоки, моменти и сили', 'Directions, torques and forces'),
    sentences: [
      L(
        'Външното цилиндрично зацепване __обръща посоката__; коничното __завърта оста на 90°__.',
        'The external helical mesh __reverses the direction__; the bevel mesh __turns the axis through 90°__.',
      ),
      L(
        `Моментът расте почти колкото падат оборотите: ==M₃ ≈ M₁·i·η₁·η₂==, тук около ${I_TOTAL}·0,98·0,97 ≈ 5,7 пъти.`,
        `The torque grows almost as much as the speed drops: ==M₃ ≈ M₁·i·η₁·η₂==, here about ${I_TOTAL}·0.98·0.97 ≈ 5.7 times.`,
      ),
      L(
        'Коничните колела **се отблъскват по осите си** – осовите сили отиват към основите на конусите.',
        'Bevel gears **push each other apart along their axes** – the axial forces point towards the backs of the cones.',
      ),
      L(
        'Затова опорите на коничните валове трябва да поемат и ((осови сили)).',
        'That is why the supports of the bevel shafts must take ((axial forces)) too.',
      ),
    ],
    annotations: {
      caption: L('фиг. 4 – посоки на въртене и изход под 90°', 'fig. 4 – directions of rotation and the output at 90°'),
      formulaNote: L('η за стъпало ≈ 0,97–0,98', 'η per stage ≈ 0.97–0.98'),
    },
    formula: 'M₃ = M₁ · i · η₁ · η₂',
    illustration: directionsFig,
  },
  {
    id: 'bearings',
    title: L('Лагери, корпус и мазане', 'Bearings, housing and lubrication'),
    sentences: [
      L(
        'Малкото конично колело е __конзолно__ – извън двата лагера на вала. Лагерът до него поема най-голямата сила и е по-голям.',
        'The bevel pinion is __overhung__ – outside the two bearings of its shaft. The bearing next to it takes the largest force and is larger.',
      ),
      L(
        'Корпусът е от сив чугун: гаси вибрациите и пази ==точните разстояния== между лагерните отвори.',
        'The housing is grey cast iron: it damps vibration and keeps ==the exact distances== between the bearing bores.',
      ),
      L(
        'Колелата се мажат чрез **потапяне**: голямото колело гребе масло от дъното и го разпръсква върху зъбите и лагерите.',
        'The gears are **splash lubricated**: the large gear dips into the oil in the sump and throws it over the teeth and the bearings.',
      ),
      L(
        'Диаметрите на всеки вал намаляват към единия край – така всеки лагер и колело имат ((един-единствен път)) при монтажа.',
        'The diameters of every shaft step down towards one end – so every bearing and gear has ((exactly one way)) on.',
      ),
    ],
    annotations: {
      caption: L('фиг. 5 – конзолното колело и маслото', 'fig. 5 – the overhung pinion and the oil'),
      warning: L('Твърде много масло → загряване от разбъркването!', 'Too much oil → heating from churning!'),
    },
    formula: 'L₁₀ = (C / P)³',
    illustration: bearingsFig,
  },
];

export const quiz: QuizQuestion[] = [
  {
    q: L('Първото стъпало има i₁ = 3, второто i₂ = 2. Колко е общото предавателно отношение?', 'The first stage has i₁ = 3, the second i₂ = 2. What is the total gear ratio?'),
    options: [L('5', '5'), L('6', '6'), L('1,5', '1.5'), L('9', '9')],
    correct: 1,
    explain: L('Предавателните отношения на стъпалата се умножават: 3·2 = 6.', 'The ratios of the stages multiply: 3·2 = 6.'),
  },
  {
    q: L('Защо първото стъпало е с косозъби колела?', 'Why is the first stage made with helical gears?'),
    options: [
      L('По-евтини са от правозъбите', 'They are cheaper than spur gears'),
      L('Работят по-тихо и поемат по-голямо натоварване', 'They run more quietly and carry more load'),
      L('Нямат осова сила', 'They have no axial force'),
      L('Могат да работят с пресичащи се оси', 'They can work with intersecting axes'),
    ],
    correct: 1,
    explain: L(
      'Наклонените зъби влизат в контакт постепенно и повече зъби носят едновременно. Цената е осовата сила.',
      'The inclined teeth come into contact gradually and more teeth carry at once. The price is the axial force.',
    ),
  },
  {
    q: L('Каква допълнителна сила създават косите зъби?', 'What extra force do helical teeth create?'),
    options: [L('Осова Fₐ = Fₜ·tg β', 'Axial Fₐ = Fₜ·tan β'), L('Никаква', 'None'), L('Центробежна', 'Centrifugal'), L('Само радиална', 'Radial only')],
    correct: 0,
    explain: L('Нормалната сила е наклонена спрямо челната равнина и има съставка по оста.', 'The normal force is inclined to the transverse plane and has a component along the axis.'),
  },
  {
    q: L(`Колко е ъгълът на делителния конус δ₃ при z₃ = ${Z3}, z₄ = ${Z4} и Σ = 90°?`, `What is the pitch cone angle δ₃ for z₃ = ${Z3}, z₄ = ${Z4} and Σ = 90°?`),
    options: [L('45°', '45°'), L(`≈ ${deg(DELTA3)}°`, `≈ ${deg(DELTA3)}°`), L(`≈ ${deg(DELTA4)}°`, `≈ ${deg(DELTA4)}°`), L('90°', '90°')],
    correct: 1,
    explain: L(`tg δ₃ = z₃/z₄ = 0,5 → δ₃ ≈ ${deg(DELTA3)}°.`, `tan δ₃ = z₃/z₄ = 0.5 → δ₃ ≈ ${deg(DELTA3)}°.`),
  },
  {
    q: L('Къде се дава модулът на коничното колело?', 'Where is the module of a bevel gear given?'),
    options: [
      L('На външния (широкия) край на зъба', 'At the outer (wide) end of the tooth'),
      L('По средата на ширината', 'At the middle of the face width'),
      L('На върха на конуса', 'At the cone apex'),
      L('В нормално сечение като при косите зъби', 'In the normal section, as for helical teeth'),
    ],
    correct: 0,
    explain: L(
      'Зъбите се смаляват към върха, затова модулът и диаметрите се дават на външния край, където е най-лесно да се измерят.',
      'The teeth get smaller towards the apex, so the module and the diameters are given at the outer end, where they are easiest to measure.',
    ),
  },
];
