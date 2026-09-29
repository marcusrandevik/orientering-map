import { MAP_LEGEND, type LegendItem } from '../../map/mapSymbols';
import { useTerrainStore } from '../../state/useTerrainStore';

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span>
        <span className="block text-sm text-white/90">{label}</span>
        {hint && <span className="block text-[11px] text-white/45">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-10 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-sky-400/90 peer-focus-visible:outline-2 peer-focus-visible:outline-white after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
    </label>
  );
}

function LegendSwatch({ item }: { item: LegendItem }) {
  const common = 'h-3.5 w-6 shrink-0 rounded-[3px]';
  switch (item.kind) {
    case 'fill':
      return <span className={`${common} ring-1 ring-black/20`} style={{ background: item.color }} />;
    case 'hatch':
      return (
        <span
          className={`${common} ring-1 ring-black/20`}
          style={{ background: `repeating-linear-gradient(0deg, ${item.color} 0 1.5px, #fff 1.5px 4px)` }}
        />
      );
    case 'line':
      return (
        <span className={`${common} grid place-items-center bg-white`}>
          <span className="h-[2px] w-5" style={{ background: item.color }} />
        </span>
      );
    case 'dashed':
      return (
        <span className={`${common} grid place-items-center bg-white`}>
          <span className="h-[2px] w-5" style={{ background: `repeating-linear-gradient(90deg, ${item.color} 0 5px, transparent 5px 7px)` }} />
        </span>
      );
    case 'dot':
      return (
        <span className={`${common} grid place-items-center bg-white`}>
          <span className="size-1.5 rounded-full" style={{ background: item.color }} />
        </span>
      );
    case 'circle':
      return (
        <span className={`${common} grid place-items-center bg-white`}>
          <span className="size-3 rounded-full border-[1.5px]" style={{ borderColor: item.color }} />
        </span>
      );
    case 'tower':
      return (
        <span className={`${common} grid place-items-center bg-white`}>
          <span className="size-2 border-x-[1.5px] border-t-[1.5px]" style={{ borderColor: item.color }} />
        </span>
      );
  }
}

export function SettingsPanel() {
  const s = useTerrainStore();
  if (!s.settingsOpen) return null;

  return (
    <aside
      id="settings-panel"
      className="pointer-events-auto glass absolute top-[4.25rem] right-3 z-20 max-h-[calc(100dvh-12rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-4 sm:top-20 sm:right-5"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">View</h2>
        <button type="button" onClick={() => s.setSettingsOpen(false)} className="text-white/50 hover:text-white" aria-label="Close settings">
          ✕
        </button>
      </div>
      <Toggle label="Camera follows slider" hint="Off keeps your viewing angle; on tilts to top-down near 2D" checked={s.autoCamera} onChange={s.setAutoCamera} />
      <Toggle label="Contours on terrain" checked={s.showTerrainContours} onChange={s.setShowTerrainContours} />
      <Toggle label="Highlight plane cut" hint="The contour at the map plane’s elevation" checked={s.showIntersection} onChange={s.setShowIntersection} />
      <Toggle label="Trees" checked={s.showVegetation} onChange={s.setShowVegetation} />

      <div className="mt-2 flex items-center justify-between gap-2 py-1.5">
        <span className="text-sm text-white/90">Terrain colours</span>
        <div className="flex rounded-full bg-white/10 p-0.5 text-xs">
          {(['realistic', 'elevation'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => s.setGroundStyle(style)}
              className={`rounded-full px-2.5 py-1 capitalize transition ${s.groundStyle === style ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={s.resetCamera}
        className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm text-white/90 transition hover:bg-white/15"
      >
        Reset camera
      </button>

      <h2 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Map legend</h2>
      <ul className="grid grid-cols-1 gap-1.5">
        {MAP_LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-[13px] text-white/80">
            <LegendSwatch item={item} />
            {item.label}
          </li>
        ))}
      </ul>

      <h2 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Keyboard</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] text-white/70">
        <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Move map plane</dd>
        <dt><kbd>Home</kbd></dt><dd>Full 3D</dd>
        <dt><kbd>End</kbd></dt><dd>Full 2D</dd>
        <dt><kbd>Space</kbd></dt><dd>Play / pause</dd>
      </dl>
    </aside>
  );
}
