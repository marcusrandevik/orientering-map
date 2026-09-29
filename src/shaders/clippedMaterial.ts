import * as THREE from 'three';
import { mapClipPlane } from '../state/animationState';

/**
 * MeshStandardMaterial for objects standing on the terrain (trees, boulders,
 * buildings, flags). It is clipped by the map plane exactly like the terrain
 * shader, so whatever the plane has passed through disappears into the map.
 */
export function createClippedMaterial(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ ...params, clippingPlanes: [mapClipPlane], clipShadows: true });
}
