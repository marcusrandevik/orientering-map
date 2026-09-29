import * as THREE from 'three';

/**
 * Per-frame animated values. These change every frame, so they live in a
 * plain mutable object instead of React/Zustand state to avoid re-renders.
 * Written by <SceneDriver/>, read by scene components and the HUD.
 */
export const animationState = {
  /** Smoothed mapLevel (eases towards the store's target value). */
  level: 0,
  /** Current map plane elevation in metres. */
  planeElevation: 0,
  /** Current map plane height in world units. */
  planeWorldY: 0,
  /** Map plane opacity where the terrain is still below the plane. */
  planeOpacity: 1,
  /** smoothstep(mapLevel). */
  transition: 0,
};

/**
 * Uniforms shared by all custom shaders, so updating them once per frame
 * updates the whole scene.
 */
export const sharedUniforms = {
  uPlaneY: { value: 0 },
  uTransition: { value: 0 },
  /** 0 … 1 strength of the highlighted cut line (terrain and plane). */
  uIntersection: { value: 0 },
};

/**
 * Clipping plane for built-in Three.js materials (trees, water, …).
 * Keeps everything with y <= planeY – what the plane has passed through is
 * "compressed" into the map. `constant` is set to planeY every frame.
 */
export const mapClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
