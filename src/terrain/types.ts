/**
 * Core terrain types.
 *
 * Everything (terrain, orienteering map, features) shares ONE coordinate
 * system expressed in metres:
 *   x → east   (0 … config.width)
 *   y → north  (0 … config.height)
 *   elevation  (metres above sea level)
 *
 * The map plane uses the same x/y coordinates but its own elevation, which
 * means real DEM data can later replace the demo terrain without touching the
 * visualization logic.
 */
export type TerrainCoordinate = {
  x: number;
  y: number;
  elevation: number;
};

export type TerrainSource = 'procedural' | 'heightmap';

export interface TerrainConfig {
  name: string;
  /** Extent east–west in metres. */
  width: number;
  /** Extent south–north in metres. */
  height: number;
  minElevation: number;
  maxElevation: number;
  /** Contour interval in metres. */
  contourInterval: number;
  /** Every n-th contour is an index contour. */
  indexContourEvery: number;
  /** Visual vertical exaggeration applied in the 3D scene only. */
  verticalExaggeration: number;
  source: TerrainSource;
  seed: number;
  /** Heightmap image (grayscale) inside /terrain when source === 'heightmap'. */
  heightmap: string | null;
  /** Optional pre-drawn orienteering map image inside /terrain. */
  map: string | null;
}

/**
 * Regular grid of samples covering [0,width] × [0,height].
 * Row 0 is the southern edge (y = 0), column 0 is the western edge (x = 0).
 */
export interface Grid {
  resolution: number;
  data: Float32Array;
}

export type VegetationClass =
  | 'lake'
  | 'marsh'
  | 'open'
  | 'roughOpen'
  | 'forest'
  | 'slowForest'
  | 'denseForest';

export type TrailKind = 'road' | 'path' | 'smallPath';

export type Point2 = [x: number, y: number];

export interface Trail {
  kind: TrailKind;
  points: Point2[];
}

export interface Boulder {
  x: number;
  y: number;
  /** Approximate size in metres. */
  size: number;
}

export interface Building {
  x: number;
  y: number;
  /** Footprint along local x (metres). */
  width: number;
  /** Footprint along local y (metres). */
  depth: number;
  /** Rotation in radians (counter-clockwise, map coordinates). */
  rotation: number;
  /** Wall height in metres. */
  wallHeight: number;
}

export type ControlKind = 'start' | 'control' | 'finish';

export interface Control {
  kind: ControlKind;
  /** Course order number (for 'control'). */
  number: number;
  /** Control code shown on the flag. */
  code: number;
  x: number;
  y: number;
}

export interface MapFeatures {
  trails: Trail[];
  boulders: Boulder[];
  buildings: Building[];
  controls: Control[];
}

export interface TerrainData {
  config: TerrainConfig;
  elevation: Grid;
  /** 0 … 1 fields used to classify vegetation. */
  openness: Grid;
  density: Grid;
  /** 1 inside the lake, 0 outside. */
  lake: Grid;
  waterLevel: number;
  features: MapFeatures;
}
