/**
 * Player intents. The UI never changes game state itself: it calls one of these, the
 * authority (the Colyseus room, or the offline stand-in) validates it, and the result
 * comes back as an updated profile or an event.
 */

let transport = null

/** Installs the active connection: `{ send(type, payload) }`. */
export function setTransport(next) {
  transport = next
}

export function send(type, payload) {
  if (!transport) return
  transport.send(type, payload)
}

export const actions = {
  /**
   * Launches you; only counts on the LAUNCH PAD (the LET GO! button sends it).
   * `accuracy` (0-1) is the stretch meter when you let go; leave it out for Auto Launch.
   */
  roll: (accuracy) => send('roll', Number.isFinite(accuracy) ? { accuracy } : undefined),
  enterPad: (pad) => send('enterPad', { pad }),
  leavePad: () => send('leavePad'),
  /** One flip of your pancake: Strength (game/toss.js). */
  toss: () => send('toss'),
  /** Strength bubble `index` caught on your launch (game/roll/skyGame.js). */
  bubble: (index) => send('bubble', { index }),
  rebirth: () => send('rebirth'),
  skipRebirth: () => send('skipRebirth'),
  buyTire: (id) => send('buyTire', { id }),
  equipTire: (id) => send('equipTire', { id }),
  /** Buys Health pack `index` (0-2) from the bar under the level. */
  buyPack: (index) => send('buyPack', { index }),
  hatch: (eggId, count = 1) => send('hatch', { eggId, count }),
  openEggItem: (itemId) => send('openEggItem', { itemId }),
  equipPet: (uid) => send('equipPet', { uid }),
  unequipPet: (uid) => send('unequipPet', { uid }),
  equipBestPets: () => send('equipBest'),
  deletePet: (uid) => send('deletePet', { uid }),
  usePotion: (itemId) => send('usePotion', { itemId }),
  claimDaily: (day) => send('claimDaily', { day }),
  claimPlaytime: (index) => send('claimPlaytime', { index }),
  claimFreeReward: () => send('claimFreeReward'),
  /** Claims today's finished quest `index` (0-2), or the bonus chest once all three are. */
  claimQuest: (index) => send('claimQuest', { index }),
  claimQuestBonus: () => send('claimQuestBonus'),
  setSetting: (key, value) => send('setting', { key, value }),
  /** Through the portal to world `world` (an index into WORLDS); the server checks it's open. */
  portal: (world) => send('portal', Number.isInteger(world) ? { world } : undefined),
  /** Picks up Palm Beach's Secret Star (the authority checks you're at it). */
  findStar: () => send('findStar'),
  /** Buys a shop item with Wins; see shop.js. */
  purchase: (productId) => send('purchase', { productId }),
  /** A rewarded ad Boxity says was watched; the server verifies the token. */
  adReward: (placement, rewardToken) => send('adReward', { placement, rewardToken }),
  /** Asks the server to apply any Gems purchases Boxity has confirmed. */
  gemsCheck: () => send('gemsCheck'),
}
