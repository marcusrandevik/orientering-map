import { useEffect } from 'react';
import { TerrainScene } from './components/TerrainScene/TerrainScene';
import { Header } from './components/UI/Header';
import { MapSlider } from './components/UI/MapSlider';
import { SettingsPanel } from './components/UI/SettingsPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTerrainStore } from './state/useTerrainStore';
import { loadTerrain } from './terrain/loadTerrain';

function LoadingOverlay() {
  const status = useTerrainStore((s) => s.terrainStatus);
  const error = useTerrainStore((s) => s.terrainError);
  if (status === 'ready') return null;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center">
      <div className="glass flex items-center gap-3 rounded-2xl px-5 py-3 text-sm text-white/85">
        {status === 'error' ? (
          <span>Could not load terrain: {error}</span>
        ) : (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Building terrain & orienteering map…
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const terrain = useTerrainStore((s) => s.terrain);
  useKeyboardShortcuts();

  useEffect(() => {
    const { terrainStatus, setTerrainLoading, setTerrain, setTerrainError } = useTerrainStore.getState();
    if (terrainStatus !== 'idle') return;
    setTerrainLoading();
    loadTerrain()
      .then(setTerrain)
      .catch((e: unknown) => setTerrainError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="app-bg relative h-dvh w-screen overflow-hidden text-white select-none">
      <div className="absolute inset-0 touch-none">{terrain && <TerrainScene terrain={terrain} />}</div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <Header />
      </div>
      <SettingsPanel />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <MapSlider />
      </div>

      <LoadingOverlay />
    </main>
  );
}
