import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import mapPlaneFrag from '../../shaders/mapPlane.frag?raw';
import mapPlaneVert from '../../shaders/mapPlane.vert?raw';
import { animationState, sharedUniforms } from '../../state/animationState';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import { skirtBottomElevation } from '../../terrain/mapLevel';

/**
 * The horizontal "map plane" carrying the orienteering map. It covers exactly
 * the terrain footprint (same x/y coordinates), only its elevation differs.
 */
export function MapPlane({ terrain }: { terrain: TerrainAssets }) {
  const { transform, data } = terrain;
  const groupRef = useRef<THREE.Group>(null);
  const guidesRef = useRef<THREE.LineSegments>(null);

  const texture = useMemo(() => {
    const tex =
      terrain.mapImage instanceof HTMLCanvasElement
        ? new THREE.CanvasTexture(terrain.mapImage)
        : new THREE.Texture(terrain.mapImage);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [terrain.mapImage]);

  // Terrain surface height (world Y) as a texture with the same UV layout as
  // the map, so the plane knows where it has cut through the terrain.
  const heightTexture = useMemo(() => {
    const n = data.elevation.resolution;
    const values = new Uint16Array(n * n);
    for (let i = 0; i < n * n; i++) {
      values[i] = THREE.DataUtils.toHalfFloat(transform.toWorldY(data.elevation.data[i]));
    }
    const tex = new THREE.DataTexture(values, n, n, THREE.RedFormat, THREE.HalfFloatType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [data, transform]);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(transform.worldWidth, transform.worldDepth, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [transform]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: mapPlaneVert,
        fragmentShader: mapPlaneFrag,
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: texture },
          uHeight: { value: heightTexture },
          uPlaneY: sharedUniforms.uPlaneY,
          uUncutOpacity: { value: 1 },
          uTransition: sharedUniforms.uTransition,
          uIntersection: sharedUniforms.uIntersection,
          uCutColor: { value: new THREE.Color('#ff8a1f') },
        },
      }),
    [texture, heightTexture],
  );

  // Vertical guide lines from the plane's corners down to the terrain block.
  const guides = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3));
    return g;
  }, []);
  const guideMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }),
    [],
  );

  useEffect(
    () => () => {
      texture.dispose();
      heightTexture.dispose();
      geometry.dispose();
      material.dispose();
      guides.dispose();
      guideMaterial.dispose();
    },
    [texture, heightTexture, geometry, material, guides, guideMaterial],
  );

  const bottomY = transform.toWorldY(skirtBottomElevation(data.config));
  const hx = transform.worldWidth / 2;
  const hz = transform.worldDepth / 2;

  useFrame(() => {
    const y = animationState.planeWorldY;
    if (groupRef.current) groupRef.current.position.y = y;
    material.uniforms.uUncutOpacity.value = animationState.planeOpacity;

    const pos = guides.getAttribute('position') as THREE.BufferAttribute;
    const corners: Array<[number, number]> = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
    const top = Math.max(y, bottomY);
    corners.forEach(([x, z], i) => {
      pos.setXYZ(i * 2, x, top, z);
      pos.setXYZ(i * 2 + 1, x, bottomY, z);
    });
    pos.needsUpdate = true;
    guideMaterial.opacity = 0.4 * (1 - animationState.transition);
    if (guidesRef.current) guidesRef.current.visible = guideMaterial.opacity > 0.01;
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh geometry={geometry} material={material} renderOrder={2} />
      </group>
      <lineSegments ref={guidesRef} geometry={guides} material={guideMaterial} frustumCulled={false} />
    </>
  );
}
