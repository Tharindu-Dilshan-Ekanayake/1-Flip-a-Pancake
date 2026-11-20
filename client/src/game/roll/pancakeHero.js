import {
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'

import { PropBuilder } from '../blocks'
import { STYLE } from '../materials'
import { addPancake, phoneStyle } from '../phoneStyles'
import { PANCAKE_SCALE } from './launchPath'

/**
 * The flying pancake as a cartoon hero: the pancake itself (its topping pushed back, rosy
 * cheeks and big eye-whites on it), googly pupils that jiggle and look about, eyelids that
 * blink, a mouth that changes with what's happening (an "O" of WHEEE off the pan, a toothy
 * grin climbing, a wobbly line when it's dizzy), noodle arms with white cartoon gloves
 * that flail, stubby legs in red sneakers that kick, fluttering fairy wings, a wobbly
 * wizard's hat with stars - and dizzy stars circling when a cloud bonks it.
 *
 * Its own frame is the pancake's: the face on top (+Y, turned to the camera in flight),
 * the hat towards -Z (up on screen), the legs towards +Z. Every part is one merged mesh
 * (about a dozen draw calls in all), animated by `animateHero` with no allocation.
 */
const S = PANCAKE_SCALE
const R = 0.41 * S
const INK = '#2a1408'

const sphere = new SphereGeometry(1, 16, 12)
const cyl = new CylinderGeometry(1, 1, 1, 12)
const cone = new ConeGeometry(1, 1, 16)
const star = new OctahedronGeometry(1, 0)
const halfDisc = new CylinderGeometry(1, 1, 1, 20, 1, false, 0, Math.PI)
const torus = new TorusGeometry(1, 0.22, 6, 18)

/** A merged part from `draw(p)`, as a mesh in `material`, positioned at `pivot`. */
function part(material, pivot, draw) {
  const p = new PropBuilder()
  draw(p)
  const mesh = new Mesh(p.build(), material)
  mesh.position.set(...pivot)
  mesh.frustumCulled = false
  return mesh
}

/** Builds the hero for pan `id`; `material` is the flying pancake's glossy vertex-coloured one. */
export function createPancakeHero(id, material) {
  const st = phoneStyle(id).stack
  const top = (st * 0.089 + 0.004 - 0.06 * st) * S
  const face = top + 0.02
  const group = new Group()
  const wingMaterial = new MeshBasicMaterial({ color: '#ffe8ff', transparent: true, opacity: 0.72, side: DoubleSide, depthWrite: false, toneMapped: false })

  // The body: the pancake (topping at the back like a tuft), cheeks and the eye-whites.
  const body = part(material, [0, 0, 0], (p) => {
    addPancake(p, id, { scale: S, face: 'hero' })
    for (const side of [-1, 1]) {
      p.add(sphere, { position: [side * 0.4, face + 0.02, 0.08], scale: [0.28, 0.12, 0.32], color: '#ffffff' })
      p.add(sphere, { position: [side * 0.72, face - 0.01, 0.42], scale: [0.2, 0.03, 0.13], color: '#ff8aa0' })
    }
  })
  group.add(body)

  // Pupils (both in one mesh, so they look together), each with two sparkles.
  const pupils = part(material, [0, face + 0.1, 0.08], (p) => {
    for (const side of [-1, 1]) {
      p.add(sphere, { position: [side * 0.4, 0, 0], scale: [0.15, 0.07, 0.17], color: '#140a06' })
      p.add(sphere, { position: [side * 0.4 - 0.05, 0.06, -0.06], scale: 0.055, color: '#ffffff', style: STYLE.GLOW })
      p.add(sphere, { position: [side * 0.4 + 0.05, 0.06, 0.05], scale: 0.025, color: '#ffffff', style: STYLE.GLOW })
    }
  })
  group.add(pupils)

  // Eyelids in batter colour, scaled down over the eyes to blink.
  const lids = part(material, [0, face + 0.15, -0.24], (p) => {
    for (const side of [-1, 1]) p.add(sphere, { position: [side * 0.4, 0, 0.32], scale: [0.3, 0.13, 0.34], color: '#f2b65a' })
  })
  lids.scale.z = 0.01
  group.add(lids)

  // Three mouths, one shown at a time.
  const mouthAt = [0, face + 0.01, 0.62]
  const grin = part(material, mouthAt, (p) => {
    p.add(halfDisc, { position: [0, 0, 0], scale: [0.34, 0.04, 0.34], rotation: [0, -Math.PI / 2, 0], color: '#5a1a10' })
    p.box(0, 0.025, 0.04, 0.5, 0.03, 0.08, '#ffffff', STYLE.SMOOTH)
    p.add(sphere, { position: [0, 0.02, 0.2], scale: [0.16, 0.03, 0.09], color: '#ff6a8a' })
  })
  const wheee = part(material, mouthAt, (p) => {
    p.add(cyl, { position: [0, 0, 0.06], scale: [0.18, 0.04, 0.24], color: '#5a1a10' })
    p.add(cyl, { position: [0, 0.01, 0.13], scale: [0.11, 0.04, 0.1], color: '#ff6a8a' })
  })
  const dizzy = part(material, mouthAt, (p) => {
    for (let k = 0; k < 5; k += 1) p.box(-0.24 + k * 0.12, 0.02, k % 2 ? 0.05 : -0.02, 0.14, 0.03, 0.05, INK, STYLE.SMOOTH, [0, k % 2 ? 0.6 : -0.6, 0])
  })
  for (const m of [grin, wheee, dizzy]) group.add(m)

  // The wizard's hat at the top edge, pointing up the screen (-Z), stars on it.
  const hat = part(material, [0, face + 0.05, -R * 0.78], (p) => {
    p.add(cyl, { position: [0, 0, 0], scale: [0.8, 0.08, 0.8], rotation: [-Math.PI / 2, 0, 0], color: '#5a2ab8' })
    p.add(cone, { position: [0, 0, -0.75], scale: [0.5, 1.4, 0.5], rotation: [-Math.PI / 2, 0, 0], color: '#7a3ad8' })
    p.add(cyl, { position: [0, 0, -0.16], scale: [0.51, 0.18, 0.51], rotation: [-Math.PI / 2, 0, 0], color: '#ffd23a' })
    p.add(star, { position: [0, 0, -1.5], scale: 0.17, color: '#ffe27a', style: STYLE.GLOW })
    for (const [x, z, s] of [[0.2, -0.45, 0.08], [-0.16, -0.75, 0.07], [0.08, -1.05, 0.06]]) p.add(star, { position: [x, 0.4 * (1 + z * 0.6), z], scale: s, color: '#fff36a', style: STYLE.GLOW })
  })
  hat.rotation.y = 0.25
  group.add(hat)

  // Noodle arms with white cartoon gloves, from the sides, pivoting in the pancake's plane.
  const arm = (side) => {
    const g = part(material, [side * R * 0.95, top * 0.4, 0.1], (p) => {
      p.add(cyl, { position: [0.42, 0, 0], scale: [0.07, 0.84, 0.07], rotation: [0, 0, Math.PI / 2], color: '#f2b65a' })
      p.add(sphere, { position: [0.92, 0, 0], scale: [0.2, 0.16, 0.18], color: '#ffffff' })
      p.add(sphere, { position: [0.88, 0, -0.17], scale: 0.08, color: '#ffffff' })
      p.add(torus, { position: [0.74, 0, 0], scale: 0.1, rotation: [0, Math.PI / 2, 0], color: '#ffffff' })
    })
    g.scale.x = side
    return g
  }
  const armL = arm(-1)
  const armR = arm(1)
  group.add(armL, armR)

  // Stubby legs in red sneakers, from the bottom edge.
  const leg = (side) =>
    part(material, [side * 0.38, top * 0.2, R * 0.9], (p) => {
      p.add(cyl, { position: [0, 0, 0.3], scale: [0.065, 0.6, 0.065], rotation: [Math.PI / 2, 0, 0], color: '#f2b65a' })
      p.add(sphere, { position: [0, 0.02, 0.66], scale: [0.16, 0.13, 0.24], color: '#ff3b4a' })
      p.box(0, -0.08, 0.68, 0.3, 0.05, 0.42, '#ffffff', STYLE.SMOOTH)
      p.box(0, 0.12, 0.6, 0.14, 0.03, 0.04, '#ffffff', STYLE.SMOOTH)
    })
  const legL = leg(-1)
  const legR = leg(1)
  group.add(legL, legR)

  // Fairy wings behind it, a big and a small pair, hinged at its back.
  const wing = (side) => {
    const g = new Group()
    g.position.set(side * 0.3, -0.22, -0.1)
    const big = new Mesh(new CircleGeometry(1, 24), wingMaterial)
    big.rotation.x = -Math.PI / 2
    big.scale.set(0.95, 0.55, 1)
    big.position.set(side * (R + 0.35), 0, -0.45)
    big.rotation.z = side * 0.5
    const small = new Mesh(new CircleGeometry(1, 20), wingMaterial)
    small.rotation.x = -Math.PI / 2
    small.scale.set(0.6, 0.38, 1)
    small.position.set(side * (R + 0.1), 0, 0.35)
    small.rotation.z = -side * 0.4
    g.add(big, small)
    return g
  }
  const wingL = wing(-1)
  const wingR = wing(1)
  group.add(wingL, wingR)

  // Dizzy stars, circling over the hat when a cloud bonks it.
  const stars = part(material, [0, face + 0.3, -R * 0.9], (p) => {
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2
      p.add(star, { position: [Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.3], scale: 0.14, color: '#ffe23a', style: STYLE.GLOW })
    }
  })
  stars.visible = false
  group.add(stars)

  group.visible = false
  return { group, body, pupils, lids, grin, wheee, dizzy, hat, armL, armR, legL, legR, wingL, wingR, stars, wingMaterial }
}

