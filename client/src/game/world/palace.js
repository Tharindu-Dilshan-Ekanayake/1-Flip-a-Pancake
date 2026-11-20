import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three'

import { hash2 } from '@shared/rng'
import { PLAZA, PORTALS } from '@shared/world'

import { STYLE } from '../materials'

/**
 * The Pancake Palace: the first world's lobby is a royal palace courtyard. Round the plaza
 * stand the palace walls - cream marble on a plinth, columns with gold capitals between
 * tall arched windows, royal banners, a gold cornice and a balustrade - with a tower at
 * each corner under a blue dome and gold spire. Behind the portal the palace front rises
 * higher, a grand golden door in it and a great golden dome over it; beyond the walls the
 * domes and spires of the royal city.
 *
 * Boxes go into the world's block set and round parts into its props: no draw calls of
 * its own. `density` (the preset's decorDensity) thins the city beyond the walls.
 */
const MARBLE = '#f4ecdc'
const MARBLE_SHADE = '#e6dac4'
const GOLD = '#e8b830'
const GOLD_DEEP = '#c9922a'
const ROYAL = '#c8102e'
const GLASS = '#1a3a7a'
const DOME = '#3a6ad8'
const CITY = ['#f4ecdc', '#ffe8d8', '#e8f0ff', '#f8e6f0', '#fff4d8']
const DOMES = ['#3a6ad8', '#e8b830', '#c8102e', '#5ac8a8', '#9a5ad8']

const POST = new CylinderGeometry(1, 1, 1, 10)
const TOWER = new CylinderGeometry(1, 1, 1, 16)
const BALL = new SphereGeometry(1, 12, 8)
const SPIRE = new ConeGeometry(1, 1, 10)

/** The palace walls' line, just outside the plaza; their height, and how thick. */
const WALL = { minX: PLAZA.minX - 1.5, maxX: PLAZA.maxX + 1.5, minZ: PLAZA.minZ - 1.5, maxZ: PLAZA.maxZ + 1.5 }
const H = 10
const T = 2
/** The bay width: a column, then a window, then a column... */
const BAY = 7

/**
 * One wall, from (x0, z0) to (x1, z1), its courtyard face towards (nx, nz). `skip(u)` says
 * whether the bay at `u` metres along is left plain (where the palace front rises).
 */
function addWall(blocks, props, x0, z0, x1, z1, nx, nz, skip = () => false, rail = 1.4, arches = true) {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const dx = (x1 - x0) / len
  const dz = (z1 - z0) / len
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const along = Math.abs(dx) > 0.5
  const box = (u, y, h, out, w, depth, color, style = STYLE.SMOOTH) => {
    const x = x0 + dx * u + nx * out
    const z = z0 + dz * u + nz * out
    blocks.add(x, y + h / 2, z, along ? w : depth, h, along ? depth : w, color, style)
  }
  // The body, its plinth and its cornice, and a balustrade along the top.
  blocks.add(cx, H / 2, cz, along ? len + T : T, H, along ? T : len + T, MARBLE, STYLE.SMOOTH)
  box(len / 2, 0, 1.3, T / 2 + 0.25, len, 0.5, MARBLE_SHADE)
  box(len / 2, H - 0.7, 0.7, T / 2 + 0.2, len, 0.4, GOLD)
  box(len / 2, H, 0.25, 0, len + T, T + 0.4, MARBLE_SHADE)
  for (let u = 1; u < len; u += rail) box(u, H + 0.25, 0.8, 0, 0.3, 0.3, MARBLE)
  box(len / 2, H + 1.05, 0.2, 0, len + T, 0.6, MARBLE_SHADE)
  // Bays: a column with a gold capital, then an arched window with a banner on every other.
  for (let u = BAY / 2, k = 0; u < len - 1; u += BAY, k += 1) {
    if (skip(u)) continue
    const px = x0 + dx * u + nx * (T / 2 + 0.55)
    const pz = z0 + dz * u + nz * (T / 2 + 0.55)
    blocks.add(px, 0.65, pz, 1.5, 1.3, 1.5, MARBLE_SHADE, STYLE.SMOOTH)
    props.add(POST, { position: [px, 1.3 + 3.9, pz], scale: [0.55, 7.8, 0.55], color: MARBLE })
    blocks.add(px, 9.25, pz, 1.4, 0.5, 1.4, GOLD, STYLE.SMOOTH)
    // The window between this column and the next.
    const w = u + BAY / 2
    if (w > len - 1 || skip(w)) continue
    box(w, 3, 4.4, T / 2 + 0.06, 2.6, 0.12, GOLD_DEEP)
    box(w, 3.15, 4.1, T / 2 + 0.1, 2.2, 0.12, GLASS, STYLE.GLOW)
    const ax = x0 + dx * w + nx * (T / 2 + 0.1)
    const az = z0 + dz * w + nz * (T / 2 + 0.1)
    if (arches) props.add(POST, { position: [ax, 7.25, az], scale: [1.1, 0.12, 1.1], rotation: along ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2], color: GLASS, style: STYLE.GLOW })
    if (arches) props.add(POST, { position: [ax + nx * -0.01, 7.25, az + nz * -0.01], scale: [1.3, 0.1, 1.3], rotation: along ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2], color: GOLD_DEEP })
    if (k % 2 === 0) {
      // A royal banner hung from the cornice, a gold crown stitched on it.
      box(w, 4.2, 4.6, T / 2 + 0.3, 2.4, 0.12, ROYAL)
      box(w, 4.2, 0.3, T / 2 + 0.36, 2.4, 0.08, GOLD)
      box(w, 8.5, 0.3, T / 2 + 0.36, 2.6, 0.08, GOLD)
      box(w, 6.4, 0.8, T / 2 + 0.38, 1, 0.08, GOLD, STYLE.GLOW)
    }
  }
}

