import { useFrame } from '@react-three/fiber';
import { animationState, mapClipPlane, sharedUniforms } from '../../state/animationState';
import { useTerrainStore } from '../../state/useTerrainStore';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import {
  mapElevationForLevel,
  mapOpacityForElevation,
  transitionForLevel,
} from '../../terrain/mapLevel';

/** Seconds-based damping – higher is snappier. */
const LEVEL_DAMPING = 9;

/**
 * Runs first every frame: advances playback, eases the displayed level
 * towards the slider target and pushes the derived values (plane elevation,
 * clipping, opacity) to shared uniforms. Renders nothing.
 */
export function SceneDriver({ terrain }: { terrain: TerrainAssets }) {
  const { config } = terrain.data;

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const store = useTerrainStore.getState();

    if (store.isPlaying) {
      const next = store.mapLevel + (store.playDirection * delta) / store.playDuration;
      if (next >= 1 || next <= 0) {
        store.setMapLevel(next);
        // Stop at the end and reverse the direction for the next press.
        useTerrainStore.setState({ isPlaying: false, playDirection: next >= 1 ? -1 : 1 });
      } else {
        store.setMapLevel(next);
      }
    }

    const target = useTerrainStore.getState().mapLevel;
    const k = 1 - Math.exp(-LEVEL_DAMPING * delta);
    let level = animationState.level + (target - animationState.level) * k;
    if (Math.abs(target - level) < 1e-5) level = target;

    const elevation = mapElevationForLevel(level, config);
    const worldY = terrain.transform.toWorldY(elevation);

    animationState.level = level;
    animationState.planeElevation = elevation;
    animationState.planeWorldY = worldY;
    animationState.planeOpacity = mapOpacityForElevation(elevation, config);
    animationState.transition = transitionForLevel(level);

    sharedUniforms.uPlaneY.value = worldY;
    sharedUniforms.uTransition.value = animationState.transition;
    mapClipPlane.constant = worldY;
  }, -2);

  return null;
}
