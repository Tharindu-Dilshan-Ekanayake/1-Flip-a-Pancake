import { PIT, pitHeightAt } from '@shared/world'

import { STYLE } from '../materials'
import { venueOf } from '../sceneStyle'
import { voxelDisc, voxelPancakes, voxelRing } from './voxel'

/** The launch circle's gameplay colours, the same in every world. */
const GOLD = '#ffd21f'
const ORANGE = '#ff8a1f'
const DARK = '#4a443a'

/** Each world's terraces, outermost first (they alternate), its floor, the rim's lip and each step's lip. */
const PIT_LOOKS = {
  candy: { steps: ['#ff8abd', '#6ae0b8', '#b498ff', '#ffd23a', '#7fc4ff'], floor: '#ffb4d8', rim: '#ffd23a', ring: '#ff5aa8', circle: '#ff5aa8' },
  palace: { steps: ['#efe6d6', '#e4d8c2', '#f7f0e2'], floor: '#f4ecdc', rim: '#e8b830', ring: '#d8a838' },
  beach: { steps: ['#f2dca0', '#e8cc88', '#f6e4b0'], floor: '#f8ead0', rim: '#16b8c4', ring: '#16b8c4' },
  snow: { steps: ['#e8f2fb', '#d6e6f4', '#f4f9ff'], floor: '#ffffff', rim: '#9fe8ff', ring: '#5ab0ff' },
  lava: { steps: ['#3a2f2c', '#2e2422', '#463834'], floor: '#2a201c', rim: '#ff7a1a', ring: '#ff5a1f' },
  stone: { steps: ['#9a9282', '#8a8272', '#ada595'], floor: '#a39b88', rim: '#d8cdb4', ring: '#6e675a' },
}

/** The pit's terraces from its edge inwards: [rIn, rOut, height], read off world.js pitHeightAt. */
function terraces() {
  const out = []
  let rOut = PIT.rim
  let h = pitHeightAt(PIT.x + PIT.rim - 0.01, PIT.z)
  for (let r = PIT.rim - 0.05; r > 0; r -= 0.05) {
    const hr = pitHeightAt(PIT.x + r, PIT.z)
    if (hr !== h) {
      out.push([r, rOut, h])
      rOut = r
      h = hr
    }
  }
  out.push([0, rOut, h])
  return out
}

/**
 * The LAUNCH PIT in the middle of the plaza, built of blocks: terraces stepping down to
 * its floor, each a stepped voxel ring in the world's colours (pastel candy, marble, sand,
 * snow, basalt) - you walk down them exactly as they're drawn (world.js pitHeightAt) - and
 * on the floor the glowing launch circle: gold and orange voxel rings, arrows pointing out
 * and a blocky pancake target where you stand to launch.
 *
 * Boxes only, in the world's block set: no draw calls of their own.
 */
export function buildRollZone(blocks, props, { world = 0 } = {}) {
  const v = venueOf(world)
  const look = PIT_LOOKS[v.park] ?? PIT_LOOKS[v.beach ? 'beach' : 'stone']
  const { x: cx, z: cz } = PIT
  const floorY = -PIT.depth
  const base = floorY - 0.4

  // The terraces, outermost (at the plaza's level, covering the ground's round hole) to the floor.
  terraces().forEach(([rIn, rOut, h], k) => {
    const outer = k === 0 ? rOut + 1.2 : rOut
    const top = k === 0 ? 0.02 : h
    const color = rIn === 0 ? look.floor : look.steps[k % look.steps.length]
    voxelRing(blocks, cx, cz, rIn, outer, base, top, color, STYLE.SMOOTH, 0.75)
    // A bright lip round the top step's edge, where the plaza drops into the pit.
    if (k === 0) voxelRing(blocks, cx, cz, rIn, rIn + 0.75, top, top + 0.06, look.rim, STYLE.SMOOTH, 0.75)
  })

  // The launch circle, each ring a clear step proud of the last.
  const at = (y) => floorY + y
  voxelRing(blocks, cx, cz, 4.1, 4.7, at(0), at(0.06), look.circle ?? '#ffffff', STYLE.SMOOTH, 0.4)
  voxelRing(blocks, cx, cz, 3.4, 4.1, at(0), at(0.1), ORANGE, STYLE.GLOW, 0.4)
  voxelRing(blocks, cx, cz, 2.6, 3.4, at(0), at(0.06), DARK, STYLE.SMOOTH, 0.4)
  voxelRing(blocks, cx, cz, 1.9, 2.6, at(0), at(0.1), GOLD, STYLE.GLOW, 0.4)
  voxelDisc(blocks, cx, cz, 1.9, at(0), at(0.04), look.floor, STYLE.SMOOTH, 0.4)
  // The target: a blocky pancake where the pancake goes up from.
  voxelPancakes(blocks, cx, at(0.04), cz, 1.6, 1)
  // Arrows round the circle pointing out (up the steps: everything leads to the sky).
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    const r = 6.2
    const x = cx + Math.sin(a) * r
    const z = cz + Math.cos(a) * r
    for (const side of [-1, 1]) blocks.add(x + Math.cos(a) * side * 0.35, at(0.08), z - Math.sin(a) * side * 0.35, 0.9, 0.05, 0.28, i % 2 ? GOLD : ORANGE, STYLE.GLOW, a + side * 0.75)
  }
}
