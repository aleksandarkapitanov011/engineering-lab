/**
 * Gear drive sound, synthesised physically (no audio files).
 *
 *   MeshExcitation (AudioWorklet: transmission error, sliding friction, tooth hits, tooth errors, rattle)
 *     ├─ housing modes  (dense, damped resonances of a cast housing)
 *     ├─ gear-body modes (brighter ringing of the steel gears)
 *     └─ direct whine
 *   → housing low-pass (a closed housing muffles the highs) ┐
 *   bearing noise ──────────────────────────────────────────┤
 *   electric motor: 100 Hz magnetic hum, rotor-bar whine,   │
 *                   cooling-fan noise ∝ speed² ─────────────┤
 *   → dry + workshop reverb (generated impulse response) → limiter → volume
 *
 * Three characters change the mix: closed reducer with motor, open gears, worn gears.
 * The AudioContext is created on the first user gesture, as browsers require.
 */
import type { MechanismSound } from '../core/types';
import { MeshExcitation } from '../audio/meshExcitation';

export type SoundCharacter = 'reducer' | 'open' | 'worn';

interface CharacterDef {
  gen: { impactLevel: number; frictionLevel: number; errorScale: number; rattle: number };
  housingModes: number;
  gearModes: number;
  direct: number;
  housingCutoff: number;
  motor: number;
  reverb: number;
}

const CHARACTERS: Record<SoundCharacter, CharacterDef> = {
  reducer: {
    gen: { impactLevel: 0.45, frictionLevel: 0.8, errorScale: 1, rattle: 0 },
    housingModes: 1,
    gearModes: 0.25,
    direct: 0.7,
    housingCutoff: 2400,
    motor: 1,
    reverb: 0.38,
  },
  open: {
    gen: { impactLevel: 0.9, frictionLevel: 0.6, errorScale: 1, rattle: 0 },
    housingModes: 0.2,
    gearModes: 1,
    direct: 0.5,
    housingCutoff: 11000,
    motor: 0,
    reverb: 0.22,
  },
  worn: {
    gen: { impactLevel: 1.2, frictionLevel: 1.1, errorScale: 2.6, rattle: 1 },
    housingModes: 1,
    gearModes: 0.6,
    direct: 0.6,
    housingCutoff: 4200,
    motor: 1,
    reverb: 0.32,
  },
};

/** Resonances: [frequency Hz, Q, gain]. Housing: dense and damped. Gears: fewer, sharper, higher. */
const HOUSING_MODES: [number, number, number][] = [
  [620, 5, 0.8],
  [890, 6, 1.0],
  [1240, 6, 0.85],
  [1710, 7, 0.65],
  [2280, 7, 0.45],
  [3050, 8, 0.3],
];
const GEAR_MODES: [number, number, number][] = [
  [2350, 18, 0.9],
  [3700, 22, 0.7],
  [5200, 20, 0.45],
  [7400, 16, 0.25],
];

function workletSource(): string {
  return `const MeshExcitation = ${MeshExcitation.toString()};
class GearMeshProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.g = new MeshExcitation(sampleRate);
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.teeth) this.g.setTeeth(d.teeth[0], d.teeth[1]);
      for (const k of ['meshFrequency', 'duty', 'load', 'impactLevel', 'frictionLevel', 'errorScale', 'rattle']) {
        if (d[k] !== undefined) this.g[k] = d[k];
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    for (let i = 0; i < out.length; i++) out[i] = this.g.next();
    return true;
  }
}
registerProcessor('gear-mesh', GearMeshProcessor);`;
}

type Params = Partial<Record<'meshFrequency' | 'duty' | 'load' | 'impactLevel' | 'frictionLevel' | 'errorScale' | 'rattle', number>> & {
  teeth?: [number, number];
};

/** Stereo room impulse response: early reflections + exponentially decaying diffuse tail. */
function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.round(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const tau = seconds / 6.9; // −60 dB at `seconds`
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      // Air absorbs highs faster: crude low-pass by averaging with the previous sample later in the tail.
      const n = Math.random() * 2 - 1;
      d[i] = n * Math.exp(-t / tau) * (t < 0.008 ? 0 : 1);
      if (i > 0 && t > 0.15) d[i] = 0.6 * d[i] + 0.4 * d[i - 1];
    }
    // A few discrete early reflections (walls, workbench).
    for (const [ms, g] of [
      [9, 0.5],
      [14, 0.35],
      [23, 0.3],
      [31, 0.22],
    ] as const) {
      const idx = Math.round(((ms + ch * 1.7) / 1000) * ctx.sampleRate);
      if (idx < len) d[idx] += g * (ch ? -1 : 1);
    }
  }
  return buf;
}

