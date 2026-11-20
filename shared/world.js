/**
 * Lobby layout: every gameplay-relevant position and trigger area.
 *
 * Shared by the client (which renders it) and the server (which validates positions
 * against it), so the two can never disagree about where a pad or the roll zone is.
 *
 * Units are metres (the avatar is 1.8 tall). +X is east, -Z is north, which is "forward"
 * from spawn and the way to the cliff edge.
 *
 * Rects are `{ minX, maxX, minZ, maxZ }` on the ground plane.
 */

/**
 * The lobby is a stone canyon, walled in by cliffs on every side: you spawn at its south
 * end and a sandstone path runs north into the LAUNCH PIT in the middle, a round stone
 * bowl where you launch your pancake into the sky. The flip mats stand along the east
 * side (each better than the last as you go north) and the pan shop along the west; the
 * eggs and leaderboards are back by the spawn.
 */
export const SPAWN = { x: 0, z: 50 }

/** The flat, walkable plaza, symmetric about the path; stone cliffs wall it in all round. */
export const PLAZA = { minX: -46, maxX: 42, minZ: -42, maxZ: 69 }
/** The path down its middle (half its width). */
export const PATH_HALF = 5

// --- The track ----------------------------------------------------------------------

/**
 * The start of the field: the plaza's north edge, where the kick field starts. Track metre
 * m is m yards along the field from here.
 */
export const TRACK_START_Z = PLAZA.minZ
/** How steeply the kick field drops away from the start: 0, dead level all the way. */
export const SLOPE_ANGLE = 0
/** Half the width of the canyon floor. */
export const CANYON_HALF_WIDTH = 16

/**
 * The LAUNCH PIT in the middle of the plaza: a round stone bowl you walk down into, its
 * flat floor (radius `floor`) `depth` below the plaza, its sides sloping up to the plaza at
 * `rim`. Launches go from its floor (the template's roll zone); nothing stands round its
 * rim, so it's open to walk into from every side.
 */
export const PIT = { x: 0, z: 8, floor: 7.5, rim: 13, depth: 2.8 }
/** The pit floor's bounding square (its middle is the pit's: tests and labels use it). */
export const ROLL_ZONE = { minX: PIT.x - PIT.floor, maxX: PIT.x + PIT.floor, minZ: PIT.z - PIT.floor, maxZ: PIT.z + PIT.floor }
/** Where you're put back after a launch: on the pit floor, south of the launch circle. */
export const ROLL_RETURN = { x: PIT.x, z: PIT.z + 4.5 }

/**
 * Where you stand to launch: just south of the pit's middle, so the pancake climbs right up
 * its centre. Pressing LAUNCH anywhere on the floor walks you here (the server only checks
 * you're on the floor).
 */
export const DROP_SPOT = { x: PIT.x, z: PIT.z + 2.4 }
/** The pit's sides are blocky terraces: this many steps from the plaza down to its floor. */
export const PIT_STEPS = 5
const PIT_STEP = PIT.depth / PIT_STEPS

/**
 * Height of the pit at (x, z): 0 outside the rim, -depth on the floor, and between them a
 * flight of PIT_STEPS terraces (a smooth bowl's slope, rounded to whole steps) - the
 * voxel steps rollZone.js draws, each low enough to walk up.
 */
export function pitHeightAt(x, z) {
  const r = Math.hypot(x - PIT.x, z - PIT.z)
  if (r >= PIT.rim) return 0
  if (r <= PIT.floor) return -PIT.depth
  const t = (r - PIT.floor) / (PIT.rim - PIT.floor)
  const smooth = -PIT.depth * 0.5 * (1 + Math.cos(Math.PI * t))
  return Math.round(smooth / PIT_STEP) * PIT_STEP + 0
}

/** Walkable ground; the controller clamps the player into it. Nothing past the start. */
export const WALKABLE = [PLAZA]

// --- Training pads ------------------------------------------------------------------

