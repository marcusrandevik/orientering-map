# Interactive 3D → Orienteering Map

## Overview

Build a modern web application that helps users understand how an orienteering map represents real-world terrain.

The core concept is an interactive slider that controls a horizontal "map plane" moving through a 3D terrain model.

When the map plane is high above the terrain, the user primarily sees a realistic 3D landscape.

As the user drags the slider downward, the map plane gradually moves down through the terrain. Parts of the terrain that are below the map plane are replaced/represented by the orienteering map's symbols.

At the lowest slider position, the entire terrain should be reduced to a traditional 2D orienteering map.

The experience should feel as if the user is literally "compressing" the three-dimensional world into an orienteering map.

---

# Technical Stack

Use the following stack unless there is a strong reason to choose something else.

### Frontend

* React
* TypeScript
* Vite
* Three.js
* React Three Fiber
* Drei
* Tailwind CSS

### State

Use React state for simple UI state.

Use Zustand for central application/3D state, for example:

* slider position
* map plane elevation
* camera state
* active visualization mode
* terrain loading state

### 3D

Use Three.js through React Three Fiber.

The terrain should be represented as a heightmap/DEM.

Use:

* `THREE.Mesh`
* `PlaneGeometry` or a custom terrain mesh
* shader/material-based terrain visualization
* clipping planes or shader-based clipping for the map plane

### Data Format

Design the application so that terrain data can later come from real DEM data.

For the first version, however, use a local demo terrain that can be loaded without external APIs.

Example:

```text
public/
  terrain/
    heightmap.png
    terrain.json
    map.png
```

`terrain.json` could contain:

```json
{
  "width": 2000,
  "height": 2000,
  "minElevation": 0,
  "maxElevation": 250,
  "contourInterval": 5
}
```

---

# Main Layout

The application should be a fullscreen web application.

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│  Terrain → Orienteering Map                    [Settings]   │
│                                                             │
│  3D terrain                                                 │
│                                                             │
│                  ┌─────────────────────────┐                │
│                  │      MAP PLANE          │                │
│                  │  orienteering symbols   │                │
│                  └─────────────────────────┘                │
│                                                             │
│                                                             │
│                                                             │
│  3D ────────────────●──────────────────────────── 2D       │
└─────────────────────────────────────────────────────────────┘
```

On mobile, adapt the layout so that the 3D view remains usable and the slider is positioned along the bottom.

---

# Slider

The slider is the application's most important UI element.

It represents the elevation of the map plane.

Left/low slider position:

```text
3D
●─────────────────────────────── 2D
```

Right/high slider position:

```text
3D
───────────────────────────────● 2D
```

Semantically, the slider value should be normalized:

```typescript
const mapLevel = 0..1
```

where:

```text
0 = map plane high above the terrain
1 = map plane down at/below the entire terrain
```

The actual map plane elevation can be calculated, for example:

```typescript
const mapHeight =
    maxTerrainHeight -
    mapLevel * terrainHeightRange;
```

This relationship should be configurable so it can easily be adjusted.

---

# Visualization

## Step 1 – 3D

When the slider is at the 3D end:

* the entire terrain should be visible
* the map plane should be clearly above the terrain
* the map plane should contain orienteering map symbols
* the user should be able to see both the terrain and the map plane
* the map plane can be slightly transparent or use subtle visual separation

Conceptually:

```text
       ORIENTEERING MAP
   ──────────────────────────
           ↓
           ↓
      /\          ___
     /  \___     /   \
 ___/       \___/     \____
       3D TERRAIN
```

---

# Step 2 – Map Plane Moving Through the Terrain

As the slider value increases, the map plane moves downward.

Terrain above the map plane should remain visible as 3D geometry.

Terrain below the map plane should visually be replaced by the map representation.

This is the most important part of the application.

Conceptually:

```text
        /\
       /  \       ← 3D terrain
──────/────\────────  MAP PLANE
     /      \
____/________\____

        ↓
```

Use clipping/shader techniques so that the transition is visually precise.

---

# Step 3 – Almost Completely 2D

As the map plane approaches the lowest elevation of the terrain:

* only small portions of the 3D landscape should remain visible
* the orienteering map symbols should dominate the visualization

---

# Step 4 – Complete Orienteering Map

When:

```typescript
mapLevel === 1
```

the entire 3D model should be below the map plane.

The result should visually be a clean 2D orienteering map.

The camera should simultaneously transition from a perspective view to an almost top-down view.

This should be a smooth interpolation rather than an abrupt camera change.

Conceptually:

```text
┌────────────────────────────────────────────┐
│                                            │
│       ╭──────╮                             │
│    ╭──╯      ╰──╮        ~~~~~             │
│    │   ⑥   ⑦    │      ~~~~~~~            │
│    ╰──────┬──────╯                          │
│       ────┼──────                            │
│          ╱                                 │
│      ───╯                                  │
│                                            │
│              2D MAP                        │
└────────────────────────────────────────────┘
```

---

# Camera

The camera should be interactive.

Use OrbitControls through Drei.

The user should be able to:

* rotate around the terrain
* pan
* zoom

The slider interaction must be independent of the camera.

As `mapLevel` approaches `1`, the camera can automatically interpolate toward a top-down view.

For example:

```typescript
cameraPosition = lerp(
    perspectiveCameraPosition,
    topDownCameraPosition,
    smoothstep(mapLevel)
)
```

However, the user should always be able to take control of the camera again.

---

# Orienteering Map

For the MVP, the application does not need to automatically generate a real orienteering map.

Instead, use a demo overlay that follows the terrain's coordinate system.

It can contain:

* contour lines
* trails
* lakes
* forest areas
* open areas
* rocks/boulders
* buildings
* orienteering controls

It is important that the map is geometrically aligned with the terrain.

For example, if there is a lake in the 3D model, the same lake must exist at the exact corresponding position on the orienteering map.

---

# Contour Lines

To demonstrate the concept, contour lines should be clearly visible.

Generate contour lines from the heightmap.

For example:

```text
Contour lines:
5 m
10 m
15 m
20 m
25 m
```

They should follow the actual elevation of the terrain.

This is important for the educational aspect of the visualization.

The user should be able to see the relationship between:

```text
3D:

       /\
      /  \
     /    \
    /      \