export class GearSound {
  private ctx: AudioContext | null = null;
  private send: ((p: Params) => void) | null = null;
  private nodes: {
    master: GainNode;
    gearsGain: GainNode;
    housingModes: GainNode;
    gearModes: GainNode;
    direct: GainNode;
    housingLp: BiquadFilterNode;
    bearingGain: GainNode;
    motorGain: GainNode;
    humGain: GainNode;
    barOsc: OscillatorNode;
    barGain: GainNode;
    fanGain: GainNode;
    wet: GainNode;
  } | null = null;
  private teeth: [number, number] = [0, 0];
  private volume = 0.5;
  private on = false;
  private last: MechanismSound | null = null;
  private running = false;
  private character: SoundCharacter = 'reducer';

  get enabled(): boolean {
    return this.on;
  }

  get currentCharacter(): SoundCharacter {
    return this.character;
  }

  /** Must be called from a user gesture (tap/click). */
  start(): boolean {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    if (!this.ctx) {
      this.ctx = new Ctor();
      void this.build(this.ctx).then(() => {
        this.teeth = [0, 0];
        this.applyCharacter();
        this.apply();
      });
    }
    void this.ctx.resume();
    this.on = true;
    this.apply();
    return true;
  }

  setCharacter(c: SoundCharacter): void {
    this.character = c;
    this.applyCharacter();
    this.apply();
  }

  private async build(ctx: AudioContext): Promise<void> {
    const master = ctx.createGain();
    master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;
    master.connect(limiter).connect(ctx.destination);

    // Dry bus + workshop reverb.
    const bus = ctx.createGain();
    bus.connect(master);
    const convolver = ctx.createConvolver();
    convolver.buffer = roomImpulse(ctx, 1.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    bus.connect(convolver).connect(wet).connect(master);

    // Gears → housing low-pass → bus.
    const housingLp = ctx.createBiquadFilter();
    housingLp.type = 'lowpass';
    housingLp.frequency.value = 2400;
    housingLp.Q.value = 0.6;
    housingLp.connect(bus);
    const gearsGain = ctx.createGain();
    gearsGain.gain.value = 0;
    gearsGain.connect(housingLp);

    let source: AudioNode;
    if (ctx.audioWorklet) {
      const url = URL.createObjectURL(new Blob([workletSource()], { type: 'application/javascript' }));
      try {
        await ctx.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const node = new AudioWorkletNode(ctx, 'gear-mesh', { numberOfInputs: 0, outputChannelCount: [1] });
      this.send = (p) => node.port.postMessage(p);
      source = node;
    } else {
      const gen = new MeshExcitation(ctx.sampleRate);
      const sp = ctx.createScriptProcessor(1024, 0, 1);
      sp.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) out[i] = gen.next();
      };
      this.send = (p) => {
        if (p.teeth) gen.setTeeth(p.teeth[0], p.teeth[1]);
        for (const k of ['meshFrequency', 'duty', 'load', 'impactLevel', 'frictionLevel', 'errorScale', 'rattle'] as const) {
          const v = p[k];
          if (v !== undefined) gen[k] = v;
        }
      };
      source = sp;
    }

    const bank = (modes: [number, number, number][]): GainNode => {
      const out = ctx.createGain();
      for (const [f, q, g] of modes) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f;
        bp.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.value = g * 2;
        source.connect(bp).connect(gain).connect(out);
      }
      out.connect(gearsGain);
      return out;
    };
    const housingModes = bank(HOUSING_MODES);
    const gearModes = bank(GEAR_MODES);
    const directLp = ctx.createBiquadFilter();
    directLp.type = 'lowpass';
    directLp.frequency.value = 2500;
    const direct = ctx.createGain();
    source.connect(directLp).connect(direct).connect(gearsGain);

    // Shared noise source.
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    noise.start();

