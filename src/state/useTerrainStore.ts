import { create } from 'zustand';
import type { TerrainAssets } from '../terrain/loadTerrain';

export type TerrainStatus = 'idle' | 'loading' | 'ready' | 'error';
export type GroundStyle = 'realistic' | 'elevation';
export type PlayDirection = 1 | -1;

export interface TerrainStore {
  /** Target slider value, 0 = 3D, 1 = 2D. The scene eases towards it. */
  mapLevel: number;
  setMapLevel: (v: number) => void;
  nudgeMapLevel: (delta: number) => void;

  isPlaying: boolean;
  playDirection: PlayDirection;
  /** Duration of a full 3D → 2D sweep in seconds. */
  playDuration: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;

  /** Opt-in: camera follows the slider towards a top-down view. Off by default. */
  autoCamera: boolean;
  setAutoCamera: (v: boolean) => void;
  /** Incremented to request a camera reset. */
  cameraResetToken: number;
  resetCamera: () => void;

  groundStyle: GroundStyle;
  setGroundStyle: (s: GroundStyle) => void;
  showTerrainContours: boolean;
  setShowTerrainContours: (v: boolean) => void;
  showVegetation: boolean;
  setShowVegetation: (v: boolean) => void;
  showIntersection: boolean;
  setShowIntersection: (v: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  terrainStatus: TerrainStatus;
  terrainError: string | null;
  terrain: TerrainAssets | null;
  setTerrainLoading: () => void;
  setTerrain: (t: TerrainAssets) => void;
  setTerrainError: (message: string) => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const useTerrainStore = create<TerrainStore>((set, get) => ({
  mapLevel: 0,
  setMapLevel: (v) => set({ mapLevel: clamp01(v) }),
  nudgeMapLevel: (delta) => set({ mapLevel: clamp01(get().mapLevel + delta), isPlaying: false }),

  isPlaying: false,
  playDirection: 1,
  playDuration: 6.5,
  play: () => {
    const { mapLevel, playDirection } = get();
    // At an end: play in the direction that makes sense.
    let dir = playDirection;
    if (mapLevel >= 1) dir = -1;
    else if (mapLevel <= 0) dir = 1;
    set({ isPlaying: true, playDirection: dir });
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => (get().isPlaying ? get().pause() : get().play()),

  autoCamera: false,
  setAutoCamera: (v) => set({ autoCamera: v }),
  cameraResetToken: 0,
  resetCamera: () => set((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),

  groundStyle: 'realistic',
  setGroundStyle: (groundStyle) => set({ groundStyle }),
  showTerrainContours: true,
  setShowTerrainContours: (showTerrainContours) => set({ showTerrainContours }),
  showVegetation: true,
  setShowVegetation: (showVegetation) => set({ showVegetation }),
  showIntersection: true,
  setShowIntersection: (showIntersection) => set({ showIntersection }),

  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  terrainStatus: 'idle',
  terrainError: null,
  terrain: null,
  setTerrainLoading: () => set({ terrainStatus: 'loading', terrainError: null }),
  setTerrain: (terrain) => set({ terrain, terrainStatus: 'ready' }),
  setTerrainError: (terrainError) => set({ terrainError, terrainStatus: 'error' }),
}));
