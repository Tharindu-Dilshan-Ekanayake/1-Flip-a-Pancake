import { comboBonus, HIT_GRADES } from '@shared/balance'
import { formatNumber } from '@shared/format'
import { DROP_SPOT, groundHeightAt, ROLL_RETURN } from '@shared/world'

import { sfx } from '../../audio/sfx'
import { getGame } from '../../store/game'
import { getQuality } from '../../store/quality'
import { fadeThrough } from '../../ui/fade'
import { burst, fireBurst } from '../fx/fxQueue'
import { spawnScattered } from '../fx/popups'
import { consumePull } from '../launch'
import { runtime } from '../runtime'
import { zones } from '../worldLook'
import { showHit, showWorldBanner } from './hudLink'
import { createDropState, dropState, landingFloor, T_RELEASE } from './launchPath'
import { spawnRing } from './flightRings'
import { sky, startSkyGame, stopSkyGame, updateSkyGame } from './skyGame'
import { skyTheme, startsWorld, themeGradient } from './skyThemes'

/** How long the result shows at the top, before you're back on the launch pad. */
const RESULT_HOLD_MS = 2600

/**
 * The launch currently playing (the template's "roll"), read every frame by the camera,
 * the sky layers, your avatar and the effects. Everything about it is known when it
 * starts (the authority already resolved the height and the Trophies), so the client
 * just plays it back - only the bubbles you catch go to the server (skyGame.js).
 *
 * It's a launch state (launchPath.dropState: phase, position, meter, layer...) plus the
 * launch's numbers. Your logical position stays on the launch pad (that's what the
 * server checks); only the pancake and the camera go up the sky.
 */
export const roll = {
  ...createDropState(),
  active: false,
  /** True once the pancake has hung at the top and the result is showing. */
  stopped: false,
  startedAt: 0,
  distance: 0,
  duration: 1,
  wins: 0,
  prize: 0,
  discovered: [],
  blocked: -1,
  /** How many layers it climbs into past the first. */
  broken: 0,
  best: false,
  tireId: 'bicycle',
  /** How well you launched (HIT_GRADES id), or null for Auto Launch. */
  hit: null,
  /** PERFECTs in a row with this launch (0: not a PERFECT), and its lucky gift or null. */
  combo: 0,
  gift: null,
  /** performance.now() of the release, entering the sky layers, the last layer and the top. */
  releasedAt: 0,
  roofAt: 0,
  hitAt: 0,
  landedAt: 0,
  /** Layers entered so far this launch (for the climbing ding). */
  smashCount: 0,
  frameKey: -1,
  /**
   * Hit-stop: ms the launch's clock is behind real time. Reaching the top holds it a beat;
   * the clock catches up a little faster than real time afterwards, and is always caught
   * up before the end, so the launch ends exactly when the authority said.
   */
  lag: 0,
  lastNow: 0,
  freezeAt: 0,
  freezeMs: 0,
  freezeLag: 0,
}

const FREEZE_RATE = 0.4
const CATCH_UP = 0.45

let timers = []

function clearTimers() {
  for (const id of timers) clearTimeout(id)
  timers = []
}

/**
 * Moves the launch on to this frame. Idempotent per frame (keyed on the renderer's
 * clock), so the camera, the sky and the effects all see exactly the same state however
 * many of them ask.
 */
export function advanceRoll(clockTime) {
  if (!roll.active || roll.frameKey === clockTime) return roll
  roll.frameKey = clockTime
  const now = performance.now()
  const wasPhase = roll.phase
  const wasLayers = roll.slabs
  const wasSky = roll.roofBroken
  const wasTop = roll.landed
  const dt = roll.lastNow ? Math.min(now - roll.lastNow, 100) : 0
  roll.lastNow = now
  if (now - roll.freezeAt < roll.freezeMs) roll.lag = roll.freezeLag + (now - roll.freezeAt) * (1 - FREEZE_RATE)
  else roll.lag = Math.max(0, roll.lag - dt * CATCH_UP)
  // All caught up by half a second before the end.
  const left = roll.duration - (now - roll.startedAt) / 1000
  roll.lag = Math.min(roll.lag, Math.max(0, left - 0.5) * 400)
  const elapsed = (now - roll.startedAt - roll.lag) / 1000
  dropState(elapsed, roll, roll)
  updateSkyGame(elapsed, dt / 1000, now, roll.position)

  if (wasPhase === 'throw' && roll.phase !== 'throw') release(now)
  if (!wasSky && roll.roofBroken) enterSky(now)
  // (On a very slow frame it could pass two at once: each gets its ding.)
  for (let i = wasLayers; i < roll.slabs; i += 1) enterLayer(now, i + 1)
  if (!wasTop && roll.landed) reachTop(now)
  if (roll.phase === 'stopped' && !roll.stopped) stopRoll()
  return roll
}

function freeze(now, ms) {
  roll.freezeAt = now
  roll.freezeMs = ms
  roll.freezeLag = roll.lag
}

