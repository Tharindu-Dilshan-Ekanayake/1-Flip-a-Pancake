import { FOUNTAINS, HEDGE_SEGMENTS, LAMPS, PLANTERS, STATUES } from '@shared/world'

import { STYLE } from '../materials'
import { venueOf } from '../sceneStyle'
import { voxelDisc, voxelPancakes, voxelRing } from './voxel'

/** Each venue's plaza furniture: iron and warm light in the canyon, white and coral at the beach. */
const LOOKS = [
  // The candy palace: candy-pink lamp posts with lemon bands, mint planters, bright gumdrop flowers.
  { post: '#ff6aa8', trim: '#ffd23a', light: '#ffe27a', box: '#6ae0b8', boxTrim: '#ff6aa8', hedge: ['#7ae05a', '#9af07a'], flowers: ['#ff3b6a', '#ffd23a', '#3fd0ff', '#b48aff', '#ff8a3a'] },
  // The palace: gilded lamp posts, marble planters with gold rims, roses and lilies.
  { post: '#d8a838', trim: '#ffffff', light: '#fff1c8', box: '#f1e8d8', boxTrim: '#e8b830', hedge: ['#3f9a3a', '#4fb046'], flowers: ['#e8203c', '#ffffff', '#ff8ad8', '#ffd23a', '#9a5ad8'] },
  { post: '#ffffff', trim: '#16b8c4', light: '#fff1c8', box: '#e2d5ba', boxTrim: '#16b8c4', hedge: ['#3fbf5a', '#54d36a'], flowers: ['#ff6f61', '#ffd27a', '#ff9ab0', '#ffffff', '#3fd8ff'] },
  // Frosty Peaks: frosted iron, icy-blue lanterns, snow-covered hedges with blue berries.
  { post: '#3a4a6a', trim: '#9fe8ff', light: '#d8f4ff', box: '#8a6a4a', boxTrim: '#ffffff', hedge: ['#e8f2fb', '#d8e8f6'], flowers: ['#3a8aff', '#9fe8ff', '#ffffff', '#b48aff', '#ff5a7a'] },
  // Lava Kitchen: black iron, fire-orange lanterns, charred hedges glowing with embers.
  { post: '#1a1210', trim: '#ff9a1f', light: '#ff8a2a', box: '#2a201c', boxTrim: '#ff5a1f', hedge: ['#3a2a24', '#2a1e1a'], flowers: ['#ff5a1f', '#ffb81f', '#ff2a1a', '#ffd27a', '#ff7a3a'] },
]

/** A lamp post at (x, z), all blocks: a base, a square post with bands, a cube lantern glowing, a cap. */
function addLamp(blocks, props, x, z, c) {
  blocks.addOn(x, 0, z, 0.9, 0.5, 0.9, c.post, STYLE.SMOOTH)
  blocks.addOn(x, 0.5, z, 0.3, 3.9, 0.3, c.post, STYLE.SMOOTH)
  for (const y of [1.2, 4.3]) blocks.addOn(x, y, z, 0.42, 0.18, 0.42, c.trim, STYLE.SMOOTH)
  blocks.add(x, 4.8, z, 0.7, 0.7, 0.7, c.light, STYLE.GLOW)
  blocks.addOn(x, 5.15, z, 0.9, 0.18, 0.9, c.post, STYLE.SMOOTH)
  blocks.addOn(x, 5.33, z, 0.4, 0.3, 0.4, c.trim, STYLE.SMOOTH)
}

/** A planter at (x, z): a box full of a blocky hedge and cube flowers. */
function addPlanter(blocks, props, x, z, c, k) {
  blocks.addOn(x, 0, z, 3.2, 0.8, 1.6, c.box, STYLE.SMOOTH)
  blocks.addOn(x, 0.8, z, 3.4, 0.14, 1.8, c.boxTrim, STYLE.SMOOTH)
  for (let i = 0; i < 3; i += 1) blocks.addOn(x - 1 + i, 0.9, z, 0.95, 0.6, 1.2, c.hedge[(i + k) % 2], STYLE.SMOOTH)
  for (let i = 0; i < 9; i += 1) {
    const fx = x - 1.3 + (i % 5) * 0.65
    const fz = z + (i < 5 ? -0.35 : 0.35)
    blocks.add(fx, 1.62 + (i % 2) * 0.12, fz, 0.26, 0.26, 0.26, c.flowers[(i + k) % c.flowers.length], STYLE.SMOOTH, i)
  }
}

/**
 * A giant pancake stack on a pedestal at (x, z), all blocks: a trimmed plinth with a light
 * at each corner, a tall stack of blocky syrupy pancakes, and a giant fork stuck in the top.
 */
function addStatue(blocks, props, x, z) {
  blocks.addOn(x, 0, z, 4.6, 0.6, 4.6, '#857e6e', STYLE.SMOOTH)
  blocks.addOn(x, 0.6, z, 3.8, 1.6, 3.8, '#a39b88', STYLE.SMOOTH)
  blocks.addOn(x, 2.2, z, 4.2, 0.25, 4.2, '#c9a24a', STYLE.SMOOTH)
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    blocks.addOn(x + dx, 0.6, z + dz, 0.5, 0.9, 0.5, '#4a443a', STYLE.SMOOTH)
    blocks.add(x + dx, 1.75, z + dz, 0.5, 0.5, 0.5, '#ffd98a', STYLE.GLOW, 0.6)
  }
  voxelPancakes(blocks, x, 2.45, z, 1.9, 6)
  const fx = x + 0.5
  const fz = z + 0.3
  blocks.add(fx, 6.6, fz, 0.32, 3.4, 0.32, '#d8dee8', STYLE.SMOOTH, 0, 0.2, 0.15)
  blocks.add(fx - 0.18, 4.95, fz - 0.33, 0.9, 0.3, 0.16, '#d8dee8', STYLE.SMOOTH, 0, 0.2, 0.15)
  for (const t of [-0.3, -0.1, 0.1, 0.3]) blocks.add(fx - 0.25 + t, 4.5, fz - 0.42, 0.1, 0.9, 0.1, '#d8dee8', STYLE.SMOOTH, 0, 0.2, 0.15)
}

