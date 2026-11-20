import { hash2 } from '@shared/rng'
import { PLAZA, PORTALS } from '@shared/world'

import { STYLE } from '../materials'
import { voxelWheel } from './voxel'

/**
 * The Candy Palace: the first world's lobby, every piece a block. The courtyard walls are
 * layered like a cake - a chocolate base, cream, a strawberry band, more cream - under
 * dripping pink frosting, merlons in rainbow pastels along the top and sprinkles stuck all
 * over; candy canes stand between the bays like pillars. A cupcake tower rises at each
 * corner (striped liner, swirled frosting, a cherry), and behind the portal the castle's
 * front: a taller cake with a chocolate-bar door and a giant lollipop over it.
 *
 * Boxes only, all in the world's block set: no draw calls of its own.
 */
const CHOC = '#7a4428'
const CHOC_DARK = '#5a3018'
const CREAM = '#ffc982'
const STRAWBERRY = '#ff8fbf'
const FROSTING = '#ff5aa0'
/** The candy canes' and lollipop sticks' light stripe: lemon, not white. */
const CANE = '#ffe27a'
const MINT = '#8ff0cf'
const PASTELS = ['#ff8fbf', '#8ff0cf', '#ffe27a', '#b9a0ff', '#8fd0ff', '#ffb38a']
const SPRINKLES = ['#ff3b6a', '#ffd23a', '#3fd0ff', '#7dff6a', '#b48aff', '#ff8a3a']

/** The walls' line, just outside the plaza, and their height and thickness. */
const WALL = { minX: PLAZA.minX - 1.5, maxX: PLAZA.maxX + 1.5, minZ: PLAZA.minZ - 1.5, maxZ: PLAZA.maxZ + 1.5 }
const H = 10
const T = 2
const BAY = 7

/**
 * A blocky candy cane at (x, z), `h` tall: a lemon shaft with red stripes round it (one
 * block per stripe, cheap), its hook of cubes turned towards (hookX, hookZ).
 */
function addCandyCane(blocks, x, z, h, hookX = 1, hookZ = 0, s = 0.8) {
  const y = Math.ceil(h / s) * s
  blocks.add(x, y / 2, z, s, y, s, CANE, STYLE.SMOOTH)
  for (let k = 1; k * s * 2 < y; k += 1) blocks.add(x, k * s * 2 - s / 2, z, s + 0.06, s, s + 0.06, '#ff2a4a', STYLE.SMOOTH)
  // The hook: up and over, three cubes, then down one.
  const hx = [0, 0.5, 1, 1.4, 1.4]
  const hy = [0, 0.7, 1.1, 0.9, 0.2]
  hx.forEach((dx, k) => blocks.add(x + dx * s * hookX, y + hy[k] * s + s / 2, z + dx * s * hookZ, k % 2 ? s : s * 1.08, k % 2 ? s : s * 1.08, k % 2 ? s : s * 1.08, k % 2 ? CANE : '#ff2a4a', STYLE.SMOOTH))
}

/** A cupcake on top of a tower at (x, top, z), `w` wide: a striped liner, three swirls of frosting, a cherry. */
function addCupcake(blocks, x, top, z, w, frost) {
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2
    blocks.add(x + Math.cos(a) * w * 0.45, top + 1.2, z + Math.sin(a) * w * 0.45, w * 0.34, 2.4, w * 0.34, k % 2 ? '#ffd23a' : '#ff6aa8', STYLE.SMOOTH, -a)
  }
  blocks.add(x, top + 1.2, z, w * 0.8, 2.4, w * 0.8, '#ffd8e8', STYLE.SMOOTH)
  blocks.add(x, top + 3, z, w * 1.05, 1.4, w * 1.05, frost, STYLE.SMOOTH)
  blocks.add(x, top + 4.2, z, w * 0.75, 1.1, w * 0.75, frost, STYLE.SMOOTH)
  blocks.add(x, top + 5.1, z, w * 0.45, 0.9, w * 0.45, frost, STYLE.SMOOTH)
  blocks.add(x, top + 6, z, 1, 1, 1, '#ff1a3a', STYLE.SMOOTH)
  blocks.add(x + 0.2, top + 6.9, z, 0.18, 0.9, 0.18, '#3a8a2a', STYLE.SMOOTH, 0, 0, -0.3)
  // Sprinkles on the frosting.
  for (let k = 0; k < 6; k += 1) {
    const a = hash2(k, x) * Math.PI * 2
    blocks.add(x + Math.cos(a) * w * 0.53, top + 3 + hash2(k, z) * 0.6, z + Math.sin(a) * w * 0.53, 0.35, 0.14, 0.14, SPRINKLES[k % SPRINKLES.length], STYLE.GLOW, a)
  }
}

