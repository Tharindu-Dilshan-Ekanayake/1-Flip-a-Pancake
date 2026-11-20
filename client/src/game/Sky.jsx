import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, ShaderMaterial } from 'three'

import { useQuality } from '../store/quality'
import { skyUniforms } from './skyState'

/** Unit dome, scaled to just inside the camera's far plane for the current preset. */
const SKY_RADIUS = 1

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Game-day sky, all in one shader: the zenith-to-horizon gradient, a big soft glow round
 * the low sun (and a bright core in its middle), a scatter of thin streaky high clouds lit
 * warm on the sun's side, and - for the night stages - stars. No textures, no geometry
 * beyond the dome, nothing done per frame on the CPU.
 */
const skyFragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform float exponent;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float glow;
  uniform float clouds;
  uniform float stars;
  uniform float fantasy;
  uniform vec3 nebulaA;
  uniform vec3 nebulaB;
  uniform float aurora;
  uniform float moon;
  uniform vec3 moonColor;
  uniform float time;

  varying vec3 vDirection;

  float skyHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float skyNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), u.x), mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float skyFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * skyNoise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;
    // Below the horizon stays horizon-coloured, matching the fog on distant ground.
    vec3 color = mix(horizonColor, topColor, pow(max(h, 0.0), exponent));

    // The low sun: a wide warm haze, a tighter glow and a bright core.
    float s = max(dot(dir, normalize(sunDirection)), 0.0);
    color += sunColor * glow * (0.35 * pow(s, 6.0) + 0.45 * pow(s, 40.0) + 1.2 * pow(s, 900.0));

    // Thin high clouds: long streaks across the sky, thinning towards the zenith and
    // gone below the horizon, lit warm towards the sun.
    if (clouds > 0.0 && h > 0.0) {
      vec2 p = dir.xz / (h + 0.18);
      float n = skyNoise(p * vec2(0.9, 5.0) + vec2(3.1, 7.7)) * 0.65 + skyNoise(p * vec2(2.3, 11.0)) * 0.35;
      float streak = smoothstep(0.62 - 0.22 * clouds, 0.9, n) * smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.55, 0.95, h));
      vec3 lit = mix(vec3(1.0, 0.96, 0.92), sunColor, 0.35 + 0.65 * pow(s, 3.0));
      color = mix(color, lit, streak * 0.7 * clouds);
    }

    // Stars on the night stages: a fixed scatter, brightest overhead.
    if (stars > 0.0 && h > 0.0) {
      vec3 cell = floor(dir * 260.0);
      float star = step(0.9965, skyHash(cell.xz + cell.y * 17.0));
      color += vec3(star * stars * smoothstep(0.05, 0.4, h));
    }

    // The launch's fantasy sky: nebula clouds swirling in two colours, aurora curtains
    // rippling round the sky, and a great glowing moon (or planet) low on one side.
    if (fantasy > 0.0) {
      vec2 q = dir.xz / (abs(h) + 0.55) * 1.4 + vec2(time * 0.012, -time * 0.008);
      float f = skyFbm(q);
      float g = skyFbm(q * 1.7 + f * 1.6 + vec2(4.0, 1.0));
      vec3 neb = mix(nebulaA, nebulaB, smoothstep(0.25, 0.75, g));
      float amt = smoothstep(0.38, 0.82, f) * fantasy * 0.6;
      color = mix(color, neb, amt) + neb * amt * 0.35;
      float ax = atan(dir.x, dir.z);
      float wave = sin(ax * 5.0 + sin(ax * 2.0 + time * 0.25) * 1.8 + time * 0.1) * 0.5 + 0.5;
      float rays = 0.6 + 0.4 * sin(ax * 41.0 + time * 0.7);
      float band = smoothstep(0.08, 0.3, h) * (1.0 - smoothstep(0.42, 0.85, h + wave * 0.12));
      vec3 auroraCol = mix(vec3(0.45, 1.0, 0.8), nebulaB, 0.45);
      color += auroraCol * pow(wave, 5.0) * rays * band * aurora * 0.9;
      vec3 moonDir = normalize(vec3(0.55, 0.36, -0.75));
      float m = dot(dir, moonDir);
      float disc = smoothstep(0.9965, 0.998, m);
      float shade = 0.75 + 0.25 * skyNoise(dir.xy * 90.0);
      color = mix(color, moonColor * shade, disc * moon);
      color += moonColor * (pow(max(m, 0.0), 90.0) * 0.7 + pow(max(m, 0.0), 12.0) * 0.12) * moon;
      // A ring round it, for the planets of space.
      float ring = smoothstep(0.004, 0.0, abs(m - 0.9935)) * step(abs(dot(dir - moonDir * m, vec3(0.0, 1.0, 0.0))), 0.06);
      color += moonColor * ring * moon * 0.5 * stars;
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * The sky dome. Follows the camera so the horizon always sits at eye level and the dome
 * can never be walked out of. Its colours are skyUniforms (worldLook.js sets the lobby's,
 * the kick field each stage's).
 */
export function Sky() {
  const ref = useRef(null)
  const camera = useThree((s) => s.camera)
  const radius = useQuality((s) => s.settings.viewDistance) * 0.9
  // Built by hand so the material holds skyUniforms itself: passed as a JSX prop, the
  // renderer copies the number uniforms once, and blending them (worldLook.blendSky)
  // would never reach the screen.
  const material = useMemo(
    () => new ShaderMaterial({ side: BackSide, depthWrite: false, uniforms: skyUniforms, vertexShader: skyVertexShader, fragmentShader: skyFragmentShader }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    ref.current?.position.copy(camera.position)
    skyUniforms.time.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={ref} renderOrder={-1} frustumCulled={false} scale={radius} material={material}>
      <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
    </mesh>
  )
}

export default Sky