/** Frees the hero's own geometries and its wing material (the pancake's material is shared). */
export function disposeHero(hero) {
  hero.group.traverse((o) => {
    if (o.isMesh) o.geometry.dispose()
  })
  hero.wingMaterial.dispose()
}

/**
 * Animates the hero for this frame. `s` is { t (seconds), phase, sinceRelease (s),
 * stunned (bool), sinceCatch (ms), steerVel, speed }.
 */
export function animateHero(h, s) {
  const { t } = s
  const top = s.phase === 'settle' || s.phase === 'stopped'
  const happy = s.sinceCatch < 450
  // Expressions: WHEEE off the pan, a grin climbing, wobbly when dizzy.
  const mouth = s.stunned ? 'dizzy' : s.sinceRelease < 0.8 ? 'wheee' : 'grin'
  h.grin.visible = mouth === 'grin'
  h.wheee.visible = mouth === 'wheee'
  h.dizzy.visible = mouth === 'dizzy'
  h.wheee.scale.setScalar(1 + 0.15 * Math.sin(t * 20))
  // Googly pupils: jiggling with every jolt, looking where it steers (and up), spinning when dizzy.
  if (s.stunned) {
    h.pupils.position.x = Math.cos(t * 18) * 0.07
    h.pupils.position.z = 0.08 + Math.sin(t * 18) * 0.07
  } else {
    const look = Math.max(-1, Math.min(1, s.steerVel * 0.08))
    h.pupils.position.x = look * 0.08 + Math.sin(t * 9.3) * 0.012 * (1 + s.speed / 80)
    h.pupils.position.z = 0.08 - 0.06 + Math.cos(t * 11.1) * 0.012 * (1 + s.speed / 80)
  }
  // Blinks every few seconds; happy squints after a bubble.
  const blink = t % 3.3 < 0.12 ? 1 : 0
  const lid = Math.max(blink, happy ? 0.55 : 0, s.stunned ? 0.3 : 0)
  h.lids.scale.z = Math.max(0.01, lid)
  h.lids.visible = lid > 0.02
  // Arms flail climbing, go wild when dizzy, cheer at the top; legs kick.
  const flail = s.stunned ? 28 : 12
  if (top) {
    h.armR.rotation.y = -1.2 + Math.sin(t * 9) * 0.3
    h.armL.rotation.y = -1.2 + Math.sin(t * 9 + 1) * 0.3
  } else {
    h.armR.rotation.y = -0.3 + Math.sin(t * flail) * 0.65
    h.armL.rotation.y = -0.3 + Math.sin(t * flail + 1.7) * 0.65
  }
  h.legL.rotation.y = Math.sin(t * 10) * 0.45
  h.legR.rotation.y = -Math.sin(t * 10) * 0.45
  // Wings flutter (slower at the top, drooping when dizzy).
  const flap = s.stunned ? 0.15 * Math.sin(t * 6) : Math.sin(t * (top ? 7 : 16)) * 0.55
  h.wingL.rotation.z = flap
  h.wingR.rotation.z = -flap
  // The hat wobbles, more when bonked.
  h.hat.rotation.x = Math.sin(t * 5) * 0.08 + (s.stunned ? Math.sin(t * 25) * 0.25 : 0)
  h.hat.rotation.z = Math.sin(t * 3.7) * 0.12
  // Dizzy stars circle while it's stunned.
  h.stars.visible = s.stunned
  if (s.stunned) h.stars.rotation.y = t * 6
}
