/**
 * Gear mesh sound, synthesised physically (no audio files):
 *
 *   MeshExcitation (AudioWorklet, sample by sample: transmission error + tooth impacts + tooth errors)
 *     ├─ resonance bank (band-pass filters = ringing modes of the gear bodies and the housing)
 *     └─ direct path (low-passed "whine")
 *   + bearing noise (band-passed noise, rises with speed)
 *   → limiter → master volume
 *
 * The AudioContext is created on the first user gesture, as browsers require.
 */
import type { MechanismSound } from '../core/types';
import { MeshExcitation } from '../audio/meshExcitation';

/** Ringing modes of gear bodies / housing: frequency (Hz), Q, gain. */
const MODES: [number, number, number][] = [
  [1150, 9, 1.0],
  [2350, 12, 0.75],
  [3700, 14, 0.5],
  [5200, 10, 0.28],
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
      if (d.meshFrequency !== undefined) this.g.meshFrequency = d.meshFrequency;
      if (d.duty !== undefined) this.g.duty = d.duty;
      if (d.load !== undefined) this.g.load = d.load;
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

type Params = { teeth?: [number, number]; meshFrequency?: number; duty?: number; load?: number };

export class GearSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private speedGain: GainNode | null = null;
  private bearingGain: GainNode | null = null;
  private send: ((p: Params) => void) | null = null;
  private building: Promise<void> | null = null;
  private teeth: [number, number] = [0, 0];
  private volume = 0.5;
  private on = false;
  private last: MechanismSound | null = null;
  private running = false;

  get enabled(): boolean {
    return this.on;
  }

  /** Must be called from a user gesture (tap/click). */
  start(): boolean {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.building = this.build(this.ctx).then(() => this.apply());
    }
    void this.ctx.resume();
    this.on = true;
    this.apply();
    return true;
  }

  private async build(ctx: AudioContext): Promise<void> {
    const master = ctx.createGain();
    master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master.connect(limiter).connect(ctx.destination);
    this.master = master;

    // Loudness rises with speed (set in apply()).
    const speedGain = ctx.createGain();
    speedGain.gain.value = 0;
    speedGain.connect(master);
    this.speedGain = speedGain;

    // Excitation source: AudioWorklet, or ScriptProcessor on very old WebViews.
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
        if (p.meshFrequency !== undefined) gen.meshFrequency = p.meshFrequency;
        if (p.duty !== undefined) gen.duty = p.duty;
        if (p.load !== undefined) gen.load = p.load;
      };
      source = sp;
    }

    // Ringing modes of the steel parts.
    for (const [f, q, g] of MODES) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = g * 2.2;
      source.connect(bp).connect(gain).connect(speedGain);
    }
    // Direct, airborne whine (the transmission-error wave itself), softened.
    const direct = ctx.createBiquadFilter();
    direct.type = 'lowpass';
    direct.frequency.value = 3000;
    direct.Q.value = 0.5;
    const directGain = ctx.createGain();
    directGain.gain.value = 0.35;
    source.connect(direct).connect(directGain).connect(speedGain);

    // Bearing noise: soft broadband hiss plus a low rumble.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 4200;
    hiss.Q.value = 0.7;
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 180;
    const bearingGain = ctx.createGain();
    bearingGain.gain.value = 0;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.9;
    noise.connect(hiss).connect(bearingGain);
    noise.connect(rumble).connect(rumbleGain).connect(bearingGain);
    bearingGain.connect(master);
    this.bearingGain = bearingGain;
    noise.start();
  }

  /** Updates the mesh and loudness. `running` false fades out (paused or zero speed). */
  update(sound: MechanismSound | null, running: boolean): void {
    this.last = sound;
    this.running = running;
    this.apply();
  }

  private apply(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.speedGain || !this.bearingGain || !this.send) return;
    const s = this.last;
    const now = ctx.currentTime;
    const audible = this.on && this.running && !!s && s.meshFrequency > 0.5;
    this.master.gain.setTargetAtTime(audible ? this.volume : 0, now, 0.06);
    if (!s) return;
    if (s.teeth[0] !== this.teeth[0] || s.teeth[1] !== this.teeth[1]) {
      this.teeth = [s.teeth[0], s.teeth[1]];
      this.send({ teeth: this.teeth });
    }
    const duty = Math.min(0.95, Math.max(0.05, s.contactRatio - 1));
    this.send({ meshFrequency: s.meshFrequency, duty, load: s.load });
    // Louder with speed; individual tooth ticks stay audible at low speed.
    const speed = Math.min(1, s.meshFrequency / 1000);
    this.speedGain.gain.setTargetAtTime(0.12 + 0.5 * Math.sqrt(speed), now, 0.08);
    this.bearingGain.gain.setTargetAtTime(0.01 + 0.05 * speed, now, 0.1);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.apply();
  }

  stop(): void {
    this.on = false;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  dispose(): void {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    this.send = null;
    if (ctx) window.setTimeout(() => void ctx.close(), 300);
    void this.building;
  }
}
