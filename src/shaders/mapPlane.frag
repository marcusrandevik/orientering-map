uniform sampler2D uMap;
uniform sampler2D uHeight;        // terrain surface height (world Y), same UVs as the map
uniform float uPlaneY;
uniform float uUncutOpacity;      // opacity where the terrain is still below the plane
uniform float uTransition;
uniform vec3 uCutColor;
uniform float uIntersection;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vec3 col = texture2D(uMap, vUv).rgb;

  // Where the plane has passed through the terrain, the terrain has been
  // "compressed" into the map: fully opaque. Elsewhere the plane is a
  // translucent sheet so the 3D terrain underneath stays visible.
  float d = texture2D(uHeight, vUv).r - uPlaneY;
  float aa = max(fwidth(d), 1e-4);
  float covered = smoothstep(-aa, aa, d);
  float alpha = mix(uUncutOpacity, 1.0, covered);

  // Faint cool tint on the translucent part, so it reads as a sheet in space.
  col = mix(col * vec3(0.93, 0.97, 1.03), col, covered);

  // Outline where plane and terrain meet – continues the cut line on the 3D side.
  float edge = 1.0 - smoothstep(0.0, aa * 2.5, abs(d));
  col = mix(col, uCutColor, edge * 0.85 * uIntersection);
  alpha = max(alpha, edge * uIntersection);

  // Thin rim so the plane edge is visible while hovering.
  float hover = 1.0 - smoothstep(0.0, 0.35, uTransition);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float rim = 1.0 - smoothstep(0.0, 0.0035, e);
  col = mix(col, vec3(1.0), rim * 0.6 * hover);
  alpha = max(alpha, rim * hover);

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
