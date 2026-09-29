import * as THREE from 'three';
import type { WorldTransform } from './coordinates';
import { sampleGrid } from './grid';
import { skirtBottomElevation } from './mapLevel';
import type { TerrainData } from './types';

/**
 * Build the terrain mesh geometry in world space: the heightfield surface
 * plus vertical side walls ("diorama" skirt). Attribute `aSide` is 0 for the
 * top surface and 1 for the walls.
 */
export function createTerrainGeometry(
  terrain: TerrainData,
  transform: WorldTransform,
  resolution = 257,
): THREE.BufferGeometry {
  const cfg = terrain.config;
  const R = resolution;
  const heights = new Float32Array(R * R);
  for (let row = 0; row < R; row++) {
    for (let col = 0; col < R; col++) {
      const x = (col / (R - 1)) * cfg.width;
      const y = (row / (R - 1)) * cfg.height;
      heights[row * R + col] = transform.toWorldY(sampleGrid(terrain.elevation, cfg, x, y));
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const sides: number[] = [];
  const indices: number[] = [];

  const cellW = transform.worldWidth / (R - 1);
  const cellD = transform.worldDepth / (R - 1);
  const h = (c: number, r: number) =>
    heights[Math.min(R - 1, Math.max(0, r)) * R + Math.min(R - 1, Math.max(0, c))];

  // Top surface.
  for (let row = 0; row < R; row++) {
    for (let col = 0; col < R; col++) {
      const x = (col / (R - 1)) * cfg.width;
      const y = (row / (R - 1)) * cfg.height;
      positions.push(transform.toWorldX(x), h(col, row), transform.toWorldZ(y));
      // Central differences. World z grows southwards (row decreases).
      const dhdx = (h(col + 1, row) - h(col - 1, row)) / (2 * cellW);
      const dhdz = -(h(col, row + 1) - h(col, row - 1)) / (2 * cellD);
      const n = new THREE.Vector3(-dhdx, 1, -dhdz).normalize();
      normals.push(n.x, n.y, n.z);
      uvs.push(col / (R - 1), row / (R - 1));
      sides.push(0);
    }
  }
  for (let row = 0; row < R - 1; row++) {
    for (let col = 0; col < R - 1; col++) {
      const a = row * R + col;
      const b = a + 1;
      const d = a + R;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }

  // Side walls.
  const bottom = transform.toWorldY(skirtBottomElevation(cfg));
  const addWall = (cells: Array<[number, number]>, normal: [number, number, number]) => {
    const start = positions.length / 3;
    for (const [col, row] of cells) {
      const x = transform.toWorldX((col / (R - 1)) * cfg.width);
      const z = transform.toWorldZ((row / (R - 1)) * cfg.height);
      positions.push(x, h(col, row), z, x, bottom, z);
      normals.push(...normal, ...normal);
      uvs.push(0, 0, 0, 0);
      sides.push(1, 1);
    }
    for (let i = 0; i < cells.length - 1; i++) {
      const t0 = start + i * 2;
      const b0 = t0 + 1;
      const t1 = t0 + 2;
      const b1 = t0 + 3;
      indices.push(t0, b0, t1, t1, b0, b1);
    }
  };
  const range = [...Array(R).keys()];
  addWall(range.map((c) => [c, 0]), [0, 0, 1]);
  addWall(range.map((c) => [R - 1 - c, R - 1]), [0, 0, -1]);
  addWall(range.map((r) => [0, R - 1 - r]), [-1, 0, 0]);
  addWall(range.map((r) => [R - 1, r]), [1, 0, 0]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

/** Flat water surface covering only the lake cells. */
export function createWaterGeometry(
  terrain: TerrainData,
  transform: WorldTransform,
  resolution = 257,
): THREE.BufferGeometry {
  const cfg = terrain.config;
  const R = resolution;
  const y = transform.toWorldY(terrain.waterLevel);
  const positions: number[] = [];
  const indices: number[] = [];
  const vertexIndex = new Int32Array(R * R).fill(-1);
  const inLake = new Uint8Array(R * R);
  for (let row = 0; row < R; row++) {
    for (let col = 0; col < R; col++) {
      const x = (col / (R - 1)) * cfg.width;
      const yy = (row / (R - 1)) * cfg.height;
      inLake[row * R + col] = sampleGrid(terrain.lake, cfg, x, yy) > 0.01 ? 1 : 0;
    }
  }
  const vid = (col: number, row: number) => {
    const i = row * R + col;
    if (vertexIndex[i] < 0) {
      vertexIndex[i] = positions.length / 3;
      positions.push(
        transform.toWorldX((col / (R - 1)) * cfg.width),
        y,
        transform.toWorldZ((row / (R - 1)) * cfg.height),
      );
    }
    return vertexIndex[i];
  };
  for (let row = 0; row < R - 1; row++) {
    for (let col = 0; col < R - 1; col++) {
      const i = row * R + col;
      if (!(inLake[i] || inLake[i + 1] || inLake[i + R] || inLake[i + R + 1])) continue;
      const a = vid(col, row);
      const b = vid(col + 1, row);
      const d = vid(col, row + 1);
      const e = vid(col + 1, row + 1);
      indices.push(a, b, d, b, e, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
