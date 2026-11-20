import {
  PAD_COUNT,
  PAD_HEIGHT,
  PAD_RADIUS,
  PAD_X,
  padCenterZ,
  SHOP_SIGN,
  SHOP_SIGN_FACING,
  PLATE_X,
  SHOP_STAGES,
  TABLE_LENGTH,
  TABLE_NEAR_X,
  TABLE_WIDTH,
} from '@shared/world'

import { STYLE } from '../materials'
import { voxelDisc, voxelPancakes, voxelRing, voxelWheel } from './voxel'
import { venueOf } from '../sceneStyle'

/**
 * Static lobby structures, added to the world's shared BlockSet and prop builder so they
 * render in the same few draw calls as the grandstands.
 */

/**
 * Per-pad look, in pad order (matches PADS in shared/balance.js): the mat's base, top,
 * glowing ring and centre emblem, the board's frame and screen, the lane's floor, and the
 * colour of its labels. `beach` ones (Palm Beach's surf pads) have a surfboard and palm
 * on top of their board.
 */
export const PAD_THEMES = [
  { base: '#0f8a7a', top: '#2fd6b8', ring: '#bffff0', emblem: '#ffffff', rail: '#0f9a88', court: '#127a6c', screen: '#bffff0', text: '#5fffe0' },
  { base: '#c85a10', top: '#ff8a2a', ring: '#ffe0a0', emblem: '#1d1f22', rail: '#d86a1a', court: '#a84e12', screen: '#ffe0a0', text: '#ffb06a' },
  { base: '#4a9a1a', top: '#7fe03a', ring: '#f0ffb8', emblem: '#ffffff', rail: '#5aa82a', court: '#3f8418', screen: '#f0ffb8', text: '#b8ff7a' },
  { base: '#1a5aa8', top: '#3a8dff', ring: '#bfe0ff', emblem: '#ffd21f', rail: '#1f66c0', court: '#174f94', screen: '#bfe0ff', text: '#8fc4ff' },
  { base: '#a8145a', top: '#ff3a8a', ring: '#ffc0dc', emblem: '#ffffff', rail: '#c01f68', court: '#8e124c', screen: '#ffc0dc', text: '#ff8ac0' },
  { base: '#5a3ad8', top: '#b8a0ff', ring: '#ffffff', emblem: '#2fc6ff', rail: '#6a4ae8', court: '#4a30b8', screen: '#ffffff', text: '#d0c0ff', style: STYLE.GLOW },
  { base: '#14183f', top: '#1a1240', ring: '#ff7a1a', emblem: '#2fc6ff', rail: '#1a1240', court: '#14183f', screen: '#ff7a1a', text: '#ffb06a', style: STYLE.GALAXY },
  // Palm Beach's beach bars: sand and surf, then a deep-sea wave.
  { base: '#e8c27a', top: '#ffe29a', ring: '#3fd8ff', emblem: '#ff7a3a', rail: '#2fb8e0', court: '#d9b46a', screen: '#3fd8ff', text: '#5fe6ff', beach: true },
  { base: '#0b4f8a', top: '#1a8fd8', ring: '#7ff6ff', emblem: '#ffffff', rail: '#0a6fb8', court: '#0b3f72', screen: '#7ff6ff', text: '#7ff6ff', style: STYLE.GLOW, beach: true },
]

/** The station's sign floats over its pan handle: its middle this high (labels centre on it, lobbyLabels). */
export const BOARD_BOTTOM = 3.2
export const BOARD_HEIGHT = 2.6

const GOLD = '#e8b830'
const IRON = '#2a2d36'

/**
 * A FLIP STATION, built of blocks: you stand in a giant frying pan - a stepped voxel bowl
 * in the station's colour on an iron base, its cooking surface, a rim glowing in its ring
 * colour, gold KG emblems either side of you - and its long handle reaches out east
 * (where you face) to a big upright weight plate, the station's sign floating over the
 * handle. A plate of blocky pancakes waits beside the handle.
 */
