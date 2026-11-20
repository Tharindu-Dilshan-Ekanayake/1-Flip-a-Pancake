import {
  BufferAttribute,
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  LinearFilter,
  Path,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from 'three'

import { EGG_ARC, EGG_STANDS, PAD_X, PATH_HALF, PIT, PIT_WALK, PLAZA, PORTALS, SHOP, SPAWN, STATUES } from '@shared/world'

import { venueOf } from '../sceneStyle'

/**
 * The plaza floor: one big plane whose colours come from a tiny "ground map" texture
 * painted at one texel per world unit. The football field (pitch.js) - its mown bands, the
 * end zones, the white border, the running track and the navy sideline apron - the ball
 * shop's yard and the turf round the plaza are rectangles painted into it on whole units,
 * so every edge is crisp and falls on the stud-tile seams, and the whole floor is a single
 * draw call however many regions it has. (The field's lines and lettering are geometry and
 * decals over it: pitch.js, signs.js.)
 */

const MAP = { minX: -64, maxX: 64, minZ: -44, maxZ: PLAZA.maxZ + 12 }
const MAP_W = MAP.maxX - MAP.minX
const MAP_H = MAP.maxZ - MAP.minZ
/**
 * Pixels per metre: quarter-metre texels (a 512px map, inside the mobile texture budget),
 * smooth-filtered with clean round circles - no blocky, grainy steps on the floor.
 */
const PX = 4

/** Where the ground plane ends to the north: far out under the cliffs (the canyon is closed). */
export const GROUND_NORTH_EDGE = -280

function painter(ctx) {
  const rect = (r, color) => {
    ctx.fillStyle = color
    ctx.fillRect((r.minX - MAP.minX) * PX, (r.minZ - MAP.minZ) * PX, (r.maxX - r.minX) * PX, (r.maxZ - r.minZ) * PX)
  }
  // Smooth, anti-aliased circles.
  const disc = (x, z, radius, color) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc((x - MAP.minX) * PX, (z - MAP.minZ) * PX, radius * PX, 0, Math.PI * 2)
    ctx.fill()
  }
  return { rect, disc }
}

/** The ground map for `world`'s venue (car park and turf, or sand). */
export function createGroundMap(maxTexture, world = 0) {
  const v = venueOf(world)
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W * PX
  canvas.height = MAP_H * PX
  const ctx = canvas.getContext('2d')
  const { rect, disc } = painter(ctx)

  paintPark(rect, disc, PARKS[v.park ?? (v.beach ? 'beach' : 'grass')])

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  // A little anisotropy even on LOW, so the floor stays crisp, not smeared, at a glance.
  texture.anisotropy = maxTexture > 512 ? 4 : 2
  return texture
}

/**
 * The lobby floor: warm stone paving with a sandstone path down the middle in the stone
 * canyon (or sand and a coral boardwalk at Tropic Skies).
 */
const PARKS = {
  grass: { grass: ['#cbc1aa', '#bfb59d'], path: ['#eaa64a', '#f2b860'], edge: '#7a6a50', ring: '#ff9a2e', portal: '#ff7a1a', yard: '#e6d8bc', hatch: ['#d9cdb4', '#e2d7c0'], pad: '#b48aff', walk: ['#e8b268', '#efbf7a'] },
  // The candy palace: strawberry paving, a pink-and-lemon candy-stripe path, mint walks, lavender egg pads (no white).
  candy: { grass: ['#ffaed2', '#ffa0ca'], path: ['#ff4f9a', '#ffd23a'], edge: '#e8508e', ring: '#ffd23a', portal: '#b48aff', yard: '#ffc4e0', hatch: ['#c8aaff', '#d4baff'], pad: '#9a6aff', walk: ['#7fe8c0', '#94f0cc'], stripes: true },
  // The palace: cream marble, a royal red carpet edged in gold, ivory walks and purple egg pads.
  palace: { grass: ['#f3ede2', '#efe7d8'], path: ['#c8102e', '#b40e28'], edge: '#d8a838', ring: '#e8b830', portal: '#7a2aa8', yard: '#ece2d0', hatch: ['#efe7d8', '#f7f1e6'], pad: '#8a3ad8', walk: ['#efe2c8', '#f6ecda'] },
  snow: { grass: ['#e4eef8', '#d6e4f2'], path: ['#7fc8ff', '#9fd8ff'], edge: '#5a7aa8', ring: '#9fe8ff', portal: '#3a8aff', yard: '#f4f9ff', hatch: ['#eef6ff', '#f6fbff'], pad: '#9fe8ff', walk: ['#bfe0ff', '#cfe8ff'] },
  lava: { grass: ['#3a302c', '#2f2724'], path: ['#ff7a1f', '#ff9a3a'], edge: '#1a0f0c', ring: '#ff9a1f', portal: '#ff5a1f', yard: '#4a3c38', hatch: ['#3e3330', '#463a36'], pad: '#ff5a1f', walk: ['#c84a1a', '#e05a22'] },
  beach: { grass: ['#f2dca0', '#ead196'], path: ['#ff7a6a', '#ff917f'], edge: '#ffffff', ring: '#16b8c4', portal: '#0b8fa0', yard: '#fbeed0', hatch: ['#fbeed0', '#f6e4bc'], pad: '#16b8c4', walk: ['#ff917f', '#ffa898'] },
}