/** A square tower at (x, z): biscuit layers with icing bands, glowing windows, a cupcake on top. */
function addTower(blocks, x, z, { w = 7, h = 16, frost = STRAWBERRY } = {}) {
  blocks.add(x, h / 2, z, w, h, w, '#e8b878', STYLE.SMOOTH)
  for (const y of [1, 6, 11, h - 0.6]) blocks.add(x, y, z, w + 0.5, 0.6, w + 0.5, y === h - 0.6 ? FROSTING : CREAM, STYLE.SMOOTH)
  for (const [dx, dz] of [
    [0, w / 2],
    [0, -w / 2],
    [w / 2, 0],
    [-w / 2, 0],
  ])
    blocks.add(x + dx * 1.01, h - 4, z + dz * 1.01, dx ? 0.2 : 1.6, 2.4, dz ? 0.2 : 1.6, '#ff7ac0', STYLE.GLOW)
  addCupcake(blocks, x, h, z, w * 0.8, frost)
}

/**
 * One wall, from (x0, z0) to (x1, z1), its courtyard face towards (nx, nz). `skip(u)`
 * leaves the bays at `u` metres along plain (where the castle front stands).
 */
function addWall(blocks, x0, z0, x1, z1, nx, nz, skip = () => false, sprinkles = true) {
  // `sprinkles` false is LOW (phones): the walls keep their shape with fewer small blocks.
  const full = sprinkles
  const dripEvery = full ? 1.1 : 3.3
  const len = Math.hypot(x1 - x0, z1 - z0)
  const dx = (x1 - x0) / len
  const dz = (z1 - z0) / len
  const along = Math.abs(dx) > 0.5
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const slab = (y0, y1, out, color, style = STYLE.SMOOTH) =>
    blocks.add(cx + nx * out, (y0 + y1) / 2, cz + nz * out, along ? len + T : T, y1 - y0, along ? T : len + T, color, style)
  // The cake's layers, bottom to top, each a little proud of the one below on the courtyard side.
  slab(0, 1.4, 0.15, CHOC)
  slab(1.4, 4, 0, CREAM)
  slab(4, 5.2, 0.12, STRAWBERRY)
  slab(5.2, 8, 0, CREAM)
  slab(8, H, 0.1, FROSTING)
  // Frosting dripping down the courtyard face, a drip every metre or so.
  for (let u = 0.6; u < len; u += dripEvery) {
    const drip = 0.6 + hash2(Math.floor(u * 10), x0 + z0) * 1.8
    blocks.add(x0 + dx * u + nx * (T / 2 + 0.12), 8 - drip / 2, z0 + dz * u + nz * (T / 2 + 0.12), along ? 0.7 : 0.25, drip, along ? 0.25 : 0.7, FROSTING, STYLE.SMOOTH)
  }
  // Merlons along the top in rainbow pastels, a gumdrop on every other.
  for (let u = 1, k = 0; u < len; u += 2.2, k += 1) {
    blocks.add(x0 + dx * u, H + 0.7, z0 + dz * u, along ? 1.4 : T, 1.4, along ? T : 1.4, PASTELS[k % PASTELS.length], STYLE.SMOOTH)
    if (full && k % 2 === 0) blocks.add(x0 + dx * u, H + 1.75, z0 + dz * u, 0.8, 0.7, 0.8, PASTELS[(k + 3) % PASTELS.length], STYLE.SMOOTH)
  }
  // Bays: a candy cane against the wall, then a window framed in frosting.
  for (let u = BAY / 2, k = 0; u < len - 1; u += BAY, k += 1) {
    if (skip(u)) continue
    // The hook leans out over the courtyard.
    if (full) addCandyCane(blocks, x0 + dx * u + nx * (T / 2 + 0.45), z0 + dz * u + nz * (T / 2 + 0.45), 7.6, nx, nz)
    const w = u + BAY / 2
    if (w > len - 1 || skip(w)) continue
    const wx = x0 + dx * w + nx * (T / 2 + 0.06)
    const wz = z0 + dz * w + nz * (T / 2 + 0.06)
    blocks.add(wx, 5, wz, along ? 2.8 : 0.14, 4, along ? 0.14 : 2.8, FROSTING, STYLE.SMOOTH)
    blocks.add(wx + nx * 0.04, 5, wz + nz * 0.04, along ? 2.2 : 0.14, 3.4, along ? 0.14 : 2.2, k % 2 ? '#ff7ac0' : '#5ac8ff', STYLE.GLOW)
    // A heart of candy over it.
    if (full) blocks.add(wx + nx * 0.1, 7.4, wz + nz * 0.1, along ? 0.8 : 0.14, 0.8, along ? 0.14 : 0.8, '#ff3b6a', STYLE.SMOOTH, 0, along ? 0 : Math.PI / 4, along ? Math.PI / 4 : 0)
  }
  // Sprinkles stuck all over the courtyard face.
  if (sprinkles) {
    for (let k = 0; k < len * 0.9; k += 1) {
      const u = hash2(k, x0 * 3 + z0) * len
      const y = 1.6 + hash2(k + 50, x1 + z1 * 2) * 6
      blocks.add(x0 + dx * u + nx * (T / 2 + 0.05), y, z0 + dz * u + nz * (T / 2 + 0.05), along ? 0.36 : 0.08, 0.12, along ? 0.08 : 0.36, SPRINKLES[k % SPRINKLES.length], STYLE.GLOW, 0, along ? 0 : hash2(k, 9) * 3, along ? hash2(k, 9) * 3 : 0)
    }
  }
}

