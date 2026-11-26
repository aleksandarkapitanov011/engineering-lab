/** Notes of the gear data tables, shared by the shaft and gear sheets. */
import type { DrawingNote } from '../../../core/types';
import { L, N } from './kit';

export const HELICAL_NOTES: Record<string, DrawingNote> = {
  mn: N(
    L('Нормален модул mₙ', 'Normal module mₙ'),
    L(
      'При косите зъби стандартен (ISO 54) е модулът в равнина, перпендикулярна на зъба. В челната равнина модулът е по-голям: mₜ = mₙ / cos β – с него се смятат диаметрите.',
      'For helical teeth the standard module (ISO 54) is the one in the plane normal to the tooth. In the transverse plane the module is larger, mₜ = mₙ / cos β, and the diameters are calculated with it.',
    ),
  ),
  z: N(L('Брой зъби z', 'Number of teeth z'), L('Отношението на броя зъби дава предавателното отношение на стъпалото.', 'The ratio of the tooth numbers gives the ratio of the stage.')),
  beta: N(
    L('Ъгъл на наклона β', 'Helix angle β'),
    L(
      'Избран така, че междуосието да е кръгло: cos β = mₙ(z₁ + z₂) / 2a = 2·68 / 140. По-голям ъгъл – по-тиха предавка, но по-голяма осова сила Fa = Ft·tg β.',
      'Chosen so that the centre distance is a round number: cos β = mₙ(z₁ + z₂) / 2a = 2·68 / 140. A larger angle gives a quieter mesh but a larger axial force Fa = Ft·tan β.',
    ),
  ),
  hand: N(
    L('Посока на наклона', 'Hand of the helix'),
    L(
      'Двете колела на една двойка са с противоположни посоки. Посоката е избрана така, че осовата сила на колело z₂ да е срещу тази на коничното колело на същия вал.',
      'The two gears of a pair have opposite hands. The hand is chosen so that the axial force of gear z₂ acts against that of the bevel pinion on the same shaft.',
    ),
  ),
  alpha: N(
    L('Профил αₙ = 20°', 'Profile αₙ = 20°'),
    L('Стандартният изходен контур по ISO 53: ъгъл 20°, височина на главата 1·m, на краката 1,25·m.', 'The standard basic rack of ISO 53: 20° angle, addendum 1·m, dedendum 1.25·m.'),
  ),
  x: N(L('Коефициент на изместване x', 'Profile shift x'), L('Нулево изместване: делителната и началната окръжност съвпадат.', 'No profile shift: the reference and operating pitch circles coincide.')),
  d: N(
    L('Делителен диаметър d', 'Pitch diameter d'),
    L('d = mₜ·z = mₙ·z / cos β. Не се мери – получава се от зъбообработката.', 'd = mₜ·z = mₙ·z / cos β. It is not measured – it results from cutting the teeth.'),
  ),
  da: N(
    L('Диаметър на върховете da h11', 'Tip diameter da h11'),
    L(
      'da = d + 2mₙ. Това е размерът на заготовката преди зъбообработката, затова е на чертежа с допуск h11.',
      'da = d + 2mₙ. It is the size of the blank before the teeth are cut, so it is on the drawing with tolerance h11.',
    ),
  ),
  a: N(
    L('Междуосие a', 'Centre distance a'),
    L(
      'a = (d₁ + d₂)/2 = 70 mm. Допускът му (по ISO 1328 / DIN 3964) се спазва от отворите в корпуса и определя страничната хлабина.',
      'a = (d₁ + d₂)/2 = 70 mm. Its tolerance (ISO 1328 / DIN 3964) is held by the bores in the housing and sets the backlash.',
    ),
  ),
  mate: N(L('Спрегнато колело', 'Mating gear'), L('Номерът на чертежа на колелото, с което работи.', 'The drawing number of the gear it runs with.')),
  b: N(L('Ширина b', 'Face width b'), L('Ширината на зъбния венец.', 'The width of the toothed rim.')),
};

