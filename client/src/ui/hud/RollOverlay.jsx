import { useCallback, useEffect } from 'react'

import { ZONES } from '@shared/balance'
import { formatDistance, formatNumber } from '@shared/format'
import { zoneIndexAt } from '@shared/logic'

import { sfx } from '../../audio/sfx'
import { setRollHudElement, setWorldBannerElement, setWorldFlashElement, zoneBarPosition } from '../../game/roll/hudLink'
import { setTouchSteer } from '../../game/roll/skyGame'
import { nextWorld, skyTheme, themeGradient } from '../../game/roll/skyThemes'
import { useGame } from '../../store/game'
import { zones } from '../../game/worldLook'
import Icon from '../Icon'
import StrokeText from '../StrokeText'
import { GRADIENTS, u } from './style'

/**
 * While your pancake climbs: the height in big numbers at the top, "1,234 m", the name of
 * the sky layer it's in under it, and up the right a tall sky bar with your pan climbing
 * it and a BEST mark where your highest launch got to. All written straight to the DOM
 * from the frame loop (see hudLink), never through React - and the whole counter is
 * contained, so those writes re-lay-out this box alone.
 */
const DISTANCE_GRADIENT = 'linear-gradient(180deg, #ffffff 0%, #e0faff 45%, #9fd8ff 100%)'
const BAR_HEIGHT = 600

/**
 * The side bar is the whole sky, bottom to top: a band for each world sized by its stages,
 * in the world's colours, a white line where each world begins. Worked out once.
 */
const SKY_BAR = (() => {
  const n = ZONES.length
  const stops = []
  const lines = []
  let start = 0
  for (let i = 1; i <= n; i += 1) {
    if (i === n || ZONES[i].theme !== ZONES[start].theme) {
      const [, mid, deep] = skyTheme(ZONES[start].theme).name
      stops.push(`${deep} ${((start / n) * 100).toFixed(2)}%`, `${mid} ${(((start + i) / 2 / n) * 100).toFixed(2)}%`, `${deep} ${((i / n) * 100).toFixed(2)}%`)
      if (i < n) lines.push(i / n)
      start = i
    }
  }
  return { gradient: `linear-gradient(0deg, ${stops.join(', ')})`, lines }
})()

