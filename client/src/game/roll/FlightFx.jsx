import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, Points, RingGeometry, ShaderMaterial, Vector3 } from 'three'

import { getQuality, useQuality } from '../../store/quality'
import { phoneTrail } from '../phoneStyles'
import { RING_POOL, rings, spawnRing } from './flightRings'
import { roll } from './rollControl'
import { sky } from './skyGame'

/**
 * The launch's animation effects, all pooled and allocation-free per frame:
 *
 *  - rings (flightRings.spawnRing): the shockwave across the pit floor as the pancake lifts off, a
 *    flash in the layer's colour each time it passes into a new layer, a burst facing the
 *    camera at the top - and, while it's climbing fast, wind rings it rushes up through.
 *    A pool of RING_POOL meshes; only live ones draw.
 *  - the trail: sparkles in your pan's colour streaming off the pancake (one Points draw
 *    call; MEDIUM and HIGH only - LOW has no particles).
 */
const TRAIL = 56
/** Seconds between wind rings at full speed, and the speed (world units/s) they start at. */
const WIND_EVERY = 0.16
const WIND_FROM = 45

const trailVertex = /* glsl */ `
  attribute float aAge;
  uniform float uSize;
  varying float vAge;
  void main() {
    vAge = aAge;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (1.0 - aAge * 0.8) * (300.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`
const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAge;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    float glint = max(0.0, 1.0 - abs(c.x) * 12.0) * smoothstep(0.5, 0.0, abs(c.y)) + max(0.0, 1.0 - abs(c.y) * 12.0) * smoothstep(0.5, 0.0, abs(c.x));
    vec3 col = mix(vec3(1.0), uColor, 0.4 + 0.6 * vAge);
    gl_FragColor = vec4(col, (a + glint * 0.6) * (1.0 - vAge));
    #include <colorspace_fragment>
  }
`

const _p = new Vector3()

export default function FlightFx() {
  const particles = useQuality((s) => s.settings.particles)
  const ringGroupRef = useRef(null)
  const trailRef = useRef(null)
  const state = useRef({ windAt: 0, trailAt: 0, next: 0, tintFor: -1 })

  const ringMeshes = useMemo(() => {
    const geometry = new RingGeometry(0.86, 1, 48)
    return Array.from({ length: RING_POOL }, () => {
      const mesh = new Mesh(geometry, new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }))
      mesh.visible = false
      mesh.frustumCulled = false
      return mesh
    })
  }, [])
  const trail = useMemo(() => {
    if (!particles) return null
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3))
    const ages = new Float32Array(TRAIL).fill(1)
    geometry.setAttribute('aAge', new BufferAttribute(ages, 1))
    const material = new ShaderMaterial({
      uniforms: { uSize: { value: 2.2 }, uColor: { value: new Color('#ffe8b0') } },
      vertexShader: trailVertex,
      fragmentShader: trailFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    points.visible = false
    // Per-sparkle birth time and drift, kept beside the buffers.
    points.userData.born = new Float32Array(TRAIL).fill(-1e9)
    points.userData.drift = new Float32Array(TRAIL * 2)
    return points
  }, [particles])

  useEffect(
    () => () => {
      ringMeshes[0].geometry.dispose()
      for (const m of ringMeshes) m.material.dispose()
    },
    [ringMeshes],
  )
  useEffect(
    () => () => {
      if (!trail) return
      trail.geometry.dispose()
      trail.material.dispose()
    },
    [trail],
  )

  useFrame((frame) => {
    const now = performance.now()
    const st = state.current
    const camera = frame.camera
    const px = roll.position.x + sky.steer
    const py = roll.position.y
    const pz = roll.position.z

    // Wind rings while the pancake rockets up: spawned just above it, so it shoots through.
    if (roll.active && roll.phase === 'air' && roll.speed > WIND_FROM) {
      const every = WIND_EVERY * Math.max(1, 120 / roll.speed)
      if (now - st.windAt > every * 1000) {
        st.windAt = now
        spawnRing({ x: px, y: py + 2.2, z: pz, from: 1.6, to: 3.2, duration: 0.32, color: '#ffffff', opacity: 0.35 })
      }
    }

    // --- Rings ---------------------------------------------------------------------
    const group = ringGroupRef.current
    if (group) {
      for (let i = 0; i < RING_POOL; i += 1) {
        const r = rings[i]
        const mesh = group.children[i]
        if (!mesh) continue
        const u = r.active ? (now - r.start) / 1000 / r.duration : 1
        if (u >= 1) {
          r.active = false
          mesh.visible = false
          continue
        }
        const ease = 1 - (1 - u) ** 3
        mesh.visible = true
        mesh.position.set(r.x, r.y, r.z)
        if (r.facing) mesh.quaternion.copy(camera.quaternion)
        else mesh.rotation.set(-Math.PI / 2, 0, 0)
        mesh.scale.setScalar(r.from + (r.to - r.from) * ease)
        mesh.material.color.copy(r.color)
        mesh.material.opacity = r.opacity * (1 - u)
      }
    }

    // --- The sparkle trail ---------------------------------------------------------
    const points = trailRef.current
    if (points) {
      const { born, drift } = points.userData
      const pos = points.geometry.attributes.position
      const age = points.geometry.attributes.aAge
      const flying = roll.active && !roll.inHand
      if (flying && st.tintFor !== roll.startedAt) {
        st.tintFor = roll.startedAt
        points.material.uniforms.uColor.value.set(phoneTrail(roll.tireId))
      }
      // A new sparkle every 22 ms while flying (faster when it's fast).
      if (flying && now - st.trailAt > (roll.phase === 'air' ? 22 : 60)) {
        st.trailAt = now
        const k = st.next
        st.next = (st.next + 1) % TRAIL
        born[k] = now
        _p.set(px + (Math.random() - 0.5) * 1.2, py - 0.3 + (Math.random() - 0.5) * 0.6, pz + (Math.random() - 0.5) * 1.2)
        pos.setXYZ(k, _p.x, _p.y, _p.z)
        drift[k * 2] = (Math.random() - 0.5) * 2
        drift[k * 2 + 1] = (Math.random() - 0.5) * 2
      }
      let alive = 0
      const life = getQuality().level === 'HIGH' ? 700 : 500
      for (let k = 0; k < TRAIL; k += 1) {
        const a = (now - born[k]) / life
        if (a >= 1) {
          age.setX(k, 1)
          continue
        }
        alive += 1
        age.setX(k, a)
        // Drifting outwards a little and sinking (the pancake's moving away upwards anyway).
        pos.setXYZ(k, pos.getX(k) + drift[k * 2] * 0.016, pos.getY(k) - 0.05, pos.getZ(k) + drift[k * 2 + 1] * 0.016)
      }
      points.visible = alive > 0
      pos.needsUpdate = true
      age.needsUpdate = true
    }
  })

  return (
    <group>
      <group ref={ringGroupRef}>
        {ringMeshes.map((m) => (
          <primitive key={m.uuid} object={m} />
        ))}
      </group>
      {trail && <primitive ref={trailRef} object={trail} />}
    </group>
  )
}