export const BEVEL_NOTES: Record<string, DrawingNote> = {
  me: N(
    L('Модул на външния край mₑ', 'Outer module mₑ'),
    L(
      'Зъбите на коничното колело се стесняват към върха на конуса, затова модулът е различен по ширината. Стандартен е модулът на външния (широкия) край.',
      'The teeth of a bevel gear taper towards the cone apex, so the module changes across the face. The standard one is the module at the outer (wide) end.',
    ),
  ),
  z: HELICAL_NOTES.z,
  form: N(L('Форма на зъба', 'Tooth form'), L('Прави зъби – образуващите им минават през върха на конуса.', 'Straight teeth – their generators pass through the cone apex.')),
  alpha: HELICAL_NOTES.alpha,
  delta: N(
    L('Ъгъл на делителния конус δ', 'Pitch cone angle δ'),
    L('tg δ₁ = z₁/z₂; двата ъгъла се събират до ъгъла между осите: δ₁ + δ₂ = Σ = 90°.', 'tan δ₁ = z₁/z₂; the two angles add up to the shaft angle: δ₁ + δ₂ = Σ = 90°.'),
  ),
  deltaA: N(
    L('Ъгъл на конуса на върховете δa', 'Face cone angle δa'),
    L(
      'δa = δ + θa, където tg θa = hₐₑ/Rₑ. По този ъгъл се стругова заготовката.',
      'δa = δ + θa, where tan θa = hₐₑ/Rₑ. The blank is turned to this angle.',
    ),
  ),
  Re: N(
    L('Външно конусно разстояние Rₑ', 'Outer cone distance Rₑ'),
    L(
      'Разстоянието от върха на конуса до външния край по делителния конус: Rₑ = dₑ / (2 sin δ). Еднакво е за двете колела на двойката.',
      'The distance from the cone apex to the outer end along the pitch cone: Rₑ = dₑ / (2 sin δ). It is the same for both gears of the pair.',
    ),
  ),
  b: N(
    L('Ширина b', 'Face width b'),
    L('Мери се по образуващата на конуса. Обикновено b ≤ Rₑ/3 – иначе зъбите при върха стават твърде малки.', 'Measured along the cone generator. Usually b ≤ Rₑ/3 – otherwise the teeth near the apex get too small.'),
  ),
  de: N(L('Външен делителен диаметър dₑ', 'Outer pitch diameter dₑ'), L('dₑ = mₑ·z.', 'dₑ = mₑ·z.')),
  dae: N(
    L('Диаметър на върховете dₐₑ', 'Outer tip diameter dₐₑ'),
    L('dₐₑ = dₑ + 2mₑ·cos δ – главата на зъба е по допълнителния конус, перпендикулярно на делителния.', 'dₐₑ = dₑ + 2mₑ·cos δ – the addendum lies on the back cone, perpendicular to the pitch cone.'),
  ),
  x: HELICAL_NOTES.x,
  mount: N(
    L('Монтажно разстояние', 'Mounting distance'),
    L(
      'Разстоянието от върха на конуса до опорното чело на колелото. Двата върха трябва да съвпаднат в една точка – иначе контактът отива към края на зъба. При монтажа се регулира с подложки.',
      'The distance from the cone apex to the locating face of the gear. The two apexes must meet in one point – otherwise the contact runs to the end of the tooth. It is set with shims during assembly.',
    ),
  ),
  sigma: N(L('Ъгъл между осите Σ', 'Shaft angle Σ'), L('Валовете се пресичат под 90° в общия връх на конусите.', 'The shafts intersect at 90° in the common cone apex.')),
  mate: HELICAL_NOTES.mate,
  apex: N(
    L('Връх на конуса', 'Cone apex'),
    L(
      'Въображаемата точка, в която се събират всички образуващи на зъбите. Делителните конуси на двете колела имат общ връх в пресечната точка на осите.',
      'The imaginary point where all tooth generators meet. The pitch cones of both gears share this apex at the intersection of the axes.',
    ),
  ),
};
