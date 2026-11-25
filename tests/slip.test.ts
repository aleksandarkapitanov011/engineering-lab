import { describe, expect, it } from 'vitest';
import { MechanismScene } from '../src/three/mechanismScene';
import { spurGear } from '../src/mechanisms/spur-gear';

describe('forgotten key in the running machine', () => {
  it('a frozen gear stands still while its shaft keeps turning', () => {
    const s = new MechanismScene(spurGear);
    const rot = (id: string): number => s.parts.get(id)!.content.rotation.z;
    s.advance(0.5, 600, 1);
    s.update(0);
    s.setFrozen(['pinion']);
    const pinion0 = rot('pinion');
    const shaft0 = rot('shaft1');
    s.advance(0.5, 600, 1);
    s.update(0);
    expect(rot('pinion')).toBeCloseTo(pinion0, 12);
    expect(Math.abs(rot('shaft1') - shaft0)).toBeGreaterThan(1);
    s.setFrozen([]);
    s.update(0);
    expect(rot('pinion')).toBeCloseTo(rot('shaft1'), 12);
  });
});
