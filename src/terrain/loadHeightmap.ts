import { createGrid } from './grid';
import type { Grid, TerrainConfig } from './types';

/**
 * Load a grayscale heightmap image (e.g. exported from a DEM) into an
 * elevation grid. Black = minElevation, white = maxElevation.
 * Image row 0 is north, grid row 0 is south – we flip while reading.
 */
export async function loadHeightmap(url: string, config: TerrainConfig, resolution = 513): Promise<Grid> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas not supported');
  ctx.drawImage(img, 0, 0, resolution, resolution);
  const pixels = ctx.getImageData(0, 0, resolution, resolution).data;
  const grid = createGrid(resolution);
  const range = config.maxElevation - config.minElevation;
  for (let row = 0; row < resolution; row++) {
    const imgRow = resolution - 1 - row;
    for (let col = 0; col < resolution; col++) {
      const p = (imgRow * resolution + col) * 4;
      const v = (pixels[p] + pixels[p + 1] + pixels[p + 2]) / (3 * 255);
      grid.data[row * resolution + col] = config.minElevation + v * range;
    }
  }
  return grid;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${url}`));
    img.src = url;
  });
}
