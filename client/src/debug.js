import { fireBurst } from './game/fx/fxQueue'
import { runtime } from './game/runtime'
import { showHit } from './game/roll/hudLink'
import { beginRoll, roll } from './game/roll/rollControl'
import { rollDuration } from '@shared/balance'
import { actions } from './net/actions'
import { remotePlayers } from './net/remotePlayers'
import { useGame } from './store/game'
import { useQuality } from './store/quality'

/**
 * `?debug` in the URL exposes game internals on `window.__pp` for the automated
 * perf/screenshot checks and console poking. Off by default; changes nothing else.
 */
export function installDebugHooks() {
  if (typeof window === 'undefined') return
  if (!new URLSearchParams(window.location.search).has('debug')) return
  window.__pp = { runtime, useGame, useQuality, actions, remotePlayers, roll, fx: { fireBurst, showHit },
    // Plays a launch to `distance` m without asking the authority (screenshots of the sky's worlds).
    previewLaunch: (distance) => beginRoll({ distance, duration: rollDuration(distance), wins: 0, prize: 0, discovered: [], best: false, hit: 'good' }),
  }
}