/** A round tower at (x, z): marble shaft with gold bands, windows, a blue dome and a gold spire with a flag. */
function addTower(blocks, props, x, z, { radius = 4.2, height = 17, dome = DOME } = {}) {
  props.add(TOWER, { position: [x, height / 2, z], scale: [radius, height, radius], color: MARBLE })
  props.add(TOWER, { position: [x, 0.8, z], scale: [radius + 0.4, 1.6, radius + 0.4], color: MARBLE_SHADE })
  for (const y of [6, height - 1]) props.add(TOWER, { position: [x, y, z], scale: [radius + 0.15, 0.5, radius + 0.15], color: GOLD })
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2
    blocks.add(x + Math.cos(a) * radius, height - 5, z + Math.sin(a) * radius, 0.3, 2.6, 1.2, GLASS, STYLE.GLOW, -a)
  }
  props.add(BALL, { position: [x, height + radius * 0.35, z], scale: [radius * 1.08, radius * 1.15, radius * 1.08], color: dome })
  props.add(SPIRE, { position: [x, height + radius * 1.6, z], scale: [0.45, 2.6, 0.45], color: GOLD })
  props.add(BALL, { position: [x, height + radius * 1.6 + 1.4, z], scale: 0.35, color: GOLD, style: STYLE.GLOW })
  blocks.add(x + 0.8, height + radius * 1.6 + 1.9, z, 1.4, 0.8, 0.06, ROYAL, STYLE.SMOOTH)
}

