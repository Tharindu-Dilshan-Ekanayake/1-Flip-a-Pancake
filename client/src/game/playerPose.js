/**
 * The player's body language, shared by the Bloxity avatar and the blocky stand-in so
 * both move the same way.
 *
 * `computePose` turns the motion state into joint angles; each avatar applies them to its
 * own limbs. Angles are radians in character space (the character faces +Z, its left side
 * is +X), about each joint's pivot:
 *   swing - about X: negative swings a hanging limb forward (arm up in front, knee up);
 *           on the spine and neck, which point up, negative bends them back
 *   sway  - about Z: positive moves a limb towards +X
 *   twist - about Y: positive turns the right shoulder forward
 * `lift` raises (or, to keep bent legs on the ground, lowers) the body, in metres.
 * `stretchL` / `stretchR` stay 1 here (the template's rubber arms): arms keep their length.
 */

export const POSED_BONES = [
  'Spine1',
  'Neck1',
  'ArmL1',
  'ArmL2',
  'ArmR1',
  'ArmR2',
  'LegL1',
  'LegL2',
  'LegR1',
  'LegR2',
]

/** Written by `computePose` every frame; one shared result, never reallocated. */
export const pose = {
  lift: 0,
  stretchL: 1,
  stretchR: 1,
  bones: Object.fromEntries(POSED_BONES.map((name) => [name, { swing: 0, sway: 0, twist: 0 }])),
}

/**
 * The 1.8 m character's measurements: shoulder height and how far out from the middle,
 * arm length (shoulder to palm), and the body's middle.
 */
export const BODY = { shoulderY: 1.35, shoulderX: 0.56, arm: 0.63, pivot: 0.9 }

/** Sway sign that moves a limb away from the body, per side. */
const OUT_L = 1
const OUT_R = -1

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Adds to a joint, scaled by weight `w`. */
function add(name, swing, sway, twist, w) {
  const b = pose.bones[name]
  b.swing += swing * w
  b.sway += sway * w
  b.twist += twist * w
}

/** Relaxed stance: knees soft, breathing, the pan held out level in front. */
function stance(w, time) {
  const breath = Math.sin(time * 1.8)
  add('LegL1', -0.04, 0.06 * OUT_L, 0, w)
  add('LegL2', 0.08, 0, 0, w)
  add('LegR1', 0.04, 0.06 * OUT_R, 0, w)
  add('LegR2', 0.08, 0, 0, w)
  add('Spine1', 0.04 + breath * 0.015, 0, 0, w)
  add('Neck1', 0.12, 0, 0, w)
  add('ArmL1', 0.04 + breath * 0.02, 0.1 * OUT_L, 0, w)
  add('ArmL2', -0.15, 0, 0, w)
  // The pan out in front, its bowl level, ready to flip.
  add('ArmR1', -0.55 + breath * 0.02, 0.05 * OUT_R, 0, w)
  add('ArmR2', -0.95, 0, 0, w)
  pose.lift += (-0.01 + breath * 0.006) * w
}

/**
 * Walk to sprint: the legs swing and the body bobs once per step, the free arm swinging
 * against the legs and the phone hand carried a little in front. `phase` advances faster
 * with speed, so the steps quicken.
 */
function stride(phase, ratio) {
  const cycle = Math.sin(phase)
  const leg = 0.85 * ratio
  add('LegL1', cycle * leg, 0, 0, 1)
  add('LegR1', -cycle * leg, 0, 0, 1)
  // Knees fold on the back swing only.
  add('LegL2', Math.max(0, -cycle) * 1.1 * ratio, 0, 0, 1)
  add('LegR2', Math.max(0, cycle) * 1.1 * ratio, 0, 0, 1)
  add('Spine1', (0.06 + 0.1 * ratio) * ratio, 0, cycle * 0.12 * ratio, 1)
  add('ArmL1', -cycle * 0.75 * ratio, 0.06 * OUT_L, 0, 1)
  add('ArmL2', -0.3 * ratio, 0, 0, 1)
  add('ArmR1', -0.3 + cycle * 0.35 * ratio, 0.05 * OUT_R, 0, 1)
  add('ArmR2', -0.9, 0, 0, 1)
  pose.lift += (Math.abs(Math.cos(phase)) * 0.05 - 0.015) * ratio
}

