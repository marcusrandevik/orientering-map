import { Veg } from '../terrain/classify';

/** Colours loosely based on ISOM 2017 (International Specification for Orienteering Maps). */
export const ISOM = {
  white: '#ffffff',
  openLand: '#ffba35',
  roughOpen: '#ffdd9a',
  slowRun: '#c5e8b4',
  walk: '#8bd17c',
  water: '#00a3e0',
  waterLight: '#9fdcf6',
  marsh: '#0087c9',
  contour: '#c3651b',
  black: '#1a1a1a',
  northLine: '#1f66d1',
  course: '#c8108e',
} as const;

/** RGB for vegetation classes on the orienteering map. */
export const MAP_VEG_RGB: Record<Veg, [number, number, number]> = {
  [Veg.Lake]: [0x9f, 0xdc, 0xf6],
  [Veg.Marsh]: [0xff, 0xff, 0xff],
  [Veg.Open]: [0xff, 0xba, 0x35],
  [Veg.RoughOpen]: [0xff, 0xdd, 0x9a],
  [Veg.Forest]: [0xff, 0xff, 0xff],
  [Veg.SlowForest]: [0xc5, 0xe8, 0xb4],
  [Veg.DenseForest]: [0x8b, 0xd1, 0x7c],
};

/** RGB for vegetation classes on the realistic 3D ground. */
export const GROUND_VEG_RGB: Record<Veg, [number, number, number]> = {
  [Veg.Lake]: [0x3a, 0x5a, 0x55],
  [Veg.Marsh]: [0x7a, 0x86, 0x4a],
  [Veg.Open]: [0xb4, 0xc0, 0x5e],
  [Veg.RoughOpen]: [0x93, 0xa2, 0x52],
  [Veg.Forest]: [0x4b, 0x6d, 0x35],
  [Veg.SlowForest]: [0x3e, 0x5f, 0x2d],
  [Veg.DenseForest]: [0x31, 0x4f, 0x25],
};

export interface LegendItem {
  label: string;
  kind: 'fill' | 'line' | 'dashed' | 'dot' | 'circle' | 'hatch';
  color: string;
  secondary?: string;
}

export const MAP_LEGEND: LegendItem[] = [
  { label: 'Contour (5 m)', kind: 'line', color: ISOM.contour },
  { label: 'Open land', kind: 'fill', color: ISOM.openLand },
  { label: 'Rough open land', kind: 'fill', color: ISOM.roughOpen },
  { label: 'Runnable forest', kind: 'fill', color: ISOM.white },
  { label: 'Slow / dense forest', kind: 'fill', color: ISOM.walk },
  { label: 'Lake', kind: 'fill', color: ISOM.water },
  { label: 'Marsh', kind: 'hatch', color: ISOM.marsh },
  { label: 'Road / path', kind: 'dashed', color: ISOM.black },
  { label: 'Boulder', kind: 'dot', color: ISOM.black },
  { label: 'Control', kind: 'circle', color: ISOM.course },
];
