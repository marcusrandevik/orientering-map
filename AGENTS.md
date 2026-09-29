# AGENTS.md

Guide for coding agents working on this repo. Read this first, then `README.md` (user-facing docs)
and `goal.md` (the original product brief).

## What this is

A browser-only 3D visualisation of how an orienteering map represents terrain. A horizontal
**map plane** carrying an ISOM-style orienteering map descends through a 3D landscape as the user
drags a slider (`mapLevel` 0 → 1). At 1.0 the result is a clean, north-up 2D map. No backend and no
external APIs: the demo terrain is generated procedurally at load time.

- Live site: https://multo.monster/orientering-map/ (GitHub Pages, custom domain of the owner's account)
- Repo: https://github.com/marcusrandevik/orientering-map (public, branch `main`)

## Stack & commands

React 19 · TypeScript · Vite · React Three Fiber + Drei · Three.js · Tailwind CSS v4 (`@tailwindcss/vite`) · Zustand.

```bash
npm install
npm run dev        # http://localhost:5173 (base "/")
npm run build      # tsc --noEmit + vite build → dist/ (base "/orientering-map/")
npm run typecheck
```

There is **no test suite**. Validate changes with `npm run build` and, for visual changes, by
running the app (headless Chrome screenshots at desktop 1400×900 and mobile 390×844 worked well).

## Directory map

```
src/
  App.tsx                     loads terrain, lays out scene + HUD (Header, SettingsPanel, MapSlider)
  terrain/
    types.ts                  core types (TerrainConfig, TerrainData, Grid, features…)
    coordinates.ts            THE metres → world transform (WORLD_SIZE = 20, vertical exaggeration)
    mapLevel.ts               slider → plane elevation/opacity, easing, camera/transition blends
    loadTerrain.ts            reads public/terrain/terrain.json, builds TerrainData
    loadHeightmap.ts          grayscale PNG DEM loader (source: "heightmap")
    generateTerrain.ts, noise.ts, grid.ts   procedural heights, seeded noise, grid helpers
    classify.ts               vegetation/ground classification (shared by 3D and 2D)
    generateContours.ts       marching-squares contours
  data/demoTerrain.ts         demo lake, trails, buildings, boulders, course
  map/
    renderOrienteeringMap.ts  draws the 2D ISOM-style map onto a canvas (texture of the plane)
    renderGroundTexture.ts    realistic ground texture for the 3D terrain
    mapSymbols.ts             ISOM colours/symbol sizes
  shaders/
    terrain.vert/.frag        terrain clipping at the plane + glowing cut line
    mapPlane.vert/.frag       plane opacity: opaque where it has cut terrain, translucent elsewhere
    clippedMaterial.ts        helpers for materials using the shared clip plane
  components/TerrainScene/    Canvas scene: TerrainMesh, MapPlane, TerrainFeatures (trees, water,
                              buildings, flags), SceneDriver (per-frame updates), TerrainControls
                              (OrbitControls + optional camera rig), sceneConstants
  components/UI/              Header, MapSlider, PlayButton, SettingsPanel
  state/useTerrainStore.ts    Zustand store: terrain load status, mapLevel, play, toggles, camera
  state/animationState.ts     mutable per-frame values + sharedUniforms + mapClipPlane
  hooks/useKeyboardShortcuts.ts  ←/→ (Shift = big step), Home/End, Space
public/
  terrain/terrain.json        terrain config (size, elevation range, contour interval, source…)
  og-image.jpg, favicon.svg
.github/workflows/deploy.yml  build + deploy to GitHub Pages on push to main
```

## Key concepts & invariants

1. **One coordinate system.** Everything is defined in terrain metres (`x` east, `y` north,
   `elevation`). Convert to world space only via `createWorldTransform` in
   `src/terrain/coordinates.ts` (world X = east, Y = up, Z = −north). Don't add ad-hoc scaling: it
   would misalign the map and the terrain.
2. **3D and 2D share their data.** The 2D map (`renderOrienteeringMap.ts`), the 3D ground texture
   and the tree placement all derive from `classify.ts` + `demoTerrain.ts`. When you add a feature,
   add it in both views from the same source.
