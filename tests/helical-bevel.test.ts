import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { helicalBevel } from '../src/mechanisms/helical-bevel';
import { A1, BETA, DE3, DE4, DELTA3, DELTA4, D1, D2, MN, RE, BB, SHAFT1, SHAFT2, SHAFT3 } from '../src/mechanisms/helical-bevel/params';
import { solveSpeeds, transmissionRatio } from '../src/core/kinematics';
import { AssemblyEngine, validateSteps } from '../src/core/assembly';
import { createMaterialKit } from '../src/three/materials';
import { MechanismScene } from '../src/three/mechanismScene';

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
