uniform sampler2D uGround;
uniform float uPlaneY;
uniform float uTransition;
uniform float uContourOpacity;
uniform float uContourInterval;   // metres between contours
uniform float uMetresPerUnit;     // world Y → metres
uniform float uMinElevation;      // metres at world Y = 0
uniform float uIndexEvery;
uniform float uIntersection;      // 0/1 – highlight where the plane cuts
uniform float uElevationStyle;    // 0 realistic … 1 hypsometric
uniform float uMaxY;
uniform vec3 uLightDir;
uniform vec3 uContourColor;
uniform vec3 uCutColor;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vSide;

vec3 hypsometric(float t) {
  vec3 c0 = vec3(0.16, 0.36, 0.20);
  vec3 c1 = vec3(0.55, 0.62, 0.30);
  vec3 c2 = vec3(0.66, 0.50, 0.30);
  vec3 c3 = vec3(0.93, 0.91, 0.88);
  if (t < 0.4) return mix(c0, c1, t / 0.4);
  if (t < 0.8) return mix(c1, c2, (t - 0.4) / 0.4);
  return mix(c2, c3, (t - 0.8) / 0.2);
}

float lineMask(float value, float widthPx) {
  float w = fwidth(value);
  float d = abs(fract(value - 0.5) - 0.5);
  return 1.0 - smoothstep(0.0, w * widthPx, d);
}

void main() {
  // The descending map plane "compresses" the world: terrain the plane has
  // passed through (above it) is flattened into the map, so discard it.
  float below = uPlaneY - vWorldPos.y;
  if (below < 0.0) discard;

  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;

  vec3 base;
  if (vSide > 0.5) {
    // Diorama side walls: layered soil.
    float strata = 0.5 + 0.5 * sin(vWorldPos.y * 18.0);
    base = mix(vec3(0.20, 0.14, 0.09), vec3(0.28, 0.20, 0.13), strata);
    base = mix(base, vec3(0.12, 0.09, 0.06), smoothstep(0.0, -1.0, vWorldPos.y));
  } else {
    base = texture2D(uGround, vUv).rgb;
    float slope = 1.0 - n.y;
    base = mix(base, vec3(0.30, 0.29, 0.27), smoothstep(0.22, 0.5, slope) * 0.55);
    vec3 hyp = hypsometric(clamp(vWorldPos.y / uMaxY, 0.0, 1.0));
    base = mix(base, hyp, uElevationStyle);
  }

  // Lighting: hemisphere ambient + directional.
  vec3 L = normalize(uLightDir);
  float diff = max(dot(n, L), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 ambient = mix(vec3(0.20, 0.18, 0.16), vec3(0.42, 0.46, 0.52), hemi);
  vec3 col = base * (ambient + vec3(1.0, 0.96, 0.88) * diff * 0.95);

  // Contour lines on the 3D surface – the "same" lines as on the map.
  if (vSide < 0.5) {
    float f = (vWorldPos.y * uMetresPerUnit + uMinElevation) / uContourInterval;
    float minor = lineMask(f, 1.1);
    float index = lineMask(f / uIndexEvery, 1.6);
    float c = max(minor * 0.75, index);
    col = mix(col, uContourColor, c * uContourOpacity);
  }

  // Glowing cut line where the map plane intersects the terrain.
  float cutWidth = max(fwidth(vWorldPos.y) * 2.5, 0.012);
  float cut = 1.0 - smoothstep(0.0, cutWidth, below);
  col = mix(col, uCutColor, cut * uIntersection);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
