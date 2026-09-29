import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { animationState } from '../../state/animationState';
import { useTerrainStore } from '../../state/useTerrainStore';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import { cameraBlendForLevel } from '../../terrain/mapLevel';
import { CAMERA_FOV } from './sceneConstants';

/** Default perspective pose. */
const DEFAULT_POLAR = 0.98;
const DEFAULT_AZIMUTH = -0.62;
/** Almost straight down (exactly 0 would make OrbitControls degenerate). */
const TOP_POLAR = 0.0008;
const FOV = CAMERA_FOV;

const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/**
 * Orbit controls + an optional "assistive" camera rig.
 *
 * By default the camera is fully user-controlled: moving the slider never
 * changes the viewing angle. When `autoCamera` is enabled in the settings the
 * rig acts while the map level changes:
 * moving towards 2D it moves the camera a proportional share of the
 * remaining way towards a north-up top-down pose; moving back to 3D it
 * returns towards the perspective pose. The user can orbit/pan/zoom at any
 * time, and the next slider change continues from wherever they left it.
 */
export function TerrainControls({ terrain }: { terrain: TerrainAssets }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const interacting = useRef(false);
  const prevBlend = useRef<number | null>(null);
  const tmp = useRef({ offset: new THREE.Vector3(), sph: new THREE.Spherical() });

  const { transform } = terrain;
  const midY = transform.toWorldY((terrain.data.config.minElevation + terrain.data.config.maxElevation) / 2) * 0.5;
  const defaultTarget = useRef(new THREE.Vector3(0, midY, 0));
  // Aim slightly south of the centre so the map sits between the header and
  // the slider panel in the top-down view.
  const topTarget = useRef(new THREE.Vector3(0, 0, transform.worldDepth * 0.045));

  /** Distance at which the whole terrain fits the viewport when seen from above. */
  const fitRadius = useCallback(() => {
    const aspect = size.width / Math.max(1, size.height);
    const halfV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Leave room for the header and the slider panel.
    const halfW = (transform.worldWidth / 2) * 1.08;
    const halfD = (transform.worldDepth / 2) * 1.32;
    return Math.max(halfD / halfV, halfW / (halfV * aspect));
  }, [size.width, size.height, transform]);

  // Portrait screens need to back off a bit more to show the oblique block.
  const perspectiveRadius = useCallback(
    () => fitRadius() * (size.width < size.height ? 1.2 : 1.02),
    [fitRadius, size.width, size.height],
  );
  const base = useRef({ polar: DEFAULT_POLAR, radius: 30 });

  const applyPose = useCallback(
    (blend: number) => {
      const c = controlsRef.current;
      if (!c) return;
      base.current = { polar: DEFAULT_POLAR, radius: perspectiveRadius() };
      const sph = new THREE.Spherical(
        THREE.MathUtils.lerp(base.current.radius, fitRadius(), blend),
        THREE.MathUtils.lerp(DEFAULT_POLAR, TOP_POLAR, blend),
        THREE.MathUtils.lerp(DEFAULT_AZIMUTH, 0, blend),
      );
      c.target.lerpVectors(defaultTarget.current, topTarget.current, blend);
      camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(sph));
      camera.lookAt(c.target);
      c.update();
      prevBlend.current = blend;
    },
    [camera, fitRadius, perspectiveRadius],
  );

  // Only reset on mount / explicit reset requests – not on every resize.
  const applyPoseRef = useRef(applyPose);
  applyPoseRef.current = applyPose;
  const resetToken = useTerrainStore((s) => s.cameraResetToken);
  useEffect(() => {
    const { autoCamera } = useTerrainStore.getState();
    applyPoseRef.current(autoCamera ? cameraBlendForLevel(animationState.level) : 0);
  }, [resetToken]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    const blend = cameraBlendForLevel(animationState.level);
    const prev = prevBlend.current;
    prevBlend.current = blend;
    if (prev === null || interacting.current || !useTerrainStore.getState().autoCamera) return;
    const d = blend - prev;
    if (Math.abs(d) < 1e-6) return;

    const { offset, sph } = tmp.current;
    offset.copy(camera.position).sub(c.target);
    sph.setFromVector3(offset);

    if (d > 0) {
      // Towards 2D: travel share f of the remaining way to the top-down pose.
      const f = prev >= 1 ? 1 : Math.min(1, d / (1 - prev));
      sph.phi += (TOP_POLAR - sph.phi) * f;
      sph.theta += shortestAngle(sph.theta, 0) * f;
      sph.radius += (fitRadius() - sph.radius) * f;
      c.target.lerp(topTarget.current, f);
    } else {
      // Towards 3D: travel back towards the perspective pose.
      const f = prev <= 0 ? 1 : Math.min(1, -d / prev);
      sph.phi += (base.current.polar - sph.phi) * f;
      sph.radius += (base.current.radius - sph.radius) * f;
      c.target.lerp(defaultTarget.current, f);
    }
    sph.makeSafe();
    offset.setFromSpherical(sph);
    camera.position.copy(c.target).add(offset);
    camera.lookAt(c.target);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={90}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2 - 0.08}
      screenSpacePanning
      onStart={() => {
        interacting.current = true;
      }}
      onEnd={() => {
        interacting.current = false;
        const c = controlsRef.current;
        // Remember the user's preferred perspective pose while in 3D.
        if (c && cameraBlendForLevel(animationState.level) < 0.02) {
          const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target));
          base.current = { polar: sph.phi, radius: sph.radius };
        }
      }}
    />
  );
}
