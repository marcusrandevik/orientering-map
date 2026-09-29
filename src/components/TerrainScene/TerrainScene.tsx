import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import { mapPlaneBottomElevation } from '../../terrain/mapLevel';
import { MapPlane } from './MapPlane';
import { SceneDriver } from './SceneDriver';
import { CAMERA_FOV, LIGHT_DIRECTION } from './sceneConstants';
import { TerrainControls } from './TerrainControls';
import { TerrainFeatures } from './TerrainFeatures';
import { TerrainMesh } from './TerrainMesh';

/** Soft radial shadow under the terrain block. */
function GroundShadow({ terrain }: { terrain: TerrainAssets }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  const y = terrain.transform.toWorldY(mapPlaneBottomElevation(terrain.data.config)) - 0.05;
  const s = terrain.transform.worldWidth * 1.9;
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} renderOrder={-1}>
      <planeGeometry args={[s, s]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export function TerrainScene({ terrain }: { terrain: TerrainAssets }) {
  const light = LIGHT_DIRECTION.clone().multiplyScalar(30);
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 400, position: [-16, 18, 22] }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <SceneDriver terrain={terrain} />
      <hemisphereLight args={['#cfe3ff', '#3b3226', 1.1]} />
      <directionalLight position={light} intensity={2.1} color="#fff4e2" />
      <GroundShadow terrain={terrain} />
      <TerrainMesh terrain={terrain} />
      <TerrainFeatures terrain={terrain} />
      <MapPlane terrain={terrain} />
      <TerrainControls terrain={terrain} />
    </Canvas>
  );
}
