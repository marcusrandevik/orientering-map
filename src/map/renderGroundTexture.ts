import { Veg, rasterizeVegetation } from '../terrain/classify';
import { mulberry32 } from '../terrain/noise';
import type { TerrainData } from '../terrain/types';
import { GROUND_VEG_RGB } from './mapSymbols';

/**
 * Realistic-looking ground colour texture for the 3D terrain. It is derived
 * from the same classification and features as the orienteering map so both
 * stay perfectly aligned.
 */
export function renderGroundTexture(terrain: TerrainData, size = 2048, vegetationResolution = 1024): HTMLCanvasElement {
  const cfg = terrain.config;
  const k = size / Math.max(cfg.width, cfg.height);
  const tx = (x: number) => x * k;
  const ty = (y: number) => (cfg.height - y) * k;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const veg = rasterizeVegetation(terrain, vegetationResolution);
  const vc = document.createElement('canvas');
  vc.width = vegetationResolution;
  vc.height = vegetationResolution;
  const vctx = vc.getContext('2d')!;
  const img = vctx.createImageData(vegetationResolution, vegetationResolution);
  const rand = mulberry32(cfg.seed + 5);
  for (let i = 0; i < veg.length; i++) {
    const rgb = GROUND_VEG_RGB[veg[i] as Veg];
    const j = (rand() - 0.5) * 18;
    img.data[i * 4] = rgb[0] + j;
    img.data[i * 4 + 1] = rgb[1] + j;
    img.data[i * 4 + 2] = rgb[2] + j * 0.6;
    img.data[i * 4 + 3] = 255;
  }
  vctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(vc, 0, 0, size, size);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const t of terrain.features.trails) {
    ctx.strokeStyle = t.kind === 'road' ? '#b8ab8e' : '#a38e68';
    ctx.lineWidth = t.kind === 'road' ? 7 * k : t.kind === 'path' ? 4 * k : 3 * k;
    ctx.lineWidth = Math.max(ctx.lineWidth, t.kind === 'road' ? 6 : 3);
    ctx.beginPath();
    t.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y))));
    ctx.stroke();
  }

  ctx.fillStyle = '#5b5750';
  for (const b of terrain.features.buildings) {
    ctx.save();
    ctx.translate(tx(b.x), ty(b.y));
    ctx.rotate(-b.rotation);
    ctx.fillRect(((-b.width / 2) - 4) * k, ((-b.depth / 2) - 4) * k, (b.width + 8) * k, (b.depth + 8) * k);
    ctx.restore();
  }
  return canvas;
}
