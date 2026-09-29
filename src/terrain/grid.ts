import type { Grid, TerrainConfig } from './types';

export function createGrid(resolution: number): Grid {
  return { resolution, data: new Float32Array(resolution * resolution) };
}

/** Terrain coordinate (metres) of grid column/row. */
export function gridToTerrain(
  config: TerrainConfig,
  resolution: number,
  col: number,
  row: number,
): [number, number] {
  return [
    (col / (resolution - 1)) * config.width,
    (row / (resolution - 1)) * config.height,
  ];
}

/** Bilinear sample of a grid at terrain coordinate (x, y) in metres. */
export function sampleGrid(grid: Grid, config: TerrainConfig, x: number, y: number): number {
  const n = grid.resolution;
  const gx = clamp((x / config.width) * (n - 1), 0, n - 1);
  const gy = clamp((y / config.height) * (n - 1), 0, n - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, n - 1);
  const y1 = Math.min(y0 + 1, n - 1);
  const fx = gx - x0;
  const fy = gy - y0;
  const d = grid.data;
  const a = d[y0 * n + x0];
  const b = d[y0 * n + x1];
  const c = d[y1 * n + x0];
  const e = d[y1 * n + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