function DistanceCounter() {
  // A callback ref: registered when the element mounts, cleared when it unmounts.
  const ref = useCallback((el) => setRollHudElement(el), [])
  const roll = useGame((s) => s.roll)
  const prevBest = roll?.prevBest || 0
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" style={{ contain: 'layout style' }}>
      <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center" style={{ top: u(40) }}>
        <span className="pp-text" style={{ fontSize: u(116), lineHeight: 1 }}>
          <span data-distance aria-hidden="true" className="pp-text-stroke" style={{ WebkitTextStrokeWidth: u(22) }}>
            0 m
          </span>
          <span data-distance className="pp-text-fill" style={{ backgroundImage: DISTANCE_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            0 m
          </span>
        </span>
        <span className="pp-text" style={{ fontSize: u(70), marginTop: u(4) }}>
          <span data-zone aria-hidden="true" className="pp-text-stroke" style={{ WebkitTextStrokeWidth: u(14) }} />
          <span data-zone data-zone-fill className="pp-text-fill" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} />
        </span>
      </div>
      <div ref={setWorldFlashElement} className="pp-world-flash absolute inset-0" />
      {/* The world banner, swept across when the pancake flies into a new world (hudLink). */}
      <div ref={setWorldBannerElement} className="pp-world absolute left-1/2 top-[34%] flex flex-col items-center" style={{ width: 'max-content' }}>
        <span className="pp-text" style={{ fontSize: u(40) }}>
          <StrokeText stroke={u(9)}>WELCOME TO</StrokeText>
        </span>
        <span className="pp-text" style={{ fontSize: u(124), lineHeight: 1 }}>
          <span data-world aria-hidden="true" className="pp-text-stroke" style={{ WebkitTextStrokeWidth: u(24) }} />
          <span data-world data-world-fill className="pp-text-fill" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} />
        </span>
      </div>
      {/* The sky bar up the right: treetop green at the bottom, through day and sunset, to space. */}
      <div className="absolute" style={{ right: u(60), top: u(150), width: u(30), height: u(BAR_HEIGHT) }}>
        <div className="absolute inset-0 overflow-hidden" style={{ border: `${u(5)} solid #111`, borderRadius: u(16), background: SKY_BAR.gradient }}>
          {SKY_BAR.lines.map((f) => (
            <div key={f} className="absolute left-0 right-0" style={{ bottom: `${f * 100}%`, height: u(3), background: '#ffffff', opacity: 0.85 }} />
          ))}
        </div>
        {prevBest > 0 && (
          <div className="absolute flex items-center" style={{ right: u(-6), bottom: `${zoneBarPosition(prevBest) * 100}%`, transform: 'translateY(50%)', gap: u(6) }}>
            <span className="flex items-center justify-center" style={{ fontSize: u(28), padding: `${u(2)} ${u(12)}`, borderRadius: u(14), border: `${u(4)} solid #111`, background: GRADIENTS.goldButton, marginRight: u(4) }}>
              <StrokeText stroke={u(6)}>BEST</StrokeText>
            </span>
            <span style={{ width: u(40), height: u(6), background: '#ffffff', border: `${u(2)} solid #111` }} />
          </div>
        )}
        {/* The marker rides a track as tall as the bar, slid by a transform (a % of the
            track's own height): moving it never needs a layout. */}
        <div data-zone-marker className="absolute inset-0" style={{ willChange: 'transform' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <Icon name="tire" size={u(78)} />
          </div>
        </div>
        {/* Which stage of the sky you're in, of how many. */}
        <div className="absolute text-right" style={{ right: u(-24), top: `calc(100% + ${u(14)})`, width: 'max-content', fontSize: u(30) }}>
          <span className="pp-text">
            <span data-stage aria-hidden="true" className="pp-text-stroke" style={{ WebkitTextStrokeWidth: u(7) }}>
              STAGE 1 / {ZONES.length}
            </span>
            <span data-stage className="pp-text-fill" style={{ backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #ffe27a 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              STAGE 1 / {ZONES.length}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/** How many trophies fly to the Wins counter, and where each bursts out to first. */
const FLYERS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + 0.3
  const r = 110 + (i % 3) * 45
  return { sx: Math.cos(a) * r, sy: Math.sin(a) * r * 0.7, delay: 0.35 + i * 0.06 }
})

/**
 * The Wins flying home: a ring of trophies bursts out of the result and streams into
 * the Wins counter in the top-left (which bumps as they land - see StatsPanel), with a
 * coin ping for each.
 */
function FlyingTrophies() {
  useEffect(() => sfx.coins(FLYERS.length), [])
  return FLYERS.map((f, i) => (
    <span
      key={i}
      className="pp-fly pointer-events-none absolute left-1/2 top-[48%]"
      style={{ '--sx': u(f.sx), '--sy': u(f.sy), animationDelay: `${f.delay}s` }}
    >
      <Icon name="trophy" size={u(70)} />
    </span>
  ))
}

/**
 * Once the phone stops: "1,433 m" with the floor it smashed down to and "+60 Wins" under
 * it, and a big tilted NEW BEST! over them when it's your deepest drop yet (by how much).
 */
function RollResult({ result }) {
  const list = zones()
  const index = zoneIndexAt(result.distance)
  const floor = list[index]
  const next = nextWorld(list, index)
  const gained = result.prevBest > 0 ? result.distance - result.prevBest : 0
  return (
    <>
      <FlyingTrophies key={`fly-${result.id}`} />
      {/* Centred by the pp-result animation's own transform. */}
      <div key={result.id} className="pp-result pointer-events-none absolute left-1/2 top-[47%] flex flex-col items-center">
        <div style={{ fontSize: u(118), transform: 'rotate(-4deg)' }}>
          <StrokeText stroke={u(22)} gradient={GRADIENTS.gold}>
            {formatDistance(result.distance)}
          </StrokeText>
        </div>
        {floor && (
          <div style={{ fontSize: u(60), transform: 'rotate(-4deg)' }}>
            <StrokeText stroke={u(12)} gradient={themeGradient(floor.theme)}>
              {skyTheme(floor.theme).title}: {floor.name}
            </StrokeText>
          </div>
        )}
        <div className="flex items-center" style={{ gap: u(12), fontSize: u(84), transform: 'rotate(-4deg)' }}>
          <Icon name="trophy" size={u(110)} />
          <StrokeText stroke={u(16)} gradient={GRADIENTS.gold}>
            +{formatNumber(result.wins + result.prize)}
          </StrokeText>
        </div>
        {next && (
          <div className="flex items-baseline" style={{ gap: u(14), fontSize: u(44), transform: 'rotate(-4deg)', marginTop: u(4) }}>
            <StrokeText stroke={u(9)}>Next:</StrokeText>
            <StrokeText stroke={u(9)} gradient={themeGradient(next.theme)}>
              {next.title}
            </StrokeText>
            <StrokeText stroke={u(9)}>at {formatDistance(next.start)}</StrokeText>
          </div>
        )}
        {result.best && (
          <div className="flex flex-col items-center" style={{ marginTop: u(10) }}>
            <div style={{ fontSize: u(120), transform: 'rotate(-6deg)' }}>
              <StrokeText stroke={u(22)} gradient={GRADIENTS.rainbow}>
                NEW BEST!
              </StrokeText>
            </div>
            {gained > 0 && (
              <div style={{ fontSize: u(56) }}>
                <StrokeText stroke={u(11)} gradient={GRADIENTS.gold}>
                  {formatDistance(result.distance)} (+{formatDistance(gained)})
                </StrokeText>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/** How long a toast stays up. */
const TOAST_MS = 3500

/** A celebration banner across the middle: a new floor, an ad reward, a Gems purchase. */
function Toast() {
  const toast = useGame((s) => s.toast)
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => {
      if (useGame.getState().toast === toast) useGame.setState({ toast: null })
    }, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])
  if (!toast) return null
  return (
    <div
      key={toast.id}
      className="pp-result pointer-events-none absolute left-1/2 top-[22%] flex flex-col items-center text-center"
      style={{ fontSize: u(60), animationDuration: `${TOAST_MS}ms`, width: 'max-content', maxWidth: '92vw' }}
    >
      <StrokeText stroke={u(12)} gradient={GRADIENTS.gold} style={{ whiteSpace: 'normal' }}>
        {toast.text}
      </StrokeText>
    </div>
  )
}

/**
 * Steering while the pancake climbs, on any screen: press and hold the left or right half
 * (a thumb on a phone, the mouse on a PC) - or A/D and the arrows (skyGame.js). The hint
 * along the bottom says so; on touch screens two big chevrons show where to press.
 */
function SteerPads() {
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const press = (dir) => (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setTouchSteer(dir)
  }
  const release = () => setTouchSteer(0)
  useEffect(() => () => setTouchSteer(0), [])
  const pad = (dir) => (
    <div
      className="absolute bottom-0 top-[14%] flex touch-none select-none items-center"
      style={{ [dir < 0 ? 'left' : 'right']: 0, width: '50%', justifyContent: dir < 0 ? 'flex-start' : 'flex-end' }}
      onPointerDown={press(dir)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {touch && (
        <span className="pp-text" style={{ fontSize: u(140), opacity: 0.45, margin: `0 ${u(40)}` }}>
          <StrokeText stroke={u(14)}>{dir < 0 ? '‹' : '›'}</StrokeText>
        </span>
      )}
    </div>
  )
  return (
    <>
      {pad(-1)}
      {pad(1)}
      <div className="pp-steer-hint pointer-events-none absolute left-1/2 -translate-x-1/2 text-center" style={{ bottom: u(90), fontSize: u(44), width: 'max-content', maxWidth: '94vw' }}>
        <StrokeText stroke={u(10)}>{touch ? 'Hold left or right: catch the bubbles, dodge the grumpy clouds!' : 'A D / ← →: catch the bubbles, dodge the grumpy clouds!'}</StrokeText>
      </div>
    </>
  )
}

export function RollOverlay() {
  // The height counter is for the climb; the result takes over at the top.
  const rolling = useGame((s) => Boolean(s.roll && !s.rollResult))
  const result = useGame((s) => s.rollResult)
  return (
    <>
      {rolling && <SteerPads />}
      {rolling && <DistanceCounter />}
      {result && <RollResult result={result} />}
      <Toast />
    </>
  )
}

export default RollOverlay
