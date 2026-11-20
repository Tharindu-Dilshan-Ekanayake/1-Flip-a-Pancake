import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'

import { createToyInstances, PropBuilder } from '../blocks'
import { sharedMaterials, STYLE } from '../materials'
import { COLUMN } from './launchPath'
import { roll } from './rollControl'
import { cloudX, MAX_BUBBLES, MAX_CLOUDS, sky, VIS_AHEAD, VIS_SPEED } from './skyGame'

const _m = new Matrix4()
const _q = new Quaternion()
const _qi = new Quaternion()
const _qa = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _ay = new Vector3(0, 1, 0)
const _az = new Vector3(0, 0, 1)
const HIDDEN = new Matrix4().makeScale(0, 0, 0)

/** A bubble's radius, how long its pop takes (ms), and a cloud hit's wobble (ms). */
const BUBBLE_R = 1.05
const POP_MS = 160
const WOBBLE_MS = 600

/**
 * A soap bubble in one shader: clear in the middle, a rainbow sheen and a bright rim
 * towards the edges (fresnel), a white highlight up and to the left. Additive-ish over
 * the sky, never writing depth, so overlapping bubbles never sort badly.
 */
const bubbleVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const bubbleFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = 1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float rim = pow(f, 2.2);
    vec3 sheen = 0.5 + 0.5 * cos(6.2831 * (f * 1.4 + uTime * 0.25 + vec3(0.0, 0.33, 0.67)));
    vec3 color = mix(vec3(0.75, 0.95, 1.0), sheen, 0.55) * (0.25 + 1.2 * rim);
    float spot = pow(max(dot(normalize(vNormal), normalize(vec3(-0.5, 0.6, 0.6))), 0.0), 40.0);
    color += vec3(spot * 1.4);
    float alpha = clamp(0.12 + rim * 0.85 + spot, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/** The strength icon inside each bubble: a flexed arm drawn on a small canvas. */
function createArmTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const g = canvas.getContext('2d')
  g.translate(64, 64)
  g.scale(1.05, 1.05)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // The arm: the same shape as the HUD's Strength icon (ui/icons.js muscle), centred.
  const arm = new Path2D('M-36 38V14c0-20 22-30 38-14l4 3V-16c-3-6-3-14 3-19 7-6 19-6 25 2 5 7 5 16-1 21l1 34c0 10-8 17-18 17z')
  const grad = g.createLinearGradient(0, -40, 0, 40)
  grad.addColorStop(0, '#ffd84a')
  grad.addColorStop(0.6, '#ffa21c')
  grad.addColorStop(1, '#f07a00')
  g.fillStyle = grad
  g.strokeStyle = '#1b1b1f'
  g.lineWidth = 7
  g.fill(arm)
  g.stroke(arm)
  g.strokeStyle = '#fff6c4'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-28, 20)
  g.quadraticCurveTo(-24, 8, -8, 9)
  g.stroke()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  return texture
}

/** A grumpy cloud: fluffy grey puffs, a scowl, angry brows and a little storm underneath. */
function createCloudGeometry() {
  const p = new PropBuilder()
  const puff = new IcosahedronGeometry(1, 1)
  const grey = '#8e96aa'
  const light = '#b4bccc'
  for (const [x, y, z, r, c] of [
    [0, 0, 0, 1.5, light],
    [-1.4, -0.3, 0, 1.1, grey],
    [1.4, -0.25, 0, 1.15, grey],
    [-0.6, 0.75, -0.2, 1.0, light],
    [0.75, 0.65, -0.1, 1.05, light],
    [0, -0.55, 0.3, 1.1, grey],
  ]) {
    p.add(puff, { position: [x, y, z], scale: r, color: c })
  }
  // The face, on the side facing the camera (+Z).
  for (const side of [-1, 1]) {
    p.box(side * 0.55, 0.15, 1.42, 0.42, 0.42, 0.1, '#ffffff', STYLE.SMOOTH)
    p.box(side * 0.5, 0.1, 1.49, 0.2, 0.22, 0.08, '#1b1b1f', STYLE.SMOOTH)
    p.box(side * 0.58, 0.55, 1.45, 0.62, 0.13, 0.1, '#2a2e3a', STYLE.SMOOTH, [0, 0, side * 0.45])
  }
  p.box(0, -0.42, 1.42, 0.7, 0.12, 0.1, '#2a2e3a', STYLE.SMOOTH, [0, 0, 0])
  p.box(-0.38, -0.32, 1.42, 0.16, 0.12, 0.1, '#2a2e3a', STYLE.SMOOTH, [0, 0, -0.6])
  p.box(0.38, -0.32, 1.42, 0.16, 0.12, 0.1, '#2a2e3a', STYLE.SMOOTH, [0, 0, 0.6])
  // A couple of rain streaks hanging under it.
  for (const x of [-0.8, 0.1, 0.9]) p.box(x, -1.75, 0.2, 0.08, 0.5, 0.08, '#7fc8ff', STYLE.GLOW)
  puff.dispose()
  return p.build()
}

/**
 * The flight mini-game on screen (skyGame.js): the strength bubbles coming down at your
 * pancake - each a glossy soap bubble with a flexed arm inside, popping when caught -
 * and the grumpy clouds drifting across. Three instanced draw calls in all, only while
 * you're launching; nothing allocated per frame.
 */