/**
 * Throw pads line the east side of the plaza, south to north: a round mat to throw from
 * (the pad: standing on it is training, facing east down its lane) with its target and
 * its multiplier backboard over the lane.
 */
/** Seven throw pads, then Palm Beach's two beach pads at the north end of the row. */
export const PAD_COUNT = 9
export const PAD_PITCH = 7
/** Radius of a pad's top: standing within it is training. */
export const PAD_RADIUS = 2.7
/** The pads' centre line, and their tops, a step up from the plaza. */
export const PAD_X = 21
export const PAD_HEIGHT = 0.5
/** Pad 0 (the free one) is the southernmost, nearest spawn; the rest run north. */
const PAD0_Z = 36

export const padCenterZ = (index) => PAD0_Z - index * PAD_PITCH


/**
 * Each pad's console area, on the ground east of it: these constants (named for the
 * template's table, kept so the server's colliders and saves don't change) bound the
 * solid block of console, handrails and backboard drawn there. Training, you face it (east)
 * and run.
 */
export const TABLE_LENGTH = 5
export const TABLE_WIDTH = 1.1
export const TABLE_HEIGHT = 1.05
/** The solid block's near (west) end, its middle, and its far end beyond the backboard. */
export const TABLE_NEAR_X = PAD_X + PAD_RADIUS + 0.05
export const TABLE_X = TABLE_NEAR_X + TABLE_LENGTH / 2
export const ROBOT_X = TABLE_NEAR_X + TABLE_LENGTH + 0.6
/** Where each flip station's KG weight plate stands, at the end of its pan handle. */
export const PLATE_X = TABLE_NEAR_X + TABLE_LENGTH + 1.2
/** Each pad's running track: its floor runs back to a low barrier behind the backboard, this wide either side. */
export const COURT_BACK_X = ROBOT_X + 1.5
export const COURT_HALF = 3.1
/** Facing the treadmill's console: east. (Yaw 0 faces +Z, south.) */
export const PAD_YAW = Math.PI / 2

/** The square round pad `index`: its raised deck (walkable, and a wall while locked). */
export function padRect(index) {
  const cz = padCenterZ(index)
  const r = PAD_RADIUS + 0.3
  return { minX: PAD_X - r, maxX: PAD_X + r, minZ: cz - r, maxZ: cz + r }
}

// --- Ball shop ----------------------------------------------------------------------

/**
 * The ball shop: an open-air yard west of the plaza with two display stages, the
 * first twelve balls on the low front one and the next twelve on the higher back one,
 * and a big BALL SHOP sign behind. Both stages are low enough to walk straight onto.
 */
export const SHOP = { minX: -42, maxX: -16, minZ: -18, maxZ: 36 }
export const SHOP_STAGES = [
  { minX: -28, maxX: -17.5, minZ: -17, maxZ: 35, height: 0.5 },
  { minX: -41, maxX: -30.5, minZ: -17, maxZ: 35, height: 1 },
]
/** The sign along the back (west) edge, facing the plaza, high enough to clear the labels. */
export const SHOP_SIGN = { x: -42.6, minZ: -14, maxZ: 32, top: 16 }
/** Which way the sign faces: +1 east (towards the plaza). */
export const SHOP_SIGN_FACING = 1
export const STAND_SIZE = 4

/** Rows of display stands, nearest the plaza first: two rows on each stage. */
const STAND_ROWS_X = [-20, -25.5, -33, -38.5]
/** Stands per row, and how far apart along it. */
const STANDS_PER_ROW = 6
const STAND_PITCH = 9

/**
 * Twenty-four stands, six to a row. `row` (0-3, front to back) lets the labels above
 * them step up so nearer ones don't hide farther ones.
 */
export const TIRE_STANDS = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / STANDS_PER_ROW)
  return {
    index: i,
    row,
    x: STAND_ROWS_X[row],
    z: (SHOP.minZ + SHOP.maxZ) / 2 - (STAND_PITCH * (STANDS_PER_ROW - 1)) / 2 + (i % STANDS_PER_ROW) * STAND_PITCH,
    y: SHOP_STAGES[row < 2 ? 0 : 1].height,
  }
})

