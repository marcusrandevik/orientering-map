import { sampleGrid } from './grid';
import type { TerrainData, VegetationClass } from './types';

export const VEGETATION_CLASSES: VegetationClass[] = [
  'lake',
  'marsh',
  'open',
  'roughOpen',
  'forest',
  'slowForest',
  'denseForest',
];

/** Numeric vegetation codes (index into VEGETATION_CLASSES). */
export const Veg = {
  Lake: 0,
  Marsh: 1,
  Open: 2,
  RoughOpen: 3,
  Forest: 4,
  SlowForest: 5,
  DenseForest: 6,
} as const;
export type Veg = (typeof Veg)[keyof typeof Veg];

/**
 * Classify the terrain at (x, y) metres. This single function drives the 3D
 * ground colouring, tree placement AND the orienteering map, which is what
 * keeps them consistent.
 */
export function classifyVegetation(t: TerrainData, x: number, y: number): Veg {
  const c = t.config;
  const e = sampleGrid(t.elevation, c, x, y);
  // Lake = below water level AND part of the flooded basin. Using the
  // elevation here (not only the binary mask) gives a smooth shoreline that
  // matches the 3D water surface exactly.
  if (e < t.waterLevel && sampleGrid(t.lake, c, x, y) > 0.01) return Veg.Lake;
  const d = sampleGrid(t.density, c, x, y);
  if (e < t.waterLevel + 1.6 && d > 0.42) return Veg.Marsh;
  const o = sampleGrid(t.openness, c, x, y);
  if (o > 0.76) return Veg.Open;
  if (o > 0.67) return Veg.RoughOpen;
  if (d > 0.74) return Veg.DenseForest;
  if (d > 0.63) return Veg.SlowForest;
  return Veg.Forest;
}

/** Rasterise the vegetation classes (row 0 = north, like an image). */
export function rasterizeVegetation(t: TerrainData, size: number): Uint8Array {
  const out = new Uint8Array(size * size);
  const { width, height } = t.config;
  for (let py = 0; py < size; py++) {
    const y = (1 - (py + 0.5) / size) * height;
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * width;
      out[py * size + px] = classifyVegetation(t, x, y);
    }
  }
  return out;
}
