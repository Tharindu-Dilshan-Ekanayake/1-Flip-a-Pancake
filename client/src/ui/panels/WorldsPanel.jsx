import { WORLDS } from '@shared/balance'
import { formatNumber } from '@shared/format'
import { worldNeed } from '@shared/logic'

import { actions } from '../../net/actions'
import { useGame } from '../../store/game'
import StrokeText from '../StrokeText'
import { ChunkyButton } from '../hud/parts'
import { GRADIENTS, u } from '../hud/style'
import Panel from './Panel'

/** Each world's card: its colours and a line about its look. */
const CARDS = [
  { blurb: 'A blocky candy castle', bg: 'linear-gradient(160deg, #fff1f8 0%, #ff9ec7 50%, #9ef0d0 100%)', title: 'linear-gradient(180deg, #ffffff 0%, #ffb8e0 50%, #ff5aa8 100%)' },
  { blurb: 'Sunny sands by the sea', bg: 'linear-gradient(160deg, #fff1c8 0%, #f2dca0 45%, #16b8c4 100%)', title: 'linear-gradient(180deg, #ffffff 0%, #8ff0ff 50%, #16b8c4 100%)' },
  { blurb: 'Snowy cliffs and ice', bg: 'linear-gradient(160deg, #ffffff 0%, #cfe8ff 50%, #5a8ad8 100%)', title: 'linear-gradient(180deg, #ffffff 0%, #bff4ff 50%, #3a8aff 100%)' },
  { blurb: 'Black rock and glowing lava', bg: 'linear-gradient(160deg, #ff9a3a 0%, #c8321a 45%, #2a0a0a 100%)', title: 'linear-gradient(180deg, #fff2a0 0%, #ff9a1f 50%, #e8321a 100%)' },
]

/**
 * The world portal: every world as a card - its name in its own colours, how much each
 * launch pays there, and either where you are, a button to travel, or what opening it
 * still needs (rebirths, and Trophies held - not spent). Worlds open in order; one opened
 * is free to visit for good. The server checks every move (session.portal).
 */
export function WorldsPanel() {
  const world = useGame((s) => s.profile.world)
  const opened = useGame((s) => s.profile.worldsUnlocked ?? (s.profile.world2Unlocked ? 1 : 0))
  const wins = useGame((s) => s.profile.wins)
  const rebirths = useGame((s) => s.profile.rebirths)
  const closePanel = useGame((s) => s.closePanel)

  const travel = (index) => {
    actions.portal(index)
    closePanel()
  }

  return (
    <Panel title="CHOOSE A WORLD" icon="portal" width={1240}>
      <div className="grid grid-cols-2" style={{ gap: u(18) }}>
        {WORLDS.map((w, i) => {
          const card = CARDS[i] ?? CARDS[0]
          const need = worldNeed(i)
          const here = i === world
          const isOpen = i <= opened
          const next = i === opened + 1
          const ready = next && need && rebirths >= need.rebirths && wins >= need.wins
          let status
          if (here) status = <StrokeText stroke={u(7)} gradient={GRADIENTS.gold}>You are here</StrokeText>
          else if (isOpen || ready) {
            status = (
              <ChunkyButton gradient={ready ? GRADIENTS.goldButton : GRADIENTS.greenButton} onClick={() => travel(i)} radius={14} border={5} style={{ height: u(78), padding: `0 ${u(30)}` }}>
                <span style={{ fontSize: u(40) }}>
                  <StrokeText stroke={u(8)}>{ready ? 'OPEN IT!' : 'TRAVEL'}</StrokeText>
                </span>
              </ChunkyButton>
            )
          } else if (!next) {
            status = <StrokeText stroke={u(6)}>Open {WORLDS[i - 1].name} first</StrokeText>
          } else {
            status = (
              <span className="flex flex-col items-center" style={{ gap: u(2) }}>
                <StrokeText stroke={u(6)} gradient={rebirths >= need.rebirths ? GRADIENTS.greenButton : GRADIENTS.priceShort}>
                  {need.rebirths} Rebirths ({rebirths})
                </StrokeText>
                <StrokeText stroke={u(6)} gradient={wins >= need.wins ? GRADIENTS.greenButton : GRADIENTS.priceShort}>
                  {formatNumber(need.wins)} Trophies ({formatNumber(wins)})
                </StrokeText>
              </span>
            )
          }
          return (
            <div
              key={w.id}
              className="relative flex flex-col items-center justify-between text-center"
              style={{
                background: card.bg,
                border: `${u(6)} solid ${here ? '#ffffff' : '#111'}`,
                borderRadius: u(22),
                padding: `${u(16)} ${u(14)}`,
                minHeight: u(300),
                boxShadow: here ? `0 0 ${u(24)} rgba(255,255,255,0.8)` : 'none',
                filter: !isOpen && !next ? 'saturate(0.45) brightness(0.8)' : 'none',
              }}
            >
              <span style={{ fontSize: u(28) }}>
                <StrokeText stroke={u(6)}>WORLD {i + 1}</StrokeText>
              </span>
              <span style={{ fontSize: u(w.name.length > 14 ? 50 : 62), lineHeight: 1.05 }}>
                <StrokeText stroke={u(12)} gradient={card.title}>
                  {w.name.toUpperCase()}
                </StrokeText>
              </span>
              <span style={{ fontSize: u(30) }}>
                <StrokeText stroke={u(6)}>{card.blurb}</StrokeText>
              </span>
              <span style={{ fontSize: u(40) }}>
                <StrokeText stroke={u(8)} gradient={GRADIENTS.gold}>
                  x{w.wins} TROPHIES
                </StrokeText>
              </span>
              <span style={{ fontSize: u(32), minHeight: u(80) }} className="flex items-center">
                {status}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export default WorldsPanel
