/**
 * Linear 2D finite element solver: plane stress, constant-strain triangles (CST).
 *
 *   K·u = f,  K = Σ t·A·Bᵀ·D·B      (sparse, assembled in CSR form)
 *   solved with Jacobi-preconditioned conjugate gradients;
 *   fixed degrees of freedom are handled by projection (u = 0 there).
 *
 * Units: mm, N, MPa.
 */

export interface Mesh2D {
  x: Float64Array;
  y: Float64Array;
  /** Node indices, 3 per triangle. */
  tri: Int32Array;
}

export interface Material2D {
  E: number;
  nu: number;
  /** Thickness (face width), mm. */
  t: number;
}

export interface FemResult {
  /** Displacements [ux0, uy0, ux1, uy1, …], mm. */
  u: Float64Array;
  sx: Float64Array;
  sy: Float64Array;
  txy: Float64Array;
  /** Von Mises stress per element, MPa. */
  vm: Float64Array;
  /** Area-weighted nodal average of the von Mises stress, MPa. */
  nodalVm: Float64Array;
  iterations: number;
  converged: boolean;
}

interface Csr {
  rowPtr: Int32Array;
  col: Int32Array;
  val: Float64Array;
}

function elementGeometry(mesh: Mesh2D, e: number): { a: number; b: number[]; c: number[]; n: number[] } {
  let n = [mesh.tri[3 * e], mesh.tri[3 * e + 1], mesh.tri[3 * e + 2]];
  let [x1, x2, x3] = n.map((i) => mesh.x[i]);
  let [y1, y2, y3] = n.map((i) => mesh.y[i]);
  let twoA = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  if (twoA < 0) {
    // Make the node order counter-clockwise.
    n = [n[0], n[2], n[1]];
    [x2, x3] = [x3, x2];
    [y2, y3] = [y3, y2];
    twoA = -twoA;
  }
  const b = [y2 - y3, y3 - y1, y1 - y2];
  const c = [x3 - x2, x1 - x3, x2 - x1];
  return { a: twoA / 2, b, c, n };
}

function dMatrix(m: Material2D): number[] {
  const k = m.E / (1 - m.nu * m.nu);
  return [k, k * m.nu, 0, k * m.nu, k, 0, 0, 0, (k * (1 - m.nu)) / 2];
}

/** B (3×6) for one element, scaled by 1/(2A). */
function bMatrix(b: number[], c: number[], a: number): number[] {
  const s = 1 / (2 * a);
  return [
    b[0] * s, 0, b[1] * s, 0, b[2] * s, 0,
    0, c[0] * s, 0, c[1] * s, 0, c[2] * s,
    c[0] * s, b[0] * s, c[1] * s, b[1] * s, c[2] * s, b[2] * s,
  ];
}

function assemble(mesh: Mesh2D, mat: Material2D): Csr {
  const nDof = mesh.x.length * 2;
  const rows: Map<number, number>[] = Array.from({ length: nDof }, () => new Map());
  const D = dMatrix(mat);
  const nEl = mesh.tri.length / 3;
  for (let e = 0; e < nEl; e++) {
    const { a, b, c, n } = elementGeometry(mesh, e);
    if (a <= 1e-12) continue;
    const B = bMatrix(b, c, a);
    // DB (3×6)
    const DB = new Array(18).fill(0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < 3; k++) DB[i * 6 + j] += D[i * 3 + k] * B[k * 6 + j];
    const dofs = [2 * n[0], 2 * n[0] + 1, 2 * n[1], 2 * n[1] + 1, 2 * n[2], 2 * n[2] + 1];
    for (let i = 0; i < 6; i++) {
      const row = rows[dofs[i]];
      for (let j = 0; j < 6; j++) {
        let kij = 0;
        for (let k = 0; k < 3; k++) kij += B[k * 6 + i] * DB[k * 6 + j];
        kij *= mat.t * a;
        row.set(dofs[j], (row.get(dofs[j]) ?? 0) + kij);
      }
    }
  }
  const rowPtr = new Int32Array(nDof + 1);
  let nnz = 0;
  for (let i = 0; i < nDof; i++) {
    rowPtr[i] = nnz;
    nnz += rows[i].size;
  }
  rowPtr[nDof] = nnz;
  const col = new Int32Array(nnz);
  const val = new Float64Array(nnz);
  for (let i = 0; i < nDof; i++) {
    let p = rowPtr[i];
    for (const [j, v] of rows[i]) {
      col[p] = j;
      val[p] = v;
      p++;
    }
  }
  return { rowPtr, col, val };
}

