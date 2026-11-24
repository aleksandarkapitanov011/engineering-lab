# Engineering Lab

A mobile-first interactive 3D lab that teaches how mechanical mechanisms work.
This demo contains one mechanism: a **spur gear pair** (m = 2 mm, z₁ = 20, z₂ = 40, α = 20°, a = 60 mm)
on two parallel shafts with keys, ball bearings and a base with bearing supports.

Stack: Vite + TypeScript + Three.js (no framework), Capacitor for Android. Everything runs offline;
all geometry is generated procedurally (no model files). UI language is Bulgarian, with English prepared.

| Tab | What it does |
| --- | --- |
| **Модел** **Параметри** opens the parameter lab: module (ISO 54 series), z₁, z₂ and profile shift x₁ (x₂ = −x₁) with presets; the 3D model is regenerated live and design checks report undercut, pointed teeth, contact ratio, bearing clash, pinion shaft and too large i. **Сили** opens the forces & strength panel: power P and K_A (speed from the slider) give M₁, M₂, Ft, Fr, Fₙ and bearing reactions drawn as 3D arrows, plus safety factors for Lewis bending, Hertz contact, key crushing and shaft torsion, and bearing L10h life. **Зацепване** flies the camera into the mesh: base/pitch circles, line of action N₁N₂ with the active path A–E, pitch point and α drawn over the gears, live contact points synced with the 3D teeth (extra ×10 slow motion), a live count of tooth pairs in contact. | Animated 3D model, 0–3000 min⁻¹ input slider, live n₁ / n₂ / i readouts and rotation arrows, exploded view, section plane through the shaft axes, standard views, tap a part for its metadata. |
| **Сглоби** | Assembly game: drag a part card onto the model (or tap card, then the target). Wrong order shakes the card and explains why. Timer, mistakes, 1–3 stars, best score in `localStorage`, rotating reward. |
| **Чертеж** | Two A3 technical drawings at 2:1 (shaft 1 and the pinion) as SVG: ISO line types, dimensions with tolerances (k6, h9, H7, N9, JS9, h11), roughness Ra 0.8/1.6/3.2, section A–A, gear data table, title block. Pinch-zoom / pan; tap a dimension or symbol for an explanation. |
| **Теория** | A spiral notebook with a cover, contents and handwritten notes (highlighter, red underlines, sticky notes, arrows); pages turn like a real book. Six pages with animated SVG illustrations computed from the same involute math (line of action with live contact points, undercut traced by a rack cutter, etc.) and a 5-question quiz. |

## Requirements

- Node.js 20 or newer (developed with Node 26) and npm
- For the Android build: Android Studio (it bundles JDK 21) with Android SDK Platform 36

## Run in the browser

```bash
npm install
npm run dev        # serves on http://localhost:5173 and on your LAN IP
```

To try it on a phone, open `http://<your-computer-ip>:5173` on a device in the same Wi‑Fi network
(the dev script starts Vite with `--host`).

```bash
npm run build      # type-check (tsc --noEmit) + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
```

## Build the Android debug APK

The `android/` project is already generated (`npx cap add android`). After any change to the web code:

```bash
npm run build
npx cap sync android
```

Then build the APK, either from Android Studio (`npx cap open android`, then *Build > Build App Bundle(s) / APK(s) > Build APK(s)*)
or from the command line:

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

If Gradle cannot find the SDK, create `android/local.properties` with `sdk.dir=<path to your Android SDK>`
(Android Studio does this automatically when it opens the project). Gradle must run on JDK 21: use the JDK
bundled with Android Studio (`JAVA_HOME=<Android Studio>/jbr`).

### iOS later

Nothing in the web code is Android-specific. To add iOS on a Mac with Xcode:
`npm i @capacitor/ios && npx cap add ios && npx cap sync ios`.

## Project structure

```
src/
  main.ts                 entry: registers mechanisms, starts the shell
  app/shell.ts            catalogue (home) + mechanism view with the 4-tab bar (mechanism-agnostic)
  app/context.ts          TabView / TabSpec / AppContext interfaces
  core/                   pure logic, no DOM or WebGL
    types.ts              the Mechanism data model
    registry.ts           catalogue registry
    kinematics.ts         speed solver (gear meshes, couplings)
    assembly.ts           assembly-order engine, stars, best score comparison
    involute.ts           involute gear math (outline, dimensions, span W, contact ratio)
    entitlements.ts       isPro() seam for paid features
    storage.ts            localStorage wrapper
  three/                  rendering engine shared by all mechanisms
    viewer.ts             renderer, camera, touch orbit controls, lights, floor, tweens, on-demand rendering
    mechanismScene.ts     builds bodies/parts from a Mechanism: rotation, explode, section caps, highlight, ghosts
    geom.ts               procedural helpers (stepped keyed shaft, keyed bore, ball bearing, extrusions)
    materials.ts          material kit (steel, chrome, paint, translucent)
    thumbnails.ts         renders part thumbnails for the assembly tray
  tabs/                   the four tabs, generic over Mechanism
  ui/                     DOM helpers, icons, bottom sheet, SVG drafting toolkit, illustration helpers
  i18n/index.ts           all UI strings (bg + en)
  mechanisms/
    index.ts              registry: the only file to touch when adding a mechanism
    spur-gear/            the spur gear pair module
      params.ts           all dimensions in one place
      parts.ts            geometry builders + metadata of every part
      assembly.ts         assembly steps (partId, prerequisites, hint)
      drawings.ts         SVG drawings + tap explanations
      theory.ts           theory pages + animated illustrations
      quiz.ts             quiz questions
      index.ts            the Mechanism object (kinematics, readouts, camera, section plane)
tests/                    Vitest unit tests
android/                  Capacitor Android project
```

