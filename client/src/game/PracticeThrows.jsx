import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

import { sfx } from '../audio/sfx'
import { asToyInstance } from './blocks'
import { throwPhoneGeometry } from './handPhone'
import { sharedMaterials } from './materials'
import { MAX_THROWS, THROW_FADE, THROW_FLIGHT, THROW_LIE, throws } from './practice'

const _q = new Quaternion()
const _qa = new Quaternion()
const _ax = new Vector3(1, 0, 0)
const _ay = new Vector3(0, 1, 0)
/** Half a pancake's thickness at its scale: lying flat, its middle is this far up. */
const LIE = 0.05
/** How high a flip sends the pancake. */
const ARC = 1.7
/** Throws landing further than this from the camera aren't heard. */
const HEAR = 30

/**
 * The pancakes flipped up out of their pans (practice.js): each spins up end over end
 * and drops straight back into the pan. A fixed pool of MAX_THROWS meshes, each showing whichever phone was
 * thrown; only the ones in flight are drawn (one draw call each, and rarely more than two
 * or three at once). Nothing allocated while it runs.
 */
export default function PracticeThrows() {
  const groupRef = useRef(null)
  const meshes = useMemo(
    () =>
      Array.from({ length: MAX_THROWS }, () => {
        const mesh = asToyInstance(throwPhoneGeometry('bicycle'), sharedMaterials().toy)
        mesh.visible = false
        mesh.frustumCulled = false
        return mesh
      }),
    [],
  )
  // The geometries are shared (cached per phone); only the meshes are this component's.
  useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return
    const now = performance.now()
    for (let i = 0; i < MAX_THROWS; i += 1) {
      const t = throws[i]
      const mesh = group.children[i]
      if (!mesh) continue
      if (!t.active) {
        mesh.visible = false
        continue
      }
      const e = (now - t.start) / 1000
      if (e >= THROW_FLIGHT + THROW_LIE + THROW_FADE) {
        // Back in the pan: a soft plop (the pan shows it again, HeldPhone).
        if (!t.landed && state.camera.position.distanceTo(t.to) < HEAR) sfx.practiceLand()
        t.landed = true
        t.active = false
        mesh.visible = false
        continue
      }
      const geometry = throwPhoneGeometry(t.phoneId)
      if (mesh.geometry !== geometry) mesh.geometry = geometry
      mesh.visible = true
      let scale = 1
      if (e < THROW_FLIGHT) {
        // In the air: an arc down the lane, two turns end over end so it lands screen up.
        const u = e / THROW_FLIGHT
        mesh.position.lerpVectors(t.from, t.to, u)
        mesh.position.y += ARC * 4 * u * (1 - u) + LIE * u
        // One full flip end over end (a double on every third), turning a little as it goes.
        _q.setFromAxisAngle(_ay, Math.PI / 2 + t.turn * u)
        _q.multiply(_qa.setFromAxisAngle(_ax, t.spin * Math.PI * 2 * (Math.abs(t.turn) > 0.55 ? 2 : 1) * u))
      } else {
        // Down on the target: a bounce, then lying still until it shrinks away.
        if (!t.landed) {
          t.landed = true
          if (state.camera.position.distanceTo(t.to) < HEAR) sfx.practiceLand()
        }
        const v = e - THROW_FLIGHT
        const hop = v < 0.2 ? 0.25 * Math.sin((v / 0.2) * Math.PI) : 0
        mesh.position.set(t.to.x, t.to.y + LIE + hop, t.to.z)
        _q.setFromAxisAngle(_ay, Math.PI / 2 + t.turn)
        if (v > THROW_LIE) scale = Math.max(0.01, 1 - (v - THROW_LIE) / THROW_FADE)
      }
      mesh.quaternion.copy(_q)
      mesh.scale.setScalar(scale)
    }
  })

  return (
    <group ref={groupRef}>
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </group>
  )
}
