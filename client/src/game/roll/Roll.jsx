import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'

import { ROLL_RECOVERY, TROPHY_FIRST, TROPHY_SPACING } from '@shared/balance'
import { formatNumber } from '@shared/format'
import { trophyValue, winsMultiplier } from '@shared/logic'
import { mulberry32 } from '@shared/rng'

import { sfx } from '../../audio/sfx'
import { getGame, useGame } from '../../store/game'
import { getQuality, useQuality } from '../../store/quality'
import { iconUrl } from '../../ui/icons'
import { createToyInstances, PropBuilder } from '../blocks'
import FireBurst from '../fx/FireBurst'
import { spawnScattered } from '../fx/popups'
import { linkPrograms } from '../linkPrograms'
import { sharedMaterials } from '../materials'
import { addPancake, phoneTrail } from '../phoneStyles'
import { runtime } from '../runtime'
import { activeWorld, showLobbySky, zones } from '../worldLook'
import { writeDistance, writeSpeed, writeZone } from './hudLink'
import { COLUMN, heightAt, PANCAKE_SCALE, T_RELEASE } from './launchPath'
import { animateHero, createPancakeHero, disposeHero } from './pancakeHero'
import { advanceRoll, roll } from './rollControl'
import { sky, stunned } from './skyGame'
import FlightFx from './FlightFx'
import SkyClouds from './SkyClouds'
import SkyGameView from './SkyGameView'
import SkyLayers from './SkyLayers'
import { floorNameGradient } from './skyThemes'
import SpeedBlur from './SpeedBlur'

const STREAKS = 36
const MAX_GHOSTS = 12
/**
 * Frame-loop priority: before every other system, so the camera has moved before anything
 * projects into it (name tags, popups). Negative, so R3F still renders itself.
 */
const BEFORE_EVERYTHING = -1

const _m = new Matrix4()
const _q = new Quaternion()
const _qa = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _v = new Vector3()
const _look = new Vector3()
const _want = new Vector3()
const _wantLook = new Vector3()
const _ax = new Vector3(1, 0, 0)
const _ay = new Vector3(0, 1, 0)
const _az = new Vector3(0, 0, 1)
/** The camera's offset from the pancake and where it looks (from the pancake), both eased. */
const camOffset = new Vector3()
const lookOffset = new Vector3()
/** Stable vector for runtime.flightFocus (the scratch ones are reused mid-frame). */
const pancakeFocus = new Vector3()

/** The camera's field of view widens with speed, up to this much more. */
const FOV_KICK = 12
const SPEED_SHAKE = 0.05
const HIT_SHAKE = 0.35
const HIT_SHAKE_MS = 170

/** At most one trophy popup this often; the trophies in between are summed into it. */
const TROPHY_POPUP_MS = 160
const TROPHY_POPUP = { iconUrl: iconUrl('trophy'), scale: 1.2 }

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Speed-line streaks, made once: alternately down the left and right of the view, each a
 * little thicker or longer than the next, and every third tinted with your pan's colour.
 */
const streakState = (() => {
  const r = mulberry32(5)
  return Array.from({ length: STREAKS }, (_, i) => ({
    a: (i % 2 ? 0 : Math.PI) + (r() - 0.5) * 1.6,
    r: 2.8 + r() * 4,
    z: -r() * 30,
    width: 0.06 + r() * 0.06,
    length: 0.7 + r() * 0.6,
    tinted: i % 3 === 0,
  }))
})()
const STREAKS_FROM = 20
const STREAKS_FULL = 70
const WHITE = new Color('#ffffff')
const _tint = new Color()

function createStreakGeometry() {
  const geometry = new BufferGeometry()
  const positions = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5]
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  return geometry
}

const streakVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vColor = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #endif
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const streakFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  void main() {
    float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float along = smoothstep(0.0, 0.75, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
    float depth = smoothstep(1.5, 6.0, vDepth) * (1.0 - smoothstep(24.0, 34.0, vDepth));
    gl_FragColor = vec4(vColor, across * across * along * depth * uOpacity);
    #include <colorspace_fragment>
  }
`

/**
 * The flying pancake's own material: glossy (the light catches its syrup and its top),
 * lifted a little so it never goes dull against a dark sky, with a soft glowing rim in
 * its pan's colour - the pancake hero of every launch. One material, one draw call.
 */
function createPancakeMaterial() {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0 })
  material.userData.rim = { value: new Color('#ffe8b0') }
  material.userData.rimStrength = { value: 0.9 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = material.userData.rim
    shader.uniforms.uRimStrength = material.userData.rimStrength
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        totalEmissiveRadiance += uRimColor * pow(rimF, 2.2) * uRimStrength + diffuseColor.rgb * 0.34;`,
      )
  }
  material.customProgramCacheKey = () => 'pancake-hero-v1'
  return material
}

/** Little stars orbiting the flying pancake: one instanced draw call, glowing in its pan's colour. */
const ORBIT_STARS = 6
function createOrbitStars() {
  const p = new PropBuilder()
  for (let i = 0; i < 4; i += 1) p.box(0, 0, 0, i % 2 ? 0.16 : 1, i % 2 ? 1 : 0.16, 0.12, '#ffffff', 0, [0, 0, (i * Math.PI) / 4])
  const mesh = new InstancedMesh(p.build(), new MeshBasicMaterial({ color: '#fff3c0', toneMapped: false }), ORBIT_STARS)
  mesh.frustumCulled = false
  mesh.visible = false
  return mesh
}

/**
 * The soft glow behind the flying pancake, in its pan's colour, so it stands out against
 * every sky: a radial gradient on a small canvas, on a camera-facing quad (one draw call).
 */
function createHalo() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const g = canvas.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  const mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: AdditiveBlending, color: '#ffe8b0' }))
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.renderOrder = 1
  mesh.userData.texture = texture
  return mesh
}
/** The flying hero drawn this much bigger than the pancake's own flight size: a star of the show. */
const HERO_SIZE = 1.4
const heroState = { t: 0, phase: '', sinceRelease: 0, stunned: false, sinceCatch: 1e9, steerVel: 0, speed: 0 }
const _toCam = new Vector3()

/** Where the camera sits (from the pancake) and looks (from the pancake) in each part of the launch. */
function cameraAim(outOffset, outLook) {
  if (roll.phase === 'throw') {
    // Behind you on the launch pad, framing you as you squat and jump with the pan (the
    // pancake leaves from the top of the jump, up above): then it tilts up after it.
    outOffset.set(1.4, -0.9, 8)
    outLook.set(0, -1.6, -1)
  } else if (roll.phase === 'air') {
    // Below and behind the climbing pancake, looking up the sky at what's coming down.
    outOffset.set(sky.steer * -0.45, -2.4, 10.5)
    outLook.set(sky.steer * -0.3, 1.4, 0)
  } else {
    // At the top: level with it, drawing back a little to show it off.
    const since = Math.max(0, (performance.now() - roll.landedAt) / 1000)
    const u = smoothstep(0, 1.6, since)
    outOffset.set(0, -1.5 + 2 * u, 8 + 3 * u)
    outLook.set(0, 0.6, 0)
  }
}

/**
 * Lazily loaded: everything above the launch pad - the sky layers (SkyLayers), the
 * flying pancake, the bubbles and grumpy clouds (SkyGameView), other players' pancakes
 * shooting up, the speed lines and the camera while you launch.
 */