export default function SkyGameView() {
  const bubbleRef = useRef(null)
  const iconRef = useRef(null)
  const cloudRef = useRef(null)

  const assets = useMemo(() => {
    const bubbleMaterial = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: bubbleVertex,
      fragmentShader: bubbleFragment,
      transparent: true,
      depthWrite: false,
    })
    const bubbles = new InstancedMesh(new SphereGeometry(BUBBLE_R, 20, 14), bubbleMaterial, MAX_BUBBLES)
    bubbles.frustumCulled = false
    bubbles.count = 0
    bubbles.renderOrder = 3
    const iconTexture = createArmTexture()
    const iconMaterial = new MeshBasicMaterial({ map: iconTexture, transparent: true, depthWrite: false, side: DoubleSide })
    const icons = new InstancedMesh(new PlaneGeometry(1.25, 1.25), iconMaterial, MAX_BUBBLES)
    icons.frustumCulled = false
    icons.count = 0
    icons.renderOrder = 2
    const clouds = createToyInstances(createCloudGeometry(), sharedMaterials().toy, MAX_CLOUDS)
    return { bubbles, bubbleMaterial, icons, iconMaterial, iconTexture, clouds }
  }, [])

  useEffect(
    () => () => {
      assets.bubbles.geometry.dispose()
      assets.bubbleMaterial.dispose()
      assets.bubbles.dispose()
      assets.icons.geometry.dispose()
      assets.iconMaterial.dispose()
      assets.iconTexture.dispose()
      assets.icons.dispose()
      assets.clouds.geometry.dispose()
      assets.clouds.dispose()
    },
    [assets],
  )

  useFrame((state) => {
    const bubbles = bubbleRef.current
    const icons = iconRef.current
    const clouds = cloudRef.current
    if (!bubbles || !icons || !clouds) return
    if (!roll.active || !sky.active) {
      bubbles.visible = icons.visible = clouds.visible = false
      return
    }
    const now = performance.now()
    const t = sky.elapsed
    const baseY = roll.position.y
    const camQ = state.camera.quaternion
    bubbles.material.uniforms.uTime.value = now / 1000

    let n = 0
    for (let i = 0; i < sky.bubbleCount; i += 1) {
      const b = sky.bubbles[i]
      const ahead = b.t - t
      if (ahead > VIS_AHEAD) break
      let scale = 1
      let y = baseY + ahead * VIS_SPEED
      if (b.done) {
        if (!b.caught) {
          // Missed: it floats on down past the pancake and is gone.
          if (ahead < -0.6) continue
        } else {
          const since = now - b.at
          if (since > POP_MS) continue
          scale = 1 + since / POP_MS
          y = baseY + 0.4
        }
      } else {
        // Swelling into view out of the haze, with a gentle wobble.
        scale = Math.min(1, (VIS_AHEAD - ahead) / 0.5) * (1 + 0.05 * Math.sin(now / 140 + i))
      }
      _p.set(COLUMN.x + b.x, y, COLUMN.z)
      _s.setScalar(scale)
      bubbles.setMatrixAt(n, _m.compose(_p, _q.identity(), _s))
      // The arm inside faces the camera, bobbing; gone the moment the bubble pops.
      _s.setScalar(b.caught ? 0 : scale)
      _qi.copy(camQ).multiply(_qa.setFromAxisAngle(_az, 0.15 * Math.sin(now / 220 + i)))
      icons.setMatrixAt(n, _m.compose(_p, _qi, _s))
      n += 1
    }
    bubbles.count = n
    icons.count = n
    bubbles.visible = icons.visible = n > 0
    bubbles.instanceMatrix.needsUpdate = true
    icons.instanceMatrix.needsUpdate = true

    let c = 0
    for (let i = 0; i < sky.cloudCount; i += 1) {
      const cl = sky.clouds[i]
      const ahead = cl.t - t
      if (ahead > VIS_AHEAD) break
      if (ahead < -0.8) continue
      const grow = Math.min(1, (VIS_AHEAD - ahead) / 0.5)
      const size = (cl.big ? 1.25 : 0.95) * grow
      // A hit cloud squashes and shudders.
      const since = cl.hit ? now - cl.at : Infinity
      const wob = since < WOBBLE_MS ? Math.exp(-since / 180) * Math.sin(since / 25) : 0
      _p.set(COLUMN.x + cloudX(cl, t), baseY + ahead * VIS_SPEED, COLUMN.z - 0.3)
      _q.setFromAxisAngle(_ay, 0.25 * Math.sin(now / 900 + i) + wob * 0.4)
      _s.set(size * (1 + wob * 0.2), size * (1 - wob * 0.2), size)
      clouds.setMatrixAt(c, _m.compose(_p, _q, _s))
      c += 1
    }
    for (let i = c; i < Math.min(clouds.count, MAX_CLOUDS); i += 1) clouds.setMatrixAt(i, HIDDEN)
    clouds.count = c
    clouds.visible = c > 0
    clouds.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <primitive ref={cloudRef} object={assets.clouds} />
      <primitive ref={iconRef} object={assets.icons} />
      <primitive ref={bubbleRef} object={assets.bubbles} />
    </group>
  )
}