    // Bearings: soft hiss and low rumble, through the housing.
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 3800;
    hiss.Q.value = 0.8;
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 160;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 1.2;
    const bearingGain = ctx.createGain();
    bearingGain.gain.value = 0;
    noise.connect(hiss).connect(bearingGain);
    noise.connect(rumble).connect(rumbleGain).connect(bearingGain);
    bearingGain.connect(housingLp);

    // Electric motor (outside the gearbox): magnetic hum, rotor-bar whine, fan.
    const motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    motorGain.connect(bus);
    const humGain = ctx.createGain();
    humGain.gain.value = 0;
    humGain.connect(motorGain);
    for (const [f, g] of [
      [100, 1],
      [200, 0.35],
      [300, 0.18],
      [600, 0.06],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(humGain);
      o.start();
    }
    const barOsc = ctx.createOscillator();
    barOsc.frequency.value = 400;
    const barGain = ctx.createGain();
    barGain.gain.value = 0;
    barOsc.connect(barGain).connect(motorGain);
    barOsc.start();
    const fan = ctx.createBiquadFilter();
    fan.type = 'bandpass';
    fan.frequency.value = 650;
    fan.Q.value = 0.6;
    const fanGain = ctx.createGain();
    fanGain.gain.value = 0;
    noise.connect(fan).connect(fanGain).connect(motorGain);

    this.nodes = { master, gearsGain, housingModes, gearModes, direct, housingLp, bearingGain, motorGain, humGain, barOsc, barGain, fanGain, wet };
  }

  private applyCharacter(): void {
    const ctx = this.ctx;
    const n = this.nodes;
    if (!ctx || !n || !this.send) return;
    const c = CHARACTERS[this.character];
    const now = ctx.currentTime;
    this.send({ ...c.gen });
    n.housingModes.gain.setTargetAtTime(c.housingModes, now, 0.05);
    n.gearModes.gain.setTargetAtTime(c.gearModes, now, 0.05);
    n.direct.gain.setTargetAtTime(c.direct, now, 0.05);
    n.housingLp.frequency.setTargetAtTime(c.housingCutoff, now, 0.05);
    n.motorGain.gain.setTargetAtTime(c.motor, now, 0.1);
    n.wet.gain.setTargetAtTime(c.reverb, now, 0.1);
  }

  /** Updates the mesh and loudness. `running` false fades out (paused or zero speed). */
  update(sound: MechanismSound | null, running: boolean): void {
    this.last = sound;
    this.running = running;
    this.apply();
  }

  private apply(): void {
    const ctx = this.ctx;
    const n = this.nodes;
    if (!ctx || !n || !this.send) return;
    const s = this.last;
    const now = ctx.currentTime;
    const audible = this.on && this.running && !!s && s.meshFrequency > 0.5;
    n.master.gain.setTargetAtTime(audible ? this.volume : 0, now, 0.08);
    if (!s) return;
    if (s.teeth[0] !== this.teeth[0] || s.teeth[1] !== this.teeth[1]) {
      this.teeth = [s.teeth[0], s.teeth[1]];
      this.send({ teeth: this.teeth });
    }
    const duty = Math.min(0.95, Math.max(0.05, s.contactRatio - 1));
    this.send({ meshFrequency: s.meshFrequency, duty, load: s.load });
    // Input shaft speed (the motor runs at n1): f_mesh = z1·n1/60.
    const shaftHz = s.meshFrequency / Math.max(1, s.teeth[0]);
    const speed = Math.min(1, shaftHz / 50); // 1 at 3000 min⁻¹
    n.gearsGain.gain.setTargetAtTime(0.1 + 0.55 * Math.sqrt(speed), now, 0.08);
    n.bearingGain.gain.setTargetAtTime(0.012 + 0.05 * speed, now, 0.1);
    n.humGain.gain.setTargetAtTime(0.035, now, 0.1);
    n.barOsc.frequency.setTargetAtTime(Math.max(20, shaftHz * 28), now, 0.05); // 28 rotor bars
    n.barGain.gain.setTargetAtTime(0.012 * Math.sqrt(speed), now, 0.1);
    n.fanGain.gain.setTargetAtTime(0.18 * speed * speed, now, 0.1);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.apply();
  }

  stop(): void {
    this.on = false;
    if (this.ctx && this.nodes) this.nodes.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  dispose(): void {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    this.send = null;
    this.nodes = null;
    if (ctx) window.setTimeout(() => void ctx.close(), 300);
  }
}