function buildStation(blocks, props, z, theme, index) {
  const r = PAD_RADIUS
  const top = PAD_HEIGHT
  const style = theme.style ?? STYLE.SMOOTH
  voxelDisc(blocks, PAD_X, z, r + 0.6, 0, 0.3, IRON)
  voxelDisc(blocks, PAD_X, z, r + 0.45, 0.3, top - 0.04, theme.base, style)
  voxelDisc(blocks, PAD_X, z, r - 0.1, top - 0.04, top, theme.top, style)
  voxelRing(blocks, PAD_X, z, r - 0.1, r + 0.45, top - 0.04, top + 0.1, theme.ring, STYLE.GLOW)
  voxelRing(blocks, PAD_X, z, r - 1, r - 0.5, top, top + 0.03, theme.ring, STYLE.GLOW)
  for (const sz of [-1, 1]) {
    blocks.add(PAD_X - 0.6, top + 0.03, z + sz * 1.55, 0.8, 0.06, 0.8, GOLD, STYLE.SMOOTH)
    blocks.add(PAD_X - 0.6, top + 0.08, z + sz * 1.55, 0.4, 0.06, 0.4, theme.ring, STYLE.GLOW)
  }
  // The handle: a neck off the rim, a long grip in the station's colour with gold bands, a hanging ring.
  const x0 = TABLE_NEAR_X
  blocks.add(x0 + 0.5, top * 0.8, z, 1.2, 0.36, 0.7, IRON, STYLE.SMOOTH)
  blocks.add(x0 + 0.6 + (TABLE_LENGTH - 0.6) / 2, top * 0.8, z, TABLE_LENGTH - 0.6, 0.5, TABLE_WIDTH, theme.rail, style)
  for (const t of [0.2, 0.5, 0.8]) blocks.add(x0 + 0.6 + (TABLE_LENGTH - 0.6) * t, top * 0.8, z, 0.18, 0.56, TABLE_WIDTH + 0.06, GOLD, STYLE.SMOOTH)
  voxelRing(blocks, x0 + TABLE_LENGTH - 0.4, z, 0.16, 0.36, top * 0.8 + 0.25, top * 0.8 + 0.35, GOLD, STYLE.SMOOTH, 0.12)
  // The weight plate at the end, standing on edge facing you.
  const px = PLATE_X
  blocks.addOn(px, 0, z, 1, 0.35, 2.6, IRON, STYLE.SMOOTH)
  voxelWheel(blocks, px, 2, z, 0, 1.55, 0.5, theme.base, style)
  voxelWheel(blocks, px - 0.06, 2, z, 0, 1.35, 0.5, theme.top, style)
  voxelWheel(blocks, px - 0.02, 2, z, 1.4, 1.8, 0.62, GOLD, STYLE.SMOOTH)
  blocks.add(px - 0.32, 2, z, 0.2, 0.7, 0.7, GOLD, STYLE.SMOOTH)
  blocks.add(px - 0.44, 2, z, 0.1, 0.34, 0.34, theme.ring, STYLE.GLOW)
  // A plate of blocky pancakes beside the handle, on alternating sides.
  const side = index % 2 ? 1 : -1
  const cx = x0 + TABLE_LENGTH * 0.55
  const cz = z + side * 1.75
  blocks.addOn(cx, 0, cz, 0.5, 0.7, 0.5, '#f4ecdc', STYLE.SMOOTH)
  voxelDisc(blocks, cx, cz, 0.75, 0.7, 0.78, '#7fd8ff', STYLE.SMOOTH, 0.25)
  voxelPancakes(blocks, cx, 0.78, cz, 0.55, 3)
  if (theme.beach) {
    blocks.addOn(cx + 0.9, 0, cz + side * 0.6, 0.22, 2.2, 0.22, '#9a6a3a', STYLE.SMOOTH)
    blocks.add(cx + 0.9, 2.3, cz + side * 0.6, 1.6, 0.18, 0.5, '#2fae4a', STYLE.SMOOTH, 0.4)
    blocks.add(cx + 0.9, 2.34, cz + side * 0.6, 0.5, 0.16, 1.6, '#4cd36a', STYLE.SMOOTH, 0.4)
  }
  // A cube of light over the plate, in the station's colour.
  blocks.add(px, 4.1, z, 0.6, 0.6, 0.6, theme.ring, STYLE.GLOW, 0.6)
}

