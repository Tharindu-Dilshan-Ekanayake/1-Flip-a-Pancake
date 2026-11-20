import { BUBBLE_EVERY, bubbleCount, bubbleTime } from '@shared/balance'
import { mulberry32 } from '@shared/rng'

import { sfx } from '../../audio/sfx'
import { actions } from '../../net/actions'
import { burst } from '../fx/fxQueue'
import { spawnScattered } from '../fx/popups'
import { runtime } from '../runtime'
import { STEER_RANGE, T_RELEASE, TOP_HANG } from './launchPath'

/**
 * The flight mini-game: while your pancake climbs you steer it left and right to catch the
 * strength bubbles floating down at it and dodge the grumpy clouds drifting across.
 *
 * Everything is laid out when the launch starts, from its numbers alone (a seeded random),
 * so it costs nothing per frame but the steering and a scan of what's near. The bubbles
 * live in the pancake's own frame: each one is drawn `VIS_SPEED` metres above the pancake
 * per second until it reaches it, however fast the sky itself is rushing by - so the game
 * reads the same on a short hop and a launch to the edge of space. The authority
 * (session.bubble) pays each bubble caught; clouds only cost you what you miss while the
 * pancake spins.
 */

/** How fast bubbles and clouds come down at the pancake, in its own frame (m/s). */
export const VIS_SPEED = 13
/** How far ahead they show (s): further ones are still hidden in the haze. */
export const VIS_AHEAD = 2.2
/** Half-width within which a bubble is caught, and a cloud hits. */
const CATCH_X = 1.55
const CLOUD_X = 1.75
/** Top steering speed (m/s) and how quickly it gets there or stops (1/s). */
const STEER_SPEED = 13
const STEER_GRIP = 14
/** How long a cloud hit knocks the pancake spinning (ms). */
const STUN_MS = 750

/** Bubbles and clouds can't outnumber these pools (a launch to the very top has ~30 bubbles). */
export const MAX_BUBBLES = 48
export const MAX_CLOUDS = 20

const makeBubble = () => ({ t: 0, x: 0, done: false, caught: false, at: 0 })
const makeCloud = () => ({ t: 0, x: 0, drift: 0, done: false, hit: false, at: 0, big: false })

export const sky = {
  active: false,
  startedAt: 0,
  /** When the pancake reaches the top (s into the launch): no bubbles or clouds after. */
  topAt: 0,
  bubbleCount: 0,
  cloudCount: 0,
  bubbles: Array.from({ length: MAX_BUBBLES }, makeBubble),
  clouds: Array.from({ length: MAX_CLOUDS }, makeCloud),
  /** Sideways offset from the column, and its speed. */
  steer: 0,
  steerVel: 0,
  /** A knock from a cloud: until when (performance.now), and which way it shoves. */
  stunUntil: 0,
  shove: 0,
  /** Bubbles caught in a row, the best run this launch, and all caught. */
  streak: 0,
  best: 0,
  caught: 0,
  /** performance.now() of the last bubble caught (the pancake's happy pop). */
  lastCatchAt: 0,
  /** Seconds into the launch at the last update. */
  elapsed: 0,
}

// --- Input ------------------------------------------------------------------------

const keys = { left: false, right: false }
/** -1..1 from the on-screen steering pads (RollOverlay). */
let touchSteer = 0
export function setTouchSteer(value) {
  touchSteer = Math.max(-1, Math.min(1, value))
}

const KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' }
function onKey(e, down) {
  const k = KEYS[e.code]
  if (!k) return
  keys[k] = down
  if (sky.active) e.preventDefault()
}
const onDown = (e) => onKey(e, true)
const onUp = (e) => onKey(e, false)
const onBlur = () => {
  keys.left = false
  keys.right = false
  touchSteer = 0
}
let listening = false
function listen(on) {
  if (on === listening || typeof window === 'undefined') return
  listening = on
  const method = on ? 'addEventListener' : 'removeEventListener'
  window[method]('keydown', onDown)
  window[method]('keyup', onUp)
  window[method]('blur', onBlur)
}