/** The palace front behind the portal: a raised centre with columns, a golden door, a pediment and a great dome. */
function addPalaceFront(blocks, props) {
  const portal = PORTALS[0]
  const cx = portal.x
  const z = WALL.minZ
  const w = 30
  const h = 20
  blocks.add(cx, h / 2, z - 3, w, h, 6, MARBLE, STYLE.SMOOTH)
  blocks.add(cx, h - 0.6, z - 0.2, w + 0.6, 1.2, 0.6, GOLD, STYLE.SMOOTH)
  // A row of tall columns along its face.
  for (let k = -3; k <= 3; k += 1) {
    if (k === 0) continue
    const x = cx + k * 4.1
    props.add(POST, { position: [x, 9.5, z + 0.8], scale: [0.7, 17, 0.7], color: MARBLE })
    blocks.add(x, 18.4, z + 0.8, 1.6, 0.6, 1.6, GOLD, STYLE.SMOOTH)
    blocks.add(x, 0.6, z + 0.8, 1.8, 1.2, 1.8, MARBLE_SHADE, STYLE.SMOOTH)
  }
  // The golden door (the portal stands before it) under a glowing arch.
  blocks.add(cx, 5.5, z + 0.15, 7.6, 11, 0.4, GOLD_DEEP, STYLE.SMOOTH)
  blocks.add(cx, 5.2, z + 0.4, 6.4, 10.4, 0.2, '#ffd86a', STYLE.GLOW)
  props.add(POST, { position: [cx, 11, z + 0.3], scale: [3.8, 0.4, 3.8], rotation: [Math.PI / 2, 0, 0], color: GOLD })
  // A pediment over it, a crown in its middle.
  blocks.add(cx, h + 1.2, z - 0.5, w * 0.7, 2.4, 1.4, MARBLE_SHADE, STYLE.SMOOTH)
  blocks.add(cx, h + 3.2, z - 0.5, w * 0.45, 1.8, 1.2, MARBLE_SHADE, STYLE.SMOOTH)
  blocks.add(cx, h + 4.6, z - 0.4, w * 0.22, 1.2, 1.2, MARBLE, STYLE.SMOOTH)
  blocks.add(cx, h + 2.6, z + 0.25, 3.2, 1.6, 0.2, GOLD, STYLE.GLOW)
  // The great golden dome behind, on a drum, with a lantern on top; two small domes beside.
  props.add(TOWER, { position: [cx, h + 3, z - 9], scale: [8.5, 6, 8.5], color: MARBLE })
  props.add(TOWER, { position: [cx, h + 6.2, z - 9], scale: [8.8, 0.6, 8.8], color: GOLD })
  props.add(BALL, { position: [cx, h + 6.5, z - 9], scale: [8.6, 8.4, 8.6], color: GOLD })
  props.add(TOWER, { position: [cx, h + 16, z - 9], scale: [1.4, 2.4, 1.4], color: MARBLE })
  props.add(SPIRE, { position: [cx, h + 19, z - 9], scale: [1, 3.6, 1], color: GOLD })
  props.add(BALL, { position: [cx, h + 21.2, z - 9], scale: 0.6, color: '#ffffff', style: STYLE.GLOW })
  for (const side of [-1, 1]) {
    props.add(TOWER, { position: [cx + side * 12, h + 2, z - 4], scale: [3, 4, 3], color: MARBLE })
    props.add(BALL, { position: [cx + side * 12, h + 4.5, z - 4], scale: [3.1, 3.4, 3.1], color: DOME })
    props.add(SPIRE, { position: [cx + side * 12, h + 9, z - 4], scale: [0.4, 2, 0.4], color: GOLD })
  }
}

/** The royal city beyond the walls: towers, halls and domes in pastel marble, all round. */
function addCity(blocks, props, density) {
  // A full city on MEDIUM and HIGH; on LOW (phones) just a few landmarks.
  const count = density < 0.5 ? 6 : Math.round(36 * density)
  for (let k = 0; k < count; k += 1) {
    const a = (k / count) * Math.PI * 2 + hash2(k, 3) * 0.2
    const d = 85 + hash2(k, 4) * 55
    const x = -2 + Math.sin(a) * d
    const z = 13 + Math.cos(a) * d * 1.15
    const pick = hash2(k, 5)
    if (pick < 0.45) {
      addTower(blocks, props, x, z, { radius: 3 + hash2(k, 6) * 2.5, height: 16 + hash2(k, 7) * 20, dome: DOMES[k % DOMES.length] })
    } else {
      const w = 10 + hash2(k, 8) * 12
      const h = 10 + hash2(k, 9) * 10
      blocks.add(x, h / 2, z, w, h, w * 0.7, CITY[k % CITY.length], STYLE.SMOOTH, a)
      blocks.add(x, h + 0.3, z, w + 0.6, 0.6, w * 0.7 + 0.6, GOLD, STYLE.SMOOTH, a)
      props.add(BALL, { position: [x, h + 2, z], scale: [w * 0.28, w * 0.32, w * 0.28], color: DOMES[(k + 2) % DOMES.length] })
    }
  }
}

export function buildPalace(blocks, props, { density = 1 } = {}) {
  const { minX, maxX, minZ, maxZ } = WALL
  const portal = PORTALS[0]
  // The palace front takes the middle of the north wall.
  const front = (u) => Math.abs(minX + u - portal.x) < 16
  // The balustrade's posts closer together where there's triangle budget to spare.
  const rail = density < 0.5 ? 2.8 : 1.4
  const arches = density >= 0.5
  addWall(blocks, props, minX, minZ, maxX, minZ, 0, 1, front, rail, arches)
  addWall(blocks, props, minX, maxZ, maxX, maxZ, 0, -1, undefined, rail, arches)
  addWall(blocks, props, minX, minZ, minX, maxZ, 1, 0, undefined, rail, arches)
  addWall(blocks, props, maxX, minZ, maxX, maxZ, -1, 0, undefined, rail, arches)
  for (const [x, z] of [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
  ])
    addTower(blocks, props, x, z)
  addPalaceFront(blocks, props)
  addCity(blocks, props, density)
}