export const standRect = (stand) => ({
  minX: stand.x - STAND_SIZE / 2,
  maxX: stand.x + STAND_SIZE / 2,
  minZ: stand.z - STAND_SIZE / 2,
  maxZ: stand.z + STAND_SIZE / 2,
})

// --- Eggs, showcases, leaderboards --------------------------------------------------

/**
 * The EGG HATCHERY, north of the pit: the six eggs on an arc facing it (EGG_ARC), the
 * two big eggs at its ends and the four everyday ones between them, cheapest to dearest
 * from west to east - with the portal behind its middle. (The Coconut egg hatches in
 * Tropic Skies only; in the first world it stands locked, a taste of what's through.)
 */
export const EGG_ARC = { x: 0, z: -14, radius: 20 }
const eggOnArc = (deg) => ({
  x: Math.round((EGG_ARC.x + Math.sin((deg * Math.PI) / 180) * EGG_ARC.radius) * 10) / 10,
  z: Math.round((EGG_ARC.z + Math.cos((deg * Math.PI) / 180) * EGG_ARC.radius) * 10) / 10,
})
export const EGG_STANDS = [
  { eggId: 'volcano', ...eggOnArc(235), big: true },
  { eggId: 'basic', ...eggOnArc(213) },
  { eggId: 'meadow', ...eggOnArc(191) },
  { eggId: 'sunset', ...eggOnArc(169) },
  { eggId: 'unicorn', ...eggOnArc(147) },
  // Each world's own egg: the Coconut egg (shown locked at home), the Frost egg, the Magma egg.
  { eggId: 'beach', byWorld: ['beach', 'beach', 'frost', 'magma'], ...eggOnArc(125), big: true },
]
export const EGG_TRIGGER_RADIUS = 4.2

/** Limited premium pet on display: west of the spawn, the free gift's twin to the east. */
export const SPHINX_STAND = { x: -15, z: 52 }

/** Four boards along the back of the plaza, as in the reference. */
export const LEADERBOARDS = [
  { id: 'rebirths', x: -18, z: 66.5 },
  { id: 'wins', x: -6, z: 66.5 },
  { id: 'distance', x: 6, z: 66.5 },
  { id: 'playtime', x: 18, z: 66.5 },
]

/** The world portal at the back of the hatchery, on the path's line. Name and Trophies in balance.js. */
export const PORTALS = [{ id: 'world2', x: 0, z: -38, radius: 3.4 }]

export const FREE_REWARD = { x: 15, z: 52, radius: 3 }

/**
 * Palm Beach's Secret Star (balance SECRET_STAR): tucked away behind the middle of the
 * leaderboards at the back of the plaza, where the camera never looks unless you go
 * round. Picked up within `radius`, in Palm Beach only.
 */
export const STAR = { x: -6, z: 68.2, y: 1.4, radius: 1.8 }

// --- Plaza decor --------------------------------------------------------------------

/** The walkway round the pit, out to this radius (painted; ground.js). */
export const PIT_WALK = PIT.rim + 4
/**
 * Lamp posts: either side of the path from the spawn up to the pit and from the pit on
 * to the hatchery, and one on each diagonal round the pit's walkway.
 */
