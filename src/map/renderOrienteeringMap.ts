import { Veg, rasterizeVegetation } from '../terrain/classify';
import { isolineSegments, type ContourLevel } from '../terrain/generateContours';
import { sampleGrid } from '../terrain/grid';
import type { Control, TerrainData, Trail } from '../terrain/types';
import { ISOM, MAP_VEG_RGB } from './mapSymbols';

export interface MapRenderOptions {
  /** Output canvas size in pixels (square). */
  size?: number;
  /** Resolution of the vegetation raster before upscaling. */
  vegetationResolution?: number;
  /** Nominal map scale – only used to size symbols. */
  scale?: number;
}

/**
 * Render a demo orienteering map (ISOM-ish symbols) onto a canvas.
 *
 * Canvas pixel (0, 0) is the north-west corner; this matches the UV layout of
 * the map plane, so terrain coordinate (x, y) ↔ canvas (x·k, (H − y)·k).
 */
export function renderOrienteeringMap(
  terrain: TerrainData,
  contours: ContourLevel[],
  options: MapRenderOptions = {},
): HTMLCanvasElement {
  const size = options.size ?? 2048;
  const vegRes = options.vegetationResolution ?? 1024;
  const cfg = terrain.config;
  const k = size / Math.max(cfg.width, cfg.height);
  /** Symbol size multiplier: 1 map-mm in px (at 1:10 000, 1 mm = 10 m). */
  const mm = (10 * k * (options.scale ?? 10000)) / 10000;
  const tx = (x: number) => x * k;
  const ty = (y: number) => (cfg.height - y) * k;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Vegetation / area symbols.
  const veg = rasterizeVegetation(terrain, vegRes);
  const vegCanvas = document.createElement('canvas');
  vegCanvas.width = vegRes;
  vegCanvas.height = vegRes;
  const vctx = vegCanvas.getContext('2d')!;
  const img = vctx.createImageData(vegRes, vegRes);
  const marshPeriod = Math.max(4, Math.round((1.2 * mm * vegRes) / size) * 2);
  for (let i = 0; i < veg.length; i++) {
    let rgb = MAP_VEG_RGB[veg[i] as Veg];
    if (veg[i] === Veg.Lake) rgb = [0x00, 0xa3, 0xe0];
    if (veg[i] === Veg.Marsh) {
      const row = (i / vegRes) | 0;
      if (row % marshPeriod < Math.max(1, marshPeriod / 4)) rgb = [0x00, 0x87, 0xc9];
    }
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  }
  vctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(vegCanvas, 0, 0, size, size);

  const inLake = (x: number, y: number) =>
    sampleGrid(terrain.lake, cfg, x, y) > 0.01 &&
    sampleGrid(terrain.elevation, cfg, x, y) < terrain.waterLevel;

  const strokeSegments = (segs: Float32Array, skip?: (x: number, y: number) => boolean) => {
    ctx.beginPath();
    for (let i = 0; i < segs.length; i += 4) {
      if (skip && skip((segs[i] + segs[i + 2]) / 2, (segs[i + 1] + segs[i + 3]) / 2)) continue;
      ctx.moveTo(tx(segs[i]), ty(segs[i + 1]));
      ctx.lineTo(tx(segs[i + 2]), ty(segs[i + 3]));
    }
    ctx.stroke();
  };

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 2. Magnetic north lines.
  ctx.strokeStyle = ISOM.northLine;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 0.18 * mm;
  const northSpacing = 250;
  for (let x = northSpacing / 2; x < cfg.width; x += northSpacing) {
    ctx.beginPath();
    ctx.moveTo(tx(x), 0);
    ctx.lineTo(tx(x), size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 3. Contours (not drawn inside the lake).
  ctx.strokeStyle = ISOM.contour;
  for (const level of contours) {
    ctx.lineWidth = (level.isIndex ? 0.3 : 0.16) * mm;
    strokeSegments(level.segments, inLake);
  }

  // 4. Shoreline: the isoline at water level near the lake.
  ctx.strokeStyle = ISOM.black;
  ctx.lineWidth = 0.2 * mm;
  strokeSegments(
    isolineSegments(cfg, terrain.elevation, terrain.waterLevel),
    (x, y) => sampleGrid(terrain.lake, cfg, x, y) <= 0.001,
  );

  // 5. Trails.
  const drawTrail = (t: Trail) => {
    ctx.strokeStyle = ISOM.black;
    if (t.kind === 'road') {
      ctx.lineWidth = 0.45 * mm;
      ctx.setLineDash([]);
    } else if (t.kind === 'path') {
      ctx.lineWidth = 0.3 * mm;
      ctx.setLineDash([2 * mm, 0.5 * mm]);
    } else {
      ctx.lineWidth = 0.22 * mm;
      ctx.setLineDash([1.2 * mm, 0.5 * mm]);
    }
    ctx.beginPath();
    let drawing = false;
    for (const [x, y] of t.points) {
      if (inLake(x, y)) {
        drawing = false;
        continue;
      }
      if (!drawing) ctx.moveTo(tx(x), ty(y));
      else ctx.lineTo(tx(x), ty(y));
      drawing = true;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  terrain.features.trails.forEach(drawTrail);

  // 6. Buildings.
  ctx.fillStyle = ISOM.black;
  for (const b of terrain.features.buildings) {
    ctx.save();
    ctx.translate(tx(b.x), ty(b.y));
    ctx.rotate(-b.rotation);
    ctx.fillRect((-b.width / 2) * k, (-b.depth / 2) * k, b.width * k, b.depth * k);
    ctx.restore();
  }

  // 7. Boulders.
  for (const b of terrain.features.boulders) {
    ctx.beginPath();
    ctx.arc(tx(b.x), ty(b.y), (0.22 + b.size * 0.05) * mm, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. Course overprint.
  drawCourse(ctx, terrain.features.controls, tx, ty, mm);

  // 9. Frame + scale note.
  ctx.strokeStyle = ISOM.black;
  ctx.lineWidth = 0.35 * mm;
  ctx.strokeRect(0, 0, size, size);
  drawScaleNote(ctx, size, mm, cfg.contourInterval);

  return canvas;
}

function drawCourse(
  ctx: CanvasRenderingContext2D,
  controls: Control[],
  tx: (x: number) => number,
  ty: (y: number) => number,
  mm: number,
) {
  const r = 2.9 * mm;
  const startSide = 7 * mm;
  const radiusOf = (c: Control) => (c.kind === 'start' ? startSide * 0.6 : c.kind === 'finish' ? 3.2 * mm : r);

  ctx.save();
  ctx.strokeStyle = ISOM.course;
  ctx.fillStyle = ISOM.course;
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 0.35 * mm;

  // Legs between controls (with gaps at the circles).
  for (let i = 0; i < controls.length - 1; i++) {
    const a = controls[i];
    const b = controls[i + 1];
    const ax = tx(a.x), ay = ty(a.y), bx = tx(b.x), by = ty(b.y);
    const len = Math.hypot(bx - ax, by - ay);
    const ra = radiusOf(a) + 0.4 * mm;
    const rb = radiusOf(b) + 0.4 * mm;
    if (len <= ra + rb) continue;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    ctx.beginPath();
    ctx.moveTo(ax + ux * ra, ay + uy * ra);
    ctx.lineTo(bx - ux * rb, by - uy * rb);
    ctx.stroke();
  }

  ctx.font = `600 ${4 * mm}px ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  controls.forEach((c, i) => {
    const x = tx(c.x), y = ty(c.y);
    if (c.kind === 'start') {
      const next = controls[i + 1];
      const angle = next ? Math.atan2(ty(next.y) - y, tx(next.x) - x) : 0;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const a = angle + (j * 2 * Math.PI) / 3;
        const px = x + Math.cos(a) * startSide * 0.577;
        const py = y + Math.sin(a) * startSide * 0.577;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (c.kind === 'finish') {
      ctx.beginPath();
      ctx.arc(x, y, 2.2 * mm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.2 * mm, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      // Number placed away from the incoming/outgoing legs.
      const prev = controls[i - 1];
      const next = controls[i + 1];
      let ax = 0, ay = 0;
      if (prev) { ax += tx(prev.x) - x; ay += ty(prev.y) - y; }
      if (next) { ax += tx(next.x) - x; ay += ty(next.y) - y; }
      const al = Math.hypot(ax, ay) || 1;
      const off = r + 3.2 * mm;
      const nx = x - (ax / al) * off;
      const ny = y - (ay / al) * off;
      ctx.lineWidth = 0.6 * mm;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(String(c.number), nx, ny);
      ctx.fillText(String(c.number), nx, ny);
      ctx.strokeStyle = ISOM.course;
      ctx.lineWidth = 0.35 * mm;
    }
  });
  ctx.restore();
}

function drawScaleNote(ctx: CanvasRenderingContext2D, size: number, mm: number, interval: number) {
  const pad = 3 * mm;
  const w = 38 * mm;
  const h = 9 * mm;
  const x = pad;
  const y = size - pad - h;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = ISOM.black;
  ctx.lineWidth = 0.15 * mm;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = ISOM.black;
  ctx.font = `600 ${3.2 * mm}px ui-sans-serif, system-ui, -apple-system, Arial`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`1:10 000   ·   ${interval} m`, x + 2 * mm, y + h * 0.36);
  // 250 m scale bar.
  const bar = 25 * mm;
  ctx.fillRect(x + 2 * mm, y + h * 0.72, bar, 0.5 * mm);
  ctx.font = `500 ${2.2 * mm}px ui-sans-serif, system-ui, Arial`;
  ctx.fillText('250 m', x + bar + 3.5 * mm, y + h * 0.74);
  ctx.restore();
}