export default function Roll() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const rootRef = useRef(null)
  const streakRef = useRef(null)
  const pancakeRef = useRef(null)
  const ghostRef = useRef(null)
  const haloRef = useRef(null)
  const orbitRef = useRef(null)
  const haloTintFor = useRef(-1)
  const streakTintedFor = useRef(-1)
  const startedFor = useRef(0)
  const trophyTally = useRef({ next: TROPHY_FIRST, pending: 0, shownAt: 0 })
  const zoneShown = useRef(-2)
  const wasActive = useRef(false)
  const baseFov = useRef(60)
  const motionBlur = useQuality((s) => s.settings.motionBlur)
  const antialias = useQuality((s) => s.antialias)
  const rolling = useGame((s) => Boolean(s.roll))
  const equipped = useGame((s) => s.profile.equippedTire)

  const assets = useMemo(() => {
    const streakMaterial = new ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: streakVertexShader,
      fragmentShader: streakFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    const streakMesh = new InstancedMesh(createStreakGeometry(), streakMaterial, STREAKS)
    for (let i = 0; i < STREAKS; i += 1) streakMesh.setColorAt(i, WHITE)
    streakMesh.frustumCulled = false
    streakMesh.count = 0
    // Other players' pancakes: one generic stack, all in one draw call.
    const g = new PropBuilder()
    addPancake(g, 'mint', { scale: PANCAKE_SCALE * 0.8 })
    const ghosts = createToyInstances(g.build(), sharedMaterials().toy, MAX_GHOSTS)
    return { streakMesh, streakMaterial, ghosts }
  }, [])

  const pancakeMaterial = useMemo(() => createPancakeMaterial(), [])
  useEffect(() => () => pancakeMaterial.dispose(), [pancakeMaterial])
  // The flying pancake: a cartoon hero with googly eyes, arms, legs, wings and a wizard's hat.
  const hero = useMemo(() => createPancakeHero(equipped, pancakeMaterial), [equipped, pancakeMaterial])
  const orbitStars = useMemo(() => createOrbitStars(), [])
  useEffect(
    () => () => {
      orbitStars.geometry.dispose()
      orbitStars.material.dispose()
      orbitStars.dispose()
    },
    [orbitStars],
  )
  const halo = useMemo(() => createHalo(), [])
  useEffect(
    () => () => {
      halo.geometry.dispose()
      halo.material.dispose()
      halo.userData.texture.dispose()
    },
    [halo],
  )
  useEffect(() => () => disposeHero(hero), [hero])

  // This module loads after the lobby is on screen; compile its shaders in the background
  // before showing it, so the first launch doesn't stall on them.
  useEffect(() => {
    const root = rootRef.current
    if (!root || import.meta.env.DEV) return undefined
    let cancelled = false
    root.visible = true
    const hidden = []
    root.traverse((object) => {
      if (object.visible) return
      hidden.push(object)
      object.visible = true
    })
    const compiling = gl.compileAsync(root, camera, scene)
    for (const object of hidden) object.visible = false
    root.visible = false
    compiling
      .catch(() => null)
      .finally(() => {
        if (cancelled) return
        linkPrograms(gl)
        root.visible = true
      })
    return () => {
      cancelled = true
    }
  }, [gl, camera, scene])

  useEffect(
    () => () => {
      assets.streakMesh.geometry.dispose()
      assets.streakMaterial.dispose()
      assets.streakMesh.dispose()
      assets.ghosts.geometry.dispose()
      assets.ghosts.dispose()
      showLobbySky(null)
    },
    [assets],
  )

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const settings = getQuality()
    const now = performance.now()

    // --- The launch ---------------------------------------------------------------
    let speed = 0
    if (roll.active) {
      advanceRoll(state.clock.elapsedTime)
      const p = roll.position
      if (startedFor.current !== roll.startedAt) {
        startedFor.current = roll.startedAt
        // Ease from wherever the lobby camera was.
        camOffset.copy(camera.position).sub(p)
        lookOffset.set(0, -1.6, -1)
        baseFov.current = camera.fov
        const tally = trophyTally.current
        tally.next = TROPHY_FIRST
        tally.pending = 0
        tally.shownAt = 0
        zoneShown.current = -2
      }
      speed = roll.speed
      // The pancake as you steer it: the column plus your sideways offset.
      _p.set(p.x + sky.steer, p.y, p.z)
      runtime.flightFocus = pancakeFocus.copy(_p)
      writeDistance(roll.meter)
      // The layer's name as the pancake climbs into it.
      const zi = roll.roofBroken ? roll.floor : -1
      if (zi !== zoneShown.current) {
        zoneShown.current = zi
        if (zi >= 0) writeZone(zi, zones()[zi].name, floorNameGradient(zones(), zi))
        else writeZone(-1, ' ', 'linear-gradient(180deg, #ffffff, #ffffff)')
      }
      if (roll.phase === 'air') sfx.windSet(Math.min(1, speed / 160), true, 0)

      const mesh = pancakeRef.current
      if (mesh) {
        mesh.visible = !roll.inHand
        if (!roll.inHand) {
          mesh.position.copy(_p)
          // Knocked by a cloud: it spins wildly for a moment.
          const knock = stunned(now) ? (sky.stunUntil - now) / 60 : 0
          _q.setFromAxisAngle(_ay, roll.yaw + knock * 0.8)
          _q.multiply(_qa.setFromAxisAngle(_ax, roll.tumble))
          _q.multiply(_qa.setFromAxisAngle(_az, roll.tilt + sky.steerVel * -0.04 + knock * 0.3))
          mesh.quaternion.copy(_q)
          // A squash and stretch with speed, round again at the top.
          const stretch = Math.min(0.25, speed / 900)
          const sinceCatch = now - sky.lastCatchAt
          const pop = sinceCatch < 400 ? 1 + 0.28 * Math.exp(-sinceCatch / 90) : 1
          // Out of the pan pancake-sized, swelling to its full flying size in a blink.
          const sinceOut = roll.releasedAt ? (now - roll.releasedAt) / 1000 : 0
          const grow = 0.22 + 0.78 * smoothstep(0, 0.28, sinceOut)
          const big = pop * HERO_SIZE * grow
          mesh.scale.set((1 - stretch * 0.4) * big, (1 + stretch) * big, (1 - stretch * 0.4) * big)
          heroState.t = now / 1000
          heroState.phase = roll.phase
          heroState.sinceRelease = roll.releasedAt ? (now - roll.releasedAt) / 1000 : 0
          heroState.stunned = stunned(now)
          heroState.sinceCatch = sinceCatch
          heroState.steerVel = sky.steerVel
          heroState.speed = speed
          animateHero(hero, heroState)
        }
      }

      if (runtime.camera.mode === 'roll') {
        cameraAim(_want, _wantLook)
        // Eased: firm while climbing, softer before and at the top, ramping between so a
        // phase change never snaps the shot.
        const sinceRelease = roll.releasedAt ? (now - roll.releasedAt) / 1000 : 0
        const rate = roll.phase === 'throw' ? 4 : roll.phase === 'air' ? 4 + 4 * Math.min(1, sinceRelease / 0.8) : 3.5
        const k = 1 - Math.exp(-rate * delta)
        camOffset.lerp(_want, k)
        lookOffset.lerp(_wantLook, k)
        const sinceHit = now - Math.max(roll.hitAt, sky.stunUntil - 750)
        const amp = (roll.phase === 'air' ? Math.min(1, speed / 160) * SPEED_SHAKE : 0) + (sinceHit < HIT_SHAKE_MS * 3 ? HIT_SHAKE * Math.exp(-sinceHit / HIT_SHAKE_MS) : 0)
        // A smooth wobble (a sum of waves), never per-frame noise: shake that reads as speed, not jitter.
        const t = now / 1000
        const wx = Math.sin(t * 31) * 0.6 + Math.sin(t * 47 + 1.3) * 0.4
        const wy = Math.sin(t * 37 + 0.7) * 0.6 + Math.sin(t * 53 + 2.1) * 0.4
        camera.position.set(_p.x + camOffset.x + wx * amp * 0.5, _p.y + camOffset.y + wy * amp * 0.5, _p.z + camOffset.z)
        camera.lookAt(_look.copy(_p).add(lookOffset))
        if (roll.phase === 'air') camera.rotateZ(Math.max(-0.12, Math.min(0.12, -sky.steerVel * 0.009)))
        const punch = now - roll.landedAt < 500 ? 6 * Math.exp(-(now - roll.landedAt) / 120) : 0
        const fov = baseFov.current + punch + (roll.phase === 'air' ? Math.min(FOV_KICK, speed * 0.05) : roll.landed ? -3 : 0)
        const lens = state.camera
        if (Math.abs(fov - lens.fov) > 0.05) {
          lens.fov += (fov - lens.fov) * (1 - Math.exp(-4 * delta))
          lens.updateProjectionMatrix()
        }
      }

      // Trophies passed on the way up: the Trophies came with the launch; this is the receipt.
      if (roll.roofBroken) {
        const tally = trophyTally.current
        while (tally.next <= Math.min(roll.meter, roll.distance)) {
          tally.pending += trophyValue(tally.next, activeWorld())
          tally.next += TROPHY_SPACING
        }
        if (tally.pending > 0 && now - tally.shownAt >= TROPHY_POPUP_MS * 3) {
          const multiplier = winsMultiplier(getGame().profile, Date.now())
          spawnScattered(`+${formatNumber(Math.round(tally.pending * multiplier))}`, TROPHY_POPUP)
          sfx.trophy()
          tally.pending = 0
          tally.shownAt = now
        }
      }
    } else if (pancakeRef.current) {
      pancakeRef.current.visible = false
    }

    // Stars orbiting the pancake, twinkling, swinging wide on every bubble.
    const stars = orbitRef.current
    if (stars) {
      const show = roll.active && !roll.inHand
      stars.visible = show
      if (show) {
        const sinceCatch = now - sky.lastCatchAt
        const wide = 1 + (sinceCatch < 600 ? 0.6 * Math.exp(-sinceCatch / 200) : 0)
        for (let i = 0; i < ORBIT_STARS; i += 1) {
          const a = now / 700 + (i / ORBIT_STARS) * Math.PI * 2
          const r = PANCAKE_SCALE * HERO_SIZE * 1.15 * wide
          _v.set(_p.x + Math.cos(a) * r, _p.y + Math.sin(a * 2 + i) * 0.6, _p.z + Math.sin(a) * r)
          _q.copy(camera.quaternion).multiply(_qa.setFromAxisAngle(_az, now / 300 + i))
          _s.setScalar(0.32 + 0.14 * Math.sin(now / 160 + i * 1.7))
          stars.setMatrixAt(i, _m.compose(_v, _q, _s))
        }
        stars.instanceMatrix.needsUpdate = true
      }
    }

    // The glow behind the pancake: just behind it from the camera, breathing gently, a
    // flash brighter on every bubble.
    const glow = haloRef.current
    if (glow) {
      const show = roll.active && !roll.inHand
      glow.visible = show
      if (show) {
        if (haloTintFor.current !== roll.startedAt) {
          haloTintFor.current = roll.startedAt
          glow.material.color.set(phoneTrail(roll.tireId)).lerp(WHITE, 0.3)
          pancakeMaterial.userData.rim.value.set(phoneTrail(roll.tireId)).lerp(WHITE, 0.35)
          hero.wingMaterial.color.set(phoneTrail(roll.tireId)).lerp(WHITE, 0.6)
          const stars = orbitRef.current
          if (stars) stars.material.color.set(phoneTrail(roll.tireId)).lerp(WHITE, 0.55)
        }
        _toCam.copy(camera.position).sub(_p).normalize()
        glow.position.copy(_p).addScaledVector(_toCam, -1.2)
        glow.quaternion.copy(camera.quaternion)
        const sinceCatch = now - sky.lastCatchAt
        const flash = sinceCatch < 500 ? 0.35 * Math.exp(-sinceCatch / 150) : 0
        glow.scale.setScalar(PANCAKE_SCALE * HERO_SIZE * (2.3 + 0.12 * Math.sin(now / 260) + flash * 2))
        glow.material.opacity = 0.55 + flash
      }
    }
    if (wasActive.current && !roll.active) {
      state.camera.fov = baseFov.current
      state.camera.updateProjectionMatrix()
      sfx.windStop()
      showLobbySky(scene.fog)
    }
    wasActive.current = roll.active

    // --- Other players' pancakes, shooting up from their launch pads -------------
    const ghosts = ghostRef.current
    if (ghosts) {
      let n = 0
      for (const g of runtime.ghostRolls.values()) {
        if (n >= MAX_GHOSTS) break
        const t = (now - g.startedAt) / 1000
        if (t < T_RELEASE || t > g.duration + ROLL_RECOVERY) continue
        const y = heightAt(t, g)
        // Over the launch pad, a little to the side where they stood in the zone.
        _p.set(COLUMN.x + Math.max(-5, Math.min(5, g.x ?? 0)), y, COLUMN.z - 1)
        _q.setFromAxisAngle(_ax, t * 9)
        _s.setScalar(1)
        ghosts.setMatrixAt(n, _m.compose(_p, _q, _s))
        n += 1
      }
      ghosts.count = n
      ghosts.visible = n > 0
      ghosts.instanceMatrix.needsUpdate = true
    }

    // --- Speed lines --------------------------------------------------------------
    const climbing = roll.active && roll.phase === 'air'
    writeSpeed(climbing ? smoothstep(STREAKS_FROM, STREAKS_FULL * 2, speed) : 0, now)
    const lines = streakRef.current
    if (lines) {
      if (!(climbing && settings.speedLines && speed > STREAKS_FROM)) {
        lines.count = 0
      } else {
        if (streakTintedFor.current !== roll.startedAt) {
          streakTintedFor.current = roll.startedAt
          _tint.set(phoneTrail(roll.tireId)).lerp(WHITE, 0.35)
          for (let i = 0; i < STREAKS; i += 1) lines.setColorAt(i, streakState[i].tinted ? _tint : WHITE)
          lines.instanceColor.needsUpdate = true
        }
        const fast = Math.min(speed, 300)
        lines.material.uniforms.uOpacity.value = smoothstep(STREAKS_FROM, STREAKS_FULL, speed) * 0.8
        const travel = fast * delta * 0.4
        lines.count = STREAKS
        for (let i = 0; i < STREAKS; i += 1) {
          const st = streakState[i]
          st.z += travel
          if (st.z > 4) st.z -= 34
          _v.set(Math.cos(st.a) * st.r * 1.15, Math.sin(st.a) * st.r * 0.75, st.z - 4)
          _v.applyQuaternion(camera.quaternion).add(camera.position)
          _q.copy(camera.quaternion)
          _s.set(st.width, st.width, (2 + fast * 0.02) * st.length)
          lines.setMatrixAt(i, _m.compose(_v, _q, _s))
        }
        lines.instanceMatrix.needsUpdate = true
      }
    }
  }, BEFORE_EVERYTHING)

  return (
    <group ref={rootRef}>
      <SkyLayers />
      <SkyClouds />
      <SkyGameView />
      <FlightFx />
      <FireBurst />
      <primitive ref={haloRef} object={halo} />
      <primitive ref={pancakeRef} object={hero.group} />
      <primitive ref={orbitRef} object={orbitStars} />
      <primitive ref={ghostRef} object={assets.ghosts} />
      <primitive ref={streakRef} object={assets.streakMesh} />
      {rolling && motionBlur > 0 && <SpeedBlur samples={motionBlur} antialias={antialias} />}
    </group>
  )
}