2D:

    (──────)
     (────)
      (──)
```

---

# Rendering

For the MVP, relatively simple rendering is acceptable.

Prioritize:

1. Clear visualization
2. Smooth slider interaction
3. Correct geometric relationship
4. Good UX
5. High FPS

A future implementation can use custom GLSL shaders to make the transition even more sophisticated.

---

# Animation

The slider should not simply switch between states.

All changes should be interpolated smoothly.

For example:

```typescript
const t = smoothstep(0, 1, mapLevel);
```

Use this interpolation for:

* map plane elevation
* clipping
* terrain visualization
* camera angle
* map opacity
* potential color transitions

The goal is for the process to feel physical.

---

# UI

The design should be minimalist and modern.

Take inspiration from:

* Apple Maps
* Google Earth
* ArcGIS
* modern GIS applications

Avoid traditional "dashboard" design.

The main view should dominate the screen.

UI elements should be subtle and may use glassmorphism where appropriate.

Example:

```text
┌──────────────────────────────────────┐
│ Terrain → Map                        │
│                                      │
│                                      │
│              3D VIEW                 │
│                                      │
│                                      │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 3D                     2D        │ │
│ │───────●─────────────────────────│ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

# Interaction

### Primary Interaction

Drag the slider.

It should immediately update:

* map plane elevation
* clipping
* map visibility
* camera perspective

### Secondary Interaction

Mouse/touch:

* drag → rotate
* pinch/wheel → zoom
* two-finger drag → pan

### Keyboard

Implement:

```text
Arrow Left  → slider - small step
Arrow Right → slider + small step
Home        → full 3D
End         → full 2D
Space       → play animation
```

---

# Play Function

Add a small play button next to the slider.

When the user presses play, the slider should automatically move from:

```text
3D → 2D
```

over approximately 5–8 seconds.

This should clearly demonstrate the concept.

When it reaches the end, allow the animation to reverse.

---

# Architecture

Structure the project approximately as follows:

```text
src/
  components/
    TerrainScene/
      TerrainScene.tsx
      TerrainMesh.tsx
      MapPlane.tsx
      TerrainControls.tsx

    UI/
      MapSlider.tsx
      PlayButton.tsx
      Header.tsx

  terrain/
    loadHeightmap.ts
    generateTerrain.ts
    generateContours.ts

  state/
    useTerrainStore.ts

  shaders/
    terrain.vert
    terrain.frag
    mapPlane.vert
    mapPlane.frag

  data/
    demoTerrain.ts

  App.tsx
  main.tsx
```

Keep 3D rendering separated from UI/state.

---

# Important Implementation Detail

The terrain and map must use the same coordinate system.

Define something like:

```typescript
type TerrainCoordinate = {
    x: number;
    y: number;
    elevation: number;
};
```

The map plane uses the same X/Y coordinates but a separate elevation value.

This makes it possible to later replace the demo terrain with real DEM data without having to rebuild the visualization logic.

---

# MVP

The first implementation should NOT attempt to solve the entire problem of generating real orienteering maps.

The MVP should demonstrate the concept using:

* a beautiful demo terrain
* heightmap
* contour lines
* an orienteering map
* map plane
* slider
* clipping
* 3D → 2D transition
* orbit controls
* play animation

The most important thing is that the user immediately understands:

> "I am looking at a 3D world, and by dragging the map plane down I can see how that world is translated into an orienteering map."

---

# Future Functionality

The architecture should leave room for:

1. Importing GeoTIFF/DEM data.
2. Importing real orienteering maps.
3. OpenStreetMap data.
4. Swedish National Land Survey elevation data.
5. Automatic contour generation.
6. Automatic identification of terrain features.
7. Support for the Swedish orienteering map symbol standard.
8. Different map scales.
9. Comparing a regular topographic map with an orienteering map.
10. VR/AR.
11. Sharing a specific terrain.
12. GPS positioning.
13. Mobile use in the field.

---

# Definition of Done

The MVP is complete when:

* the application starts with a demo terrain
* the user can rotate and zoom the terrain
* an orienteering map plane is visible above the terrain
* the slider moves the map plane through the terrain
* only terrain above the plane is rendered as 3D
* the map becomes increasingly dominant as the plane moves downward
* at 100% the result is essentially a clean 2D orienteering map
* the transition is smooth and visually impressive
* the play button can automatically demonstrate the transition
* the application works on desktop and basic touch devices
* rendering maintains a stable, high FPS on a modern laptop

Prioritize the visual demonstration over advanced data handling in the first version.
