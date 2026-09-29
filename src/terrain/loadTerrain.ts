import {
  computeLake,
  generateDemoElevation,
  generateDemoFeatures,
  generateVegetationFields,
} from '../data/demoTerrain';
import { renderGroundTexture } from '../map/renderGroundTexture';
import { renderOrienteeringMap } from '../map/renderOrienteeringMap';
import { createWorldTransform, type WorldTransform } from './coordinates';
import { generateContours, type ContourLevel } from './generateContours';
import { loadHeightmap, loadImage } from './loadHeightmap';
import type { TerrainConfig, TerrainData } from './types';

export interface TerrainAssets {
  data: TerrainData;
  transform: WorldTransform;
  contours: ContourLevel[];
  /** Orienteering map image (generated or loaded from config.map). */
  mapImage: HTMLCanvasElement | HTMLImageElement;
  /** Realistic ground colour texture for the 3D surface. */
  groundImage: HTMLCanvasElement;
}

const DEFAULT_CONFIG: TerrainConfig = {
  name: 'Demo terrain',
  width: 2000,
  height: 2000,
  minElevation: 0,
  maxElevation: 120,
  contourInterval: 5,
  indexContourEvery: 5,
  verticalExaggeration: 2.4,
  source: 'procedural',
  seed: 7,
  heightmap: null,
  map: null,
};

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Load terrain config + elevation and derive everything the scene needs.
 * The pipeline is data-source agnostic: swap the elevation step for real
 * DEM/GeoTIFF data and the rest stays the same.
 */
export async function loadTerrain(baseUrl = `${import.meta.env.BASE_URL}terrain/`): Promise<TerrainAssets> {
  let config = DEFAULT_CONFIG;
  try {
    const res = await fetch(`${baseUrl}terrain.json`);
    if (res.ok) config = { ...DEFAULT_CONFIG, ...(await res.json()) };
  } catch {
    // Fall back to the built-in defaults.
  }

  await nextFrame();
  const elevation =
    config.source === 'heightmap' && config.heightmap
      ? await loadHeightmap(`${baseUrl}${config.heightmap}`, config)
      : generateDemoElevation(config);

  const { lake, waterLevel } = computeLake(config, elevation);
  const { openness, density } = generateVegetationFields(config);
  const features = generateDemoFeatures(config, lake, elevation);
  const data: TerrainData = { config, elevation, openness, density, lake, waterLevel, features };

  await nextFrame();
  const contours = generateContours(config, elevation);
  const mapImage = config.map
    ? await loadImage(`${baseUrl}${config.map}`)
    : renderOrienteeringMap(data, contours);
  await nextFrame();
  const groundImage = renderGroundTexture(data);

  return { data, transform: createWorldTransform(config), contours, mapImage, groundImage };
}
