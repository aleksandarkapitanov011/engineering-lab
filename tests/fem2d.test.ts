import { describe, expect, it } from 'vitest';
import { rectangleMesh, solvePlaneStress } from '../src/core/fem2d';

const steel = { E: 210000, nu: 0.3, t: 1 };

describe('2D plane-stress FEM (CST)', () => {
  it('patch test: uniform tension is reproduced exactly in every element', () => {
    const w = 10;
    const h = 2;
    const nx = 10;
    const ny = 4;
    const mesh = rectangleMesh(w, h, nx, ny);
    const fixed: number[] = [];
    const load = new Float64Array(mesh.x.length * 2);
    const sigma = 100;
    for (let j = 0; j <= ny; j++) {
      const left = j * (nx + 1);
      const right = left + nx;
      fixed.push(2 * left); // ux = 0 on the left edge
      // Consistent nodal forces on the right edge: σ·h·t, end nodes take half.
      const share = (sigma * h * steel.t) / ny;
      load[2 * right] = j === 0 || j === ny ? share / 2 : share;
    }
    fixed.push(1); // uy = 0 at the bottom-left node only (free lateral contraction)
    const r = solvePlaneStress(mesh, steel, fixed, load);
    expect(r.converged).toBe(true);
    for (let e = 0; e < r.vm.length; e++) {
      expect(r.sx[e]).toBeCloseTo(sigma, 6);
      expect(Math.abs(r.sy[e])).toBeLessThan(1e-6);
      expect(Math.abs(r.txy[e])).toBeLessThan(1e-6);
      expect(r.vm[e]).toBeCloseTo(sigma, 6);
    }
    // Elongation u = σ·L/E at the loaded edge.
    expect(r.u[2 * nx]).toBeCloseTo((sigma * w) / steel.E, 9);
  });

  it('cantilever beam: bending stress and tip deflection match beam theory', () => {
    const L = 100;
    const h = 10;
    const P = 100;
    const nx = 100;
    const ny = 10;
    const mesh = rectangleMesh(L, h, nx, ny);
    const fixed: number[] = [];
    const load = new Float64Array(mesh.x.length * 2);
    for (let j = 0; j <= ny; j++) {
      const left = j * (nx + 1);
      fixed.push(2 * left, 2 * left + 1);
      const right = left + nx;
      load[2 * right + 1] = (j === 0 || j === ny ? 0.5 : 1) * (-P / ny);
    }
    const r = solvePlaneStress(mesh, steel, fixed, load);
    expect(r.converged).toBe(true);
    const I = (steel.t * h ** 3) / 12;
    // Bending stress at mid-span, evaluated at the centroid height of the outermost elements.
    let best = 0;
    for (let e = 0; e < r.vm.length; e++) {
      const n = [mesh.tri[3 * e], mesh.tri[3 * e + 1], mesh.tri[3 * e + 2]];
      const cx = (mesh.x[n[0]] + mesh.x[n[1]] + mesh.x[n[2]]) / 3;
      const cy = (mesh.y[n[0]] + mesh.y[n[1]] + mesh.y[n[2]]) / 3;
      if (Math.abs(cx - L / 2) < 1 && cy > h - 1) {
        const expected = (P * (L - cx) * (cy - h / 2)) / I;
        best = Math.max(best, r.sx[e] / expected);
      }
    }
    expect(best).toBeGreaterThan(0.9);
    expect(best).toBeLessThan(1.1);
    // Tip deflection (Euler–Bernoulli, shear adds ~1 %): δ = P·L³ / (3·E·I).
    const delta = (P * L ** 3) / (3 * steel.E * I);
    const tip = -r.u[2 * (ny * (nx + 1) + nx) + 1];
    expect(tip / delta).toBeGreaterThan(0.9);
    expect(tip / delta).toBeLessThan(1.1);
  });
});
