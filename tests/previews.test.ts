import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../src/mechanisms';
import { catalogue, categories } from '../src/core/registry';
import { createMaterialKit } from '../src/three/materials';
import { mechanismPreview } from '../src/three/thumbs';
import type { Preview3D } from '../src/core/types';

describe('catalogue card pictures', () => {
  const list: [string, Preview3D | undefined][] = [
    ...categories().map((c) => [`cat:${c.id}`, c.preview] as [string, Preview3D | undefined]),
    ...catalogue().map((e) => [`${e.kind}:${e.id}`, e.kind === 'mechanism' ? mechanismPreview(e) : e.preview] as [string, Preview3D | undefined]),
  ];

  for (const [id, p] of list) {
    it(`${id} has a 3D model that builds into a sensible size`, () => {
      expect(p).toBeDefined();
      const obj = p!.build(createMaterialKit());
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()).length();
      expect(size).toBeGreaterThan(40);
      expect(size).toBeLessThan(600);
      expect(p!.dir.some((v) => v !== 0)).toBe(true);
    });
  }
});
