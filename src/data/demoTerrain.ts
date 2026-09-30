import { createGrid, gridToTerrain, sampleGrid } from '../terrain/grid';
import { createNoise2D, fbm, mulberry32 } from '../terrain/noise';
import type {
  Boulder,
  Building,
  Control,
  Grid,
  MapFeatures,
  Point2,
  TerrainConfig,
  Tower,
  Trail,
  Wall,
} from '../terrain/types';

/**
 * Procedural demo terrain.
 *
 * Everything here is expressed in terrain metres (x east, y north) so the
 * same features can be used both for the 3D scene and the orienteering map.
 */

export const DEMO_ELEVATION_RESOLUTION = 513;

const LAKE_CENTER: Point2 = [650, 700];
const FARM_CENTER: Point2 = [1520, 360];
const MAIN_HILL: Point2 = [1350, 1250];

const gauss = (x: number, y: number, cx: number, cy: number, r: number) => {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
};

function distToSegment(px: number, py: number, a: Point2, b: Point2): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)));
  const dx = px - (a[0] + vx * t);
  const dy = py - (a[1] + vy * t);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Raw (un-normalised) demo elevation function in metres. */
function createElevationFunction(seed: number) {
  const n1 = createNoise2D(seed);
  const n2 = createNoise2D(seed + 101);
  const ridgeA: Point2 = [1350, 1250];
  const ridgeB: Point2 = [1780, 480];
  return (x: number, y: number) => {
    let h = 0;
    // A narrow eastern flank contrasts with the gentle west slope in the contours.
    const hillDx = (x - MAIN_HILL[0]) / (x > MAIN_HILL[0] ? 100 : 400);
    const hillDy = (y - MAIN_HILL[1]) / 400;
    h += 72 * Math.exp(-(hillDx * hillDx + hillDy * hillDy) / 2);
    h += 50 * gauss(x, y, 480, 1520, 290);
    h += 38 * gauss(x, y, 1720, 1760, 250);
    const rd = distToSegment(x, y, ridgeA, ridgeB);
    h += 34 * Math.exp(-(rd * rd) / (2 * 190 * 190));
    h -= 34 * gauss(x, y, LAKE_CENTER[0], LAKE_CENTER[1], 250);
    h += 10 * ((x + y) / 4000);
    const farmCalm = 1 - 0.75 * gauss(x, y, FARM_CENTER[0], FARM_CENTER[1], 220);
    h += farmCalm * 15 * fbm(n1, x / 520 + 3.1, y / 520 + 7.7, 5);
    h += farmCalm * 3.5 * fbm(n2, x / 110, y / 110, 3);
    return h;
  };
}

/** Generate the demo elevation grid, normalised to the config's elevation range. */
export function generateDemoElevation(config: TerrainConfig, resolution = DEMO_ELEVATION_RESOLUTION): Grid {
  const f = createElevationFunction(config.seed);
  const grid = createGrid(resolution);
  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const [x, y] = gridToTerrain(config, resolution, col, row);
      const h = f(x, y);
      grid.data[row * resolution + col] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  // Keep a little margin above the minimum so the lake bottom is not at 0.
  const lo = config.minElevation + 2;
  const hi = config.maxElevation;
  for (let i = 0; i < grid.data.length; i++) {
    grid.data[i] = lo + ((grid.data[i] - min) / (max - min)) * (hi - lo);
  }
  return grid;
}

/**
 * Find the lake by flooding the basin around LAKE_CENTER up to a water level
 * chosen so the lake has roughly the requested area.
 */
