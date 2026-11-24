/**
 * Physically based excitation signal of a spur gear mesh, generated sample by sample.
 *
 * Gear noise is not a tone. Its sources, all modelled here:
 *  1. transmission error caused by the mesh stiffness switching between one and two tooth pairs
 *     (periodic at the mesh frequency, rounded by tip relief → the "whine");
 *  2. sliding friction between the flanks: broadband noise whose strength changes within every mesh
 *     cycle (sliding speed is zero at the pitch point and largest at the start/end of contact);
 *  3. a small hit each time a new tooth pair comes into contact (rings the steel resonances);
 *  4. pitch/profile errors of the individual teeth, repeating once per revolution of each gear
 *     (sidebands at both shaft frequencies);
 *  5. slow random fluctuation of load and speed (a real drive is never perfectly steady);
 *  6. with wear: extra random knocks inside the backlash (rattle).
 *
 * The class has NO references outside itself (only Math), because its source text is injected into an
 * AudioWorklet. Fields are assigned in the constructor (no initialisers) for the same reason.
 */
export class MeshExcitation {
  declare sampleRate: number;
  declare meshFrequency: number;
  declare z1: number;
  declare z2: number;
  /** Fraction of the mesh cycle with two tooth pairs in contact (ε − 1). */
  declare duty: number;
  declare load: number;
  /** Character controls (0…~2). */
  declare impactLevel: number;
  declare frictionLevel: number;
  declare errorScale: number;
  declare rattle: number;
  declare private phase: number;
  declare private k1: number;
  declare private k2: number;
  declare private err1: number[];
  declare private err2: number[];
  declare private impact: number;
  declare private rough: number;
  declare private impactAmp: number;
  declare private teLp: number;
  declare private hpPrevIn: number;
  declare private hpPrevOut: number;
  declare private frLp: number;
  declare private seed: number;
  declare private wobble: number;
  declare private wobbleTarget: number;
  declare private wobbleTimer: number;
  declare private loadMod: number;
  declare private loadTarget: number;
  declare private loadTimer: number;
  declare private rattleDelay: number;
  declare private rattleAmp: number;
  declare private rattleEnv: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.meshFrequency = 0;
    this.z1 = 20;
    this.z2 = 40;
    this.duty = 0.64;
    this.load = 0.5;
    this.impactLevel = 0.6;
    this.frictionLevel = 0.7;
    this.errorScale = 1;
    this.rattle = 0;
    this.phase = 0;
    this.k1 = 0;
    this.k2 = 0;
    this.err1 = [];
    this.err2 = [];
    this.impact = 0;
    this.rough = 0;
    this.impactAmp = 0;
    this.teLp = 0;
    this.hpPrevIn = 0;
    this.hpPrevOut = 0;
    this.frLp = 0;
    this.seed = 12345;
    this.wobble = 0;
    this.wobbleTarget = 0;
    this.wobbleTimer = 0;
    this.loadMod = 0;
    this.loadTarget = 0;
    this.loadTimer = 0;
    this.rattleDelay = -1;
    this.rattleAmp = 0;
    this.rattleEnv = 0;
    this.setTeeth(20, 40);
  }

  /** Deterministic pseudo-random numbers (reproducible tooth errors). */
  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  setTeeth(z1: number, z2: number): void {
    this.z1 = Math.max(4, Math.round(z1));
    this.z2 = Math.max(4, Math.round(z2));
    this.seed = 12345;
    // Each tooth gets a pitch error: a once-per-revolution runout component plus random scatter.
    const make = (z: number, runout: number, phase: number): number[] => {
      const e: number[] = [];
      for (let k = 0; k < z; k++) e.push(runout * Math.sin((2 * Math.PI * k) / z + phase) + 0.14 * (this.rand() * 2 - 1));
      return e;
    };
    this.err1 = make(this.z1, 0.22, 0.4);
    this.err2 = make(this.z2, 0.16, 2.1);
    this.k1 = 0;
    this.k2 = 0;
  }

  /** Next output sample (roughly −1…1 before the resonance filters). */
  next(): number {
    const f = this.meshFrequency;
    const sr = this.sampleRate;
    if (f <= 0) {
      this.impact *= 0.99;
      this.rough *= 0.99;
      this.rattleEnv *= 0.99;
      return 0;
    }
    // 5) Slow random drift of speed (±0.15 %) and load (±12 %).
    if (--this.wobbleTimer <= 0) {
      this.wobbleTimer = Math.round(sr * 0.25);
      this.wobbleTarget = (this.rand() * 2 - 1) * 0.0015;
    }
    this.wobble += (this.wobbleTarget - this.wobble) * (4 / sr);
    if (--this.loadTimer <= 0) {
      this.loadTimer = Math.round(sr * (0.15 + 0.5 * this.rand()));
      this.loadTarget = (this.rand() * 2 - 1) * 0.12;
    }
    this.loadMod += (this.loadTarget - this.loadMod) * (6 / sr);
    const load = Math.max(0.05, this.load * (1 + this.loadMod));

    this.phase += (f * (1 + this.wobble)) / sr;
    const es = this.errorScale;
    if (this.phase >= 1) {
      this.phase -= 1;
      // A new tooth pair enters contact.
      this.k1 = (this.k1 + 1) % this.z1;
      this.k2 = (this.k2 + 1) % this.z2;
      const err = es * (this.err1[this.k1] + this.err2[this.k2]);
      this.impactAmp = (0.5 + 0.5 * load) * Math.max(0.1, 1 + 1.6 * err);
      this.impact = 1;
      this.rough = 1;
      // 6) Worn teeth: sometimes the flanks separate and knock again inside the backlash.
      if (this.rattle > 0 && this.rand() < this.rattle * 0.35) {
        this.rattleDelay = Math.round((sr / f) * (0.2 + 0.6 * this.rand()));
        this.rattleAmp = 0.5 + this.rand();
      }
    }
    // 1) Transmission error: lower while two pairs share the load (stiffer), higher with one pair.
    const single = this.phase >= this.duty;
    const target = (single ? 1 : -1) * (0.6 + 0.4 * load) + 0.5 * es * (this.err1[this.k1] + this.err2[this.k2]);
    // Tip relief makes the stiffness change gradual: rounded corners (~1/5 of a mesh period).
    const a = 1 - Math.exp((-2 * Math.PI * Math.min(f * 5, 6000)) / sr);
    this.teLp += a * (target - this.teLp);
    // DC blocker (high-pass ~20 Hz).
    const te = this.teLp - this.hpPrevIn + 0.997 * this.hpPrevOut;
    this.hpPrevIn = this.teLp;
    this.hpPrevOut = te;

    // 2) Sliding friction: noise shaped by the sliding speed, which is zero at the pitch point
    //    (about the middle of the cycle) and largest at the start and end of contact.
    const slide = 0.15 + 1.7 * Math.abs(this.phase - 0.5);
    const speed = Math.min(1.5, Math.sqrt(f / 300));
    const white = this.rand() * 2 - 1;
    this.frLp += 0.35 * (white - this.frLp); // gentle colouring (less fizz)
    const friction = this.frictionLevel * 1.6 * slide * speed * load * this.frLp;

    // 3) Engagement hit (τ ≈ 0.18 ms) plus a little surface roughness (τ ≈ 0.5 ms).
    this.impact *= Math.exp(-1 / (0.00018 * sr));
    this.rough *= Math.exp(-1 / (0.0005 * sr));
    const hit = this.impact * this.impactAmp * this.impactLevel;
    const rough = this.rough * this.impactAmp * this.impactLevel * 0.25 * (this.rand() * 2 - 1);

    // 6) Rattle knock.
    if (this.rattleDelay >= 0 && --this.rattleDelay < 0) this.rattleEnv = this.rattleAmp;
    this.rattleEnv *= Math.exp(-1 / (0.00025 * sr));
    const knock = this.rattleEnv * (0.6 + 0.4 * (this.rand() * 2 - 1));

    return 0.6 * te + 1.3 * hit + rough + friction + knock;
  }
}