/** In the air: one knee up on the way up; falling, the legs straighten and reach down. */
function airborne(vy) {
  const f = smooth(0, 1, clamp01((2 - vy) / 9))
  add('LegL1', lerp(-1.3, -0.35, f), 0.08 * OUT_L, 0, 1)
  add('LegL2', lerp(1.6, 0.25, f), 0, 0, 1)
  add('LegR1', lerp(0.25, -0.1, f), 0.08 * OUT_R, 0, 1)
  add('LegR2', lerp(0.5, 0.2, f), 0, 0, 1)
  add('Spine1', lerp(0.15, -0.06, f), 0, 0, 1)
  add('ArmL1', -2.4, 0.35 * OUT_L, 0, 1)
  add('ArmR1', -2.2, 0.35 * OUT_R, 0, 1)
  add('ArmR2', -0.4, 0, 0, 1)
}

/**
 * Flipping your pancake for Strength (`phase` one flip per turn): a little dip of the pan,
 * a sharp flick up (the cake leaves the pan at practice.THROW_RELEASE), the pan held
 * level under it as it spins, and a soft give as it lands back in.
 */
function practicing(phase, w) {
  const f = ((phase / (Math.PI * 2)) % 1 + 1) % 1
  // 0-0.22 the dip, 0.22-0.34 the flick, 0.34-0.85 waiting under it, 0.85-1 the catch.
  const dip = smooth(0, 0.22, f) * (1 - smooth(0.22, 0.3, f))
  const flick = smooth(0.22, 0.3, f) * (1 - smooth(0.34, 0.6, f))
  const catchIt = smooth(0.85, 0.93, f) * (1 - smooth(0.93, 1, f))
  add('ArmR1', -0.55 + 0.3 * dip - 0.65 * flick + 0.18 * catchIt, 0.05 * OUT_R, 0, w)
  add('ArmR2', -0.95 + 0.15 * dip - 0.35 * flick, 0, 0, w)
  add('ArmL1', -0.25 - 0.4 * flick, 0.15 * OUT_L, 0, w)
  add('ArmL2', -0.4, 0, 0, w)
  add('Spine1', 0.05 + 0.1 * dip - 0.12 * flick, 0, 0, w)
  // Eyes on the pancake: up as it flies, down as it lands.
  add('Neck1', 0.1 - 0.45 * smooth(0.26, 0.5, f) * (1 - smooth(0.6, 0.9, f)), 0, 0, w)
  add('LegL1', -0.1 - 0.15 * dip, 0.08 * OUT_L, 0, w)
  add('LegL2', 0.15 + 0.3 * dip + 0.2 * catchIt, 0, 0, w)
  add('LegR1', -0.1 - 0.15 * dip, 0.08 * OUT_R, 0, w)
  add('LegR2', 0.15 + 0.3 * dip + 0.2 * catchIt, 0, 0, w)
  pose.lift -= (0.02 + 0.07 * dip + 0.05 * catchIt) * w
  pose.lift += 0.04 * flick * w
}

/**
 * Charging a launch (`charge` 0-1): crouched low over the pan, both hands on it, sinking
 * deeper the more it's charged. Full, it trembles (`wobble`).
 */
function windingUp(charge, wobble, time, w) {
  const c = smooth(0, 1, charge)
  const shake = wobble * Math.sin(time * 40) * 0.05
  add('Spine1', 0.2 + 0.25 * c, 0, 0, w)
  add('Neck1', -0.35 - 0.15 * c, 0, 0, w)
  add('ArmR1', -0.4 + 0.25 * c + shake, 0.15 * OUT_R, 0, w)
  add('ArmR2', -0.9, 0, 0, w)
  add('ArmL1', -0.5 + 0.25 * c - shake, 0.35 * OUT_L, 0.3, w)
  add('ArmL2', -1.1, 0, 0, w)
  add('LegL1', -0.55 - 0.5 * c, 0.14 * OUT_L, 0, w)
  add('LegL2', 0.9 + 0.9 * c, 0, 0, w)
  add('LegR1', -0.55 - 0.5 * c, 0.14 * OUT_R, 0, w)
  add('LegR2', 0.9 + 0.9 * c, 0, 0, w)
  pose.lift -= (0.12 + 0.2 * c) * w
}