/**
 * The floor plan, a hub round the launch pit: stone paving in 4 m checker tiles; the
 * hatchery's round yard to the north with a coloured pad under each egg; the main path
 * from the spawn's circle up through the pit to the portal, and a cross path from the pan
 * shop to the flip mats; and a sandstone walkway all round the pit (the pit itself is a
 * hole in the ground; rollZone.js).
 */
function paintPark(rect, disc, PARK) {
  // Smooth paving, one even colour.
  rect(MAP, PARK.grass[0])
  // The hatchery's round yard, a pad under each egg.
  disc(EGG_ARC.x, EGG_ARC.z, EGG_ARC.radius + 7, PARK.edge)
  disc(EGG_ARC.x, EGG_ARC.z, EGG_ARC.radius + 6, PARK.hatch[0])
  disc(EGG_ARC.x, EGG_ARC.z, EGG_ARC.radius - 6, PARK.hatch[1])
  for (const s of EGG_STANDS) {
    disc(s.x, s.z, s.big ? 5 : 4, PARK.edge)
    disc(s.x, s.z, s.big ? 4 : 3, PARK.pad)
  }
  // The pan shop's tiled yard.
  rect(SHOP, PARK.yard)
  // The main path, edged, in light and dark 4 m bands; and the cross path.
  // Paths: candy stripes in the candy palace, one even colour elsewhere.
  const band = (r, colors, horizontal) => {
    if (!PARK.stripes) return rect(r, colors[0])
    if (horizontal) for (let x = r.minX, k = 0; x < r.maxX; x += 2, k += 1) rect({ ...r, minX: x, maxX: Math.min(r.maxX, x + 2) }, colors[k % 2])
    else for (let z = r.minZ, k = 0; z < r.maxZ; z += 2, k += 1) rect({ ...r, minZ: z, maxZ: Math.min(r.maxZ, z + 2) }, colors[k % 2])
  }
  rect({ minX: -PATH_HALF - 1, maxX: PATH_HALF + 1, minZ: PLAZA.minZ, maxZ: PLAZA.maxZ }, PARK.edge)
  band({ minX: -PATH_HALF, maxX: PATH_HALF, minZ: PLAZA.minZ, maxZ: PLAZA.maxZ }, PARK.path, false)
  rect({ minX: SHOP.maxX, maxX: PAD_X - 2, minZ: PIT.z - 4, maxZ: PIT.z + 4 }, PARK.edge)
  band({ minX: SHOP.maxX, maxX: PAD_X - 2, minZ: PIT.z - 3, maxZ: PIT.z + 3 }, PARK.path, true)
  // Round stone plinths' footprints under the corner statues.
  for (const s of STATUES) {
    disc(s.x, s.z, 5, PARK.edge)
    disc(s.x, s.z, 4, PARK.walk[1])
  }
  // The walkway round the pit, edged both sides.
  disc(PIT.x, PIT.z, PIT_WALK + 1, PARK.edge)
  disc(PIT.x, PIT.z, PIT_WALK, PARK.walk[0])
  disc(PIT.x, PIT.z, PIT.rim + 1.5, PARK.walk[1])
  // The spawn's circle (the logo lies on it).
  disc(SPAWN.x, SPAWN.z, 11, PARK.edge)
  disc(SPAWN.x, SPAWN.z, 10, PARK.walk[0])
  for (const p of PORTALS) {
    disc(p.x, p.z, 6, PARK.ring)
    disc(p.x, p.z, 5, PARK.portal)
  }
}

/** How far the ground runs out at Palm Beach before the ocean (Ocean.jsx) takes over. */
export const BEACH_EDGE = 118

/**
 * The ground plane, with UVs computed from world position so the map lands exactly
 * on the world grid. Outside the map, clamp-to-edge repeats the car park's (or the sand's)
 * colour. At Palm Beach it stops at BEACH_EDGE, and the sea runs on from there.
 */
export function createGroundGeometry(world = 0) {
  const reach = venueOf(world).beach ? BEACH_EDGE : 280
  const minX = -reach
  const maxX = reach
  const minZ = GROUND_NORTH_EDGE
  const maxZ = reach
  // A big rectangle with a round hole cut for the launch pit (its bowl is its own mesh,
  // rollZone.js). Drawn with the shape's y as -z, so laying it flat puts it the right way round.
  const shape = new Shape()
  shape.moveTo(minX, -maxZ)
  shape.lineTo(maxX, -maxZ)
  shape.lineTo(maxX, -minZ)
  shape.lineTo(minX, -minZ)
  shape.closePath()
  const hole = new Path()
  hole.absarc(PIT.x, -PIT.z, PIT.rim, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const geometry = new ShapeGeometry(shape, 48)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    uv.setXY(i, (x - MAP.minX) / MAP_W, 1 - (z - MAP.minZ) / MAP_H)
  }
  uv.needsUpdate = true
  geometry.setAttribute('aStyle', new BufferAttribute(new Float32Array(position.count), 1))
  return geometry
}
