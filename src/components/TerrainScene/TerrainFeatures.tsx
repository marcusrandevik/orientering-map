import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createClippedMaterial } from '../../shaders/clippedMaterial';
import { mapClipPlane } from '../../state/animationState';
import { useTerrainStore } from '../../state/useTerrainStore';
import { Veg, classifyVegetation } from '../../terrain/classify';
import { createWaterGeometry } from '../../terrain/generateTerrain';
import { sampleGrid } from '../../terrain/grid';
import type { TerrainAssets } from '../../terrain/loadTerrain';
import { mulberry32 } from '../../terrain/noise';
import type { Point2, TerrainData } from '../../terrain/types';

interface InstanceSpec {
  matrix: THREE.Matrix4;
  /** Ground height (world Y) the object stands on. */
  ground: number;
  color?: THREE.Color;
}

function buildInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  specs: InstanceSpec[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, specs.length);
  specs.forEach((s, i) => {
    mesh.setMatrixAt(i, s.matrix);
    if (s.color) mesh.setColorAt(i, s.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function distToPolyline(x: number, y: number, pts: Point2[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const vx = bx - ax;
    const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
    const d = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
    if (d < best) best = d;
  }
  return best;
}

const TREE_PROBABILITY: Record<Veg, number> = {
  [Veg.Lake]: 0,
  [Veg.Marsh]: 0.1,
  [Veg.Open]: 0.0,
  [Veg.RoughOpen]: 0.07,
  [Veg.Forest]: 0.5,
  [Veg.SlowForest]: 0.78,
  [Veg.DenseForest]: 0.97,
};

function placeTrees(data: TerrainData, assets: TerrainAssets) {
  const { config, features } = data;
  const t = assets.transform;
  const rand = mulberry32(config.seed + 4242);
  const spacing = 21;
  const conifers: InstanceSpec[] = [];
  const broadleaf: InstanceSpec[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  for (let y = spacing / 2; y < config.height; y += spacing) {
    for (let x = spacing / 2; x < config.width; x += spacing) {
      const px = x + (rand() - 0.5) * spacing * 0.9;
      const py = y + (rand() - 0.5) * spacing * 0.9;
      if (px < 8 || py < 8 || px > config.width - 8 || py > config.height - 8) continue;
      const veg = classifyVegetation(data, px, py);
      if (rand() > TREE_PROBABILITY[veg]) continue;
      if (features.trails.some((tr) => distToPolyline(px, py, tr.points) < (tr.kind === 'road' ? 14 : 9))) continue;
      if (features.buildings.some((b) => Math.hypot(b.x - px, b.y - py) < Math.max(b.width, b.depth) + 10)) continue;
      if (features.walls.some((w) => distToPolyline(px, py, w.points) < 7)) continue;
      if (features.towers.some((tw) => Math.hypot(tw.x - px, tw.y - py) < 12)) continue;

      const ground = t.toWorldY(sampleGrid(data.elevation, config, px, py));
      const isConifer = veg === Veg.DenseForest ? rand() < 0.8 : rand() < 0.55;
      const h = (isConifer ? 0.3 : 0.24) * (0.75 + rand() * 0.55);
      const r = (isConifer ? 0.075 : 0.1) * (0.8 + rand() * 0.4);
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(
        new THREE.Vector3(t.toWorldX(px), ground - 0.015, t.toWorldZ(py)),
        q,
        new THREE.Vector3(r, h, r),
      );
      const shade = 0.8 + rand() * 0.35;
      const color = isConifer
        ? new THREE.Color(0.13 * shade, 0.27 * shade, 0.13 * shade)
        : new THREE.Color(0.24 * shade, 0.4 * shade, 0.16 * shade);
      (isConifer ? conifers : broadleaf).push({ matrix: m.clone(), ground, color });
    }
  }
  return { conifers, broadleaf };
}

function createFlagTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#f26b1d';
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(64, 64);
  ctx.lineTo(0, 64);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function TerrainFeatures({ terrain }: { terrain: TerrainAssets }) {
  const showVegetation = useTerrainStore((s) => s.showVegetation);
  const { data, transform: t } = terrain;
  const cfg = data.config;

  const objects = useMemo(() => {
    const disposables: Array<{ dispose(): void }> = [];
    const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

    // Trees.
    const { conifers, broadleaf } = placeTrees(data, terrain);
    const coneGeo = track(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0));
    const crownGeo = track(new THREE.IcosahedronGeometry(0.62, 0).scale(1, 0.9, 1).translate(0, 0.55, 0));
    const treeMat = track(createClippedMaterial({ roughness: 0.95, metalness: 0, flatShading: true, side: THREE.DoubleSide }));
    const coniferMesh = buildInstanced(coneGeo, treeMat, conifers);
    const broadleafMesh = buildInstanced(crownGeo, treeMat, broadleaf);

    // Boulders.
    const rand = mulberry32(cfg.seed + 77);
    const boulderSpecs: InstanceSpec[] = data.features.boulders.map((b) => {
      const ground = t.toWorldY(sampleGrid(data.elevation, cfg, b.x, b.y));
      const s = 0.02 + b.size * 0.012;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(t.toWorldX(b.x), ground - s * 0.25, t.toWorldZ(b.y)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand() * 6, rand())),
        new THREE.Vector3(s, s * 0.75, s),
      );
      return { matrix: m, ground };
    });
    const boulderGeo = track(new THREE.DodecahedronGeometry(1, 0));
    const boulderMat = track(createClippedMaterial({ color: '#8b8a86', roughness: 0.9, flatShading: true }));
    const boulderMesh = buildInstanced(boulderGeo, boulderMat, boulderSpecs);

    // Buildings: walls + hip roofs.
    const wallSpecs: InstanceSpec[] = [];
    const roofSpecs: InstanceSpec[] = [];
    for (const b of data.features.buildings) {
      const cos = Math.cos(b.rotation);
      const sin = Math.sin(b.rotation);
      let minE = Infinity;
      for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
        const lx = (ox * b.width) / 2;
        const ly = (oy * b.depth) / 2;
        minE = Math.min(minE, sampleGrid(data.elevation, cfg, b.x + lx * cos - ly * sin, b.y + lx * sin + ly * cos));
      }
      const ground = t.toWorldY(minE);
      const wallH = b.wallHeight * t.scale * 2.2;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotation);
      const pos = new THREE.Vector3(t.toWorldX(b.x), ground - 0.02, t.toWorldZ(b.y));
      wallSpecs.push({
        matrix: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(b.width * t.scale, wallH + 0.02, b.depth * t.scale)),
        ground,
      });
      roofSpecs.push({
        matrix: new THREE.Matrix4().compose(
          pos.clone().setY(ground + wallH),
          q,
          new THREE.Vector3(b.width * t.scale * 1.08, wallH * 0.7, b.depth * t.scale * 1.08),
        ),
        ground,
      });
    }
    const wallGeo = track(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const roofGeo = track(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0));
    const wallMat = track(createClippedMaterial({ color: '#d9d2c3', roughness: 0.85, side: THREE.DoubleSide }));
    const roofMat = track(createClippedMaterial({ color: '#8a3b2c', roughness: 0.7, flatShading: true, side: THREE.DoubleSide }));
    const wallMesh = buildInstanced(wallGeo, wallMat, wallSpecs);
    const roofMesh = buildInstanced(roofGeo, roofMat, roofSpecs);

    // Dry stone walls: short boxes following the ground along each segment.
    const stoneSpecs: InstanceSpec[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (const w of data.features.walls) {
      const wallH = w.height * t.scale * 2.2;
      const thickness = 0.014;
      for (let i = 0; i < w.points.length - 1; i++) {
        const [ax, ay] = w.points[i];
        const [bx, by] = w.points[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const pieces = Math.max(1, Math.ceil(len / 8));
        const q = new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(by - ay, bx - ax));
        for (let p = 0; p < pieces; p++) {
          const x0 = ax + ((bx - ax) * p) / pieces, y0 = ay + ((by - ay) * p) / pieces;
          const x1 = ax + ((bx - ax) * (p + 1)) / pieces, y1 = ay + ((by - ay) * (p + 1)) / pieces;
          const e0 = t.toWorldY(sampleGrid(data.elevation, cfg, x0, y0));
          const e1 = t.toWorldY(sampleGrid(data.elevation, cfg, x1, y1));
          const ground = Math.min(e0, e1);
          const h = wallH * (0.85 + rand() * 0.3) + Math.abs(e1 - e0);
          stoneSpecs.push({
            matrix: new THREE.Matrix4().compose(
              new THREE.Vector3(t.toWorldX((x0 + x1) / 2), ground - 0.01, t.toWorldZ((y0 + y1) / 2)),
              q,
              new THREE.Vector3((len / pieces) * t.scale * 1.05, h + 0.01, thickness),
            ),
            ground,
          });
        }
      }
    }
    const stoneGeo = track(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const stoneMat = track(createClippedMaterial({ color: '#8f8d86', roughness: 0.95, flatShading: true }));
    const stoneMesh = buildInstanced(stoneGeo, stoneMat, stoneSpecs);

    // Hunting towers: four legs, a cabin and a pitched roof.
    const towerWoodSpecs: InstanceSpec[] = [];
    const towerRoofSpecs: InstanceSpec[] = [];
    for (const tw of data.features.towers) {
      const ground = t.toWorldY(sampleGrid(data.elevation, cfg, tw.x, tw.y));
      const s = t.scale * 5.5;
      const platform = ground + tw.height * s;
      const cx = t.toWorldX(tw.x);
      const cz = t.toWorldZ(tw.y);
      const q = new THREE.Quaternion().setFromAxisAngle(up, tw.rotation);
      const leg = 1.1 * s;
      for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const off = new THREE.Vector3(ox * leg, 0, oz * leg).applyQuaternion(q);
        towerWoodSpecs.push({
          matrix: new THREE.Matrix4().compose(
            new THREE.Vector3(cx + off.x, ground - 0.01, cz + off.z),
            q,
            new THREE.Vector3(0.12 * s, platform - ground + 0.01, 0.12 * s),
          ),
          ground,
        });
      }
      const cabin = 1.5 * s;
      towerWoodSpecs.push({
        matrix: new THREE.Matrix4().compose(new THREE.Vector3(cx, platform, cz), q, new THREE.Vector3(cabin * 1.6, cabin, cabin * 1.6)),
        ground,
      });
      towerRoofSpecs.push({
        matrix: new THREE.Matrix4().compose(
          new THREE.Vector3(cx, platform + cabin, cz),
          q,
          new THREE.Vector3(cabin * 1.9, cabin * 0.6, cabin * 1.9),
        ),
        ground,
      });
    }
    const towerWoodMat = track(createClippedMaterial({ color: '#7a5634', roughness: 0.9, flatShading: true, side: THREE.DoubleSide }));
    const towerRoofMat = track(createClippedMaterial({ color: '#3d3a36', roughness: 0.8, flatShading: true, side: THREE.DoubleSide }));
    const towerWoodMesh = buildInstanced(wallGeo, towerWoodMat, towerWoodSpecs);
    const towerRoofMesh = buildInstanced(roofGeo, towerRoofMat, towerRoofSpecs);

    // Control flags (orange/white prisms on a pole).
    const flagSpecs: InstanceSpec[] = [];
    const poleSpecs: InstanceSpec[] = [];
    for (const c of data.features.controls) {
      if (c.kind !== 'control') continue;
      const ground = t.toWorldY(sampleGrid(data.elevation, cfg, c.x, c.y));
      const base = new THREE.Vector3(t.toWorldX(c.x), ground, t.toWorldZ(c.y));
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
      poleSpecs.push({ matrix: new THREE.Matrix4().compose(base, q, new THREE.Vector3(0.008, 0.2, 0.008)), ground });
      flagSpecs.push({
        matrix: new THREE.Matrix4().compose(base.clone().setY(ground + 0.13), q, new THREE.Vector3(0.09, 0.09, 0.09)),
        ground,
      });
    }
    const flagTex = track(createFlagTexture());
    const poleGeo = track(new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0));
    const flagGeo = track(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const poleMat = track(createClippedMaterial({ color: '#555555' }));
    const flagMat = track(createClippedMaterial({ map: flagTex, roughness: 0.6, emissive: '#3a1a08', side: THREE.DoubleSide }));
    const poleMesh = buildInstanced(poleGeo, poleMat, poleSpecs);
    const flagMesh = buildInstanced(flagGeo, flagMat, flagSpecs);

    // Water surface (built-in clipping against the map plane).
    const waterGeo = track(createWaterGeometry(data, t));
    const waterMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2a6f9e',
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.86,
        clippingPlanes: [mapClipPlane],
      }),
    );
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.renderOrder = 1;

    return {
      vegetation: [coniferMesh, broadleafMesh],
      structures: [boulderMesh, wallMesh, roofMesh, stoneMesh, towerWoodMesh, towerRoofMesh, poleMesh, flagMesh],
      water,
      disposables,
    };
  }, [data, terrain, t, cfg]);

  useEffect(() => () => objects.disposables.forEach((d) => d.dispose()), [objects]);

  return (
    <>
      {showVegetation && objects.vegetation.map((m, i) => <primitive key={`veg-${i}`} object={m} />)}
      {objects.structures.map((m, i) => (
        <primitive key={`st-${i}`} object={m} />
      ))}
      <primitive object={objects.water} />
    </>
  );
}