/**
 * How each grade of launch looks and sounds as the pancake leaves the pan: its burst
 * (FireBurst kind) and confetti. The title follows the grade too (HitFlash.jsx).
 */
const HIT_FX = {
  perfect: { fire: 'perfect', palette: 'gold', count: 50, speed: 11 },
  great: { fire: 'great', palette: 'power', count: 30, speed: 9 },
  good: { fire: 'good', palette: 'confetti', count: 14, speed: 6 },
  weak: { fire: null, palette: null, count: 0, speed: 0 },
}

/** The pancake leaving the pan: the launch's grade, straight away, so you see why it goes as high as it does. */
function release(now) {
  roll.releasedAt = now
  const grade = HIT_GRADES.find((g) => g.id === roll.hit)
  sfx.throwPhone(grade ? { perfect: 1, great: 0.8, good: 0.6, weak: 0.3 }[grade.id] : 0.7)
  sfx.windStart()
  const p = roll.position
  // A puff of flour off the pan, and a shockwave rolling out across the pit floor.
  burst({ x: p.x, y: p.y, z: p.z, count: 16, palette: 'wood', speed: 6 })
  const floor = groundHeightAt(DROP_SPOT.x, DROP_SPOT.z) + 0.25
  spawnRing({ x: p.x, y: floor, z: p.z, from: 1, to: 15, duration: 0.85, color: '#ffd21f', opacity: 1 })
  spawnRing({ x: p.x, y: floor + 0.05, z: p.z, from: 0.6, to: 9, duration: 0.55, color: '#ffffff', opacity: 0.8 })
  if (!grade) return
  const fx = HIT_FX[grade.id]
  if (fx.count) burst({ x: p.x, y: p.y, z: p.z, count: fx.count, palette: fx.palette, speed: fx.speed })
  if (grade.id === 'perfect' && roll.combo >= 2) {
    timers.push(setTimeout(() => spawnScattered(`PERFECT COMBO x${roll.combo}! +${Math.round((comboBonus(roll.combo) - 1) * 100)}% TROPHIES`, { scale: 1.25 }), 450))
  }
  if (grade.id === 'weak') {
    spawnScattered(grade.label, { scale: 1.3 })
    sfx.weakHit()
    return
  }
  if (fx.fire && getQuality().particles) fireBurst(p.x, p.y, p.z, fx.fire)
  showHit(grade.id)
  sfx.gradeHit(grade.id)
}

/** Out of the launch boost and into the sky layers. */
function enterSky(now) {
  roll.roofAt = now
  roll.hitAt = now
  enterWorld(0)
}

/** Into a new world (the first layer of its theme): its banner, a shimmer and a burst in its colours. */
function enterWorld(index) {
  const layer = zones()[index]
  if (!layer) return
  const look = skyTheme(layer.theme)
  showWorldBanner(look.title, themeGradient(layer.theme), look.gate)
  sfx.worldEnter()
  const p = roll.position
  spawnRing({ x: p.x + sky.steer, y: p.y, z: p.z, from: 4, to: 30, duration: 1.1, color: look.gate, opacity: 1 })
  burst({ x: p.x + sky.steer, y: p.y + 2, z: p.z, count: 40, palette: 'confetti', speed: 10 })
}

/** Up into sky layer `index`: a ding that climbs with every layer (its name comes up on the HUD, Roll.jsx), a cheer every fifth. */
function enterLayer(now, index) {
  roll.hitAt = now
  roll.smashCount += 1
  const layer = zones()[index]
  if (layer) spawnRing({ x: roll.position.x + sky.steer, y: roll.position.y, z: roll.position.z, from: 3, to: 17, duration: 0.6, color: skyTheme(layer.theme).ring, opacity: 0.9 })
  if (startsWorld(zones(), index)) {
    enterWorld(index)
    return
  }
  sfx.floorSmash(roll.smashCount)
  if ((index + 1) % 5 === 0) sfx.stageUp()
}

/** At the top: the pancake hangs, a burst of gold, a chime and a beat of slow motion. */
function reachTop(now) {
  roll.landedAt = now
  roll.hitAt = now
  freeze(now, 160)
  sfx.windStop()
  sfx.topReached(Math.min(1, 0.4 + roll.end / 30))
  const p = roll.position
  burst({ x: p.x + sky.steer, y: p.y + 1, z: p.z, count: 60, palette: 'gold', speed: 10 })
  if (getQuality().particles) fireBurst(p.x + sky.steer, p.y, p.z, 'good')
  spawnRing({ x: p.x + sky.steer, y: p.y, z: p.z, from: 1, to: 9, duration: 0.7, color: '#ffd21f', opacity: 1, facing: true })
  spawnRing({ x: p.x + sky.steer, y: p.y, z: p.z, from: 0.5, to: 5.5, duration: 0.5, color: '#ffffff', opacity: 0.9, facing: true })
  if (sky.caught > 0) {
    const run = sky.best >= 5 ? ` - BEST RUN ${sky.best}` : ''
    timers.push(setTimeout(() => spawnScattered(`${sky.caught} BUBBLE${sky.caught > 1 ? 'S' : ''}!${run}`, { scale: 1.2 }), 350))
  }
}

