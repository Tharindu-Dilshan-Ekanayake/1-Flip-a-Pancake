import { BoxGeometry, ConeGeometry, CylinderGeometry, Euler, IcosahedronGeometry, LatheGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three'

import { TIRES } from '@shared/balance'

import { STYLE } from './materials'

/**
 * How each pan looks, by pan id (the ids are the template's tire ids, kept for saves;
 * names and stats live in shared/balance.js TIRES). Every pan holds its own pancake with
 * its own topping, so a better pan reads at a glance - in your hand, on its shop stand
 * and flying up the sky.
 *
 * `body` the pan's outside, `inner` its cooking surface, `rim` the lip, `handle` and
 * `grip` the handle, `batter` the pancake, `topping` what's on it (butter, syrup,
 * berries, sprinkles, cream, choc, stars...), `toppingColor` its colour, `stack` how
 * many pancakes (1-3), `style` the pan's surface (materials STYLE), and `trail` the colour
 * of its streaks and glow as it flies. The exported names say "phone" because the
 * template's consumers ask for them by those names.
 */
const P = (body, inner, rim, handle, grip, topping, toppingColor, trail, extra = {}) => ({
  body,
  inner,
  rim,
  handle,
  grip,
  batter: '#f2b65a',
  topping,
  toppingColor,
  stack: 1,
  trail,
  ...extra,
})
export const PHONE_STYLES = {
  bicycle: P('#3a3d44', '#24262b', '#4a4e57', '#2b2d33', '#5a3a24', 'butter', '#ffe27a', '#ffe8b0'),
  mountain: P('#d9874a', '#3a2b24', '#f0a567', '#c46d33', '#7a4a2a', 'butter', '#ffe27a', '#ffc08a'),
  wood: P('#ff5a7a', '#3a2430', '#ff8aa0', '#e8425f', '#ffffff', 'berries', '#ff3b5c', '#ff8aa0', { stack: 2 }),
  stone: P('#4f6bff', '#22284a', '#7f95ff', '#3a52e0', '#ffffff', 'berries', '#3a4fd8', '#8fa0ff', { stack: 2 }),
  cookie: P('#3fd6a0', '#1f3a32', '#7ff0c8', '#2fb886', '#ffffff', 'cream', '#eafff6', '#8affd6', { stack: 2 }),
  pizza: P('#ffd23a', '#3a3420', '#ffe57a', '#e8b820', '#7a5a2a', 'banana', '#fff1a8', '#ffe57a', { stack: 2 }),
  donut: P('#7a4a2a', '#2a1a12', '#a0663e', '#5e3820', '#ffd8a8', 'choc', '#4a2614', '#c08a5a', { stack: 3, batter: '#e0a050' }),
  watermelon: P('#fff07a', '#3a3a22', '#fff6b0', '#f0dc4a', '#ffffff', 'lemon', '#fff36a', '#fff6b0', { stack: 2 }),
  monster: P('#7ab04a', '#24301a', '#a6d47a', '#5e9436', '#f4f0d8', 'cream', '#cfe8a8', '#b4e08a', { stack: 3 }),
  mint: P('#e8a050', '#3a2a1a', '#ffc27a', '#cc8436', '#ffffff', 'syrup', '#c06a1a', '#ffc27a', { stack: 3 }),
  silver: P('#ff8ad8', '#3a2436', '#ffb4e8', '#e86ac0', '#ffffff', 'sprinkles', '#ff5ab8', '#ffb4e8', { stack: 3 }),
  ice: P('#ffb81f', '#3a2c12', '#ffd46a', '#e89c0a', '#5a3a14', 'honey', '#ffb81f', '#ffd46a', { stack: 3 }),
  gold: P('#ff4a1f', '#3a1610', '#ff8a3a', '#d8320e', '#2a1410', 'syrup', '#ff6a1f', '#ff8a3a', { stack: 3, style: STYLE.GLOW }),
  lava: P('#9fe8ff', '#20343a', '#d8f6ff', '#6fd0f0', '#ffffff', 'cream', '#e8faff', '#d8f6ff', { stack: 3 }),
  platinum: P('#1fcf6a', '#12301e', '#6af0a0', '#14a854', '#e8fff0', 'berries', '#2fe07a', '#6af0a0', { stack: 3 }),
  emerald: P('#e8203c', '#3a1016', '#ff6a7e', '#c0142c', '#ffe8ec', 'berries', '#ff2040', '#ff6a7e', { stack: 3 }),
  ruby: P('#2050e8', '#101e3a', '#6a8aff', '#1438c0', '#e8f0ff', 'stars', '#9fd0ff', '#6a8aff', { stack: 3 }),
  diamond: P('#c8f4ff', '#203440', '#ffffff', '#9fe0f8', '#ffffff', 'stars', '#e8fbff', '#ffffff', { stack: 3, style: STYLE.GLOW }),
  rainbow: P('#ff5a5a', '#2a2436', '#ffd23a', '#4fd06a', '#3fa8ff', 'sprinkles', '#ffffff', '#ffd0ff', { stack: 3, rainbow: true }),
  unicorn: P('#ffd0f4', '#3a2a40', '#ffffff', '#e8a8ff', '#ffe27a', 'cream', '#ffb4f0', '#ffd0f4', { stack: 3 }),
  galaxy: P('#3a1a7a', '#120a2a', '#8a5aff', '#2a1060', '#d8c8ff', 'stars', '#d8b0ff', '#a07aff', { stack: 3, style: STYLE.GLOW }),
  dragon: P('#1f8a4a', '#102a1a', '#ffb81f', '#14663a', '#ff5a1f', 'syrup', '#ff7a1f', '#ffb81f', { stack: 3, style: STYLE.GLOW }),
  cosmic: P('#1fd8ff', '#0a2a3a', '#ff6af0', '#14a8d8', '#ffffff', 'stars', '#ffffff', '#9ff4ff', { stack: 3, style: STYLE.GLOW }),
  infinity: P('#ffc21a', '#3a2a0a', '#fff0a0', '#e8a00a', '#ffffff', 'stars', '#ff9aff', '#ffe27a', { stack: 3, style: STYLE.GLOW, rainbow: true }),
}

const FALLBACK = PHONE_STYLES.bicycle
export const phoneStyle = (id) => PHONE_STYLES[id] ?? FALLBACK
/** The colour a pan's streaks and glow take as its pancake flies. */
export const phoneTrail = (id) => phoneStyle(id).trail
/** Its body colour, for anything tinted to match (labels, stands). */
export const phoneCase = (id) => phoneStyle(id).body

export const PHONE_IDS = TIRES.map((t) => t.id)

/** The pan's measurements before scaling: bowl radius, depth, handle length. */
export const PAN = { radius: 0.5, depth: 0.14, handle: 0.62 }
/** A pan's size before scaling: across, deep, and long with its handle. */
export const PHONE_SIZE = { width: PAN.radius * 2, thickness: PAN.depth, length: PAN.radius * 2 + PAN.handle }
export const phoneDims = () => PHONE_SIZE

const BOX = new BoxGeometry(1, 1, 1)
// Kept lean: a pan is on each of the 24 shop stands and in every player's hand.
const DISC_FULL = new CylinderGeometry(0.5, 0.5, 1, 16)
const BOWL = new CylinderGeometry(0.5, 0.42, 1, 14, 1, true)
const RIM = new TorusGeometry(0.5, 0.05, 4, 16)
const BALL = new IcosahedronGeometry(0.5, 0)
const RAINBOW = ['#ff5a5a', '#ffa83a', '#ffe23a', '#4fd06a', '#3fa8ff', '#a05aff']
const ROUND_FULL = new SphereGeometry(0.5, 10, 6)
const CONE = new ConeGeometry(0.5, 1, 8)
const SMILE = new TorusGeometry(0.5, 0.09, 5, 14, Math.PI)
/**
 * One pancake, 1 across and 1 tall before scaling: flat underneath, a puffy rounded edge
 * and a gently domed top - so it reads as cooked batter, not a coin.
 */
const CAKE = new LatheGeometry(
  [
    [0, 0],
    [0.44, 0],
    [0.485, 0.08],
    [0.5, 0.32],
    [0.492, 0.6],
    [0.465, 0.85],
    [0.42, 0.97],
    [0.25, 1.04],
    [0, 1.06],
  ].map(([x, y]) => new Vector2(x, y)),
  16,
)
/** The flying pancake's cake: the same profile, twice as round (one mesh, seen up close). */
const CAKE_HI = new LatheGeometry(CAKE.parameters.points, 36)

/**
 * The same pancake in fewer triangles, for every pan in a hand or on a shop stand (24
 * stands and 12 players' pans): the detailed one is only for the flying pancake.
 */
const CAKE_LOW = new LatheGeometry(
  [
    [0, 0],
    [0.46, 0],
    [0.5, 0.35],
    [0.47, 0.82],
    [0.3, 1.03],
    [0, 1.06],
  ].map(([x, y]) => new Vector2(x, y)),
  10,
)
const DISC_LOW = new CylinderGeometry(0.5, 0.5, 1, 10)
/** Lighter pan and topping parts for the shop's two dozen display pans on LOW. */
const BOWL_LOW = new CylinderGeometry(0.5, 0.42, 1, 10, 1, true)
const RIM_LOW = new TorusGeometry(0.5, 0.05, 3, 10)
const ROUND_LOW = new SphereGeometry(0.5, 7, 4)
const HOLE = new CylinderGeometry(0.5, 0.5, 1, 6)
/** Batter: browned at the edge, golden on top, palest in the middle, and its cooking holes. */
const BATTER = { edge: '#d98d3a', top: '#fbc96c', middle: '#ffe3a0', hole: '#d48a3c', dark: '#c47830' }

const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _one = new Vector3(1, 1, 1)

/** A tiny repeatable random number for placing toppings. */
const hash = (n) => {
  const x = Math.sin(n * 91.345 + 7.13) * 43758.5453
  return x - Math.floor(x)
}

/** Runs `draw(part)` with the builder's transform set to `position`/`rotation`, then restores it. */
function placed(builder, position, rotation, draw) {
  const saved = builder.transform
  _q.setFromEuler(_e.set(rotation[0], rotation[1], rotation[2]))
  const m = new Matrix4().compose(_p.fromArray(position), _q, _one)
  builder.transform = saved ? new Matrix4().copy(saved).multiply(m) : m
  draw()
  builder.transform = saved
}

/**
 * The pancake (or stack) of pan `id` with its topping, its underside at y = 0 in its
 * own frame, `r` across (before `scale`). With `face`, the top pancake has a happy face -
 * big shiny eyes, rosy cheeks and a smile - on the near half of its top (+Z), the topping
 * moved over to the far half (-Z) like a hat: the flying pancake is a little character.
 */
function pancakeParts(builder, s, scale, r = 0.4, face = false, light = false) {
  // The flying pancake (the one with the face) is seen up close: full detail. The rest light.
  const fine = !!face
  const ROUND = light ? ROUND_LOW : ROUND_FULL
  const DISC = light ? DISC_LOW : DISC_FULL
  const part = (geometry, x, y, z, sx, sy, sz, color, style = STYLE.SMOOTH, rot = [0, 0, 0]) =>
    builder.add(geometry, { position: [x * scale, y * scale, z * scale], rotation: rot, scale: [sx * scale, sy * scale, sz * scale], color, style })
  const h = 0.085
  let y = 0
  for (let i = 0; i < s.stack; i += 1) {
    const ri = r * (1 - i * 0.05)
    // Each cake a touch off centre, so the stack looks hand-made.
    const ox = (hash(i + 3) - 0.5) * 0.03
    const oz = (hash(i + 9) - 0.5) * 0.03
    part(fine ? CAKE_HI : CAKE_LOW, ox, y, oz, ri * 2, h, ri * 2, i % 2 ? BATTER.dark : BATTER.edge)
    // Only the top cake shows its golden top.
    if (fine || i === s.stack - 1) {
      part(fine ? DISC : DISC_LOW, ox, y + h * 0.98, oz, ri * 1.62, 0.012, ri * 1.62, BATTER.top)
      if (fine) part(DISC, ox, y + h * 0.98 + 0.004, oz, ri * 0.95, 0.012, ri * 0.95, BATTER.middle)
    }
    y += h + 0.004
  }
  const top = y + 0.004
  // Little cooking holes on the top cake.
  for (let k = 0; k < (fine ? 9 : 0); k += 1) {
    const a = hash(k + 40) * Math.PI * 2
    const d = (0.25 + hash(k + 50) * 0.6) * r
    part(HOLE, Math.cos(a) * d, top, Math.sin(a) * d, 0.035, 0.008, 0.035, BATTER.hole)
  }
  // With a face, the topping sits on the far half like a hat.
  const tz = face ? -r * 0.42 : 0
  const ts = face ? 0.72 : 1
  const t = s.topping
  const c = s.toppingColor
  const shine = (x, yy, z, size = 0.035) => part(ROUND, x, yy, z, size, size * 0.6, size, '#ffffff', STYLE.GLOW)
  if (t === 'butter') {
    // A pat of butter on a melted golden puddle, with a shine on it.
    part(DISC, 0, top + 0.004, tz, r * 0.75 * ts, 0.01, r * 0.62 * ts, '#ffe68a')
    part(BOX, 0, top + 0.05 * ts, tz, 0.2 * ts, 0.09 * ts, 0.2 * ts, c, STYLE.SMOOTH, [0, 0.5, 0.06])
    part(BOX, 0, top + 0.096 * ts, tz, 0.16 * ts, 0.012, 0.16 * ts, '#fff6c8', STYLE.SMOOTH, [0, 0.5, 0.06])
    shine(-0.04 * ts, top + 0.1 * ts, tz - 0.03)
  } else if (t === 'syrup' || t === 'honey' || t === 'choc') {
    // A glossy pool spilling over the edge in rounded drips, a highlight on it, and butter.
    const glow = t !== 'choc' && s.style === STYLE.GLOW ? STYLE.GLOW : STYLE.SMOOTH
    part(DISC, 0, top + 0.012, face ? tz * 0.6 : 0, r * 1.62, 0.024, r * (face ? 1.25 : 1.62), c, glow)
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2 + 0.4
      if (face && Math.sin(a) > 0.2) continue
      const len = 0.08 + hash(k) * 0.08
      const x = Math.cos(a) * r * 0.99
      const z = Math.sin(a) * r * 0.99
      part(BOX, x, top - len / 2, z, 0.05, len, 0.05, c, glow)
      part(ROUND, x, top - len, z, 0.07, 0.08, 0.07, c, glow)
    }
    part(DISC, -r * 0.3, top + 0.026, (face ? tz * 0.6 : 0) - r * 0.25, r * 0.4, 0.004, r * 0.14, '#ffffff', STYLE.GLOW, [0, 0.6, 0])
    if (t !== 'choc') part(BOX, 0, top + 0.07, tz, 0.15 * ts, 0.08, 0.15 * ts, '#fff1a0', STYLE.SMOOTH, [0, 0.7, 0])
    else for (let k = 0; k < 6; k += 1) part(BOX, (hash(k + 70) - 0.5) * r, top + 0.035, tz + (hash(k + 80) - 0.5) * r * 0.6, 0.06, 0.03, 0.06, '#2a140a', STYLE.SMOOTH, [0, k, 0])
  } else if (t === 'berries') {
    // A dollop of cream, strawberry halves round it and blueberries, each with a shine.
    part(ROUND, 0, top + 0.05, tz, 0.26 * ts, 0.13, 0.26 * ts, '#ffffff')
    const n = face ? 5 : 7
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * (face ? 1 : 2) + (face ? Math.PI : 0)
      const d = r * 0.5 * ts
      const x = Math.cos(a) * d
      const z = tz + Math.sin(a) * d
      if (k % 2) {
        part(ROUND, x, top + 0.045, z, 0.1, 0.09, 0.1, c)
        shine(x - 0.02, top + 0.085, z - 0.02, 0.025)
      } else {
        part(CONE, x, top + 0.05, z, 0.12, 0.13, 0.1, '#ff3b5c', STYLE.SMOOTH, [0, a, 0])
        part(BOX, x, top + 0.115, z, 0.06, 0.02, 0.04, '#4fbf3a', STYLE.SMOOTH, [0, a, 0])
      }
    }
  } else if (t === 'cream' || t === 'banana' || t === 'lemon') {
    // A swirl of whipped cream in three turns, a cherry on top; fruit slices round it.
    const cream = t === 'cream' ? c : '#fffbe8'
    part(ROUND, 0, top + 0.06, tz, 0.32 * ts, 0.14, 0.32 * ts, cream)
    part(ROUND, 0, top + 0.14, tz, 0.22 * ts, 0.12, 0.22 * ts, cream)
    part(ROUND, 0, top + 0.21, tz, 0.12 * ts, 0.1, 0.12 * ts, cream)
    part(ROUND, 0, top + 0.28, tz, 0.09, 0.09, 0.09, '#ff2a4a')
    part(BOX, 0.02, top + 0.33, tz, 0.012, 0.07, 0.012, '#3a8a2a', STYLE.SMOOTH, [0, 0, 0.4])
    shine(-0.025, top + 0.31, tz - 0.02, 0.025)
    const slices = t === 'cream' ? 0 : face ? 3 : 5
    for (let k = 0; k < slices; k += 1) {
      const a = (k / slices) * Math.PI * (face ? 1 : 2) + (face ? Math.PI * 1.15 : 0)
      part(DISC, Math.cos(a) * r * 0.6, top + 0.02, tz + Math.sin(a) * r * 0.45, 0.16, 0.03, 0.16, c)
      part(DISC, Math.cos(a) * r * 0.6, top + 0.036, tz + Math.sin(a) * r * 0.45, 0.1, 0.004, 0.1, '#fffbe0')
    }
  } else if (t === 'sprinkles') {
    // Pink icing with a drip at the edge and rainbow sprinkles.
    part(DISC, 0, top + 0.01, face ? tz * 0.5 : 0, r * 1.7, 0.02, r * (face ? 1.2 : 1.7), c === '#ffffff' ? '#ffd8ec' : c)
    for (let k = 0; k < 16; k += 1) {
      const a = hash(k) * Math.PI * 2
      const d = Math.sqrt(hash(k + 30)) * r * 0.72
      const z = Math.sin(a) * d * (face ? 0.6 : 1) + (face ? tz * 0.6 : 0)
      part(BOX, Math.cos(a) * d, top + 0.028, z, 0.08, 0.022, 0.026, RAINBOW[k % RAINBOW.length], STYLE.GLOW, [0, hash(k + 60) * 3, 0])
    }
  } else if (t === 'stars') {
    // Night-blue icing scattered with glowing stars.
    part(DISC, 0, top + 0.01, face ? tz * 0.5 : 0, r * 1.6, 0.02, r * (face ? 1.15 : 1.6), '#2a1a5a')
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2 + 0.3
      const d = k === 0 ? 0 : r * 0.5
      const big = k === 0 ? 0.17 : 0.08
      part(BALL, Math.cos(a) * d, top + 0.06, tz + Math.sin(a) * d * (face ? 0.5 : 1), big, big, big, c, STYLE.GLOW)
    }
  }
  // ('hero' - the flying cartoon pancake - brings its own face parts.)
  if (face === true) {
    // The face on the near half of the top, just proud of the batter.
    const fy = top + 0.012
    for (const side of [-1, 1]) {
      const ex = side * r * 0.31
      const ez = r * 0.18
      // Big glossy eyes: a white, a deep brown iris with a warm ring, two sparkles.
      part(ROUND, ex, fy, ez, 0.19, 0.035, 0.21, '#ffffff')
      part(ROUND, ex + side * 0.006, fy + 0.012, ez - 0.018, 0.13, 0.03, 0.145, '#6a3a1a')
      part(ROUND, ex + side * 0.006, fy + 0.02, ez - 0.018, 0.095, 0.03, 0.105, '#1a0e08')
      part(ROUND, ex - 0.028, fy + 0.032, ez - 0.05, 0.05, 0.02, 0.05, '#ffffff', STYLE.GLOW)
      part(ROUND, ex + 0.022, fy + 0.032, ez + 0.012, 0.022, 0.02, 0.022, '#ffffff', STYLE.GLOW)
      // A curved little eyebrow, happy.
      part(BOX, ex, fy + 0.004, ez - 0.14, 0.11, 0.012, 0.022, '#7a4420', STYLE.SMOOTH, [0, -side * 0.3, 0])
      // Rosy cheeks.
      part(ROUND, side * r * 0.58, fy - 0.004, r * 0.42, 0.15, 0.012, 0.09, '#ff8aa0')
    }
    // A wide open smile with a little pink tongue.
    part(SMILE, 0, fy, r * 0.34, 0.26, 0.26, 0.26, '#5a2a14', STYLE.SMOOTH, [Math.PI / 2, 0, 0])
    part(ROUND, 0, fy - 0.002, r * 0.42, 0.13, 0.012, 0.08, '#3a140a')
    part(ROUND, 0, fy + 0.002, r * 0.45, 0.08, 0.012, 0.05, '#ff6a8a')
  }
  return top
}

