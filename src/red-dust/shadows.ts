import * as THREE from 'three';

let patched = false;

/**
 * Enhances Three.js r187 PCFShadowMap with receiver-plane slope depth bias
 * (dFdx/dFdy) and 9-tap IGN-rotated Vogel disk filtering on sampler2DShadow.
 * Safe and idempotent across hot reloads.
 */
export function patchShadowsR187(): void {
  if (patched) return;
  const src = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (!src.includes('#if defined( SHADOWMAP_TYPE_PCF )')) return;

  const targetBlock = `vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
\t\t\t\tvec2 radius = shadowRadius * texelSize;
\t\t\t\tfloat phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
\t\t\t\tshadow = (
\t\t\t\t\ttexture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
\t\t\t\t\ttexture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
\t\t\t\t\ttexture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
\t\t\t\t\ttexture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
\t\t\t\t\ttexture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
\t\t\t\t) * 0.2;`;

  const enhancedBlock = `vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
\t\t\t\tvec2 radius = shadowRadius * texelSize;
\t\t\t\t// Receiver-plane depth slope bias reduces acne on angled pipes & corrugated roofs
\t\t\t\tvec3 duvdx = dFdx( shadowCoord.xyz );
\t\t\t\tvec3 duvdy = dFdy( shadowCoord.xyz );
\t\t\t\tfloat det = duvdx.x * duvdy.y - duvdx.y * duvdy.x;
\t\t\t\tvec2 dzduv = abs( det ) > 1e-8 ? vec2(
\t\t\t\t\tduvdy.y * duvdx.z - duvdx.y * duvdy.z,
\t\t\t\t\tduvdx.x * duvdy.z - duvdy.x * duvdx.z
\t\t\t\t) / det : vec2( 0.0 );
\t\t\t\tdzduv = clamp( dzduv, vec2( -0.02 ), vec2( 0.02 ) );
\t\t\t\tfloat phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
\t\t\t\tfloat acc = 0.0;
\t\t\t\tfor ( int i = 0; i < 9; i ++ ) {
\t\t\t\t\tvec2 off = vogelDiskSample( i, 9, phi ) * radius;
\t\t\t\t\tfloat zBias = dot( off, dzduv );
\t\t\t\t\tacc += texture( shadowMap, vec3( shadowCoord.xy + off, clamp( shadowCoord.z + zBias, 0.0, 1.0 ) ) );
\t\t\t\t}
\t\t\t\tshadow = acc / 9.0;`;

  if (src.includes(targetBlock)) {
    THREE.ShaderChunk.shadowmap_pars_fragment = src.replace(targetBlock, enhancedBlock);
    patched = true;
  }
}

export function fitSunShadowFrustum(
  sunLight: THREE.DirectionalLight,
  centerX = 0,
  centerZ = -4,
  halfExtent = 34
): void {
  const cam = sunLight.shadow.camera;
  cam.left = -halfExtent;
  cam.right = halfExtent;
  cam.top = halfExtent;
  cam.bottom = -halfExtent;
  cam.near = 2;
  cam.far = 145;
  cam.updateProjectionMatrix();

  sunLight.target.position.set(centerX, 0, centerZ);
  sunLight.target.updateMatrixWorld();
}