/**
 * Starts a launch the authority already resolved: you heave the pan up from the launch
 * pad and the pancake rockets up through the sky layers to the height it reached.
 */
export function beginRoll(result) {
  clearTimers()
  const game = getGame()
  consumePull()
  const end = landingFloor(result.distance)
  Object.assign(roll, createDropState(), {
    active: true,
    stopped: false,
    startedAt: performance.now(),
    distance: result.distance,
    duration: result.duration,
    wins: result.wins,
    prize: result.prize || 0,
    discovered: result.discovered || [],
    blocked: result.blocked ?? -1,
    broken: result.broken || 0,
    best: result.best,
    tireId: result.tireId || game.profile.equippedTire,
    hit: result.hit ?? null,
    combo: result.combo || 0,
    gift: result.gift || null,
    releasedAt: 0,
    roofAt: 0,
    hitAt: 0,
    landedAt: 0,
    smashCount: 0,
    frameKey: -1,
    lag: 0,
    lastNow: 0,
    freezeAt: 0,
    freezeMs: 0,
    freezeLag: 0,
  })
  dropState(0, roll, roll)
  startSkyGame(roll)
  // Step onto the launch spot, facing north.
  const player = runtime.player
  player.position.set(DROP_SPOT.x, groundHeightAt(DROP_SPOT.x, DROP_SPOT.z), DROP_SPOT.z)
  player.frozen = true
  player.yaw = Math.PI
  runtime.camera.mode = 'roll'
  // The HUD's switch to the launch (a React update and a restyle) in a task of its own,
  // not the frame the launch starts in.
  const started = {
    distance: result.distance,
    wins: result.wins,
    prize: result.prize || 0,
    blocked: result.blocked ?? -1,
    duration: result.duration,
    best: result.best,
    giftWins: result.gift?.wins || 0,
    // Your best before this launch (the profile with the new one may already be on its way).
    prevBest: game.profile.stats.bestDistance || 0,
    floor: end,
  }
  timers.push(setTimeout(() => game.startRoll(started), 0))

  // A rising whistle as it rockets off.
  timers.push(setTimeout(() => sfx.fallWhistle(1.6), (T_RELEASE + 0.05) * 1000))
  // The result shows as soon as the pancake has hung at the top (advanceRoll); this is
  // the backstop for a tab that stopped drawing frames.
  timers.push(setTimeout(stopRoll, result.duration * 1000))
}

/**
 * At the top: the Trophies pour in, a first-time sky layer and any lucky gift are
 * announced, and after a moment you're back on the launch pad. Once per launch.
 */
function stopRoll() {
  if (!roll.active || roll.stopped) return
  roll.stopped = true
  const game = getGame()
  sfx.wins()
  const f = roll.position
  burst({ x: f.x + sky.steer, y: f.y + 2, z: f.z, count: 50, palette: 'gold', speed: 9 })
  game.endRoll()
  // A sky layer reached for the first time ever: its name and the prize, once.
  const layers = zones()
  for (const zi of roll.discovered) {
    game.showToast(`NEW SKY LAYER: ${layers[zi].name}! +${formatNumber(layers[zi].discover)} Trophies`)
  }
  // A lucky gift: a present bursting open by the pancake, and what was in it.
  const gift = roll.gift
  if (gift) {
    timers.push(
      setTimeout(
        () => {
          sfx.reveal()
          burst({ x: f.x + sky.steer, y: f.y + 2.4, z: f.z, count: 70, palette: 'confetti', speed: 11 })
          const what = gift.wins ? `+${formatNumber(gift.wins)} Trophies` : gift.label
          game.showToast(`LUCKY GIFT! ${gift.wins ? `${gift.label}: ${what}` : what}`)
        },
        roll.discovered.length ? 1600 : 500,
      ),
    )
  }
  // Back to the pad once the result has shown - and never before the authority has
  // finished the launch, so the next one is accepted.
  const ready = roll.startedAt + roll.duration * 1000 + 400 - performance.now()
  timers.push(setTimeout(() => fadeThrough(finishRoll), Math.max(RESULT_HOLD_MS, ready)))
}

/**
 * Back on the launch pad, camera behind you. With Auto Launch on you stay in the zone, so
 * the next launch goes straight away.
 */
export function finishRoll() {
  clearTimers()
  stopSkyGame()
  sfx.windStop()
  roll.active = false
  roll.stopped = false
  runtime.flightFocus = null
  const player = runtime.player
  const { passes, settings } = getGame().profile
  if (!(passes.autoRoll && settings.autoRoll)) player.position.set(ROLL_RETURN.x, groundHeightAt(ROLL_RETURN.x, ROLL_RETURN.z), ROLL_RETURN.z)
  player.yaw = Math.PI
  player.frozen = false
  runtime.camera.mode = 'follow'
  runtime.camera.yaw = 0
  runtime.camera.snap = true
  getGame().clearRollResult()
}
