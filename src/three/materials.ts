import * as THREE from 'three';

/**
 * Material factory handed to part builders. Every call returns a new material instance,
 * so highlighting/dimming one part never affects another.
 */
export interface MaterialKit {
  /** Turned / ground steel (shafts). */
  steel(): THREE.Material;
  /** Darker, less polished steel (keys). */
  darkSteel(): THREE.Material;
  /** Polished bearing steel (rings). */
  bearingSteel(): THREE.Material;
  /** Mirror-like chrome (balls). */
  chrome(): THREE.Material;
  /** Painted or coated part. */
  paint(color: string, metalness?: number, roughness?: number): THREE.Material;
  /** Semi-transparent housing / base plate. */
  translucent(color: string, opacity: number): THREE.Material;
}

export function createMaterialKit(): MaterialKit {
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial(p);
  return {
    steel: () => std({ color: '#b9bec4', metalness: 0.9, roughness: 0.32 }),
    darkSteel: () => std({ color: '#6f757c', metalness: 0.85, roughness: 0.45 }),
    bearingSteel: () => std({ color: '#d2d6da', metalness: 0.95, roughness: 0.18 }),
    chrome: () => std({ color: '#f1f3f5', metalness: 1, roughness: 0.08 }),
    paint: (color, metalness = 0.35, roughness = 0.42) => std({ color, metalness, roughness }),
    translucent: (color, opacity) =>
      std({
        color,
        metalness: 0.1,
        roughness: 0.6,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
  };
}

/** A kit that returns one shared material: used for ghost previews in the assembly game. */
export function createGhostKit(material: THREE.Material): MaterialKit {
  const m = (): THREE.Material => material;
  return { steel: m, darkSteel: m, bearingSteel: m, chrome: m, paint: m, translucent: m };
}
