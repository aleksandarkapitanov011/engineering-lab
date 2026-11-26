import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { helicalBevel } from '../src/mechanisms/helical-bevel';
import { A1, BETA, DE3, DE4, DELTA3, DELTA4, D1, D2, MN, RE, BB, SHAFT1, SHAFT2, SHAFT3 } from '../src/mechanisms/helical-bevel/params';
import { solveSpeeds, transmissionRatio } from '../src/core/kinematics';
import { AssemblyEngine, validateSteps } from '../src/core/assembly';
import { createMaterialKit } from '../src/three/materials';
import { MechanismScene } from '../src/three/mechanismScene';
import { computeGearbox, DM3, equivalentLoad, P_BEV, P_HEL, SHAFTS } from '../src/mechanisms/helical-bevel/forces';

describe('helical-bevel gearbox: geometry', () => {
  it('the helix angle gives the round centre distance a = 70 mm', () => {
    expect((MN * (17 + 51)) / (2 * Math.cos(BETA))).toBeCloseTo(A1, 9);
    expect((D1 + D2) / 2).toBeCloseTo(A1, 9);
    expect((BETA * 180) / Math.PI).toBeGreaterThan(8);
    expect((BETA * 180) / Math.PI).toBeLessThan(20);
  });

  it('bevel cones: δ₃ + δ₄ = 90°, both pitch cones share the cone distance, b ≤ Rₑ/3', () => {
    expect(DELTA3 + DELTA4).toBeCloseTo(Math.PI / 2, 12);
    expect(DE3 / (2 * Math.sin(DELTA3))).toBeCloseTo(RE, 9);
    expect(DE4 / (2 * Math.sin(DELTA4))).toBeCloseTo(RE, 9);
    expect(BB).toBeLessThanOrEqual(RE / 3);
  });

  it('every bearing and gear has a way on: shaft diameters step down towards one end', () => {
    // Shaft 2: from bearing B (z 42) to the left end the diameters never grow.
    const fromB = SHAFT2.filter(([z0]) => z0 >= 42).map(([, , d]) => d);
    expect(fromB.every((d, i) => i === 0 || d <= fromB[i - 1])).toBe(true);
    // Shaft 3: from bearing A outwards the diameters never grow.
    const fromA = SHAFT3.filter(([z0]) => z0 >= 34).map(([, , d]) => d);
    expect(fromA.every((d, i) => i === 0 || d <= fromA[i - 1])).toBe(true);
    // Segments are contiguous.
    for (const s of [SHAFT1, SHAFT2, SHAFT3]) for (let i = 1; i < s.length; i++) expect(s[i][0]).toBe(s[i - 1][1]);
  });

  it('every part builds and the scene has a sensible size', () => {
    const kit = createMaterialKit();
    for (const p of helicalBevel.parts) expect(() => p.build({ materials: kit })).not.toThrow();
    const scene = new MechanismScene(helicalBevel);
    const r = scene.boundingSphere().radius;
    expect(r).toBeGreaterThan(80);
    expect(r).toBeLessThan(250);
  });

  it('gear teeth sit where the meshes are (helical mesh at z ≈ 52,5, bevel teeth near the apex)', () => {
    const scene = new MechanismScene(helicalBevel);
    scene.root.updateMatrixWorld(true);
    const box = (id: string): THREE.Box3 => new THREE.Box3().setFromObject(scene.parts.get(id)!.wrapper);
    const g2 = box('gear2');
    expect(g2.max.z).toBeGreaterThan(D2 / 2 - 1);
    const g4 = box('gear4');
    expect(g4.min.z).toBeGreaterThan(10);
    expect(g4.max.x).toBeGreaterThan(DE4 / 2 - 2);
  });
});

describe('helical-bevel gearbox: kinematics', () => {
  it('total ratio i = 3·2 = 6', () => {
    expect(transmissionRatio(helicalBevel.kinematics)).toBeCloseTo(6, 12);
  });

  it('the helical stage reverses the direction, the bevel stage turns the axis', () => {
    const s = solveSpeeds(helicalBevel.kinematics, 1500);
    expect(s.get('s2')).toBeCloseTo(-500, 9);
    expect(s.get('s3')).toBeCloseTo(250, 9);
    const ax = Object.fromEntries(helicalBevel.kinematics.bodies.map((b) => [b.id, b.axis]));
    const dot = ax.s2[0] * ax.s3[0] + ax.s2[1] * ax.s3[1] + ax.s2[2] * ax.s3[2];
    expect(dot).toBeCloseTo(0, 12);
  });
});

describe('helical-bevel gearbox: assembly game', () => {
  const steps = helicalBevel.assembly.steps;

  it('step data is valid and every part except the housing is a step', () => {
    expect(validateSteps(steps, ['housing'])).toEqual([]);
    const ids = new Set(steps.map((s) => s.partId));
    for (const p of helicalBevel.parts) if (!p.fixed) expect(ids.has(p.id)).toBe(true);
  });

  it('bearing B of shaft 2 must go on before the large gear; bearing B of shaft 3 after bearing A', () => {
    const e = new AssemblyEngine(steps, ['housing']);
    e.tryInstall('shaft2');
    expect(e.tryInstall('gear2').ok).toBe(false);
    e.tryInstall('shaft3');
    expect(e.tryInstall('brg3B').ok).toBe(false);
  });

  it('a valid order assembles everything, its reverse takes it apart, both without mistakes', () => {
    const order = ['shaft1', 'brg1A', 'brg1B', 'shaft2', 'brg2B', 'key2', 'gear2', 'brg2A', 'shaft3', 'key3', 'gear4', 'brg3A', 'brg3B'];
    const a = new AssemblyEngine(steps, ['housing']);
    for (const id of order) expect(a.tryInstall(id).ok).toBe(true);
    expect(a.isComplete()).toBe(true);
    const d = new AssemblyEngine(steps, ['housing'], 'disassemble');
    for (const id of [...order].reverse()) expect(d.tryRemove(id).ok).toBe(true);
    expect(d.mistakes + a.mistakes).toBe(0);
  });
});

