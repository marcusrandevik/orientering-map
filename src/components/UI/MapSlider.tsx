import { useEffect, useRef, type CSSProperties } from 'react';
import { animationState } from '../../state/animationState';
import { useTerrainStore } from '../../state/useTerrainStore';
import { PlayButton } from './PlayButton';

/** Live readout of the plane elevation without re-rendering React every frame. */
function PlaneReadout() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = '';
    const tick = () => {
      const text = `${Math.round(animationState.planeElevation)} m`;
      if (ref.current && text !== last) {
        ref.current.textContent = text;
        last = text;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} className="tabular-nums" />;
}

export function MapSlider() {
  const mapLevel = useTerrainStore((s) => s.mapLevel);
  const setMapLevel = useTerrainStore((s) => s.setMapLevel);
  const pause = useTerrainStore((s) => s.pause);
  const pct = Math.round(mapLevel * 100);

  return (
    <div className="pointer-events-auto glass w-full max-w-3xl rounded-3xl px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <PlayButton />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
            <span className={mapLevel < 0.5 ? 'text-white' : ''}>3D terrain</span>
            <span className="hidden normal-case tracking-normal text-white/50 sm:inline">
              Map plane at <PlaneReadout />
            </span>
            <span className={mapLevel >= 0.5 ? 'text-white' : ''}>2D map</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={mapLevel}
            onChange={(e) => {
              pause();
              setMapLevel(Number(e.target.value));
            }}
            aria-label="Map plane level: 3D terrain to 2D orienteering map"
            aria-valuetext={`${pct}% towards 2D map`}
            className="map-slider w-full"
            style={{ '--fill': `${mapLevel * 100}%` } as CSSProperties}
          />
          <div className="mt-1 flex justify-between text-[11px] text-white/45 sm:hidden">
            <span>
              Plane <PlaneReadout />
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
        </div>
        <span className="hidden w-10 text-right text-sm font-semibold tabular-nums text-white/80 sm:block">{pct}%</span>
      </div>
    </div>
  );
}