export function computeLake(
  config: TerrainConfig,
  elevation: Grid,
  center: Point2 = LAKE_CENTER,
  targetArea = Math.PI * 175 * 175,
): { lake: Grid; waterLevel: number } {
  const n = elevation.resolution;
  const cellArea = (config.width / (n - 1)) * (config.height / (n - 1));
  // Lowest cell near the basin centre.
  const searchR = 260;
  let seed = -1;
  let seedH = Infinity;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const [x, y] = gridToTerrain(config, n, col, row);
      if (Math.hypot(x - center[0], y - center[1]) > searchR) continue;
      const h = elevation.data[row * n + col];
      if (h < seedH) {
        seedH = h;
        seed = row * n + col;
      }
    }
  }

  const flood = (level: number, out?: Uint8Array) => {
    const visited = out ?? new Uint8Array(n * n);
    visited.fill(0);
    const stack = [seed];
    visited[seed] = 1;
    let count = 0;
    let touchesEdge = false;
    while (stack.length) {
      const i = stack.pop()!;
      count++;
      const r = (i / n) | 0;
      const c = i - r * n;
      if (r === 0 || c === 0 || r === n - 1 || c === n - 1) touchesEdge = true;
      const nb = [i - 1, i + 1, i - n, i + n];
      for (const j of nb) {
        if (j < 0 || j >= n * n || visited[j]) continue;
        const rj = (j / n) | 0;
        if (Math.abs((j - rj * n) - c) > 1) continue;
        if (elevation.data[j] < level) {
          visited[j] = 1;
          stack.push(j);
        }
      }
    }
    return { count, touchesEdge, visited };
  };

  let lo = seedH;
  let hi = seedH + 30;
  for (let it = 0; it < 24; it++) {
    const mid = (lo + hi) / 2;
    const { count, touchesEdge } = flood(mid);
    if (touchesEdge || count * cellArea > targetArea) hi = mid;
    else lo = mid;
  }
  const waterLevel = lo;
  const { visited } = flood(waterLevel);
  const lake = createGrid(n);
  for (let i = 0; i < visited.length; i++) lake.data[i] = visited[i];
  return { lake, waterLevel };
}

/** Vegetation fields (0…1) used by the classifier. */
export function generateVegetationFields(config: TerrainConfig, resolution = 257): { openness: Grid; density: Grid } {
  const nOpen = createNoise2D(config.seed + 17);
  const nDense = createNoise2D(config.seed + 29);
  const openness = createGrid(resolution);
  const density = createGrid(resolution);
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const [x, y] = gridToTerrain(config, resolution, col, row);
      const i = row * resolution + col;
      let o = 0.5 + 0.55 * fbm(nOpen, x / 380 + 11, y / 380 + 4, 4);
      o += 0.75 * gauss(x, y, FARM_CENTER[0], FARM_CENTER[1], 230);
      o += 0.45 * gauss(x, y, MAIN_HILL[0], MAIN_HILL[1], 110);
      o += 0.35 * gauss(x, y, 480, 1520, 90);
      o -= 0.25 * gauss(x, y, 1000, 1500, 300);
      openness.data[i] = o;
      density.data[i] = 0.5 + 0.6 * fbm(nDense, x / 260 + 40, y / 260 + 9, 4);
    }
  }
  return { openness, density };
}