describe('helical-bevel gearbox: forces and strength', () => {
  const base = { P: 0.37, n1: 500, KA: 1.25 };

  it('stage forces follow the textbook relations', () => {
    const r = computeGearbox(base);
    expect(r.hel.Ft).toBeCloseTo((2 * r.M1) / D1, 9);
    expect(r.hel.Fa).toBeCloseTo(r.hel.Ft * Math.tan(BETA), 9);
    expect(r.bev.Ft).toBeCloseTo((2 * r.M2) / DM3, 9);
    const ta = Math.tan((20 * Math.PI) / 180);
    expect(r.bev.Fr3).toBeCloseTo(r.bev.Ft * ta * Math.cos(DELTA3), 9);
    expect(r.bev.Fa3).toBeCloseTo(r.bev.Ft * ta * Math.sin(DELTA3), 9);
    // The force vectors have the right size and point the right way.
    const mag = (v: number[]): number => Math.hypot(...v);
    expect(mag(r.hel.parts.a)).toBeCloseTo(r.hel.Fa, 9);
    expect(mag(r.bev.parts.r)).toBeCloseTo(r.bev.Fr3, 9);
    expect(r.bev.parts.a[0]).toBeLessThan(0); // bevel pinion pushed away from the apex (−X)
    expect(r.hel.parts.a[0]).toBeLessThan(0); // helical pinion pushed to −X, so gear z₂ to +X
  });

  it('the pinion resists the motion: its tangential force opposes the flank velocity from the kinematics', () => {
    const r = computeGearbox(base);
    const speeds = solveSpeeds(helicalBevel.kinematics, base.n1);
    const vel = (body: string, p: number[]): number[] => {
      const b = helicalBevel.kinematics.bodies.find((x) => x.id === body)!;
      const w = b.axis.map((a) => a * speeds.get(body)!);
      const d = [p[0] - b.origin[0], p[1] - b.origin[1], p[2] - b.origin[2]];
      return [w[1] * d[2] - w[2] * d[1], w[2] * d[0] - w[0] * d[2], w[0] * d[1] - w[1] * d[0]];
    };
    const dot = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    // Both members of a pair move together at the pitch point.
    const v1 = vel('s1', P_HEL);
    const v2 = vel('s2', P_HEL);
    for (let i = 0; i < 3; i++) expect(v1[i]).toBeCloseTo(v2[i], 6);
    const v3 = vel('s2', P_BEV);
    const v4 = vel('s3', P_BEV);
    for (let i = 0; i < 3; i++) expect(v3[i]).toBeCloseTo(v4[i], 6);
    expect(dot(r.hel.parts.t, v1)).toBeLessThan(0);
    expect(dot(r.bev.parts.t, v3)).toBeLessThan(0);
  });

  it('every shaft is in equilibrium: loads + reactions sum to zero', () => {
    const r = computeGearbox(base);
    const loads: Record<string, [number[], number[]][]> = {
      s1: [[P_HEL, r.hel.onPinion]],
      s2: [
        [P_HEL, r.hel.onPinion.map((x) => -x)],
        [P_BEV, r.bev.onPinion],
      ],
      s3: [[P_BEV, r.bev.onPinion.map((x) => -x)]],
    };
    for (const sh of SHAFTS) {
      const res = r.shafts[sh.id];
      const F = [0, 0, 0];
      for (const [, f] of loads[sh.id]) for (let i = 0; i < 3; i++) F[i] += f[i];
      for (let i = 0; i < 3; i++) F[i] += res.A.R[i] + res.B.R[i] + sh.u[i] * res.axial;
      for (const c of F) expect(Math.abs(c)).toBeLessThan(1e-6);
    }
  });

  it('on shaft 2 the helical and bevel axial forces act against each other', () => {
    const r = computeGearbox(base);
    expect(Math.abs(r.shafts.s2.axial)).toBeCloseTo(Math.abs(r.bev.Fa3 - r.hel.Fa), 6);
  });

  it('bearing equivalent load follows ISO 281 for deep groove ball bearings', () => {
    expect(equivalentLoad(1000, 0, 5000)).toBe(1000);
    expect(equivalentLoad(1000, 100, 5000)).toBe(1000); // Fa/Fr = 0.1 < e
    const P = equivalentLoad(500, 500, 5000); // Fa/C0 = 0.1 → e ≈ 0.29, Y ≈ 1.49
    expect(P).toBeGreaterThan(0.56 * 500 + 1.45 * 500);
    expect(P).toBeLessThan(0.56 * 500 + 1.55 * 500);
  });

  it('the default load passes everything; 1.5 kW at 1500 rpm overloads the bevel stage', () => {
    const ok = helicalBevel.forces!.evaluate({ P: 0.37, KA: 1.25 }, 500);
    expect(ok.checks.every((c) => c.safety >= c.required)).toBe(true);
    expect(ok.warnings.some((w) => w.level === 'ok')).toBe(true);
    const over = helicalBevel.forces!.evaluate({ P: 1.5, KA: 1.25 }, 1500);
    expect(over.checks.some((c) => c.safety < c.required)).toBe(true);
    expect(over.arrows.length).toBeGreaterThan(12);
    expect(helicalBevel.forces!.evaluate({ P: 1, KA: 1 }, 0).checks).toEqual([]);
  });
});
