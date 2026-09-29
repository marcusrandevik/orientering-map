import { clamp, lerp, smoothstep } from './grid';
import type { TerrainConfig } from './types';

/**
 * Configurable relationship between the normalised slider value
 * (mapLevel 0 … 1) and the map plane elevation.
 *
 *   0 = map plane high above the terrain (full 3D)
 *   1 = map plane below the entire terrain (pure 2D map)
 */
export interface MapLevelConfig {
  /** How far above maxElevation the plane starts, as a fraction of the elevation range. */
  topOffset: number;
  /** How far below minElevation the plane ends, as a fraction of the elevation range. */
  bottomOffset: number;
  /** Depth of the terrain block's side walls below minElevation (fraction of range). */
  skirtOffset: number;
  /** Easing applied to mapLevel before computing the elevation. */
  easing: (t: number) => number;
  /** Map plane opacity while it hovers above the terrain. */
  hoverOpacity: number;
  /** Opacity of the not-yet-compressed part of the plane once it is inside the terrain. */
  insideOpacity: number;
}

export const DEFAULT_MAP_LEVEL_CONFIG: MapLevelConfig = {
  topOffset: 0.5,
  bottomOffset: 0.14,
  skirtOffset: 0.1,
  easing: (t) => smoothstep(0, 1, t),
  hoverOpacity: 0.62,
  insideOpacity: 0.3,
};

export function elevationRange(config: TerrainConfig): number {
  return config.maxElevation - config.minElevation;
}

export function mapPlaneTopElevation(config: TerrainConfig, m = DEFAULT_MAP_LEVEL_CONFIG): number {
  return config.maxElevation + m.topOffset * elevationRange(config);
}

export function mapPlaneBottomElevation(config: TerrainConfig, m = DEFAULT_MAP_LEVEL_CONFIG): number {
  return config.minElevation - m.bottomOffset * elevationRange(config);
}

export function skirtBottomElevation(config: TerrainConfig, m = DEFAULT_MAP_LEVEL_CONFIG): number {
  return config.minElevation - m.skirtOffset * elevationRange(config);
}

/** mapHeight = top − eased(mapLevel) · (top − bottom). */
export function mapElevationForLevel(level: number, config: TerrainConfig, m = DEFAULT_MAP_LEVEL_CONFIG): number {
  return lerp(mapPlaneTopElevation(config, m), mapPlaneBottomElevation(config, m), m.easing(clamp(level, 0, 1)));
}

/**
 * Opacity of the map plane where the terrain is still below it (where the
 * plane has cut the terrain it is always opaque). Clearly visible while
 * hovering, more see-through once inside the terrain so the remaining 3D
 * landscape underneath stays readable.
 */
export function mapOpacityForElevation(elevation: number, config: TerrainConfig, m = DEFAULT_MAP_LEVEL_CONFIG): number {
  const top = mapPlaneTopElevation(config, m);
  const t = clamp((elevation - config.maxElevation) / (top - config.maxElevation), 0, 1);
  return lerp(m.insideOpacity, m.hoverOpacity, smoothstep(0, 1, t));
}

/** How far the camera should have travelled towards the top-down view. */
export function cameraBlendForLevel(level: number): number {
  return smoothstep(0.3, 1, level);
}

/** 0 → 1 "how much of the terrain is already map" (for colour/contour blending). */
export function transitionForLevel(level: number): number {
  return smoothstep(0, 1, level);
}
