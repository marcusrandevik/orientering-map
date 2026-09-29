# Terrain → Orienteering Map

An interactive 3D visualisation that shows how an orienteering map represents real terrain.
A horizontal **map plane** carrying an orienteering map descends through a 3D landscape as you
drag the slider. Terrain the plane has passed through is "compressed" into the map, while the
terrain still below it stays 3D. At 100 % you have a clean, north-up 2D orienteering map.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Controls

| Input | Action |
| --- | --- |
| Slider / ← → (Shift = bigger step) | Move the map plane 3D ↔ 2D |
| Home / End | Full 3D / full 2D |
| Space or ▶ | Play 3D → 2D (≈6.5 s); press again at the end to play back |
| Drag · wheel/pinch · right-drag/two-finger drag | Orbit · zoom · pan |

The slider never changes the camera: you keep whatever viewing angle you have chosen while the map
plane moves. If you prefer the camera to ease towards a top-down view as the slider approaches 2D,
enable "Camera follows slider" under Settings.

## How it works

* **One coordinate system.** Terrain, map texture, features and map plane all use terrain metres
  (`x` east, `y` north, `elevation`), see `src/terrain/types.ts`. `src/terrain/coordinates.ts` maps them to
  world space (with vertical exaggeration applied only in 3D).
* **Slider → plane elevation** is configurable in `src/terrain/mapLevel.ts`
  (`mapHeight = top − ease(mapLevel) · (top − bottom)`), including the easing and opacity behaviour.
* **Clipping.** `shaders/terrain.frag` discards terrain above the plane and draws a glowing cut line.
  Trees, buildings and water use a Three.js clipping plane with the same height. `shaders/mapPlane.frag`
  samples a terrain height texture, so the plane is opaque exactly where it has cut the terrain and
  translucent elsewhere.
* **Map generation.** `src/map/renderOrienteeringMap.ts` draws an ISOM-style map (contours from marching
  squares, vegetation, lake, trails, buildings, boulders, north lines, course overprint) from the same
  data that drives the 3D ground texture and tree placement (`src/terrain/classify.ts`). This keeps both
  views geometrically aligned.
* **State.** Zustand (`src/state/useTerrainStore.ts`) holds UI/scene state. Per-frame animated values live
  in `src/state/animationState.ts` to avoid React re-renders.

## Using real data

`public/terrain/terrain.json` configures the terrain:

```json
{ "width": 2000, "height": 2000, "minElevation": 0, "maxElevation": 120,
  "contourInterval": 5, "source": "procedural", "heightmap": null, "map": null }
```

* Set `"source": "heightmap"` and `"heightmap": "heightmap.png"` to load a grayscale DEM export
  (black = `minElevation`, white = `maxElevation`) from `public/terrain/`.
* Set `"map": "map.png"` to use a pre-drawn orienteering map instead of the generated one.
  It must cover exactly the same extent, with north up.

Lakes, vegetation and features currently come from the procedural demo (`src/data/demoTerrain.ts`).
Replacing them with GeoTIFF, OSM or Lantmäteriet data only requires producing the same `TerrainData`
structure.
