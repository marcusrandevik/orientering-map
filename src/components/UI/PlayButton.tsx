import { useTerrainStore } from '../../state/useTerrainStore';

export function PlayButton() {
  const isPlaying = useTerrainStore((s) => s.isPlaying);
  const atEnd = useTerrainStore((s) => s.mapLevel >= 1);
  const togglePlay = useTerrainStore((s) => s.togglePlay);

  const label = isPlaying ? 'Pause' : atEnd ? 'Play back to 3D' : 'Play 3D → 2D';

  return (
    <button
      type="button"
      onClick={togglePlay}
      aria-label={label}
      title={`${label} (Space)`}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-slate-900 shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {isPlaying ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <rect x="6" y="5" width="4" height="14" rx="1.2" />
          <rect x="14" y="5" width="4" height="14" rx="1.2" />
        </svg>
      ) : atEnd ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12a8 8 0 1 0 2.4-5.7" />
          <path d="M4 4v4.5h4.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor" aria-hidden>
          <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z" />
        </svg>
      )}
    </button>
  );
}
