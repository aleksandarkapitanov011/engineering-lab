/**
 * Physically based excitation signal of a spur gear mesh, generated sample by sample.
 *
 * Gear noise is not a tone: it comes from
 *  1. transmission error caused by the mesh stiffness switching between one and two tooth pairs
 *     (a periodic, sharp-cornered wave at the mesh frequency → "whine" with many harmonics);
 *  2. a small impact each time a new tooth pair comes into contact (excites the metal resonances);
 *  3. pitch/profile errors of the individual teeth, repeating once per revolution of each gear
 *     (sidebands at the shaft frequencies, the typical "wow" and roughness).
 *
 * The class has NO references outside itself (only Math), because its source text is also
 * injected into an AudioWorklet. Keep it self-contained.
 */
export class MeshExcitation {
  // Declared without initialisers: bundlers may lower field initialisers into external helpers,
  // which would break the source injection into the AudioWorklet.
  declare sampleRate: number;
  declare meshFrequency: number;
  declare z1: number;
  declare z2: number;
  /** Fraction of the mesh cycle with two tooth pairs in contact (ε − 1). */
  declare duty: number;
  declare load: number;
  declare private phase: number;
  declare private k1: number;
  declare private k2: number;
  declare private err1: number[];
  declare private err2: number[];
  declare private impact: number;
  declare private rough: number;
  declare private impactAmp: number;
  declare private te: number;
  declare private teLp: number;
  declare private hpPrevIn: number;
  declare private hpPrevOut: number;
  declare private seed: number;
  declare private wobble: number;
  declare private wobbleTarget: number;
  declare private wobbleTimer: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.meshFrequency = 0;
    this.z1 = 20;
    this.z2 = 40;
    this.duty = 0.64;
    this.load = 0.5;
    this.phase = 0;
    this.k1 = 0;
    this.k2 = 0;
    this.err1 = [];
    this.err2 = [];
    this.impact = 0;
    this.rough = 0;
    this.impactAmp = 0;
    this.te = 0;
    this.teLp = 0;
    this.hpPrevIn = 0;
    this.hpPrevOut = 0;
    this.seed = 12345;
    this.wobble = 0;
    this.wobbleTarget = 0;
    this.wobbleTimer = 0;
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
    if (f <= 0) {
      this.impact *= 0.99;
      this.rough *= 0.99;
      return 0;
    }
    // Real drives never turn perfectly steadily: slow random speed drift of about ±0.15 %.
    if (--this.wobbleTimer <= 0) {
      this.wobbleTimer = Math.round(this.sampleRate * 0.25);
      this.wobbleTarget = (this.rand() * 2 - 1) * 0.0015;
    }
    this.wobble += (this.wobbleTarget - this.wobble) * (4 / this.sampleRate);
    this.phase += (f * (1 + this.wobble)) / this.sampleRate;
    if (this.phase >= 1) {
      this.phase -= 1;
      // A new tooth pair enters contact.
      this.k1 = (this.k1 + 1) % this.z1;
      this.k2 = (this.k2 + 1) % this.z2;
      const err = this.err1[this.k1] + this.err2[this.k2];
      this.impactAmp = (0.55 + 0.45 * this.load) * (1 + 1.6 * err);
      this.impact = 1;
      this.rough = 1;
    }
    // 1) Transmission error: lower while two pairs share the load (stiffer), higher with one pair.
    //    Profile errors of the tooth currently in mesh shift the level slightly.
    const single = this.phase >= this.duty;
    const target = (single ? 1 : -1) * (0.6 + 0.4 * this.load) + 0.5 * (this.err1[this.k1] + this.err2[this.k2]);
    // Tip relief makes the stiffness change gradual: rounded corners (~1/5 of a mesh period).
    const a = 1 - Math.exp((-2 * Math.PI * Math.min(f * 5, 6000)) / this.sampleRate);
    this.teLp += a * (target - this.teLp);
    // DC blocker (high-pass ~20 Hz).
    const hp = this.teLp - this.hpPrevIn + 0.997 * this.hpPrevOut;
    this.hpPrevIn = this.teLp;
    this.hpPrevOut = hp;
    this.te = hp;
    // 2) Engagement impact: a short, deterministic hit (τ ≈ 0.12 ms) whose strength depends on the
    //    errors of the two teeth that meet, plus a little surface roughness noise (τ ≈ 0.4 ms).
    //    The hit is broadband and rings the steel resonances downstream.
    this.impact *= Math.exp(-1 / (0.00012 * this.sampleRate));
    this.rough *= Math.exp(-1 / (0.0004 * this.sampleRate));
    const hit = this.impact * this.impactAmp;
    const noise = this.rough * this.impactAmp * 0.22 * (this.rand() * 2 - 1);
    return 0.55 * this.te + 1.4 * hit + noise;
  }
}