/** Catmull–Rom resampling so hand-placed trails look organic. */
function smoothPolyline(points: Point2[], samplesPerSegment = 10): Point2[] {
  if (points.length < 3) return points;
  const out: Point2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const RAW_TRAILS: Trail[] = [
  {
    kind: 'road',
    points: [[0, 300], [400, 330], [800, 285], [1200, 305], [1500, 350], [1800, 385], [2000, 430]],
  },
  {
    kind: 'path',
    points: [[1500, 350], [1450, 600], [1250, 850], [1060, 1100], [950, 1400], [1000, 1700], [1080, 2000]],
  },
  {
    kind: 'path',
    points: [[400, 330], [370, 600], [420, 930], [650, 1010], [910, 910], [1010, 700], [960, 470], [800, 285]],
  },
  {
    kind: 'smallPath',
    points: [[0, 1150], [300, 1210], [700, 1250], [1060, 1100]],
  },
  {
    kind: 'smallPath',
    points: [[1450, 600], [1650, 800], [1790, 1100], [1880, 1500], [2000, 1700]],
  },
  {
    kind: 'smallPath',
    points: [[950, 1400], [1180, 1320], [1340, 1250]],
  },
];

const BUILDINGS: Building[] = [
  { x: 1480, y: 300, width: 42, depth: 22, rotation: 0.1, wallHeight: 6 },
  { x: 1545, y: 415, width: 30, depth: 30, rotation: 0.1, wallHeight: 8 },
  { x: 1610, y: 330, width: 24, depth: 14, rotation: 0.35, wallHeight: 4 },
  { x: 1050, y: 650, width: 14, depth: 10, rotation: -0.4, wallHeight: 4 },
  { x: 250, y: 360, width: 16, depth: 11, rotation: 0.05, wallHeight: 4 },
];

/** Dry stone wall across the farm field, south of the farm road. */
const WALLS: Wall[] = [
  { points: [[1235, 165], [1400, 180], [1560, 190], [1700, 170], [1800, 150]], height: 1.2 },
];

/** Hunting tower in the north-western forest, overlooking a small clearing. */
const TOWERS: Tower[] = [{ x: 590, y: 1600, height: 5, rotation: Math.PI }];

const CONTROLS: Control[] = [
  { kind: 'start', number: 0, code: 0, x: 300, y: 250 },
  { kind: 'control', number: 1, code: 31, x: 960, y: 560 },
  { kind: 'control', number: 2, code: 45, x: 1560, y: 640 },
  { kind: 'control', number: 3, code: 52, x: 1760, y: 1030 },
  { kind: 'control', number: 4, code: 38, x: 1350, y: 1250 },
  { kind: 'control', number: 5, code: 61, x: 1720, y: 1760 },
  { kind: 'control', number: 6, code: 47, x: 1060, y: 1660 },
  { kind: 'control', number: 7, code: 70, x: 480, y: 1520 },
  { kind: 'control', number: 8, code: 33, x: 230, y: 1030 },
  { kind: 'finish', number: 0, code: 0, x: 190, y: 470 },
];

function distToPolyline(x: number, y: number, pts: Point2[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(x, y, pts[i], pts[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

/** Hand-authored + seeded features that match the demo terrain. */
export function generateDemoFeatures(config: TerrainConfig, lake: Grid, elevation: Grid): MapFeatures {
  const trails = RAW_TRAILS.map((t) => ({ kind: t.kind, points: smoothPolyline(t.points) }));
  const inLake = (x: number, y: number) => sampleGrid(lake, config, x, y) > 0.2;

  const rand = mulberry32(config.seed + 999);
  const boulders: Boulder[] = [];
  let attempts = 0;
  while (boulders.length < 70 && attempts < 5000) {
    attempts++;
    const x = 60 + rand() * (config.width - 120);
    const y = 60 + rand() * (config.height - 120);
    if (inLake(x, y)) continue;
    if (trails.some((t) => distToPolyline(x, y, t.points) < 20)) continue;
    if (BUILDINGS.some((b) => Math.hypot(b.x - x, b.y - y) < 60)) continue;
    if (WALLS.some((w) => distToPolyline(x, y, w.points) < 15)) continue;
    if (TOWERS.some((tw) => Math.hypot(tw.x - x, tw.y - y) < 30)) continue;
    // Prefer slopes – boulders tend to sit on hillsides.
    const e = sampleGrid(elevation, config, x, y);
    const ex = sampleGrid(elevation, config, x + 10, y) - e;
    const ey = sampleGrid(elevation, config, x, y + 10) - e;
    const slope = Math.hypot(ex, ey) / 10;
    if (slope < 0.05 && rand() > 0.25) continue;
    boulders.push({ x, y, size: 1.5 + rand() * 2.5 });
  }

  return {
    trails,
    boulders,
    buildings: BUILDINGS.filter((b) => !inLake(b.x, b.y)),
    walls: WALLS,
    towers: TOWERS.filter((tw) => !inLake(tw.x, tw.y)),
    controls: CONTROLS.filter((c) => !inLake(c.x, c.y)),
  };
}