/** How high each grade of launch jumps (metres): a PERFECT one leaps highest. */
const TOSS_JUMP = { perfect: 1.7, great: 1.35, good: 1.1, weak: 0.75 }
/** Of the heave (0-1): the quick squat before the jump, and the takeoff. */
const TOSS_TAKEOFF = 0.3
/** Seconds from the top of the jump (the pancake leaving) back down to the ground. */
const TOSS_FALL = 0.26

/** How high off the ground the jump has you: up to the top as the pancake leaves, then back down. */
function tossHeight(t, after, style) {
  const top = TOSS_JUMP[style] ?? TOSS_JUMP.good
  if (t < 1) {
    const u = clamp01((t - TOSS_TAKEOFF) / (1 - TOSS_TAKEOFF))
    return top * (1 - (1 - u) * (1 - u))
  }
  const f = clamp01(after / TOSS_FALL)
  return top * (1 - f * f)
}

/**
 * A PERFECT launch's spin: one full turn through the air, from takeoff to landing (radians
 * about the vertical; 0 for any other grade). The player turns the whole body by it.
 */
export function tossSpin(t, after, style) {
  if (style !== 'perfect' || t <= TOSS_TAKEOFF) return 0
  const p = t < 1 ? ((t - TOSS_TAKEOFF) / (1 - TOSS_TAKEOFF)) * 0.55 : 0.55 + clamp01(after / TOSS_FALL) * 0.45
  return Math.PI * 2 * smooth(0, 1, p)
}

/**
 * The launch: a jump-and-toss. A quick squat with the pan low, then a leap - legs tucking
 * under, the pan swinging up - and right at the top of the jump the pan flicks and the
 * pancake shoots up out of it (`t` 0-1 through the heave; it leaves at 1). Then down again,
 * a bouncy landing, and watching it go - arms up cheering after a GREAT or PERFECT one.
 * `after` is seconds since the pancake left, `style` the grade.
 */
function throwing(t, time, w, after = 0, style = 'good') {
  const squat = t < TOSS_TAKEOFF ? smooth(0, TOSS_TAKEOFF, t) : 1 - smooth(TOSS_TAKEOFF, TOSS_TAKEOFF + 0.18, t)
  const swing = smooth(TOSS_TAKEOFF * 0.6, 1, t)
  const flick = smooth(0.82, 1, t) * (1 - smooth(0.12, 0.35, after))
  const air = t >= TOSS_TAKEOFF && after < TOSS_FALL
  const tuck = air ? Math.sin(Math.PI * clamp01(t < 1 ? (t - TOSS_TAKEOFF) / (1 - TOSS_TAKEOFF) * 0.5 : 0.5 + (after / TOSS_FALL) * 0.5)) : 0
  const landed = after >= TOSS_FALL
  const land = landed ? Math.sin(Math.PI * clamp01((after - TOSS_FALL) / 0.22)) : 0
  const cheer = landed && (style === 'perfect' || style === 'great') ? smooth(TOSS_FALL, TOSS_FALL + 0.3, after) : 0
  const bend = squat + land * 0.7
  // The pan: low behind you in the squat, swung up overhead, flicked as the pancake goes.
  add('ArmR1', lerp(0.5, -3.05, swing) + 0.35 * flick, 0.12 * OUT_R, 0, w)
  add('ArmR2', lerp(-0.6, -0.15, swing) - 0.55 * flick, 0, 0, w)
  add('ArmL1', lerp(0.4, -2.6, swing), 0.35 * OUT_L, 0, w)
  add('ArmL2', -0.3, 0, 0, w)
  add('Spine1', 0.5 * squat - 0.22 * swing * (1 - squat) + 0.25 * land, 0, 0, w)
  add('Neck1', -0.3 * squat - 0.7 * swing, 0, 0, w)
  // Legs: bent in the squat and the landing, tucked under in the air.
  add('LegL1', -1.05 * bend - 0.9 * tuck, 0.12 * OUT_L, 0, w)
  add('LegL2', 1.8 * bend + 1.4 * tuck, 0, 0, w)
  add('LegR1', -1.05 * bend - 0.7 * tuck, 0.12 * OUT_R, 0, w)
  add('LegR2', 1.8 * bend + 1.2 * tuck, 0, 0, w)
  pose.lift += (tossHeight(t, after, style) - 0.32 * bend) * w
  if (landed) {
    // Watching it climb: swaying, or arms up and bouncing after a great launch.
    const wave = Math.sin(time * 10) * 0.28 * cheer
    add('ArmL1', 0.4 * cheer + wave, 0.2 * OUT_L * cheer, 0, w)
    add('ArmR1', 0.3 * cheer - wave, 0.2 * OUT_R * cheer, 0, w)
    add('Spine1', Math.sin(time * 2) * 0.03, 0, 0, w)
    add('Neck1', -0.1, 0, 0, w)
    pose.lift += Math.abs(Math.sin(time * 7)) * 0.12 * cheer * w
  }
}

