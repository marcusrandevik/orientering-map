import { useEffect } from 'react';
import { useTerrainStore } from '../state/useTerrainStore';

const SMALL_STEP = 0.02;
const LARGE_STEP = 0.1;

/**
 *   ← / →  slider − / + small step (Shift = large step)
 *   Home   full 3D
 *   End    full 2D
 *   Space  play / pause
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Leave text inputs and buttons alone (Space activates buttons).
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && (target as HTMLInputElement).type !== 'range')) return;

      const store = useTerrainStore.getState();
      const step = e.shiftKey ? LARGE_STEP : SMALL_STEP;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          store.nudgeMapLevel(-step);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          store.nudgeMapLevel(step);
          break;
        case 'Home':
          store.pause();
          store.setMapLevel(0);
          break;
        case 'End':
          store.pause();
          store.setMapLevel(1);
          break;
        case ' ':
          if (tag === 'BUTTON') return;
          store.togglePlay();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
