import { PropBuilder } from './blocks'
import { addPancake, addPhone, PAN } from './phoneStyles'

/** How big a pan is in someone's hand: a chunky toy pan, its bowl about half a metre across. */
export const HAND_PHONE_SCALE = 0.48

const cache = new Map()

/**
 * The merged geometry of pan `id` at hand size, held by its grip with the bowl reaching
 * out in front, level. `pancake` says whether its pancake is in it (it isn't while the
 * cake is up in the air). One geometry per pan and state, shared by every hand.
 *
 * In the palm's frame (the arm's) the forearm runs along -Y and, with the arm held out
 * level, +Z is up: so the pan's up (+Y) turns to +Z and its handle (+Z) back up the arm
 * (+Y) - a half turn about Y, then a quarter about X.
 */
export function handPhoneGeometry(id, pancake = true) {
  const key = `${id}:${pancake ? 1 : 0}`
  let geometry = cache.get(key)
  if (!geometry) {
    const p = new PropBuilder()
    const grip = (PAN.radius + PAN.handle * 0.62) * HAND_PHONE_SCALE
    // The grip (that far out along the handle, +Z) lands on the palm.
    addPhone(p, id, { position: [0, -grip, 0.03], rotation: [Math.PI / 2, Math.PI, 0], scale: HAND_PHONE_SCALE, pancake })
    geometry = p.build()
    cache.set(key, geometry)
  }
  return geometry
}

/** How big a flipped pancake is in flight: a little bigger than in the pan, to read from afar. */
export const THROW_PHONE_SCALE = 0.62
const throwCache = new Map()

/**
 * The merged geometry of pan `id`'s pancake as it flips up out of the pan: lying flat,
 * centred on its middle. One per pan, shared by every flip.
 */
export function throwPhoneGeometry(id) {
  let geometry = throwCache.get(id)
  if (!geometry) {
    const p = new PropBuilder()
    addPancake(p, id, { scale: THROW_PHONE_SCALE })
    geometry = p.build()
    throwCache.set(id, geometry)
  }
  return geometry
}

/**
 * Shows a HeldPhone group's pan with its pancake in it (`inPan`), or empty: its two
 * children are the full pan and the empty one.
 */
export function showPancake(group, inPan) {
  if (!group || group.children.length < 2) return
  group.visible = true
  group.children[0].visible = inPan
  group.children[1].visible = !inPan
}