/** Arms up and waving, bouncing on the spot: the celebration. */
function cheering(time, w) {
  const wave = Math.sin(time * 10) * 0.28
  add('ArmL1', -2.7 + wave, 0.38 * OUT_L, 0, w)
  add('ArmR1', -2.7 - wave, 0.38 * OUT_R, 0, w)
  add('ArmL2', -0.25, 0, 0, w)
  add('ArmR2', -0.25, 0, 0, w)
  add('LegL1', -0.12, 0.06 * OUT_L, 0, w)
  add('LegR1', -0.12, 0.06 * OUT_R, 0, w)
  add('LegL2', 0.22, 0, 0, w)
  add('LegR2', 0.22, 0, 0, w)
  add('Spine1', -0.1, 0, 0, w)
  add('Neck1', -0.15, 0, 0, w)
  pose.lift += Math.abs(Math.sin(time * 7)) * 0.16 * w
}

/**
 * @param {{ time?: number, speed?: number, maxSpeed?: number, grounded?: boolean,
 *   vy?: number, stride?: number, run?: number, windup?: number, wobble?: number,
 *   throwT?: number, cheer?: number, emote?: string|null }} motion
 *   `run` (0-1) is throwing your phone for Skill (`stride` is the throw's phase, a turn per
 *   throw); the name is the template's.
 *   `windup` (0-1) is the throw meter while you hold DROP (0: not throwing), `wobble` 1
 *   once it's full; `throwT` (0-1) how far through the throw itself (0: no throw).
 *   `cheer` (0-1) up and celebrating.
 *   `emote` is a Boxity emote id to play over this pose, or null. It isn't posed here:
 *   the Bloxity avatar blends the emote clip on top of this pose (avatarRig.updateEmote),
 *   so the same motion object drives both. `emoteFromAnim(r.anim)` in bloxity/emotes.js
 *   turns another player's synced anim ('emote:<id>') into this field.
 */
export function computePose(motion) {
  const {
    time = 0,
    speed = 0,
    maxSpeed = 6,
    grounded = true,
    vy = 0,
    stride: phase = time * 5,
    run = 0,
    windup = 0,
    wobble = 0,
    throwT = 0,
    tossAfter = 0,
    tossStyle = 'good',
    cheer = 0,
  } = motion
  for (const name of POSED_BONES) {
    const b = pose.bones[name]
    b.swing = 0
    b.sway = 0
    b.twist = 0
  }
  pose.lift = 0
  pose.stretchL = 1
  pose.stretchR = 1

  if (throwT > 0) {
    throwing(throwT, time, 1, tossAfter, tossStyle)
    return pose
  }
  if (windup > 0) {
    windingUp(windup, wobble, time, 1)
    return pose
  }
  if (cheer > 0) {
    cheering(time, cheer)
    const rest = clamp01(1 - cheer)
    if (rest > 0) stance(rest, time)
    return pose
  }
  if (run > 0 && grounded) {
    practicing(phase, clamp01(run))
    return pose
  }
  const ratio = grounded ? clamp01(speed / Math.max(maxSpeed, 0.001)) : 0
  if (grounded) {
    const still = 1 - smooth(0.05, 0.4, ratio)
    stance(still, time)
    if (ratio > 0.02) stride(phase, ratio)
  } else {
    airborne(vy)
  }
  return pose
}