export const LAMPS = [
  ...[26, 34, 42].flatMap((z) => [{ x: -6.8, z }, { x: 6.8, z }]),
  { x: -6.8, z: -10 },
  { x: 6.8, z: -10 },
  ...[45, 135, 225, 315].map((deg) => ({
    x: Math.round(Math.sin((deg * Math.PI) / 180) * (PIT_WALK + 1.5) * 10) / 10,
    z: Math.round((PIT.z + Math.cos((deg * Math.PI) / 180) * (PIT_WALK + 1.5)) * 10) / 10,
  })),
]
/** Flower planters at the corners where the paths meet the walkway. */
export const PLANTERS = [
  { x: -11, z: 30 },
  { x: 11, z: 30 },
  { x: -11, z: -13 },
  { x: 11, z: -13 },
]
/** A giant pancake-stack statue in each corner of the plaza, mirrored about its middle. */
export const STATUES = [
  { x: -34, z: -31 },
  { x: 30, z: -31 },
  { x: -34, z: 57 },
  { x: 30, z: 57 },
]
/** A royal fountain either side of the plaza's south half (themed with each world: water, ice, lava). */
export const FOUNTAINS = [
  { x: -29, z: 46, radius: 3.4 },
  { x: 26, z: 46, radius: 3.4 },
]
/** The hedge round the back of the hatchery, with a gap on the path to the portal. */
export const HEDGE = { radius: EGG_ARC.radius + 4.5, from: 118, to: 242, gap: 14, step: 6 }
export const HEDGE_SEGMENTS = (() => {
  const out = []
  for (let deg = HEDGE.from; deg <= HEDGE.to + 0.01; deg += HEDGE.step) {
    if (Math.abs(deg - 180) < HEDGE.gap) continue
    const a = (deg * Math.PI) / 180
    out.push({ x: EGG_ARC.x + Math.sin(a) * HEDGE.radius, z: EGG_ARC.z + Math.cos(a) * HEDGE.radius, yaw: a })
  }
  return out
})()

// --- Collision ----------------------------------------------------------------------

const box = (x, z, halfX, halfZ) => ({
  minX: x - halfX,
  maxX: x + halfX,
  minZ: z - halfZ,
  maxZ: z + halfZ,
})

/** Solid, never-changing obstacles. Locked pads add their own walls at runtime. */
export const STATIC_COLLIDERS = [
  // The ball shop's sign.
  { minX: SHOP_SIGN.x - 0.5, maxX: SHOP_SIGN.x + 0.5, minZ: SHOP_SIGN.minZ - 0.5, maxZ: SHOP_SIGN.maxZ + 0.5 },
  // Egg pedestals.
  ...EGG_STANDS.map((s) => box(s.x, s.z, s.big ? 2.1 : 1.6, s.big ? 2.1 : 1.6)),
  box(SPHINX_STAND.x, SPHINX_STAND.z, 3, 3),
  ...LEADERBOARDS.map((b) => box(b.x, b.z, 4.6, 0.5)),
  box(FREE_REWARD.x, FREE_REWARD.z, 1.4, 1.4),
  // Lamp posts, planters and the hatchery hedge.
  ...LAMPS.map((l) => box(l.x, l.z, 0.3, 0.3)),
  ...PLANTERS.map((p) => box(p.x, p.z, 1.6, 0.8)),
  ...STATUES.map((s) => box(s.x, s.z, 2.3, 2.3)),
  ...FOUNTAINS.map((f) => box(f.x, f.z, f.radius, f.radius)),
  ...HEDGE_SEGMENTS.map((h) => box(h.x, h.z, 1.1, 1.1)),
  // Each flip station's pan handle reaching east, and the weight plate at its end.
  ...Array.from({ length: PAD_COUNT }, (_, i) => ({
    minX: TABLE_NEAR_X,
    maxX: TABLE_NEAR_X + TABLE_LENGTH,
    minZ: padCenterZ(i) - TABLE_WIDTH / 2,
    maxZ: padCenterZ(i) + TABLE_WIDTH / 2,
  })),
  ...Array.from({ length: PAD_COUNT }, (_, i) => box(PLATE_X, padCenterZ(i), 0.35, 1.8)),
  // Each portal ring's base; the swirl itself is walk-through.
  ...PORTALS.flatMap((p) => [box(p.x - p.radius, p.z, 0.6, 0.8), box(p.x + p.radius, p.z, 0.6, 0.8)]),
  // The canyon's rims either side of its mouth.
  { minX: PLAZA.minX, maxX: -CANYON_HALF_WIDTH - 1, minZ: PLAZA.minZ - 1, maxZ: PLAZA.minZ + 0.6 },
  { minX: CANYON_HALF_WIDTH + 1, maxX: PLAZA.maxX, minZ: PLAZA.minZ - 1, maxZ: PLAZA.minZ + 0.6 },
]

