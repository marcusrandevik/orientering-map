import { useTerrainStore } from '../../state/useTerrainStore';

export function Header() {
  const settingsOpen = useTerrainStore((s) => s.settingsOpen);
  const setSettingsOpen = useTerrainStore((s) => s.setSettingsOpen);
  const terrainName = useTerrainStore((s) => s.terrain?.data.config.name);

  return (
    <header className="pointer-events-none flex items-start justify-between gap-3 p-3 sm:p-5">
      <div className="pointer-events-auto glass rounded-2xl px-4 py-2.5">
        <h1 className="text-[15px] font-semibold tracking-tight text-white sm:text-base">
          Terrain <span className="text-white/50">→</span> Orienteering Map
        </h1>
        <p className="hidden text-xs text-white/55 sm:block">
          {terrainName ?? 'Loading terrain…'} · drag the map plane down through the landscape
        </p>
      </div>
      <button
        type="button"
        onClick={() => setSettingsOpen(!settingsOpen)}
        aria-expanded={settingsOpen}
        aria-controls="settings-panel"
        className="pointer-events-auto glass grid size-11 place-items-center rounded-2xl text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        title="Settings"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
        <span className="sr-only">Settings</span>
      </button>
    </header>
  );
}
