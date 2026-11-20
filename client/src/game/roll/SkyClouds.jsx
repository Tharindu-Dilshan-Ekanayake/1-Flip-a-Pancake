import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, SRGBColorSpace, Vector3 } from 'three'

import { mulberry32 } from '@shared/rng'

import { useQuality } from '../../store/quality'
import { zones } from '../worldLook'
import { COLUMN, LAYER_H, layerY, SKY_BASE } from './launchPath'
import { roll } from './rollControl'

/** Puffs per layer at full detail, and the most on screen (four layers' worth). */
const PER_LAYER = 12
const MAX_PUFFS = 48
/** How many each preset draws (soft sprites cost fill-rate on phones). */
const PUFFS = { LOW: 16, MEDIUM: 32, HIGH: 48 }

/** Each world's cloud colours: soft and white low down, candy pink, gold, ice, then nebula wisps. */
const CLOUD_TINTS = {
  forest: ['#ffffff', '#eafff0', '#fffbe8'],
  candy: ['#ffd8f0', '#ffe8f8', '#e8d8ff'],
  clouds: ['#ffffff', '#fff6e0', '#f0f6ff'],
  diamond: ['#c8f8ff', '#ffd0f4', '#d8d0ff'],
  honey: ['#ffe6a8', '#ffd08a', '#fff1d0'],
  ice: ['#f0faff', '#d8f4ff', '#ffffff'],
  space: ['#8a6aff', '#ff7ad8', '#5a8aff'],
  galaxy: ['#ff8ae0', '#8a7aff', '#5ae8ff'],
  rainbow: ['#ffd8f0', '#fff6c8', '#d8f8ff'],
  dream: ['#ffd8f4', '#e8d8ff', '#fff4e0'],
  sun: ['#fff1c0', '#ffd890', '#ffffff'],
  infinity: ['#ffffff', '#fff1d0', '#e8e0ff'],
}

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _c = new Color()

/** A soft, round-shouldered cloud on a small canvas: overlapping blurred circles. */
function createCloudTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const g = canvas.getContext('2d')
  const r = mulberry32(11)
  for (let i = 0; i < 14; i += 1) {
    const x = 28 + r() * 72
    const y = 46 + r() * 40 - Math.abs(x - 64) * 0.25
    const rad = 16 + r() * 18
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(255,255,255,0.55)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.3)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Billboards in the vertex shader (each instance's quad turned to face the camera on the
 * GPU, so nothing is updated per frame), soft-edged, fading out close to the camera so a
 * puff never smothers the view, and a gentle drift.
 */
const vertex = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vec3 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float size = length(instanceMatrix[0].xyz);
    centre.x += sin(uTime * 0.15 + centre.y * 0.05) * 1.5;
    vec4 mv = modelViewMatrix * vec4(centre, 1.0);
    vFade = smoothstep(10.0, 26.0, -mv.z);
    mv.xy += position.xy * size;
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float a = t.a * vFade * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.85 + 0.25 * vUv.y), a);
    #include <colorspace_fragment>
  }
`

/**
 * Soft, dreamy cloud puffs all round the climbing pancake, in each world's colours (white
 * and gold low down, candy pink, ice, then glowing nebula wisps in space), some drifting
 * below it like a sea of cloud. One instanced draw call; re-placed only when the pancake
 * enters a new layer; fewer on LOW.
 */
export default function SkyClouds() {
  const level = useQuality((s) => s.level)
  const ref = useRef(null)
  const shown = useRef({ floor: -99, startedAt: -1, level: '' })

  const mesh = useMemo(() => {
    const texture = createCloudTexture()
    const material = new ShaderMaterial({
      uniforms: { uMap: { value: texture }, uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
    })
    const m = new InstancedMesh(new PlaneGeometry(1, 0.62), material, MAX_PUFFS)
    for (let i = 0; i < MAX_PUFFS; i += 1) m.setColorAt(i, _c.set('#ffffff'))
    m.count = 0
    m.frustumCulled = false
    m.visible = false
    m.renderOrder = -0.5
    m.userData.texture = texture
    return m
  }, [])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      mesh.material.dispose()
      mesh.userData.texture.dispose()
      mesh.dispose()
    },
    [mesh],
  )

  useFrame((state, rawDelta) => {
    const m = ref.current
    if (!m) return
    const up = roll.active && roll.position.y > SKY_BASE * 0.4
    const u = m.material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uOpacity.value += ((up ? 1 : 0) - u.uOpacity.value) * (1 - Math.exp(-3 * Math.min(rawDelta, 0.05)))
    m.visible = u.uOpacity.value > 0.01
    if (!up) {
      shown.current.floor = -99
      return
    }
    const floor = Math.max(0, roll.floor)
    const s = shown.current
    if (s.floor === floor && s.startedAt === roll.startedAt && s.level === level) return
    s.floor = floor
    s.startedAt = roll.startedAt
    s.level = level
    const list = zones()
    const budget = PUFFS[level] ?? PUFFS.MEDIUM
    const perLayer = Math.ceil(budget / 4)
    let n = 0
    for (let i = floor - 1; i <= floor + 2 && n < budget; i += 1) {
      if (i < 0 || i >= list.length) continue
      const tints = CLOUD_TINTS[list[i].theme] ?? CLOUD_TINTS.clouds
      const r = mulberry32(i * 1531 + 7)
      for (let k = 0; k < Math.min(PER_LAYER, perLayer) && n < budget; k += 1) {
        // Round the column, wide; never right on the camera's side close in.
        let a = r() * Math.PI * 2
        const d = 16 + r() * 60
        if (d < 34 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.8) a += Math.PI
        _p.set(COLUMN.x + Math.sin(a) * d, layerY(i) + r() * LAYER_H, COLUMN.z + Math.cos(a) * d)
        const size = 14 + r() * 22
        m.setMatrixAt(n, _m.compose(_p, _q.identity(), _s.setScalar(size)))
        m.setColorAt(n, _c.set(tints[k % tints.length]))
        n += 1
      }
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return <primitive ref={ref} object={mesh} />
}
