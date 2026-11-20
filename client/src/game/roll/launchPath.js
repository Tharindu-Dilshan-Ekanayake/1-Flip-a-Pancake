import { Vector3 } from 'three'

import { DROP_ROOF, DROP_SETTLE, ROLL_LAUNCH, ZONES } from '@shared/balance'
import { zoneIndexAt } from '@shared/logic'
import { DROP_SPOT, groundHeightAt } from '@shared/world'

/**
 * Geometry and timeline of a launch. Pure maths and allocation-free, so the frame loop can
 * call it freely - for your own launch, and for other players' ghost pancakes replayed
 * from the same numbers.
 *
 * The launch pad is at the lobby's north end. The pancake leaves your pan straight up a
 * column of sky above it: first the launch boost over the lobby (0 to DROP_ROOF metres,
 * up to SKY_BASE), then one band of sky LAYER_H tall per sky layer (balance ZONES), each
 * whatever its span in metres. The world is compressed - 60 layers in under 4 km of world
 * units - so float precision and the far plane never get in the way, and every layer
 * gets the same screen time per metre of its own.
 */

/** The column the pancake climbs: just in front of where you stand to launch. */
export const COLUMN = { x: DROP_SPOT.x, z: DROP_SPOT.z - 2.4 }
/** Kept for the template's consumers: the middle of the "tower" is the column. */
export const HOTEL = COLUMN
/** Where the pancake leaves the pan, and where layer 0 starts (DROP_ROOF metres). */
export const RELEASE_Y = groundHeightAt(DROP_SPOT.x, DROP_SPOT.z) + 2.3
export const SKY_BASE = 70
/** World height of each sky layer's band. */
export const LAYER_H = 70
export const LAYERS = ZONES.length

/** Bottom of sky layer `i`'s band (world y). */
export const layerY = (i) => SKY_BASE + i * LAYER_H
/** Kept for the template's consumers (dropPath had floors). */
export const floorY = layerY

/** How big the flying pancake is (a toy world: about as wide as a car). */
export const PHONE_SCALE = 2.9
export const PANCAKE_SCALE = PHONE_SCALE

/** Seconds into a launch it leaves your pan. */
export const T_RELEASE = ROLL_LAUNCH
/** Seconds of the hang at the top (balance DROP_SETTLE). */
export const TOP_HANG = DROP_SETTLE

/** How far either side of the column you can steer it (world units). */
export const STEER_RANGE = 4.6

const clamp01 = (x) => Math.min(1, Math.max(0, x))
/** How far the flying pancake leans its topping towards the camera below and behind it. */
const FACE = 1.35

/** The layer a launch to `distance` tops out in. */
export const landingFloor = (distance) => zoneIndexAt(distance)

/** End of layer `i` in metres (the last layer runs on as long again as the one before). */
const layerEnd = (i) => (i + 1 < ZONES.length ? ZONES[i + 1].start : ZONES[i].start + (ZONES[i].start - ZONES[i - 1].start))

/** World height at which the counter reads `meter`. */
export function yAtMeter(meter) {
  const first = ZONES[0].start
  if (meter <= first) return RELEASE_Y + (SKY_BASE - RELEASE_Y) * clamp01(meter / Math.max(1, first || DROP_ROOF))
  const i = zoneIndexAt(meter)
  const from = ZONES[i].start
  const f = clamp01((meter - from) / Math.max(1, layerEnd(i) - from))
  return layerY(i) + f * LAYER_H
}

/** The inverse: what the counter reads at world height `y`. */
export function meterAtY(y) {
  const first = ZONES[0].start
  if (y <= SKY_BASE) return first * clamp01((y - RELEASE_Y) / (SKY_BASE - RELEASE_Y))
  const i = Math.min(ZONES.length - 1, Math.floor((y - SKY_BASE) / LAYER_H))
  const f = clamp01((y - layerY(i)) / LAYER_H)
  return ZONES[i].start + f * (layerEnd(i) - ZONES[i].start)
}

/**
 * How far up the climb the pancake is, 0-1, `u` (0-1) of the way through it: a rocket
 * start that eases off towards the top, so the end of every launch hangs a moment.
 */
/*
 * The climb's speed through it (u 0-1): it leaves the pan already fast, reaching full
 * speed in the first moment - no waiting about - then slows smoothly all the way to
 * the top, where it hangs. Integrated once into a table, so the height is a lookup.
 */
const CLIMB_N = 512
const climbVelocity = (u) => {
  // Off the pan like a shot: near full speed within the first moment (an ease-out kick, not
  // a slow wind-up), then the long glide up to the top.
  const ramp = Math.min(1, u / 0.02)
  return (0.35 + 0.65 * ramp * (2 - ramp)) * (1 - u) ** 1.35
}
const CLIMB_TABLE = (() => {
  const t = new Float64Array(CLIMB_N + 1)
  for (let i = 1; i <= CLIMB_N; i += 1) t[i] = t[i - 1] + (climbVelocity((i - 0.5) / CLIMB_N) / CLIMB_N)
  const total = t[CLIMB_N]
  for (let i = 0; i <= CLIMB_N; i += 1) t[i] /= total
  t.total = total
  return t
})()
const climb = (u) => {
  const x = Math.min(1, Math.max(0, u)) * CLIMB_N
  const i = Math.min(CLIMB_N - 1, Math.floor(x))
  return CLIMB_TABLE[i] + (CLIMB_TABLE[i + 1] - CLIMB_TABLE[i]) * (x - i)
}
const climbSpeed = (u) => climbVelocity(Math.min(1, Math.max(0, u))) / CLIMB_TABLE.total

