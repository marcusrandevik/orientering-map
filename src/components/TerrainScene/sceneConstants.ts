import * as THREE from 'three';

/** Direction towards the sun (north-west, like classic hill shading). */
export const LIGHT_DIRECTION = new THREE.Vector3(-0.55, 0.75, -0.38).normalize();

/** Vertical field of view of the scene camera in degrees. */
export const CAMERA_FOV = 40;