/** -1 (left) .. 1 (right): keys, the steering pads and the joystick together. */
const steerInput = () => Math.max(-1, Math.min(1, (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchSteer + runtime.input.joyX))

// --- Layout -----------------------------------------------------------------------

/**
 * Lays out a launch's bubbles and clouds. The bubbles wander across the sky in runs you
 * can follow - a drift one way, a zig-zag, now and then a long sweep - never further
 * apart than you can steer between them; the clouds sit in the gaps, on the side the next
 * bubble isn't, so there's always a way through.
 */
export function startSkyGame(launch) {
  const r = mulberry32(Math.floor(launch.startedAt) ^ Math.floor(launch.distance * 10))
  sky.active = true
  sky.startedAt = launch.startedAt
  sky.topAt = launch.duration - TOP_HANG
  sky.steer = 0
  sky.steerVel = 0
  sky.stunUntil = 0
  sky.shove = 0
  sky.streak = 0
  sky.best = 0
  sky.caught = 0
  sky.lastCatchAt = 0
  sky.elapsed = 0
  const n = Math.min(MAX_BUBBLES, bubbleCount(launch.duration))
  sky.bubbleCount = n
  const reach = STEER_SPEED * BUBBLE_EVERY * 0.7
  let x = 0
  let dir = r() < 0.5 ? -1 : 1
  for (let i = 0; i < n; i += 1) {
    const b = sky.bubbles[i]
    // Every few bubbles the pattern changes.
    if (i % 5 === 0) dir = r() < 0.5 ? -1 : 1
    const zig = i % 5 >= 3 && r() < 0.5
    const step = zig ? -dir * reach * 0.8 : dir * (0.6 + r() * 0.9) * (reach * 0.55)
    x += step
    if (Math.abs(x) > STEER_RANGE) {
      dir = -dir
      x = Math.max(-STEER_RANGE, Math.min(STEER_RANGE, x - 2 * step))
    }
    b.t = bubbleTime(i)
    b.x = x
    b.done = false
    b.caught = false
    b.at = 0
  }
  let c = 0
  for (let i = 2; i < n - 1 && c < MAX_CLOUDS; i += 1) {
    // About one gap in three gets a cloud, more of them higher up.
    if (r() > 0.28 + Math.min(0.25, i * 0.01)) continue
    const cloud = sky.clouds[c]
    const next = sky.bubbles[i + 1].x
    const side = next > 0 ? -1 : 1
    cloud.t = (sky.bubbles[i].t + sky.bubbles[i + 1].t) / 2
    cloud.x = Math.max(-STEER_RANGE, Math.min(STEER_RANGE, next + side * (2.6 + r() * 1.6)))
    cloud.drift = (r() - 0.5) * 1.6
    cloud.big = r() < 0.3
    cloud.done = false
    cloud.hit = false
    cloud.at = 0
    c += 1
  }
  sky.cloudCount = c
  listen(true)
}

export function stopSkyGame() {
  sky.active = false
  listen(false)
  onBlur()
}

/** Where cloud `c` is across the sky at `t` seconds into the launch. */
export const cloudX = (c, t) => c.x + c.drift * (t - c.t)
/** Whether the pancake is spinning from a cloud hit. */
export const stunned = (now = performance.now()) => now < sky.stunUntil

/**
 * Steers and settles what reaches the pancake this frame: a bubble passing within reach
 * pops and pays (the authority hears of it), a cloud in the way knocks it spinning.
 * `elapsed` is seconds into the launch (the drop clock), `pancake` its position (for the
 * pop's sparkle).
 */
export function updateSkyGame(elapsed, dt, now, pancake) {
  if (!sky.active) return
  sky.elapsed = elapsed
  const flying = elapsed >= T_RELEASE && elapsed < sky.topAt
  const knocked = stunned(now)
  // Steering: eased towards where you push, a shove while knocked, kept in the column.
  const want = flying && !knocked ? steerInput() * STEER_SPEED : sky.shove * Math.max(0, (sky.stunUntil - now) / STUN_MS) * 6
  sky.steerVel += (want - sky.steerVel) * (1 - Math.exp(-STEER_GRIP * dt))
  sky.steer += sky.steerVel * dt
  if (Math.abs(sky.steer) > STEER_RANGE) {
    sky.steer = Math.sign(sky.steer) * STEER_RANGE
    sky.steerVel = 0
  }
  if (!flying) {
    // At the top, drift back over the column for the finish.
    if (elapsed >= sky.topAt) sky.steer += (0 - sky.steer) * (1 - Math.exp(-3 * dt))
    return
  }

  for (let i = 0; i < sky.bubbleCount; i += 1) {
    const b = sky.bubbles[i]
    if (b.done || elapsed < b.t) continue
    b.done = true
    if (!knocked && Math.abs(b.x - sky.steer) < CATCH_X) {
      b.caught = true
      b.at = now
      sky.lastCatchAt = now
      sky.caught += 1
      sky.streak += 1
      sky.best = Math.max(sky.best, sky.streak)
      actions.bubble(i)
      sfx.bubblePop(sky.streak)
      burst({ x: pancake.x + b.x, y: pancake.y + 0.5, z: pancake.z, count: 14, palette: 'power', speed: 6 })
      if (sky.streak > 1 && sky.streak % 5 === 0) spawnScattered(`${sky.streak} IN A ROW!`, { scale: 1.3 })
    } else {
      sky.streak = 0
    }
  }

  for (let i = 0; i < sky.cloudCount; i += 1) {
    const c = sky.clouds[i]
    if (c.done || elapsed < c.t) continue
    c.done = true
    const cx = cloudX(c, c.t)
    if (!knocked && Math.abs(cx - sky.steer) < CLOUD_X * (c.big ? 1.3 : 1)) {
      c.hit = true
      c.at = now
      sky.stunUntil = now + STUN_MS
      sky.shove = sky.steer >= cx ? 1 : -1
      sky.streak = 0
      sfx.cloudBonk()
      spawnScattered('BONK!', { scale: 1.4 })
    }
  }
}