/**
 * Adds pan `id`, with its pancake in it, to a PropBuilder: the bowl centred on `position`
 * (its cooking surface up, +Y) and the handle reaching out towards +Z, turned by
 * `rotation` (Euler XYZ), at `scale`. `pancake: false` leaves the pan empty (the cake is
 * in the air).
 */
export function addPhone(builder, id, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, pancake = true, light = false } = {}) {
  const s = phoneStyle(id)
  const { radius: R, depth: D, handle: L } = PAN
  placed(builder, position, rotation, () => {
    const part = (geometry, x, y, z, sx, sy, sz, color, style = STYLE.SMOOTH, rot = [0, 0, 0]) =>
      builder.add(geometry, { position: [x * scale, y * scale, z * scale], rotation: rot, scale: [sx * scale, sy * scale, sz * scale], color, style })
    const surface = s.style ?? STYLE.SMOOTH
    // The bowl, its cooking surface, and a lip round the top.
    const DISC = light ? DISC_LOW : DISC_FULL
    part(light ? BOWL_LOW : BOWL, 0, 0, 0, R * 2, D, R * 2, s.body, surface)
    part(DISC, 0, D / 2 + 0.003, 0, R * 1.78, 0.006, R * 1.78, s.inner)
    part(light ? RIM_LOW : RIM, 0, D / 2, 0, R * 2, R * 2, R * 2, s.rainbow ? RAINBOW[2] : s.rim, s.rainbow ? STYLE.GLOW : surface, [Math.PI / 2, 0, 0])
    // The handle: a neck off the rim, then the grip with a hanging hole at its end.
    part(BOX, 0, D * 0.25, R + 0.1, 0.12, 0.06, 0.24, s.handle, surface)
    part(BOX, 0, D * 0.3, R + 0.22 + (L - 0.22) / 2, 0.15, 0.09, L - 0.22, s.grip)
    part(DISC, 0, D * 0.3, R + L - 0.08, 0.06, 0.1, 0.06, '#1a1a1a', STYLE.SMOOTH)
    if (s.rainbow) {
      for (let k = 0; k < 6; k += 1) part(BOX, 0, D * 0.3 + 0.047, R + 0.3 + k * 0.06, 0.155, 0.01, 0.05, RAINBOW[k], STYLE.GLOW)
    }
    if (pancake) {
      placed(builder, [0, (D / 2 + 0.01) * scale, 0], [0, 0, 0], () => pancakeParts(builder, s, scale, R * 0.82, false, light))
    }
  })
  return builder
}

/**
 * Adds pan `id`'s pancake on its own (for flips and launches), centred on `position` -
 * its middle, not its underside - turned by `rotation`, at `scale`; `face` gives it its
 * happy face (the flying pancake).
 */
export function addPancake(builder, id, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, face = false } = {}) {
  const s = phoneStyle(id)
  placed(builder, position, rotation, () => {
    placed(builder, [0, -0.06 * s.stack * scale, 0], [0, 0, 0], () => pancakeParts(builder, s, scale, PAN.radius * 0.82, face))
  })
  return builder
}
