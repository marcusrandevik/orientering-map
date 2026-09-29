attribute float aSide;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vSide;

void main() {
  vUv = uv;
  vSide = aSide;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
