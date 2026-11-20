import { Color } from 'three'

/**
 * The launch's ring effects (drawn by FlightFx.jsx): the shockwave across the pit floor as
 * the pancake lifts off, a flash each time it passes into a new layer, a burst facing the
 * camera at the top, and the wind rings it rushes through. A fixed pool, the oldest
 * reused once it's full; nothing allocated when one starts.
 */
export const RING_POOL = 10

export const rings = Array.from({ length: RING_POOL }, () => ({
  active: false,
  start: 0,
  duration: 0.5,
  x: 0,
  y: 0,
  z: 0,
  from: 1,
  to: 10,
  opacity: 1,
  facing: false,
  color: new Color(),
}))
let nextRing = 0

/**
 * Starts a ring at (x, y, z) growing from `from` to `to` (radius) over `duration` seconds
 * and fading out: lying flat, or `facing` the camera. Safe to call from the frame loop.
 */
export function spawnRing({ x, y, z, from = 1, to = 10, duration = 0.5, color = '#ffffff', opacity = 0.9, facing = false }) {
  const r = rings[nextRing]
  nextRing = (nextRing + 1) % RING_POOL
  r.active = true
  r.start = performance.now()
  r.duration = duration
  r.x = x
  r.y = y
  r.z = z
  r.from = from
  r.to = to
  r.opacity = opacity
  r.facing = facing
  r.color.set(color)
}
