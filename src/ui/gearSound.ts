/**
 * Synthesised machine sound (Web Audio API, no audio files):
 * harmonics of the fundamental + a little band-passed noise, amplitude-modulated at the
 * shaft frequency (the "wow" you hear from eccentricity in real gearboxes).
 * The AudioContext is created on the first user gesture, as browsers require.
 */
import type { MechanismSound } from '../core/types';

const MAX_HARMONICS = 4;

export class GearSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private amp: GainNode | null = null;
  private oscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private lfo: OscillatorNode | null = null;
  private lfoDepth: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private volume = 0.5;
  private on = false;

  get enabled(): boolean {
    return this.on;
  }

  /** Must be called from a user gesture (tap/click). */
  start(): boolean {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    if (!this.ctx) {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      // Amplitude modulation: amp.gain = 1 + depth·sin(2π·f_shaft·t)
      this.amp = ctx.createGain();
      this.amp.gain.value = 1;
      this.amp.connect(this.master);
      this.lfo = ctx.createOscillator();
      this.lfoDepth = ctx.createGain();
      this.lfoDepth.gain.value = 0.22;
      this.lfo.connect(this.lfoDepth).connect(this.amp.gain);
      this.lfo.start();
      for (let i = 0; i < MAX_HARMONICS; i++) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sine';
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain).connect(this.amp);
        osc.start();
        this.oscs.push({ osc, gain });
      }
      // Gear "hiss": white noise through a band-pass around the mesh frequency.
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = ctx.createBufferSource();
      this.noise.buffer = buf;
      this.noise.loop = true;
      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.Q.value = 4;
      const ng = ctx.createGain();
      ng.gain.value = 0.18;
      this.noise.connect(this.noiseFilter).connect(ng).connect(this.amp);
      this.noise.start();
    }
    void this.ctx.resume();
    this.on = true;
    return true;
  }

  /** Updates pitch and loudness. `running` false fades the sound out (paused or zero speed). */
  update(sound: MechanismSound | null, running: boolean): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const audible = this.on && running && !!sound && sound.fundamental > 1;
    this.master.gain.setTargetAtTime(audible ? 0.16 * this.volume : 0, now, 0.08);
    if (!sound || sound.fundamental <= 1) return;
    const f = sound.fundamental;
    const nyquist = this.ctx.sampleRate / 2;
    this.oscs.forEach(({ osc, gain }, i) => {
      const fi = f * (i + 1);
      osc.frequency.setTargetAtTime(Math.min(fi, nyquist - 100), now, 0.05);
      const a = fi < nyquist - 100 ? (sound.harmonics[i] ?? 0) : 0;
      gain.gain.setTargetAtTime(a * 0.5, now, 0.05);
    });
    this.lfo?.frequency.setTargetAtTime(Math.max(0.1, sound.modulation), now, 0.1);
    this.noiseFilter?.frequency.setTargetAtTime(Math.min(f * 2, nyquist - 100), now, 0.05);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  stop(): void {
    this.on = false;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  dispose(): void {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) window.setTimeout(() => void ctx.close(), 300);
    this.oscs = [];
  }
}