/** A fresh state for launchState to write into. */
export const createDropState = () => ({
  /** 'throw' (still in your pan) | 'air' (climbing) | 'settle' (hanging at the top) | 'stopped' */
  phase: 'throw',
  /** 0-1 through the launch heave. */
  throwT: 0,
  /** The pancake's middle (before steering: skyGame adds the sideways offset). */
  position: new Vector3(),
  /** Flip end over end, spin about the vertical, and a wobble. */
  tumble: 0,
  yaw: 0,
  tilt: 0,
  /** What the height counter reads. */
  meter: 0,
  /** Climbing speed in world units a second (for wind, speed lines and the lens). */
  speed: 0,
  /** The sky layer it's in: -1 below the first. */
  floor: -1,
  /** The layer it tops out in. */
  end: 0,
  /** Layers entered so far, and whether it has climbed past the launch boost. */
  slabs: 0,
  roofBroken: false,
  /** True once it hangs at the top. */
  landed: false,
  bounces: 0,
  settleAt: 0,
  inHand: true,
  crashed: false,
  airborne: false,
  size: PHONE_SCALE,
})

/**
 * Everything about a launch `elapsed` seconds in. `drop` is `{ distance, duration }`
 * (duration from the authority: rollDuration). Writes into `out` (createDropState).
 */
export function dropState(elapsed, drop, out) {
  const end = landingFloor(drop.distance)
  const topY = yAtMeter(drop.distance)
  const topAt = Math.max(T_RELEASE + 0.5, drop.duration - TOP_HANG)
  const climbTime = topAt - T_RELEASE
  out.end = end
  out.crashed = false
  out.bounces = 0
  out.settleAt = drop.duration
  out.tilt = 0
  if (elapsed < T_RELEASE) {
    out.phase = 'throw'
    out.throwT = clamp01(elapsed / T_RELEASE)
    out.inHand = true
    out.position.set(COLUMN.x, RELEASE_Y, COLUMN.z)
    out.tumble = 0
    out.yaw = 0
    out.meter = 0
    out.speed = 0
    out.floor = -1
    out.slabs = 0
    out.roofBroken = false
    out.landed = false
    out.airborne = false
    return out
  }
  out.throwT = 1
  out.inHand = false
  out.airborne = true
  if (elapsed < topAt) {
    const u = (elapsed - T_RELEASE) / climbTime
    const y = RELEASE_Y + (topY - RELEASE_Y) * climb(u)
    out.phase = 'air'
    out.landed = false
    out.position.set(COLUMN.x, y, COLUMN.z)
    out.speed = ((topY - RELEASE_Y) * climbSpeed(u)) / climbTime
    // Two flips straight off the pan, then it settles with its topping turned to the
    // camera (FACE), wobbling as it climbs.
    const spin = Math.min(1, u / 0.22)
    out.tumble = Math.PI * 2 * 2 * (1 - (1 - spin) ** 2) + FACE * spin + 0.18 * Math.sin(u * 23) * spin
    out.yaw = 0.3 * Math.sin(u * 7)
    out.tilt = 0.2 * Math.sin(u * 17) * (1 - u)
  } else {
    // At the top: it hangs, bobbing, and makes one last lazy flip to land flat.
    const v = Math.min(elapsed, drop.duration) - topAt
    const w = clamp01(v / TOP_HANG)
    out.phase = elapsed >= drop.duration ? 'stopped' : 'settle'
    out.landed = true
    out.speed = 0
    out.position.set(COLUMN.x, topY + 1.2 * Math.sin(w * Math.PI) * (1 - w * 0.4), COLUMN.z)
    // One last lazy flip to show off at the top, ending face-on again.
    out.tumble = Math.PI * 4 + FACE + Math.PI * 2 * (1 - (1 - w) ** 3)
    out.yaw = 0.3 * Math.sin(7) * (1 - w)
    out.tilt = 0.1 * Math.sin(w * Math.PI * 3) * (1 - w)
  }
  const y = out.position.y
  out.roofBroken = y >= SKY_BASE
  out.floor = out.roofBroken ? Math.min(end, Math.floor((y - SKY_BASE) / LAYER_H)) : -1
  out.slabs = Math.max(0, out.floor)
  out.meter = out.landed ? drop.distance : Math.min(drop.distance, meterAtY(y))
  return out
}

/** The pancake's height `t` seconds into a launch, without the rest (for bubbles ahead). */
export function heightAt(t, drop) {
  const topY = yAtMeter(drop.distance)
  const topAt = Math.max(T_RELEASE + 0.5, drop.duration - TOP_HANG)
  if (t <= T_RELEASE) return RELEASE_Y
  if (t >= topAt) return topY
  return RELEASE_Y + (topY - RELEASE_Y) * climb((t - T_RELEASE) / (topAt - T_RELEASE))
}
