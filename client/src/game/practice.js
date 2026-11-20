import { Vector3 } from 'three'

import { PAD_X, PAD_YAW, padCenterZ } from '@shared/world'

/**
 * Flipping your pancake for Strength (toss.js starts a flip; the Strength comes from the
 * authority): a flick of the pan sends the cake spinning up and it drops straight back
 * into the pan. Shared by the mats' scenery (structures.js), the flippers (Player,
 * RemoteAvatars) and the pancakes in the air (PracticeThrows.jsx).
 */

/** Kept for the mats' scenery: the backboard's middle down each mat (x), and its top. */
export const THROW_TARGET_X = PAD_X + 7.6
export const THROW_TARGET_TOP = 0.15
export const throwTargetZ = (index) => padCenterZ(index)

/** Seconds one flip takes, from the dip to holding the pan level again. */
export const TOSS_TIME = 0.5
/** How far through a flip (0-1) the pancake leaves the pan. */
export const THROW_RELEASE = 0.3
/** Seconds a flipped pancake is up in the air before it lands back in the pan. */
export const THROW_FLIGHT = 0.34
export const THROW_LIE = 0
export const THROW_FADE = 0
/** How far through a flip (0-1) the pancake is back in the pan. */
export const CATCH_F = THROW_RELEASE + THROW_FLIGHT / TOSS_TIME
/** Whether a flip `tossF` (0-1) through has its pancake up in the air. */
export const pancakeUp = (tossF) => tossF >= THROW_RELEASE && tossF < CATCH_F

/** The pancakes in the air: a fixed pool, the oldest reused once it's full. */
export const MAX_THROWS = 10
export const throws = Array.from({ length: MAX_THROWS }, () => ({
  active: false,
  start: 0,
  from: new Vector3(),
  to: new Vector3(),
  phoneId: 'bicycle',
  /** Which way it flips and how much it turns, so no two flips look the same. */
  spin: 1,
  turn: 0,
  /** Whether its landing has been heard yet. */
  landed: false,
}))
let next = 0

/**
 * Flips pan `phoneId`'s pancake from (x, y, z) - the pan - to land at (toX, toY, toZ),
 * back in the pan. Allocation-free: safe to call from a frame loop.
 */
export function spawnThrow(x, y, z, toX, toZ, phoneId, toY = THROW_TARGET_TOP) {
  const t = throws[next]
  next = (next + 1) % MAX_THROWS
  t.active = true
  t.start = performance.now()
  t.from.set(x, y, z)
  t.to.set(toX, toY, toZ)
  t.phoneId = phoneId
  t.spin = Math.random() < 0.5 ? 1 : -1
  t.turn = (Math.random() - 0.5) * 1.6
  t.landed = false
}

/**
 * Where the pancake leaves a flipper's pan, standing at `pos` facing `yaw` (along a mat
 * by default): the pan's bowl, held out in front at chest height.
 */
export function releasePoint(pos, out, yaw = PAD_YAW) {
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  return out.set(pos.x + fx * 0.95 - fz * 0.3, pos.y + 1.3, pos.z + fz * 0.95 + fx * 0.3)
}

/** Where a flip lands: straight back in the pan. */
export function tossTarget(pos, yaw, _pad, out) {
  return releasePoint(pos, out, yaw)
}