## How to add a new mechanism

A mechanism is a data module. The shell, the tabs and the 3D engine only know the `Mechanism`
interface in `src/core/types.ts`, so adding one never touches them.

1. **Create a folder**, e.g. `src/mechanisms/bevel-gear/`.
2. **Parts** (`parts.ts`): an array of `PartDef`. Each part has
   - `build({ materials })` returning a `THREE.Object3D` in the part's local frame. For rotating parts the
     local +Z axis is the rotation axis; keep the part centred on that axis (`position: [0, 0, z]`).
   - `body`: id of the kinematic body it turns with (omit for static parts such as housings).
   - `meta`: Bulgarian name, material, function, key dimensions (shown in the Model tab sheet).
   - `explode`: offset and `order` for the exploded view (`frame: 'spin'` for offsets that rotate with the shaft, e.g. keys).
   - optional `approach` (direction it slides in from in the assembly game), `spin` (child objects that turn at a
     different speed, e.g. bearing balls), `fixed: true` (pre-installed in the game).
3. **Kinematics**: list the `bodies` (origin, axis, arrow position) and `links`
   (`external-gear`, `internal-gear`, `coupling`), plus `input` and `output` body ids. Speeds and directions are
   solved by `solveSpeeds()`. Add `readouts` to show values in the Model tab.
4. **Assembly** (`assembly.ts`): `steps: [{ partId, requires: [...], hint: { bg } }]` and `parTimeSec`.
   `validateSteps()` in a unit test catches unknown ids and cycles.
5. **Drawings** (`drawings.ts`): `{ id, title, render(): string, notes }`. Use the toolkit in `src/ui/svgdraw.ts`
   (`dim`, `roughness`, `leader`, `titleBlock`, …); pass `note: 'key'` and add `notes[key]` to make an element tappable.
6. **Theory** (`theory.ts`): pages with `title`, 3–5 `sentences`, one `formula` and an
   `illustration(host)` that returns `{ start, stop, dispose }` (helpers in `src/ui/illus.ts`).
   The booklet is rendered as a spiral notebook. Sentences support notebook markup:
   `==highlighter==`, `__red underline__`, `**ink bold**`, `((red circle))`. Optional `annotations` add a figure
   caption, a handwritten remark with an arrow next to the formula, a yellow sticky note and a red warning.
7. **Quiz** (`quiz.ts`): `{ q, options, correct, explain }` (options are shuffled at runtime).
8. **Optional parameter lab**: add `lab: { title, intro, params, presets, evaluate(values) }`. `evaluate` returns
   computed values, warnings (`ok | info | warn | error`) and a regenerated `Mechanism`; the Model tab shows a
   "Параметри" button automatically (see `spur-gear/lab.ts` and `spur-gear/layout.ts`).
9. **Optional forces panel**: add `forces: { title, intro, params, evaluate(values, inputRpm) }` returning values,
   `checks` (stress, limit, safety, required), warnings and `arrows` (world-space force vectors). See `spur-gear/forces.ts`;
   the pure `computeForces()` is unit-tested against hand calculations.
10. **Optional close-up**: add `closeUp: { title, intro, camera, focusParts, createOverlay(), facts(rpm) }`.
   The overlay's `update(inputAngle)` is called every frame. See `spur-gear/closeup.ts`.
11. **Export** the `Mechanism` from `index.ts` (also `camera` view directions, `section` plane, `maxInputRpm`,
   catalogue `thumbnail` SVG, optional `pro: true`).
12. **Register** it in `src/mechanisms/index.ts` with `registerEntry(myMechanism)` and remove its teaser entry.

## Localisation

- Shell UI strings live in `src/i18n/index.ts` (`bg` complete, `en` partial; missing keys fall back to Bulgarian).
- Mechanism content uses `LText = { bg, en? }` inside each module and is resolved with `lt()`.
- Switch language with `setLang('en')` in `src/main.ts` (a UI toggle can be added later).

## Pro / payments

`src/core/entitlements.ts` exposes `isPro()` behind an `EntitlementService` interface. The local stub always
returns `false`. To add RevenueCat, implement the interface with `@revenuecat/purchases-capacitor` and call
`setEntitlementService(...)` at start-up. Catalogue entries with `pro: true` are gated through this seam;
the three "Скоро" teasers are `TeaserEntry` objects in the registry.

## Performance notes

- One `MeshStandardMaterial` per part, merged geometry per part (each gear is one mesh, balls of a bearing are one mesh).
- Single 1024² shadow map, pixel ratio capped at 2, rendering only when something moves (on-demand loop).
- WebGL contexts are created when a 3D tab is shown and released when it is hidden.

## Tests

`tests/kinematics.test.ts` checks n₂ = n₁·z₁/z₂, opposite direction for an external mesh, i = 2, idler and internal
meshes, inconsistent loops, and that the generated involute gears mesh without overlapping over a full tooth pitch.
`tests/assembly.test.ts` checks the order rules (key before gear, gear before bearing B), completion, scoring and
step validation.