/** Each world's fountain: its basin and what flows in it (water, ice, or lava). */
const FOUNTAIN_LOOKS = {
  candy: { basin: '#ff8ac4', trim: '#ffd23a', water: '#ff5aa8', style: STYLE.GLOW, spout: '#ff8fd0' },
  palace: { basin: '#f4ecdc', trim: '#e8b830', water: '#5ad8ff', style: STYLE.WATER, spout: '#bff4ff' },
  beach: { basin: '#f2dca0', trim: '#16b8c4', water: '#3fc6d8', style: STYLE.WATER, spout: '#bff4ff' },
  snow: { basin: '#e8f2fb', trim: '#9fe8ff', water: '#cff4ff', style: STYLE.GLOW, spout: '#ffffff' },
  lava: { basin: '#2a201c', trim: '#ff9a1f', water: '#ff5a14', style: STYLE.LAVA, spout: '#ffb81f' },
}

/** A fountain at (x, z), all blocks: a stepped voxel basin, two tiers spilling over, a crown on top. */
function addFountain(blocks, props, x, z, radius, f) {
  voxelDisc(blocks, x, z, radius, 0, 0.9, f.basin, STYLE.SMOOTH, 0.5)
  voxelRing(blocks, x, z, radius - 0.5, radius + 0.1, 0.9, 1.02, f.trim, STYLE.SMOOTH, 0.5)
  voxelDisc(blocks, x, z, radius - 0.5, 0.9, 0.95, f.water, f.style, 0.5)
  blocks.addOn(x, 0.9, z, 0.9, 2.4, 0.9, f.basin, STYLE.SMOOTH)
  voxelDisc(blocks, x, z, 1.7, 2.3, 2.6, f.basin, STYLE.SMOOTH, 0.34)
  voxelDisc(blocks, x, z, 1.4, 2.6, 2.64, f.water, f.style, 0.34)
  blocks.addOn(x, 2.6, z, 0.6, 1.8, 0.6, f.basin, STYLE.SMOOTH)
  voxelDisc(blocks, x, z, 0.9, 4.3, 4.55, f.basin, STYLE.SMOOTH, 0.3)
  blocks.addOn(x, 4.55, z, 0.6, 0.6, 0.6, f.trim, STYLE.SMOOTH)
  blocks.add(x, 5.4, z, 0.4, 0.4, 0.4, f.trim, STYLE.GLOW, 0.8)
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2
    blocks.add(x + Math.cos(a) * 1.6, 1.65, z + Math.sin(a) * 1.6, 0.2, 1.5, 0.2, f.spout, f.style === STYLE.LAVA ? STYLE.GLOW : f.style)
    if (k % 2 === 0) blocks.add(x + Math.cos(a) * 0.85, 3.5, z + Math.sin(a) * 0.85, 0.14, 1.6, 0.14, f.spout, f.style === STYLE.LAVA ? STYLE.GLOW : f.style)
  }
}

/**
 * The plaza's furniture, laid out in world.js so the server's colliders match: lamp posts
 * lining the paths and round the pit's walkway, flower planters where the paths meet it,
 * and a trimmed hedge round the back of the egg hatchery (a gap on the portal's path),
 * dotted with flowers - all built of blocks, in the world's block set: no draw calls of
 * its own.
 */
export function buildPlazaDecor(blocks, props, { world = 0 } = {}) {
  const v = venueOf(world)
  const c = LOOKS[{ candy: 0, palace: 1, snow: 3, lava: 4 }[v.park] ?? (v.beach ? 2 : 1)]
  for (const l of LAMPS) addLamp(blocks, props, l.x, l.z, c)
  PLANTERS.forEach((p, k) => addPlanter(blocks, props, p.x, p.z, c, k))
  STATUES.forEach((s) => addStatue(blocks, props, s.x, s.z))
  const f = FOUNTAIN_LOOKS[v.park] ?? FOUNTAIN_LOOKS[v.beach ? 'beach' : 'palace']
  for (const fountain of FOUNTAINS) addFountain(blocks, props, fountain.x, fountain.z, fountain.radius, f)
  HEDGE_SEGMENTS.forEach((h, k) => {
    blocks.add(h.x, 0.75, h.z, 1.4, 1.5, 4.4, c.hedge[k % 2], STYLE.STUDS, h.yaw + Math.PI / 2)
    blocks.add(h.x, 1.55, h.z, 1.1, 0.12, 4.0, c.hedge[(k + 1) % 2], STYLE.STUDS, h.yaw + Math.PI / 2)
    if (k % 2 === 0) blocks.add(h.x, 1.72, h.z, 0.32, 0.32, 0.32, c.flowers[k % c.flowers.length], STYLE.SMOOTH, k)
  })
}