3. **Slider → plane height** lives in `mapLevel.ts`:
   `mapHeight = top − easing(level) · (top − bottom)`, with top/bottom offsets, hover/inside
   opacity and easing in `DEFAULT_MAP_LEVEL_CONFIG`. Tune it there, not in components.
4. **Clip direction (a deliberate design choice).** Terrain *above* the plane (already passed
   through) is discarded, i.e. "compressed into the map". Terrain *below* the plane stays 3D.
   This is the reverse of the literal wording in `goal.md`. To flip it, change it consistently in
   `shaders/terrain.frag`, `shaders/mapPlane.frag` and `mapClipPlane` (`animationState.ts`).
   Built-in materials (trees, water, buildings, flags) use `mapClipPlane`, and custom shaders use
   `sharedUniforms.uPlaneY`.
5. **Per-frame state stays out of React.** `SceneDriver` smooths the store's target `mapLevel`
   into `animationState.level` each frame and updates `sharedUniforms` and `mapClipPlane.constant`.
   Read `animationState` inside `useFrame`. Don't put per-frame values into Zustand (it causes
   re-renders).
6. **Camera.** The slider does **not** change the camera by default (user request). The old
   "assistive rig" that tilts to top-down near 2D is still in `TerrainControls.tsx`, behind the
   `autoCamera` store flag (Settings → "Camera follows slider", default `false`). "Reset camera"
   returns to the default 3D pose when `autoCamera` is off.

## Real data hooks

`public/terrain/terrain.json` supports `"source": "heightmap"` + `"heightmap": "<png>"` (grayscale DEM,
black = minElevation, white = maxElevation) and `"map": "<png>"` (pre-drawn map, same extent, north up).
**Neither path has been tested with real files yet.** Lakes, vegetation and features still come from
`demoTerrain.ts`. Real data (GeoTIFF/OSM/Lantmäteriet) only needs to produce the same `TerrainData`.

## Deployment & gotchas

- Any push to `main` triggers `.github/workflows/deploy.yml` (Node 22, `npm ci`, `npm run build`, upload
  `dist`). Pages source is set to "GitHub Actions".
- `vite.config.ts` sets `base: '/orientering-map/'` only for `build`. Reference assets in `public/`
  via relative paths or `import.meta.env.BASE_URL`, never a hard-coded leading `/…`, or they will
  break on Pages.
- Link-preview tags (Open Graph/Twitter) in `index.html` use absolute
  `https://multo.monster/orientering-map/...` URLs. If the domain or repo name changes, update them.
- **Check that new files in `public/` are committed.** A previous bug: `og-image.jpg` was untracked,
  so the live preview image returned 404. Run `git status` before pushing.
- `og-image.jpg` is CC BY-SA 3.0 (credit is in `README.md`). Keep the credit if you replace or
  derive from it.
- "Enforce HTTPS" in the repo's Pages settings may still be off; that's a repo setting, not code.

## Conventions

- TypeScript strict, functional React components, named exports, 2-space indentation, single quotes.
- Tailwind utility classes for the UI. The shared `glass` panel style is in `src/index.css`.
- Sparse JSDoc comments on exported functions/types explaining *why*. Match that density.
- Only commit when asked. Add `--trailer "Co-authored-by: Junie <junie@jetbrains.com>"` to commits.

## History (initial development)

1. `c937a72` MVP from `goal.md`: procedural terrain, contours, ISOM map, shader-based cut, slider,
   play/reverse animation, keyboard shortcuts, settings panel, responsive layout.
2. Camera no longer follows the slider by default (opt-in toggle kept).
3. Git repo + GitHub Pages workflow + Vite base path.
4. `e18b745` / `dd3f7de` Link-preview meta tags and image (the image was fixed in the second commit).

## Possible next steps

Test with a real DEM/map image; load real vector features; make a 1200×630 preview image (the current
one is 420×240); add a test setup (e.g. Vitest for `mapLevel.ts`, `generateContours.ts`, `coordinates.ts`).