/** Raised floors the player stands on, as rects with a height. */
export const PLATFORMS = [
  ...SHOP_STAGES.map((s) => ({ ...s })),
  ...Array.from({ length: PAD_COUNT }, (_, i) => ({ ...padRect(i), height: PAD_HEIGHT })),
]

// --- Helpers ------------------------------------------------------------------------

export const inRect = (r, x, z, margin = 0) =>
  x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin

/** Whether (x, z) is on training pad `index`'s top, give or take `margin`. */
export const onPad = (index, x, z, margin = 0) => Math.hypot(x - PAD_X, z - padCenterZ(index)) <= PAD_RADIUS + margin

/** Index of the training pad under (x, z), or -1. */
export function padAt(x, z, margin = 0) {
  for (let i = 0; i < PAD_COUNT; i += 1) {
    if (onPad(i, x, z, margin)) return i
  }
  return -1
}

/** Whether (x, z) is on the launch pit's floor, give or take `margin`. */
export const inRollZone = (x, z, margin = 0) => Math.hypot(x - PIT.x, z - PIT.z) <= PIT.floor + margin

/** The portal whose swirl (x, z) is in, give or take `margin`, or null. */
export function portalAt(x, z, margin = 0) {
  for (const p of PORTALS) {
    if (Math.hypot(x - p.x, z - p.z) < p.radius + margin) return p
  }
  return null
}

/**
 * Whether a move from `from` to `to` is the hop back after a drop: off the drop zone
 * onto ROLL_RETURN. Faster than walking, so the server's speed check lets exactly this
 * one through.
 */
export const isRollReturn = (from, to) =>
  inRollZone(from.x, from.z, 2) && Math.hypot(to.x - ROLL_RETURN.x, to.z - ROLL_RETURN.z) < 2.5

/** Index of the tire stand under (x, z), or -1. */
export function standAt(x, z) {
  for (const stand of TIRE_STANDS) {
    if (inRect(standRect(stand), x, z)) return stand.index
  }
  return -1
}

/** The egg stand `stand` holds in world `world` (the east stand's changes with the world). */
export const eggAt = (stand, world = 0) => (stand ? (stand.byWorld?.[world] ?? stand.eggId) : null)

/** The nearest egg stand within reach of (x, z), or null (on the arc their reaches overlap). */
export function eggStandNear(x, z) {
  let best = null
  let bestD = Infinity
  for (const stand of EGG_STANDS) {
    const d = Math.hypot(stand.x - x, stand.z - z)
    const reach = EGG_TRIGGER_RADIUS + (stand.big ? 1 : 0)
    if (d <= reach && d < bestD) {
      best = stand
      bestD = d
    }
  }
  return best
}

/** Height of the floor at (x, z): raised platforms, the launch pit, else the ground at 0. */
export function groundHeightAt(x, z) {
  let h = pitHeightAt(x, z)
  for (const p of PLATFORMS) {
    if (p.height > h && inRect(p, x, z)) h = p.height
  }
  return h
}

/** Clamps (x, z) into the walkable union, returning the nearest walkable point. */
export function clampToWalkable(x, z, out = { x: 0, z: 0 }) {
  let best = Infinity
  for (const r of WALKABLE) {
    const cx = Math.min(r.maxX, Math.max(r.minX, x))
    const cz = Math.min(r.maxZ, Math.max(r.minZ, z))
    const d = (cx - x) ** 2 + (cz - z) ** 2
    if (d < best) {
      best = d
      out.x = cx
      out.z = cz
      if (d === 0) break
    }
  }
  return out
}

/** Fastest a player can legitimately move, for the server's anti-teleport check. */
export const MAX_MOVE_SPEED = 14