/** The castle front behind the portal: a taller cake with a chocolate-bar door and a giant lollipop over it. */
function addFront(blocks) {
  const cx = PORTALS[0].x
  const z = WALL.minZ
  const w = 30
  const h = 18
  const layers = [
    [0, 1.6, CHOC],
    [1.6, 6, CREAM],
    [6, 7.6, MINT],
    [7.6, 13, CREAM],
    [13, 14.6, STRAWBERRY],
    [14.6, h, FROSTING],
  ]
  for (const [y0, y1, c] of layers) blocks.add(cx, (y0 + y1) / 2, z - 3, w, y1 - y0, 6 + (c === CREAM ? 0 : 0.3), c, STYLE.SMOOTH)
  for (let u = -w / 2 + 0.8; u < w / 2; u += 1) {
    const drip = 0.8 + hash2(Math.floor(u * 7), 3) * 2.4
    blocks.add(cx + u, 14.6 - drip / 2, z + 0.15, 0.7, drip, 0.3, FROSTING, STYLE.SMOOTH)
  }
  // The chocolate-bar door, its squares raised, in a frosting frame.
  blocks.add(cx, 5.7, z + 0.2, 8.4, 11.4, 0.3, FROSTING, STYLE.SMOOTH)
  blocks.add(cx, 5.5, z + 0.35, 7.4, 10.8, 0.3, CHOC_DARK, STYLE.SMOOTH)
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 2; c += 1) blocks.add(cx - 1.7 + c * 3.4, 1.4 + r * 2.6, z + 0.55, 3, 2.2, 0.2, CHOC, STYLE.SMOOTH)
  // Rainbow merlons and two cupcake towers either side.
  for (let u = -w / 2 + 1, k = 0; u < w / 2; u += 2.2, k += 1) blocks.add(cx + u, h + 0.7, z - 3, 1.4, 1.4, 6, PASTELS[k % PASTELS.length], STYLE.SMOOTH)
  for (const side of [-1, 1]) addTower(blocks, cx + side * (w / 2 + 2.5), z - 3, { w: 6.9, h: 20, frost: side < 0 ? MINT : '#ffe27a' })
  // The giant lollipop over the door: a swirl of voxel rings on a lemon stick.
  blocks.add(cx, h + 4, z - 3, 0.6, 8, 0.6, CANE, STYLE.SMOOTH)
  const rings = ['#ff3b6a', '#ffe27a', '#3fd0ff', '#ffe27a', '#ffd23a', '#b48aff']
  rings.forEach((c, k) => voxelWheel(blocks, cx, h + 10, z - 2.6, (5 - k * 0.85) - 0.85, 5 - k * 0.85, 0.8 + k * 0.02, c, k % 2 ? STYLE.SMOOTH : STYLE.GLOW, 'z', 0.7))
}

/** Giant lollipops and candy canes standing just outside the walls, all round. */
function addGiantCandy(blocks, density) {
  const n = density < 0.5 ? 4 : Math.round(14 * density)
  for (let k = 0; k < n; k += 1) {
    const a = (k / n) * Math.PI * 2 + 0.2
    const x = -2 + Math.sin(a) * 64
    const z = 13 + Math.cos(a) * 66
    if (k % 2) {
      const h = 14 + hash2(k, 4) * 8
      blocks.add(x, h / 2, z, 0.7, h, 0.7, CANE, STYLE.SMOOTH)
      const c = PASTELS[k % PASTELS.length]
      voxelWheel(blocks, x, h + 3.5, z, 0, 4, 0.9, c, STYLE.SMOOTH, Math.abs(Math.sin(a)) > 0.7 ? 'x' : 'z', 0.6)
      voxelWheel(blocks, x, h + 3.5, z, 1.4, 2.5, 1, '#ffd23a', STYLE.SMOOTH, Math.abs(Math.sin(a)) > 0.7 ? 'x' : 'z', 0.6)
    } else {
      addCandyCane(blocks, x, z, 16 + hash2(k, 5) * 8, Math.cos(a), Math.sin(a), 1.4)
    }
  }
}

export function buildCandyCastle(blocks, { density = 1 } = {}) {
  const { minX, maxX, minZ, maxZ } = WALL
  const portal = PORTALS[0]
  const front = (u) => Math.abs(minX + u - portal.x) < 16
  const sprinkles = density >= 0.5
  addWall(blocks, minX, minZ, maxX, minZ, 0, 1, front, sprinkles)
  addWall(blocks, minX, maxZ, maxX, maxZ, 0, -1, undefined, sprinkles)
  addWall(blocks, minX, minZ, minX, maxZ, 1, 0, undefined, sprinkles)
  addWall(blocks, maxX, minZ, maxX, maxZ, -1, 0, undefined, sprinkles)
  const frosts = [STRAWBERRY, MINT, '#b9a0ff', '#ffe27a']
  ;[
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
  ].forEach(([x, z], k) => addTower(blocks, x, z, { frost: frosts[k] }))
  addFront(blocks)
  addGiantCandy(blocks, density)
}
