import type { Grid, TerrainConfig } from './types';

export interface ContourLevel {
  elevation: number;
  isIndex: boolean;
  /** Flat list of segments [x1, y1, x2, y2, …] in terrain metres. */
  segments: Float32Array;
}

/**
 * Marching squares for a single iso level. Returns line segments in terrain
 * coordinates (metres), so the result lines up exactly with the 3D terrain.
 */
export function isolineSegments(config: TerrainConfig, grid: Grid, level: number): Float32Array {
  const n = grid.resolution;
  const d = grid.data;
  const dx = config.width / (n - 1);
  const dy = config.height / (n - 1);
  const out: number[] = [];
  const L = level;

  for (let row = 0; row < n - 1; row++) {
    for (let col = 0; col < n - 1; col++) {
      const a = d[row * n + col]; // south-west
      const b = d[row * n + col + 1]; // south-east
      const c = d[(row + 1) * n + col + 1]; // north-east
      const e = d[(row + 1) * n + col]; // north-west
      let idx = 0;
      if (a >= L) idx |= 1;
      if (b >= L) idx |= 2;
      if (c >= L) idx |= 4;
      if (e >= L) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const x0 = col * dx;
      const y0 = row * dy;
      const t = (p: number, q: number) => (p === q ? 0.5 : (L - p) / (q - p));
      const Sx = x0 + t(a, b) * dx, Sy = y0;
      const Ex = x0 + dx, Ey = y0 + t(b, c) * dy;
      const Nx = x0 + t(e, c) * dx, Ny = y0 + dy;
      const Wx = x0, Wy = y0 + t(a, e) * dy;
      const WS = () => out.push(Wx, Wy, Sx, Sy);
      const SE = () => out.push(Sx, Sy, Ex, Ey);
      const WE = () => out.push(Wx, Wy, Ex, Ey);
      const EN = () => out.push(Ex, Ey, Nx, Ny);
      const SN = () => out.push(Sx, Sy, Nx, Ny);
      const WN = () => out.push(Wx, Wy, Nx, Ny);

      switch (idx) {
        case 1: case 14: WS(); break;
        case 2: case 13: SE(); break;
        case 3: case 12: WE(); break;
        case 4: case 11: EN(); break;
        case 6: case 9: SN(); break;
        case 7: case 8: WN(); break;
        case 5:
          if ((a + b + c + e) / 4 >= L) { WN(); SE(); } else { WS(); EN(); }
          break;
        case 10:
          if ((a + b + c + e) / 4 >= L) { WS(); EN(); } else { WN(); SE(); }
          break;
      }
    }
  }
  return new Float32Array(out);
}

/** Generate all contour levels (every config.contourInterval metres). */
export function generateContours(config: TerrainConfig, elevation: Grid): ContourLevel[] {
  const d = elevation.data;
  const interval = config.contourInterval;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < d.length; i++) {
    if (d[i] < min) min = d[i];
    if (d[i] > max) max = d[i];
  }
  const indexStep = interval * config.indexContourEvery;
  const levels: ContourLevel[] = [];
  for (let e = Math.ceil(min / interval) * interval; e <= max; e += interval) {
    const r = e / indexStep;
    levels.push({
      elevation: e,
      isIndex: Math.abs(r - Math.round(r)) < 1e-6,
      segments: isolineSegments(config, elevation, e),
    });
  }
  return levels;
}
