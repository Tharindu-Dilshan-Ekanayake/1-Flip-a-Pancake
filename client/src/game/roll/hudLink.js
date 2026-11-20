/**
 * The roll's distance counter, zone name and zone progress bar are DOM elements written
 * from the frame loop. The overlay registers them here; the renderer writes the
 * distance (and slides your marker along the bar) at most UPDATE_HZ times a second and
 * only when the whole-yard value changes, and the zone name only when the ball crosses
 * into a new zone, so React never re-renders during a kick.
 */
import { ZONES } from '@shared/balance'
import { formatDistance } from '@shared/format'
import { zoneIndexAt } from '@shared/logic'

const UPDATE_MS = 1000 / 15

/**
 * Changes an element's text in place, by its text node's value: `textContent` swaps in a
 * new text node, which takes the old one out of layout and puts a new one in - on text
 * written many times a second (the distance, popups), that's layout work every time.
 */
export function setText(el, text) {
  const node = el.firstChild
  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) node.nodeValue = text
  else el.textContent = text
}

/** Each graded hit's overlay (HitFlash.jsx), by grade id, played by restarting its CSS animation. */
const hitEls = {}
export function setHitElement(grade, el) {
  hitEls[grade] = el
}
/**
 * Plays grade `grade`'s overlay from the start; safe to call from the frame loop (no
 * React). The class comes off now and back on next frame, which restarts the animation
 * - not by reading layout to force it, which recalculates the whole page right there,
 * in the middle of the game's frame.
 */
export function showHit(grade) {
  const el = hitEls[grade]
  if (!el) return
  el.classList.remove('pp-perfect-on')
  requestAnimationFrame(() => el.classList.add('pp-perfect-on'))
}

/** The stacked text spans (outline and fill) that show the distance, and the zone's. */
let distanceSpans = []
let zoneSpans = []
let zoneFill = null
let marker = null
let stageSpans = []
let shown = -1
let shownZone = null
let lastWrite = 0

export function setRollHudElement(el) {
  distanceSpans = el ? [...el.querySelectorAll('[data-distance]')] : []
  zoneSpans = el ? [...el.querySelectorAll('[data-zone]')] : []
  zoneFill = el ? el.querySelector('[data-zone-fill]') : null
  marker = el ? el.querySelector('[data-zone-marker]') : null
  stageSpans = el ? [...el.querySelectorAll('[data-stage]')] : []
  shown = -1
  shownZone = null
  lastWrite = 0
}

export function writeDistance(meters, now = performance.now()) {
  const m = Math.max(0, Math.floor(meters))
  if (distanceSpans.length === 0 || m === shown || now - lastWrite < UPDATE_MS) return
  shown = m
  lastWrite = now
  // Climbing: the height counts up, "1,234 m".
  const text = formatDistance(m)
  for (const span of distanceSpans) setText(span, text)
  // Up the whole sky, a stage at a time (every stage an equal step of the bar).
  if (marker) marker.style.transform = `translateY(${-zoneBarPosition(m) * 100}%)`
}


/**
 * Where metre `m` sits on the zone progress bar, 0-1: each zone gets an equal segment,
 * filled by how far through that zone the tire is (the last zone's segment fills over
 * as long again as the one before it).
 */
export function zoneBarPosition(m) {
  const i = zoneIndexAt(m)
  const start = ZONES[i].start
  const end = i + 1 < ZONES.length ? ZONES[i + 1].start : start * 2
  return (i + Math.min(1, (m - start) / Math.max(1, end - start))) / ZONES.length
}

let tunnel = null
let tunnelShown = -1

/** The speed tunnel overlay (HUD.jsx), or null. */
export function setSpeedTunnelElement(el) {
  tunnel = el
  tunnelShown = -1
}

/** How strongly the speed tunnel shows, 0-1; written at most UPDATE_HZ times a second. */
export function writeSpeed(amount, now = performance.now()) {
  if (!tunnel) return
  const k = Math.round(amount * 20) / 20
  if (k === tunnelShown || (now - lastSpeedWrite < UPDATE_MS && k !== 0)) return
  tunnelShown = k
  lastSpeedWrite = now
  tunnel.style.opacity = String(k)
  tunnel.style.visibility = k > 0 ? 'visible' : 'hidden'
}
let lastSpeedWrite = 0

/** Shows zone `index`'s `name` under the distance, filled with `gradient` (a CSS gradient), and its stage number under the bar. */
export function writeZone(index, name, gradient) {
  if (index >= 0) for (const span of stageSpans) setText(span, `STAGE ${index + 1} / ${ZONES.length}`)
  if (zoneSpans.length === 0 || name === shownZone) return
  shownZone = name
  for (const span of zoneSpans) setText(span, name)
  if (zoneFill) zoneFill.style.backgroundImage = gradient
}

/** The world banner (RollOverlay): DIAMOND WORLD! sweeping across as the pancake flies in. */
let worldBanner = null
let worldFlash = null
export function setWorldBannerElement(el) {
  worldBanner = el
}
/** The full-screen flash in a new world's colour (RollOverlay). */
export function setWorldFlashElement(el) {
  worldFlash = el
}
/** Shows world `title` filled with `gradient`, the screen flashing `color`; safe from the frame loop. */
export function showWorldBanner(title, gradient, color = '#ffffff') {
  if (worldFlash) {
    worldFlash.style.background = `radial-gradient(circle at 50% 50%, ${color} 0%, ${color}88 35%, transparent 75%)`
    worldFlash.classList.remove('pp-flash-on')
    requestAnimationFrame(() => worldFlash?.classList.add('pp-flash-on'))
  }
  if (!worldBanner) return
  for (const span of worldBanner.querySelectorAll('[data-world]')) setText(span, title)
  const fill = worldBanner.querySelector('[data-world-fill]')
  if (fill) fill.style.backgroundImage = gradient
  worldBanner.classList.remove('pp-world-on')
  requestAnimationFrame(() => worldBanner?.classList.add('pp-world-on'))
}