/**
 * The flip stations along the east side, south to north, each better than the last. The
 * rounded parts go into the world's props, the rest into its blocks: no draw calls of
 * their own.
 */
export function buildPads(blocks, props) {
  for (let i = 0; i < PAD_COUNT; i += 1) buildStation(blocks, props, padCenterZ(i), PAD_THEMES[i], i)
}

const WHITE = '#f4f7fb'

/**
 * The arm shop: two open display stages (the stands on them are TireShop's) and the big
 * ARM SHOP sign behind, built like the start arch - white decks on a yellow band with
 * gold light strips round the edges. `detail` (off on LOW) adds the sign's bulbs.
 *
 * No two faces here share a plane: every layer stands a clear step proud of what it
 * sits on.
 */
export function buildShop(blocks, { detail = true, world = 0 } = {}) {
  const { band: YELLOW, strip: PALE, post: GOLD, panel: NAVY } = venueOf(world).shop
  const DECK = venueOf(world).shopFloor ?? WHITE
  for (const s of SHOP_STAGES) {
    const w = s.maxX - s.minX
    const d = s.maxZ - s.minZ
    const cx = (s.minX + s.maxX) / 2
    const cz = (s.minZ + s.maxZ) / 2
    blocks.addOn(cx, -0.1, cz, w, s.height + 0.1, d, DECK)
    blocks.addOn(cx, 0, cz, w + 0.3, s.height * 0.5, d + 0.3, YELLOW)
    // Light strips along all four top edges, and a gold post at each corner.
    for (const side of [-1, 1]) {
      blocks.addOn(cx + side * (w / 2 - 0.25), s.height, cz, 0.35, 0.08, d - 1.4, PALE, STYLE.GLOW)
      blocks.addOn(cx, s.height, cz + side * (d / 2 - 0.25), w - 1.4, 0.08, 0.35, PALE, STYLE.GLOW)
      for (const end of [-1, 1]) {
        blocks.addOn(cx + side * (w / 2 - 0.35), s.height, cz + end * (d / 2 - 0.35), 0.6, 0.7, 0.6, GOLD, STYLE.GLOW)
      }
    }
  }

  // The sign: two striped legs, a navy panel in a yellow frame, a gold cap, its face
  // turned to the plaza (`f`).
  const { x, minZ, maxZ, top } = SHOP_SIGN
  const f = SHOP_SIGN_FACING
  const length = maxZ - minZ
  const midZ = (minZ + maxZ) / 2
  const bottom = top - 8.2
  for (const z of [minZ + 1.5, maxZ - 1.5]) blocks.addOn(x - 0.1 * f, 0, z, 0.9, bottom + 0.3, 0.9, YELLOW, STYLE.STRIPES)
  blocks.addOn(x, bottom, midZ, 0.6, top - bottom, length, YELLOW)
  blocks.addOn(x + 0.1 * f, bottom + 0.5, midZ, 0.6, top - bottom - 1, length - 1, NAVY, STYLE.SMOOTH)
  blocks.addOn(x, top, midZ, 0.9, 0.4, length + 0.4, GOLD, STYLE.GLOW)
  if (detail) {
    for (let z = minZ + 1; z <= maxZ - 0.99; z += 1.5) {
      blocks.add(x + 0.42 * f, bottom + 0.25, z, 0.16, 0.3, 0.3, Math.round(z) % 2 ? '#ff6aa8' : GOLD, STYLE.GLOW)
      blocks.add(x + 0.42 * f, top - 0.25, z + 0.75, 0.16, 0.3, 0.3, Math.round(z) % 2 ? GOLD : '#ff6aa8', STYLE.GLOW)
    }
  }
}
