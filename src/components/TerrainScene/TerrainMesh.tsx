import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import terrainFrag from '../../shaders/terrain.frag?raw';
import terrainVert from '../../shaders/terrain.vert?raw';
import { animationState, sharedUniforms } from '../../state/animationState';
import { useTerrainStore } from '../../state/useTerrainStore';
import { createTerrainGeometry } from '../../terrain/generateTerrain';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import { LIGHT_DIRECTION } from './sceneConstants';

export function TerrainMesh({ terrain }: { terrain: TerrainAssets }) {
  const { data, transform } = terrain;
  const cfg = data.config;

  const geometry = useMemo(() => createTerrainGeometry(data, transform), [data, transform]);

  const groundTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(terrain.groundImage);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }, [terrain.groundImage]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
        side: THREE.DoubleSide,
        uniforms: {
          uGround: { value: groundTexture },
          uPlaneY: sharedUniforms.uPlaneY,
          uTransition: sharedUniforms.uTransition,
          uContourOpacity: { value: 0.3 },
          uContourInterval: { value: cfg.contourInterval },
          uMetresPerUnit: { value: 1 / transform.verticalScale },
          uMinElevation: { value: cfg.minElevation },
          uIndexEvery: { value: cfg.indexContourEvery },
          uIntersection: sharedUniforms.uIntersection,
          uElevationStyle: { value: 0 },
          uMaxY: { value: transform.toWorldY(cfg.maxElevation) },
          uLightDir: { value: LIGHT_DIRECTION.clone() },
          uContourColor: { value: new THREE.Color('#b8561a') },
          uCutColor: { value: new THREE.Color('#ff8a1f') },
        },
      }),
    [groundTexture, cfg, transform],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      groundTexture.dispose();
    },
    [geometry, material, groundTexture],
  );

  useFrame((_, delta) => {
    const s = useTerrainStore.getState();
    const u = material.uniforms;
    const k = 1 - Math.exp(-8 * Math.min(delta, 0.1));
    const t = animationState.transition;

    const contourTarget = s.showTerrainContours ? 0.28 + 0.62 * t : 0;
    u.uContourOpacity.value += (contourTarget - u.uContourOpacity.value) * k;

    const e = animationState.planeElevation;
    const inside = e <= cfg.maxElevation && e >= cfg.minElevation - 1 ? 1 : 0;
    const cutTarget = s.showIntersection ? inside : 0;
    sharedUniforms.uIntersection.value += (cutTarget - sharedUniforms.uIntersection.value) * k;

    const styleTarget = s.groundStyle === 'elevation' ? 1 : 0;
    u.uElevationStyle.value += (styleTarget - u.uElevationStyle.value) * k;
  });

  return <mesh geometry={geometry} material={material} />;
}