export function solvePlaneStress(mesh: Mesh2D, mat: Material2D, fixedDofs: Iterable<number>, load: Float64Array): FemResult {
  const nNode = mesh.x.length;
  const nDof = nNode * 2;
  const K = assemble(mesh, mat);
  const fixed = new Uint8Array(nDof);
  for (const d of fixedDofs) fixed[d] = 1;

  const mul = (p: Float64Array, out: Float64Array): void => {
    for (let i = 0; i < nDof; i++) {
      if (fixed[i]) {
        out[i] = 0;
        continue;
      }
      let s = 0;
      for (let k = K.rowPtr[i]; k < K.rowPtr[i + 1]; k++) {
        const j = K.col[k];
        if (!fixed[j]) s += K.val[k] * p[j];
      }
      out[i] = s;
    }
  };
  const diag = new Float64Array(nDof);
  for (let i = 0; i < nDof; i++) {
    for (let k = K.rowPtr[i]; k < K.rowPtr[i + 1]; k++) if (K.col[k] === i) diag[i] = K.val[k];
    if (!(diag[i] > 0)) diag[i] = 1;
  }

  // Preconditioned conjugate gradients.
  const u = new Float64Array(nDof);
  const r = new Float64Array(nDof);
  const z = new Float64Array(nDof);
  const p = new Float64Array(nDof);
  const q = new Float64Array(nDof);
  for (let i = 0; i < nDof; i++) r[i] = fixed[i] ? 0 : load[i];
  let rz = 0;
  let bNorm = 0;
  for (let i = 0; i < nDof; i++) {
    z[i] = r[i] / diag[i];
    p[i] = z[i];
    rz += r[i] * z[i];
    bNorm += r[i] * r[i];
  }
  bNorm = Math.sqrt(bNorm) || 1;
  let it = 0;
  let converged = false;
  const maxIt = Math.max(2000, nDof * 4);
  for (; it < maxIt; it++) {
    mul(p, q);
    let pq = 0;
    for (let i = 0; i < nDof; i++) pq += p[i] * q[i];
    if (pq === 0) break;
    const alpha = rz / pq;
    let rr = 0;
    for (let i = 0; i < nDof; i++) {
      u[i] += alpha * p[i];
      r[i] -= alpha * q[i];
      rr += r[i] * r[i];
    }
    if (Math.sqrt(rr) / bNorm < 1e-10) {
      converged = true;
      it++;
      break;
    }
    let rzNew = 0;
    for (let i = 0; i < nDof; i++) {
      z[i] = r[i] / diag[i];
      rzNew += r[i] * z[i];
    }
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = 0; i < nDof; i++) p[i] = z[i] + beta * p[i];
  }

  // Element stresses.
  const nEl = mesh.tri.length / 3;
  const D = dMatrix(mat);
  const sx = new Float64Array(nEl);
  const sy = new Float64Array(nEl);
  const txy = new Float64Array(nEl);
  const vm = new Float64Array(nEl);
  const nodalVm = new Float64Array(nNode);
  const weight = new Float64Array(nNode);
  for (let e = 0; e < nEl; e++) {
    const { a, b, c, n } = elementGeometry(mesh, e);
    if (a <= 1e-12) continue;
    const B = bMatrix(b, c, a);
    const ue = [u[2 * n[0]], u[2 * n[0] + 1], u[2 * n[1]], u[2 * n[1] + 1], u[2 * n[2]], u[2 * n[2] + 1]];
    const eps = [0, 0, 0];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) eps[i] += B[i * 6 + j] * ue[j];
    const s = [0, 0, 0];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) s[i] += D[i * 3 + k] * eps[k];
    sx[e] = s[0];
    sy[e] = s[1];
    txy[e] = s[2];
    vm[e] = Math.sqrt(s[0] * s[0] - s[0] * s[1] + s[1] * s[1] + 3 * s[2] * s[2]);
    for (const i of n) {
      nodalVm[i] += vm[e] * a;
      weight[i] += a;
    }
  }
  for (let i = 0; i < nNode; i++) if (weight[i] > 0) nodalVm[i] /= weight[i];
  return { u, sx, sy, txy, vm, nodalVm, iterations: it, converged };
}

/** Structured mesh of a rectangle [0, w] × [0, h] with nx × ny cells, two triangles per cell. */
export function rectangleMesh(w: number, h: number, nx: number, ny: number): Mesh2D {
  const x = new Float64Array((nx + 1) * (ny + 1));
  const y = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      x[j * (nx + 1) + i] = (w * i) / nx;
      y[j * (nx + 1) + i] = (h * j) / ny;
    }
  }
  const tri = new Int32Array(nx * ny * 6);
  let k = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const n0 = j * (nx + 1) + i;
      const n1 = n0 + 1;
      const n2 = n0 + nx + 1;
      const n3 = n2 + 1;
      if ((i + j) % 2 === 0) {
        tri.set([n0, n1, n3, n0, n3, n2], k);
      } else {
        tri.set([n0, n1, n2, n1, n3, n2], k);
      }
      k += 6;
    }
  }
  return { x, y, tri };
}
