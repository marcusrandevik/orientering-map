import type { TerrainConfig } from './types';

/** Size of the longest terrain side in 3D world units. */
export const WORLD_SIZE = 20;

/**
 * Maps terrain coordinates (metres) to Three.js world space.
 *
 *   world X =  east
 *   world Y =  up   (0 at config.minElevation, exaggerated)
 *   world Z = -north
 *
 * All 3D objects, the map plane and the map texture use this single
 * transform, which guarantees that the map is geometrically aligned with the
 * terrain.
 */
export interface WorldTransform {
  /** Metres → world units (horizontal). */
  scale: number;
  /** Metres → world units (vertical, includes exaggeration). */
  verticalScale: number;
  worldWidth: number;
  worldDepth: number;
  toWorldX(x: number): number;
  toWorldZ(y: number): number;
  toWorldY(elevation: number): number;
  fromWorldY(worldY: number): number;
}

export function createWorldTransform(config: TerrainConfig): WorldTransform {
  const scale = WORLD_SIZE / Math.max(config.width, config.height);
  const verticalScale = scale * config.verticalExaggeration;
  return {
    scale,
    verticalScale,
    worldWidth: config.width * scale,
    worldDepth: config.height * scale,
    toWorldX: (x) => (x - config.width / 2) * scale,
    toWorldZ: (y) => -(y - config.height / 2) * scale,
    toWorldY: (e) => (e - config.minElevation) * verticalScale,
    fromWorldY: (wy) => wy / verticalScale + config.minElevation,
  };
}
