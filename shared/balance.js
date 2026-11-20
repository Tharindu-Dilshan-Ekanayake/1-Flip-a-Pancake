/**
 * Every tunable number in the game. Rules live in logic.js; this file is only data,
 * so balancing never means touching code. `scripts/balance-sim.mjs` plays the game
 * with these numbers and prints the pacing (time to each rebirth, arm and stage).
 *
 * Shared by client (display) and server (authority): both always agree on costs and
 * multipliers because they read the same table.
 *
 * The loop (Phone Plunge): practise throwing on the throw pads for SKILL -> walk to the DROP ZONE at the
 * cliff edge, charge the throw meter and fling your phone off the edge -> it falls through
 * the clouds onto the hotel far below, smashes its glass roof and then floor after floor
 * (more Skill smashes deeper, and every metre pays) -> Wins -> newer phones, eggs and
 * throw pads -> rebirth at max level for a bigger Skill multiplier and a higher cap ->
 * smash deeper still.
 *
 * Inside the code the template's names stay (so saves and the server never change):
 * `health` is SKILL, a `tire` is a PHONE, a `pad` is a throw pad, a `roll` is a drop and a
 * `zone` is one floor of the hotel. Only what players see was renamed. How each phone
 * looks is client/src/game/phoneStyles.js.
 */

// --- Health and levels --------------------------------------------------------------

/**
 * Skill comes from throwing your phone - a click, a tap, THROW, or standing on a throw
 * pad, which throws by itself every TRAIN_INTERVAL - and nothing else (not walking): one
 * throw, one gain, more on a throw pad (PADS mult). The server takes at most one throw
 * every TOSS_COOLDOWN seconds; the client's throw (game/practice.js TOSS_TIME) takes a
 * little longer, so honest clicking never hits the limit.
 */
export const TOSS_COOLDOWN = 0.35
/**
 * Seconds between the throws a throw pad makes by itself while you stand on it; also the
 * pace of the Skill earned while you were away (logic.applyOfflineProgress).
 */
export const TRAIN_INTERVAL = 0.6

/**
 * Your level comes from your Health: reaching level L takes healthForLevel(L) Health.
 * Each level needs LEVEL_GROWTH_EARLY times the last at first, easing towards
 * LEVEL_GROWTH_LATE: early rebirths multiply your gains many times over (a new bar,
 * x2 from the rebirth itself, the next phone), later ones much less, and the levels
 * keep step so every rebirth takes a little longer than the one before.
 */
export const LEVEL_BASE = 20
export const LEVEL_GROWTH_EARLY = 1.3
export const LEVEL_GROWTH_LATE = 1.097
export const LEVEL_GROWTH_FADE = 100
/** Levels past this are not reachable: the table stops here. */
export const MAX_LEVEL = 1200

const LEVEL_TABLE = (() => {
  const table = new Float64Array(MAX_LEVEL + 1)
  let need = LEVEL_BASE
  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    table[level] = table[level - 1] + need
    const growth = LEVEL_GROWTH_LATE + (LEVEL_GROWTH_EARLY - LEVEL_GROWTH_LATE) * Math.exp(-level / LEVEL_GROWTH_FADE)
    need *= growth
  }
  return table
})()

/** Two significant figures: level thresholds read cleanly (2,300, not 2,317). */
const round2 = (n) => {
  if (n < 100) return Math.round(n)
  const step = 10 ** (Math.floor(Math.log10(n)) - 1)
  return Math.round(n / step) * step
}

export const healthForLevel = (level) => (level <= 1 ? 0 : round2(LEVEL_TABLE[Math.min(MAX_LEVEL, level)]))

// --- Rebirth ----------------------------------------------------------------------

/** Max level by rebirth count: R0 = 15, R1 = 23, then +8 per rebirth. */
export const levelCap = (rebirths) => Math.min(MAX_LEVEL, 15 + 8 * Math.max(0, rebirths))

/** Health multiplier from rebirths, as in the reference: R0 = x1, R1 = x2, R2 = x3 ... */
export const rebirthMultiplier = (rebirths) => 1 + Math.max(0, rebirths)

/**
 * From Rebirth 15, every 5th rebirth (15, 20, 25...) comes with a gift of eggs: late in
 * the game, when each rebirth takes longest, there's always one coming up. One more egg
 * every 10 rebirths, up to 6.
 */
export const REBIRTH_GIFT_FROM = 15
export const REBIRTH_GIFT_EVERY = 5
export function rebirthGift(rebirths) {
  if (rebirths < REBIRTH_GIFT_FROM || (rebirths - REBIRTH_GIFT_FROM) % REBIRTH_GIFT_EVERY !== 0) return null
  const amount = Math.min(6, 3 + Math.floor((rebirths - REBIRTH_GIFT_FROM) / 10))
  return { rebirths, item: 'eggVolcano', amount, label: `${amount} Toaster Eggs` }
}
/** The next rebirth after `rebirths` that brings a gift, and the gift. */
export function nextRebirthGift(rebirths) {
  const from = Math.max(REBIRTH_GIFT_FROM, rebirths + 1)
  const at = from + ((REBIRTH_GIFT_EVERY - ((from - REBIRTH_GIFT_FROM) % REBIRTH_GIFT_EVERY)) % REBIRTH_GIFT_EVERY)
  return rebirthGift(at)
}

/** Skipping straight to a rebirth costs this many max-level drops' worth of Wins. */
export const REBIRTH_SKIP_ROLLS = 10

// --- Training pads (throw pads) --------------------------------------------------

/**
 * Throw pads, south to north in world.js order. Standing on one you practise throwing
 * your phone down its lane at a target: a throw (a rep, and a Skill gain) every
 * TRAIN_INTERVAL. `rebirths` = rebirths needed; `product` = the SHOP
 * pass that unlocks it instead; `world` = the only world it works in (the beach
 * pads at the north end of the row work in Palm Beach only, and stand locked in
 * World 1 as a teaser).
 */
export const PADS = [
  { id: 'starter', name: '1 KG Flip Mat', mult: 1, rebirths: 0 },
  { id: 'speed', name: '2 KG Flip Mat', mult: 2, rebirths: 1 },
  { id: 'turbo', name: '4 KG Flip Mat', mult: 4, rebirths: 2 },
  { id: 'nitro', name: '10 KG Flip Mat', mult: 10, rebirths: 4 },
  { id: 'rocket', name: '20 KG Flip Mat', mult: 20, rebirths: 6 },
  { id: 'diamond', name: '40 KG Crystal Mat', mult: 40, product: 'padVeryOp', tag: 'VERY OP!' },
  { id: 'galaxy', name: '100 KG Galaxy Mat', mult: 100, product: 'padBest', tag: 'BEST OVERALL!' },
  // Kept close to the Galaxy Throw Pad: every Skill multiplier here speeds up the whole
  // late game (scripts/balance-sim.mjs) - the beach pads are milestones, not a jump.
  { id: 'surf', name: '115 KG Surf Mat', mult: 115, rebirths: 10, world: 1 },
  { id: 'tsunami', name: '130 KG Tsunami Mat', mult: 130, rebirths: 16, world: 1 },
]

// --- Phones (the template's tires) -------------------------------------------------

/**
 * The phone you drop. `power` is the Skill every single gain is worth before multipliers
 * (the "+1" of the Button Phone); `cost` is in Wins; `rarity` (RARITIES) is shown on its
 * stand. Bought in order at the phone shop, they run through the history of the mobile
 * phone: an old button phone, a flip phone, a slider and a keyboard phone, the first
 * touch phones with their home buttons, then the notch, then the island - all the way up
 * to the 18 Pro Max. (No brand names: a published game must not use a real company's
 * trademarks.) About x2.6 power for x2.8-x3.3 the Wins each. The ids are the template's
 * (saves and the server key on them). How each one looks: client/src/game/phoneStyles.js.
 */
export const TIRES = [
  { id: 'bicycle', name: 'Cast Iron Strengthet', power: 1, cost: 0, rarity: 'common' },
  // Cheap enough to buy with the Wins from your very first drop.
  { id: 'mountain', name: 'Copper Pan', power: 3, cost: 1, rarity: 'common' },
  { id: 'wood', name: 'Strawberry Pan', power: 5, cost: 15, rarity: 'common' },
  { id: 'stone', name: 'Blueberry Pan', power: 12, cost: 75, rarity: 'uncommon' },
  { id: 'cookie', name: 'Mint Pan', power: 30, cost: 300, rarity: 'uncommon' },
  { id: 'pizza', name: 'Banana Pan', power: 75, cost: 1200, rarity: 'rare' },
  { id: 'donut', name: 'Chocolate Pan', power: 200, cost: 4500, rarity: 'rare' },
  { id: 'watermelon', name: 'Lemon Pan', power: 500, cost: 16000, rarity: 'rare' },
  { id: 'monster', name: 'Matcha Pan', power: 1250, cost: 55000, rarity: 'epic' },
  { id: 'mint', name: 'Caramel Pan', power: 3500, cost: 180000, rarity: 'epic' },
  { id: 'silver', name: 'Bubblegum Pan', power: 9000, cost: 600000, rarity: 'epic' },
  { id: 'ice', name: 'Honey Pan', power: 23000, cost: 2e6, rarity: 'epic' },
  { id: 'gold', name: 'Lava Pan', power: 60000, cost: 6e6, rarity: 'legendary' },
  { id: 'lava', name: 'Frost Pan', power: 155000, cost: 17e6, rarity: 'legendary' },
  { id: 'platinum', name: 'Emerald Pan', power: 400000, cost: 48e6, rarity: 'legendary' },
  { id: 'emerald', name: 'Ruby Pan', power: 1.05e6, cost: 135e6, rarity: 'legendary' },
  { id: 'ruby', name: 'Sapphire Pan', power: 2.7e6, cost: 380e6, rarity: 'mythic' },
  { id: 'diamond', name: 'Diamond Pan', power: 7e6, cost: 1.05e9, rarity: 'mythic' },
  { id: 'rainbow', name: 'Rainbow Pan', power: 1.8e7, cost: 3e9, rarity: 'mythic' },
  { id: 'unicorn', name: 'Unicorn Pan', power: 4.8e7, cost: 8.5e9, rarity: 'mythic' },
  { id: 'galaxy', name: 'Galaxy Pan', power: 1.25e8, cost: 2.4e10, rarity: 'secret' },
  { id: 'dragon', name: 'Dragon Pan', power: 3.3e8, cost: 6.8e10, rarity: 'secret' },
  { id: 'cosmic', name: 'Cosmic Pan', power: 8.6e8, cost: 1.9e11, rarity: 'secret' },
  { id: 'infinity', name: 'Infinity Pan', power: 2.2e9, cost: 5.4e11, rarity: 'secret' },
]

// --- Dropping (the template's rolls) -----------------------------------------------

/**
 * Depths are metres below the edge you throw from. The hotel's glass roof is DROP_ROOF
 * metres down: every drop falls that far through the clouds first, smashes the glass and
 * lands somewhere inside. Floor `i` of the hotel (FLOORS / ZONES) starts at `start`
 * metres; the glass roof is the top of floor 0.
 */
export const DROP_ROOF = 300

/**
 * How deep a drop goes (in metres): 0 Skill still smashes ROLL_BASE metres (through the
 * roof into the first floor), and each floor is reached with the Skill in its `wall`,
 * less WALL_MARGIN; in between, depth follows Skill (in log terms) from one floor's top
 * to the next. So the floors' `wall` Skill sets the pace. See logic.rollReach.
 */
export const ROLL_BASE = DROP_ROOF + 60
export const ROLL_H0 = 50
/** A floor's `wall` is this many times the Skill that just reaches its top. */
export const WALL_MARGIN = 1.3

/**
 * The sky's worlds, bottom to top: every layer belongs to one (its `theme`), and each world
 * fills the sky round the pancake with its own scenery (client/src/game/roll/skyThemes.js).
 */
export const ROOM_THEMES = ['forest', 'candy', 'clouds', 'diamond', 'honey', 'ice', 'space', 'galaxy', 'rainbow', 'dream', 'sun', 'infinity']

/**
 * The hotel's sixty floors, top to bottom: [id, name, room theme, top (metres below the
 * roof), wall, winsPerMeter, smash, discover]. Each floor is a stretch of depth a little
 * longer than the one above (100 m, 106 m, 112 m ... about 450 m). The first twenty are
 * the hotel proper, the next twenty its deluxe floors, the last twenty its secret
 * basement levels. `wall` = the Skill that paces how deep a drop smashes (see
 * ROLL_BASE); each about twice the last. `winsPerMeter` pays for every metre smashed
 * through on the floor - the deeper, the more each metre pays - and `discover` is a
 * one-off prize the first time you ever reach the floor. `smash` is left over from the
 * template and no longer paid. Numbers from scripts/gen-stages.py.
 */
const FLOOR_TABLE = [
  ['griddle-rooftop', 'Griddle Rooftop', 'forest', 0, 0, 0.006, 0, 0],
  ['treetop-canopy', 'Treetop Canopy', 'forest', 100, 11, 0.0072, 2, 5],
  ['owl-hollow', 'Owl Hollow', 'forest', 200, 21, 0.00984, 3, 7],
  ['rope-bridge-village', 'Rope Bridge Village', 'forest', 306, 41, 0.0135, 4, 9],
  ['leafy-crown', 'Leafy Crown', 'forest', 418, 79, 0.0185, 5, 13],
  ['gumdrop-grove', 'Gumdrop Grove', 'candy', 536, 150, 0.0255, 7, 18],
  ['lollipop-lane', 'Lollipop Lane', 'candy', 660, 300, 0.0351, 10, 24],
  ['candy-cane-forest', 'Candy Cane Forest', 'candy', 790, 590, 0.0486, 13, 34],
  ['cotton-candy-isles', 'Cotton Candy Isles', 'candy', 926, 1200, 0.0673, 19, 47],
  ['marshmallow-peaks', 'Marshmallow Peaks', 'candy', 1068, 2300, 0.0934, 26, 65],
  ['butter-cloud-bay', 'Butter Cloud Bay', 'clouds', 1216, 4600, 0.13, 36, 90],
  ['rainbow-arch', 'Rainbow Arch', 'clouds', 1370, 9200, 0.181, 50, 130],
  ['sky-castle', 'Sky Castle', 'clouds', 1530, 18000, 0.253, 70, 180],
  ['balloon-bazaar', 'Balloon Bazaar', 'clouds', 1696, 37000, 0.355, 99, 250],
  ['cloud-nine', 'Cloud Nine', 'clouds', 1868, 75000, 0.498, 140, 350],
  ['crystal-caves', 'Crystal Caves', 'diamond', 2046, 150000, 0.7, 190, 490],
  ['diamond-spires', 'Diamond Spires', 'diamond', 2230, 310000, 0.987, 270, 690],
  ['sapphire-steps', 'Sapphire Steps', 'diamond', 2420, 640000, 1.39, 390, 970],
  ['ruby-ridge', 'Ruby Ridge', 'diamond', 2616, 1.3e6, 1.97, 550, 1400],
  ['emerald-arches', 'Emerald Arches', 'diamond', 2818, 2.7e6, 2.8, 780, 1900],
  ['amethyst-halo', 'Amethyst Halo', 'diamond', 3026, 5.7e6, 3.98, 1100, 2800],
  ['diamond-throne', 'Diamond Throne', 'diamond', 3240, 1.2e7, 5.66, 1600, 3900],
  ['honeycomb-heights', 'Honeycomb Heights', 'honey', 3460, 2.5e7, 8.08, 2200, 5600],
  ['syrup-falls', 'Syrup Falls', 'honey', 3686, 5.3e7, 11.6, 3200, 8000],
  ['golden-hour', 'Golden Hour', 'honey', 3918, 1.1e8, 16.6, 4600, 12000],
  ['maple-meadows', 'Maple Meadows', 'honey', 4156, 2.4e8, 23.8, 6600, 17000],
  ['butter-bridges', 'Butter Bridges', 'honey', 4400, 5.1e8, 34.2, 9500, 24000],
  ['caramel-canyon', 'Caramel Canyon', 'honey', 4650, 1.1e9, 49.3, 14000, 34000],
  ['golden-griddle', 'Golden Griddle', 'honey', 4906, 2.3e9, 71.3, 20000, 50000],
  ['frost-gate', 'Frost Gate', 'ice', 5168, 5e9, 103, 29000, 72000],
  ['snowflake-drift', 'Snowflake Drift', 'ice', 5436, 1.1e10, 150, 42000, 100000],
  ['ice-palace', 'Ice Palace', 'ice', 5710, 2.4e10, 218, 60000, 150000],
  ['glacier-peaks', 'Glacier Peaks', 'ice', 5990, 5.2e10, 317, 88000, 220000],
  ['frozen-waffles', 'Frozen Waffles', 'ice', 6276, 1.1e11, 462, 130000, 320000],
  ['aurora-ribbons', 'Aurora Ribbons', 'ice', 6568, 2.5e11, 676, 190000, 470000],
  ['polar-lights', 'Polar Lights', 'ice', 6866, 5.6e11, 990, 270000, 690000],
  ['crystal-blizzard', 'Crystal Blizzard', 'ice', 7170, 1.2e12, 1450, 400000, 1e6],
  ['satellite-belt', 'Satellite Belt', 'space', 7480, 2.8e12, 2140, 590000, 1.5e6],
  ['moon-diner', 'Moon Diner', 'space', 7796, 6.2e12, 3150, 870000, 2.2e6],
  ['crater-cafe', 'Crater Cafe', 'space', 8118, 1.4e13, 4650, 1.3e6, 3.2e6],
  ['comet-trail', 'Comet Trail', 'space', 8446, 3.2e13, 6870, 1.9e6, 4.8e6],
  ['asteroid-pantry', 'Asteroid Pantry', 'space', 8780, 7.2e13, 10200, 2.8e6, 7.1e6],
  ['ring-planet', 'Ring Planet', 'space', 9120, 1.6e14, 15100, 4.2e6, 1e7],
  ['space-station-snacks', 'Space Station Snacks', 'space', 9466, 3.7e14, 22500, 6.2e6, 1.6e7],
  ['rocket-brunch', 'Rocket Brunch', 'space', 9818, 8.6e14, 33500, 9.3e6, 2.3e7],
  ['meteor-muffins', 'Meteor Muffins', 'space', 10176, 2e15, 50000, 1.4e7, 3.5e7],
  ['orbit-omelette', 'Orbit Omelette', 'space', 10540, 4.6e15, 74800, 2.1e7, 5.2e7],
  ['solar-flare-skillet', 'Solar Flare Skillet', 'space', 10910, 1.1e16, 112000, 3.1e7, 7.8e7],
  ['nebula-kitchen', 'Nebula Kitchen', 'galaxy', 11286, 2.5e16, 168000, 4.7e7, 1.2e8],
  ['galaxy-griddle', 'Galaxy Griddle', 'galaxy', 11668, 5.8e16, 253000, 7e7, 1.8e8],
  ['starlight-stack', 'Starlight Stack', 'galaxy', 12056, 1.4e17, 382000, 1.1e8, 2.7e8],
  ['pulsar-pancakes', 'Pulsar Pancakes', 'galaxy', 12450, 3.2e17, 576000, 1.6e8, 4e8],
  ['quasar-crepes', 'Quasar Crepes', 'galaxy', 12850, 7.6e17, 872000, 2.4e8, 6.1e8],
  ['supernova-syrup', 'Supernova Syrup', 'galaxy', 13256, 1.8e18, 1300000, 3.7e8, 9.2e8],
  ['wormhole-waffles', 'Wormhole Waffles', 'galaxy', 13668, 4.3e18, 2000000, 5.6e8, 1.4e9],
  ['black-hole-bakery', 'Black Hole Bakery', 'galaxy', 14086, 1e19, 3000000, 8.5e8, 2.1e9],
  ['event-horizon-eatery', 'Event Horizon Eatery', 'galaxy', 14510, 2.5e19, 4700000, 1.3e9, 3.2e9],
  ['multiverse-maple', 'Multiverse Maple', 'galaxy', 14940, 6e19, 7100000, 2e9, 4.9e9],
  ['cosmic-core', 'Cosmic Core', 'galaxy', 15376, 1.5e20, 11000000, 3e9, 7.5e9],
  ['the-final-flapjack', 'The Final Flapjack', 'galaxy', 15818, 3.5e20, 17000000, 4.6e9, 1.2e10],
]

/**
 * Forty more layers above the Final Flapjack, in four more worlds of the sky: Rainbow
 * World, Dreamland, Sun World and Infinity - for the long game. Their numbers carry on the
 * table's pattern: each layer a little taller than the last (12 m more each time), its
 * wall about 2.2 times the one below, every metre paying about 1.5 times as much.
 */
const MORE_LAYERS = [
  ['rainbow', ['Rainbow Gate', 'Prism Falls', 'Spectrum Bridge', 'Color Cascade', 'Rainbow Ribbons', 'Glitter Garden', 'Sparkle Springs', 'Kaleidoscope Keep', 'Prism Palace', 'Rainbow Crown']],
  ['dream', ['Dreamland Door', 'Pillow Peaks', 'Lullaby Lagoon', 'Sleepy Stars', 'Marshmallow Moon', 'Wishing Well', 'Fairy Floss Fields', 'Unicorn Meadow', 'Dream Castle', 'Sweet Dreams Summit']],
  ['sun', ['Sunrise Steps', 'Golden Rays', 'Solar Gardens', 'Blazing Bridge', 'Phoenix Nest', 'Sunflower Sky', 'Radiant Ridge', 'Corona Cove', 'Sun Temple', 'Heart of the Sun']],
  ['infinity', ['Infinity Gate', 'Starlight Throne', 'Celestial Halls', 'Eternity Express', 'Diamond Dimension', 'Cosmic Crown', 'Angel Clouds', 'Heavenly Griddle', 'Universe Edge', 'The Endless Stack']],
]
/** Two significant figures, so the numbers read cleanly. */
const sig2 = (n) => {
  if (n < 100) return Math.round(n * 10) / 10
  const step = 10 ** (Math.floor(Math.log10(n)) - 1)
  return Math.round(n / step) * step
}
for (const [theme, names] of MORE_LAYERS) {
  for (const name of names) {
    const last = FLOOR_TABLE[FLOOR_TABLE.length - 1]
    const before = FLOOR_TABLE[FLOOR_TABLE.length - 2]
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    FLOOR_TABLE.push([id, name, theme, last[3] + (last[3] - before[3]) + 12, sig2(last[4] * 2.2), sig2(last[5] * 1.5), sig2(last[6] * 1.45), sig2(last[7] * 1.5)])
  }
}

export const ZONES = FLOOR_TABLE.map(([id, name, theme, start, wall, winsPerMeter, smash, discover]) => ({
  id,
  name,
  theme,
  start: DROP_ROOF + start,
  wall,
  winsPerMeter,
  smash,
  discover,
}))
/** The same table by its game name. */
export const FLOORS = ZONES

/** Wins pickups down the hotel: the first 40 m under the roof, then every 80 m. */
export const TROPHY_FIRST = DROP_ROOF + 40
export const TROPHY_SPACING = 80
/** A trophy is worth this many metres of its zone's Wins (at least 1). */
export const TROPHY_METERS = 80

/**
 * Seconds from letting go of the DROP button to the phone leaving your hand: the throw's
 * swing. (The charge before it is yours: you hold for as long as you like, and the server
 * only hears about the release.)
 */
export const ROLL_LAUNCH = 0.34
/** Seconds the phone falls through the sky, from your hand to the hotel's glass roof. */
export const DROP_AIR = 2.4
/** Seconds the phone takes to bounce and settle once it stops on a floor. */
export const DROP_SETTLE = 0.9
/** Seconds smashing down through the hotel for a drop `below` metres under the roof. */
export const towerDuration = (below) => 0.8 + 1.7 * Math.log(1 + Math.max(0, below) / 60)
/**
 * Seconds a drop to depth `distance` takes: the throw, the fall to the roof, smashing
 * down floor by floor and settling. Logarithmic: deep drops stay short.
 */
export const rollDuration = (distance) => ROLL_LAUNCH + DROP_AIR + towerDuration(distance - DROP_ROOF) + DROP_SETTLE
/** The result popup after the phone stops, before you're back at the drop zone. */
export const ROLL_RECOVERY = 2.2

/**
 * The throw meter. Stand in the DROP ZONE and hold DROP (or E): the meter charges up, and
 * once full it wobbles: it bounces off the top and back, again and again (TWANG_PERIOD a
 * bounce, dipping TWANG_DEPTH). Let go to throw. `accuracy` is how full the meter was when
 * you let go: 1 at the very top of a bounce. The grade it lands in decides the drop, each
 * grade clearly apart from the next: how deep it smashes (`reach`, a share of the depth
 * under the roof your Skill alone would reach - half for a WEAK throw, half as deep again
 * for a PERFECT one) and how many Wins it pays (`bonus`). Auto Drop skips the meter: a
 * plain x1 drop, between GOOD and GREAT.
 *
 * Wins are the Skill's worth times `bonus` - not paid by the metres the grade adds: late
 * in the game each floor pays ~1.4 times the last, so paying for half as deep again would
 * multiply a PERFECT drop's Wins dozens of times over (logic.applyRoll).
 */
/** Seconds the throw meter takes to charge from empty to full. */
export const CHARGE_TIME = 0.9
/**
 * Seconds per wobble at full charge, and how far down the meter each one dips. The
 * bounce is sharp at the top (|sin|), so the PERFECT moment is ~0.1 s each time: a real
 * test of timing, still fair on a phone, and a throw let go at full charge is never
 * worse than GOOD.
 */
export const TWANG_PERIOD = 0.75
export const TWANG_DEPTH = 0.5
/** The meter (0-1) `seconds` after reaching full charge: bouncing off the top. */
export const twangAt = (seconds) => 1 - TWANG_DEPTH * Math.abs(Math.sin((Math.PI * Math.max(0, seconds)) / TWANG_PERIOD))
/**
 * Grades by `min` accuracy: PERFECT is the top 12% of the meter, GREAT 30%, GOOD 60%.
 * `reach` is [at the grade's outer edge, at its inner edge]: a little further the nearer
 * the top within a grade, and a big step up to the next.
 */
export const HIT_GRADES = [
  { id: 'perfect', min: 0.88, reach: [1.4, 1.5], bonus: 1.6, label: 'PERFECT LAUNCH!' },
  { id: 'great', min: 0.7, reach: [1.1, 1.2], bonus: 1.25, label: 'GREAT LAUNCH!' },
  { id: 'good', min: 0.4, reach: [0.8, 0.9], bonus: 1, label: 'GOOD LAUNCH' },
  { id: 'weak', min: 0, reach: [0.5, 0.6], bonus: 0.75, label: 'WEAK LAUNCH...' },
]
const clampAccuracy = (accuracy) => Math.min(1, Math.max(0, accuracy))
/** The grade for a meter `accuracy` (0-1), or null for a drop without the meter. */
export const hitGrade = (accuracy) => (Number.isFinite(accuracy) ? HIT_GRADES.find((g) => clampAccuracy(accuracy) >= g.min) : null)
/**
 * How deep a throw at meter `accuracy` smashes, as a share of the depth under the roof
 * your Skill alone would reach: 0.5 barely charged, 1.5 at the top of a wobble, in a
 * clear step per grade; 1 for a drop without the meter.
 */
export function hitReach(accuracy) {
  const grade = hitGrade(accuracy)
  if (!grade) return 1
  const index = HIT_GRADES.indexOf(grade)
  const top = index > 0 ? HIT_GRADES[index - 1].min : 1
  const t = Math.min(1, (clampAccuracy(accuracy) - grade.min) / (top - grade.min))
  return grade.reach[0] + (grade.reach[1] - grade.reach[0]) * t
}

// --- Sky bubbles & grumpy clouds (the flight mini-game) ----------------------------

/**
 * While your pancake climbs you steer it left and right (A/D, arrows, or touch): strength
 * bubbles float down the sky towards it and grumpy clouds drift across. A bubble caught
 * is BUBBLE_FLIPS flips' worth of Strength (your pan's own gain, multiplied as usual);
 * a cloud hit knocks the pancake spinning for a moment so you miss what's next.
 * Bubbles come one every BUBBLE_EVERY seconds of the climb, from BUBBLE_FROM seconds
 * after it leaves the pan to BUBBLE_TAIL seconds before the top. The authority accepts
 * at most bubbleCount(duration) per launch, each bubble index once.
 */
export const BUBBLE_EVERY = 0.5
export const BUBBLE_FROM = 0.9
export const BUBBLE_TAIL = 0.5
export const BUBBLE_FLIPS = 2
/** Bubbles in a launch lasting `duration` seconds (rollDuration). */
export const bubbleCount = (duration) =>
  Math.max(3, Math.floor((duration - ROLL_LAUNCH - DROP_SETTLE - BUBBLE_FROM - BUBBLE_TAIL) / BUBBLE_EVERY) + 1)
/** Seconds into a launch that bubble `index` reaches the pancake's height. */
export const bubbleTime = (index) => ROLL_LAUNCH + BUBBLE_FROM + index * BUBBLE_EVERY

// --- Pets & eggs ------------------------------------------------------------------

export const RARITIES = {
  common: { name: 'Common', color: '#b9c3cf', order: 0 },
  uncommon: { name: 'Uncommon', color: '#4ade80', order: 1 },
  rare: { name: 'Rare', color: '#38bdf8', order: 2 },
  epic: { name: 'Epic', color: '#b15cff', order: 3 },
  legendary: { name: 'Legendary', color: '#ffc41f', order: 4 },
  mythic: { name: 'Mythic', color: '#ff3b6b', order: 5 },
  secret: { name: 'Secret', color: '#ff5bd8', order: 6 },
}

/** `mult` multiplies Skill gains. Equipped pets stack additively (see logic.js). */
export const PETS = {
  cat: { name: 'Cat', rarity: 'common', mult: 1.1 },
  dog: { name: 'Dog', rarity: 'common', mult: 1.15 },
  bunny: { name: 'Bunny', rarity: 'uncommon', mult: 1.25 },
  bear: { name: 'Bear', rarity: 'rare', mult: 1.5 },
  cow: { name: 'Cow', rarity: 'uncommon', mult: 1.4 },
  parrot: { name: 'Parrot', rarity: 'rare', mult: 1.7 },
  fox: { name: 'Fox', rarity: 'epic', mult: 2.2 },
  tiger: { name: 'Tiger', rarity: 'legendary', mult: 3 },
  flamingo: { name: 'Flamingo', rarity: 'uncommon', mult: 2.5 },
  turtle: { name: 'Turtle', rarity: 'rare', mult: 3.2 },
  owl: { name: 'Owl', rarity: 'epic', mult: 4.5 },
  phoenix: { name: 'Phoenix', rarity: 'legendary', mult: 7 },
  pony: { name: 'Pony', rarity: 'rare', mult: 5 },
  unicorn: { name: 'Unicorn', rarity: 'epic', mult: 8 },
  pegasus: { name: 'Pegasus', rarity: 'legendary', mult: 13 },
  salamander: { name: 'Salamander', rarity: 'rare', mult: 10 },
  firebird: { name: 'Fire Bird', rarity: 'epic', mult: 16 },
  golem: { name: 'Magma Golem', rarity: 'legendary', mult: 26 },
  inferno: { name: 'Inferno Wolf', rarity: 'mythic', mult: 45 },
  dragon: { name: 'Dragon', rarity: 'epic', mult: 2.5 },
  crab: { name: 'Lucky Crab', rarity: 'uncommon', mult: 1.2 },
  sphinx: { name: 'Sphinx', rarity: 'secret', mult: 80 },
  // Palm Beach's Beach Egg: the Kraken is the best pet in the game, but only just - the
  // best three pets set the late game's pace (scripts/balance-sim.mjs).
  seagull: { name: 'Seagull', rarity: 'rare', mult: 16 },
  dolphin: { name: 'Dolphin', rarity: 'epic', mult: 22 },
  shark: { name: 'Shark', rarity: 'legendary', mult: 32 },
  kraken: { name: 'Kraken', rarity: 'mythic', mult: 55 },
  // Frosty Peaks' Frost Egg, and Lava Kitchen's Magma Egg: each world's best pets.
  penguin: { name: 'Penguin', rarity: 'rare', mult: 40 },
  snowfox: { name: 'Snow Fox', rarity: 'epic', mult: 58 },
  polarbear: { name: 'Polar Bear', rarity: 'legendary', mult: 82 },
  yeti: { name: 'Yeti', rarity: 'mythic', mult: 125 },
  emberpup: { name: 'Ember Pup', rarity: 'rare', mult: 95 },
  lavaturtle: { name: 'Lava Turtle', rarity: 'epic', mult: 135 },
  magmadrake: { name: 'Magma Drake', rarity: 'legendary', mult: 190 },
  magmaking: { name: 'Magma King', rarity: 'mythic', mult: 280 },
}

/**
 * Eggs, bought with Wins. `world` = the only world it hatches in (the Beach Egg: Palm
 * Beach). `pets` are [petId, weight] - weights are percentages and
 * sum to 100. Each egg is priced at about the Wins of a few drops at the stage of the
 * game whose pets it beats.
 */
export const EGGS = {
  basic: { name: 'Basic', cost: { wins: 15 }, pets: [['cat', 45], ['dog', 30], ['bunny', 20], ['bear', 5]] },
  meadow: { name: 'Berry', cost: { wins: 120 }, pets: [['cow', 45], ['parrot', 30], ['fox', 20], ['tiger', 5]] },
  sunset: { name: 'Syrup', cost: { wins: 750 }, pets: [['flamingo', 45], ['turtle', 30], ['owl', 20], ['phoenix', 5]] },
  unicorn: { name: 'Sprinkle', cost: { wins: 6000 }, pets: [['pony', 50], ['unicorn', 35], ['pegasus', 15]] },
  volcano: { name: 'Toaster', cost: { wins: 35000 }, pets: [['salamander', 50], ['firebird', 30], ['golem', 15], ['inferno', 5]] },
  beach: { name: 'Coconut', cost: { wins: 2000000 }, world: 1, pets: [['seagull', 45], ['dolphin', 30], ['shark', 20], ['kraken', 5]] },
  frost: { name: 'Frost', cost: { wins: 500000000 }, world: 2, pets: [['penguin', 45], ['snowfox', 30], ['polarbear', 20], ['yeti', 5]] },
  magma: { name: 'Magma', cost: { wins: 100000000000 }, world: 3, pets: [['emberpup', 45], ['lavaturtle', 30], ['magmadrake', 20], ['magmaking', 5]] },
}

export const MAX_EQUIPPED_PETS = 3
export const MAX_PET_INVENTORY = 60
/** Multi-hatch opens this many at once, for that many times the cost. */
export const MULTI_HATCH = 3

// --- Items, boosts, rewards -------------------------------------------------------

export const POTION_DURATION_MS = 5 * 60 * 1000

export const ITEMS = {
  potionHealth: { name: 'x2 Strength Potion', kind: 'potion', boost: 'health', durationMs: POTION_DURATION_MS },
  potionWins: { name: 'x2 Trophies Potion', kind: 'potion', boost: 'wins', durationMs: POTION_DURATION_MS },
  eggMeadow: { name: 'Berry Egg', kind: 'egg', egg: 'meadow' },
  eggSunset: { name: 'Syrup Egg', kind: 'egg', egg: 'sunset' },
  eggUnicorn: { name: 'Sprinkle Egg', kind: 'egg', egg: 'unicorn' },
  eggVolcano: { name: 'Toaster Egg', kind: 'egg', egg: 'volcano' },
}

/** 7-day cycle; day N unlocks N x 24h after the cycle started. */
export const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000
export const DAILY_REWARDS = [
  { label: 'x2 Trophies', icon: 'potionWins', sub: '5m', grant: { item: 'potionWins' } },
  { label: 'Dragon', icon: 'pet:dragon', sub: 'x1', grant: { pet: 'dragon' } },
  { label: 'x2 Strength', icon: 'potionHealth', sub: '5m', grant: { item: 'potionHealth' } },
  { label: 'Sprinkle Egg', icon: 'egg:unicorn', sub: 'x1', grant: { item: 'eggUnicorn' } },
  { label: 'x2 Strength', icon: 'potionHealth', sub: '5m', grant: { item: 'potionHealth' } },
  { label: 'x2 Trophies', icon: 'potionWins', sub: '5m', grant: { item: 'potionWins' } },
  { label: 'Toaster Egg', icon: 'egg:volcano', sub: 'x1', grant: { item: 'eggVolcano' } },
]

/**
 * Claimable once each per session, after this many minutes played: something to look
 * forward to every few minutes for the first hour.
 */
export const PLAYTIME_REWARDS = [
  { minutes: 3, label: '+10 Trophies', icon: 'trophy', grant: { wins: 10 } },
  { minutes: 8, label: 'x2 Strength', icon: 'potionHealth', grant: { item: 'potionHealth' } },
  { minutes: 15, label: 'Berry Egg', icon: 'egg:meadow', grant: { item: 'eggMeadow' } },
  { minutes: 25, label: 'x2 Trophies', icon: 'potionWins', grant: { item: 'potionWins' } },
  { minutes: 35, label: '+250 Trophies', icon: 'trophy', grant: { wins: 250 } },
  { minutes: 45, label: 'Syrup Egg', icon: 'egg:sunset', grant: { item: 'eggSunset' } },
  { minutes: 60, label: 'x2 Strength', icon: 'potionHealth', grant: { item: 'potionHealth' } },
  { minutes: 90, label: 'Sprinkle Egg', icon: 'egg:unicorn', grant: { item: 'eggUnicorn' } },
]

/** The stand by spawn: a pet the first time, a potion on later sessions. */
export const FREE_REWARD = { firstTime: { pet: 'crab' }, repeat: { item: 'potionHealth' } }

/** Offline training: a quarter of your pad's rate, for up to 8 hours away. */
export const OFFLINE_RATE = 0.25
export const OFFLINE_MAX_MS = 8 * 60 * 60 * 1000
export const OFFLINE_MIN_MS = 60 * 1000

/**
 * The world portal (placed by PORTALS in world.js): its name, and what opens it the
 * first time - this many rebirths AND this many Wins held (not spent). After that it's
 * open for good, both ways. Stepping through earns the badge of the same id.
 */
export const WORLD_PORTALS = {
  world2: { name: 'Tropic Skies', wins: 1000000, rebirths: 8 },
  world3: { name: 'Frosty Peaks', wins: 250000000, rebirths: 18 },
  world4: { name: 'Lava Kitchen', wins: 40000000000, rebirths: 30 },
}

/**
 * Palm Beach's Secret Star, hidden somewhere in its lobby (STAR in world.js): finding it
 * doubles every Skill gain for good, in every world.
 */
export const SECRET_STAR = { world: 1, power: 2 }

// --- Worlds -----------------------------------------------------------------------

/**
 * Palm Beach (World 2), through the portal once you've rebirthed 8 times and hold 1M
 * Wins: a sunny cliff over the sea. Its own Beach Egg, two beach throw pads and a Secret
 * Star, and its own tower to drop on - the Beach Resort, one floor for each of the
 * hotel's - where every metre, trophy and first-visit prize pays `wins` times as much.
 * Its floors need the same Skill as World 1's - a harder World 2 would pay less than
 * World 1 right after each rebirth - so going over is always worth it, and coming back
 * (the same portal) costs nothing.
 */
export const WORLDS = [
  { id: 'world1', name: 'Candy Palace', wins: 1 },
  { id: 'world2', name: 'Tropic Skies', wins: 3 },
  { id: 'world3', name: 'Frosty Peaks', wins: 9 },
  { id: 'world4', name: 'Lava Kitchen', wins: 27 },
]

/** The Beach Resort's floors in Tropic Skies: [id, name, room theme], one for each of World 1's. */
const WORLD2_STAGES = [
  ['w2-palm-canopy', 'Palm Canopy', 'forest'],
  ['w2-coconut-grove', 'Coconut Grove', 'forest'],
  ['w2-parrot-perch', 'Parrot Perch', 'forest'],
  ['w2-tiki-rope-bridge', 'Tiki Rope Bridge', 'forest'],
  ['w2-banana-leaf-crown', 'Banana Leaf Crown', 'forest'],
  ['w2-mango-gumdrops', 'Mango Gumdrops', 'candy'],
  ['w2-pineapple-lollipops', 'Pineapple Lollipops', 'candy'],
  ['w2-papaya-candy-canes', 'Papaya Candy Canes', 'candy'],
  ['w2-shaved-ice-isles', 'Shaved Ice Isles', 'candy'],
  ['w2-coconut-marshmallows', 'Coconut Marshmallows', 'candy'],
  ['w2-pina-colada-clouds', 'Pina Colada Clouds', 'clouds'],
  ['w2-tropic-rainbow', 'Tropic Rainbow', 'clouds'],
  ['w2-seashell-castle', 'Seashell Castle', 'clouds'],
  ['w2-beach-ball-bazaar', 'Beach Ball Bazaar', 'clouds'],
  ['w2-lagoon-cloud-nine', 'Lagoon Cloud Nine', 'clouds'],
  ['w2-coral-caves', 'Coral Caves', 'diamond'],
  ['w2-pearl-spires', 'Pearl Spires', 'diamond'],
  ['w2-lagoon-sapphires', 'Lagoon Sapphires', 'diamond'],
  ['w2-sunset-rubies', 'Sunset Rubies', 'diamond'],
  ['w2-jungle-emeralds', 'Jungle Emeralds', 'diamond'],
  ['w2-starfish-amethyst', 'Starfish Amethyst', 'diamond'],
  ['w2-treasure-throne', 'Treasure Throne', 'diamond'],
  ['w2-golden-lagoon', 'Golden Lagoon', 'honey'],
  ['w2-mango-syrup-falls', 'Mango Syrup Falls', 'honey'],
  ['w2-golden-sunset', 'Golden Sunset', 'honey'],
  ['w2-papaya-meadows', 'Papaya Meadows', 'honey'],
  ['w2-coconut-butter-bridges', 'Coconut Butter Bridges', 'honey'],
  ['w2-caramel-cove', 'Caramel Cove', 'honey'],
  ['w2-golden-grill', 'Golden Grill', 'honey'],
  ['w2-frosty-lagoon', 'Frosty Lagoon', 'ice'],
  ['w2-snowy-sandbar', 'Snowy Sandbar', 'ice'],
  ['w2-ice-tiki-palace', 'Ice Tiki Palace', 'ice'],
  ['w2-glacier-reef', 'Glacier Reef', 'ice'],
  ['w2-frozen-smoothies', 'Frozen Smoothies', 'ice'],
  ['w2-coral-aurora', 'Coral Aurora', 'ice'],
  ['w2-polar-palms', 'Polar Palms', 'ice'],
  ['w2-blizzard-bay', 'Blizzard Bay', 'ice'],
  ['w2-lighthouse-belt', 'Lighthouse Belt', 'space'],
  ['w2-coconut-moon', 'Coconut Moon', 'space'],
  ['w2-sand-crater-cafe', 'Sand Crater Cafe', 'space'],
  ['w2-flamingo-comet', 'Flamingo Comet', 'space'],
  ['w2-treasure-asteroids', 'Treasure Asteroids', 'space'],
  ['w2-pearl-ring-planet', 'Pearl Ring Planet', 'space'],
  ['w2-space-shack-snacks', 'Space Shack Snacks', 'space'],
  ['w2-rocket-regatta', 'Rocket Regatta', 'space'],
  ['w2-meteor-mango', 'Meteor Mango', 'space'],
  ['w2-orbit-oasis', 'Orbit Oasis', 'space'],
  ['w2-solar-surf', 'Solar Surf', 'space'],
  ['w2-lagoon-nebula', 'Lagoon Nebula', 'galaxy'],
  ['w2-galaxy-grill', 'Galaxy Grill', 'galaxy'],
  ['w2-starlight-sandbar', 'Starlight Sandbar', 'galaxy'],
  ['w2-pulsar-papaya', 'Pulsar Papaya', 'galaxy'],
  ['w2-seashell-quasar', 'Seashell Quasar', 'galaxy'],
  ['w2-supernova-smoothie', 'Supernova Smoothie', 'galaxy'],
  ['w2-wormhole-wave', 'Wormhole Wave', 'galaxy'],
  ['w2-whirlpool-bakery', 'Whirlpool Bakery', 'galaxy'],
  ['w2-event-horizon-inn', 'Event Horizon Inn', 'galaxy'],
  ['w2-multiverse-mango', 'Multiverse Mango', 'galaxy'],
  ['w2-cosmic-coral', 'Cosmic Coral', 'galaxy'],
  ['w2-the-final-wave', 'The Final Wave', 'galaxy'],
]

/**
 * Frosty Peaks' and Lava Kitchen's layers: World 1's, renamed in each world's own words -
 * "Treetop Canopy" becomes "Snowy Canopy" and "Molten Canopy".
 */
const WORLD_WORDS = { 2: ['Frosty', 'Snowy', 'Icy', 'Polar', 'Glacier'], 3: ['Lava', 'Magma', 'Molten', 'Ember', 'Blazing'] }
const renamedStages = (world, ownWords = null) =>
  ZONES.map((zone, i) => {
    const words = ownWords ?? WORLD_WORDS[world]
    const adj = words[i % words.length]
    const parts = zone.name.split(' ')
    const name = parts[0] === 'The' ? `The ${adj} ${parts[parts.length - 1]}` : parts.length > 1 ? `${adj} ${parts.slice(1).join(' ')}` : `${adj} ${zone.name}`
    return [`w${world + 1}-${zone.id}`, name, zone.theme]
  })
/** Tropic Skies' layers past its own sixty: World 1's new ones, in island words. */
const tropicMore = () => renamedStages(1, ['Tropic', 'Coral', 'Lagoon', 'Palm', 'Sunny']).slice(WORLD2_STAGES.length)
const STAGES = [null, [...WORLD2_STAGES, ...tropicMore()], renamedStages(2), renamedStages(3)]

const worldZones = (world) =>
  ZONES.map((zone, i) => {
    const mult = WORLDS[world].wins
    const [id, name, theme] = world > 0 ? STAGES[world][i] : [zone.id, zone.name, zone.theme]
    return {
      ...zone,
      id,
      name,
      theme,
      winsPerMeter: zone.winsPerMeter * mult,
      smash: zone.smash * mult,
      discover: zone.discover * mult,
    }
  })

/** Each world's floors, as ZONES: `WORLD_ZONES[profile.world]`. */
export const WORLD_ZONES = WORLDS.map((_, world) => (world ? worldZones(world) : ZONES))
export const zonesOf = (world) => WORLD_ZONES[world] ?? ZONES

// --- Shop -------------------------------------------------------------------------

/**
 * The shop. Wins are the game's only currency: everything here, like phones and eggs,
 * is bought with them. `pass` = permanent unlock; `consumable` = grants every time.
 */
export const SHOP = {
  healthX2: { name: 'x2 Strength', price: 400, kind: 'pass' },
  winsX2: { name: 'x2 Trophies', price: 2500, kind: 'pass' },
  autoRoll: { name: 'Auto Launch', price: 150, kind: 'pass' },
  padVeryOp: { name: 'VERY OP! Flip Mat', price: 150000, kind: 'pass' },
  padBest: { name: 'BEST OVERALL! Flip Mat', price: 2500000, kind: 'pass' },
  sphinx: { name: 'Sphinx', price: 2500000, kind: 'consumable', grant: { pet: 'sphinx' }, stock: 1000 },
}

/**
 * Boxity Gems products, by sku. Prices live in Boxity's catalog, never here: the game
 * only names the sku and, once Boxity confirms the sale, grants what it says. Wins
 * packs grow with you: `winsRolls` max-level drops' worth of Wins.
 */
export const GEM_PRODUCTS = {
  wins_small: { name: 'Pile of Trophies', blurb: '10 max-level launches of Trophies', icon: 'trophy', grant: { winsRolls: 10 } },
  wins_big: { name: 'Mountain of Trophies', blurb: '60 max-level launches of Trophies', icon: 'trophy', grant: { winsRolls: 60 } },
  potion_bundle: { name: 'Potion Bundle', blurb: '3 x2 Strength + 3 x2 Trophies potions', icon: 'potionHealth', grant: { items: { potionHealth: 3, potionWins: 3 } } },
  volcano_eggs: { name: '3 Toaster Eggs', blurb: 'The best pets in the game', icon: 'egg:volcano', grant: { items: { eggVolcano: 3 } } },
  auto_roll: { name: 'Auto Launch', blurb: 'Launches your pancake for you from the Launch Pad', icon: 'tire', grant: { pass: 'autoRoll' } },
  health_x2: { name: 'x2 Strength', blurb: 'Double every Strength gain, forever', icon: 'heart', grant: { pass: 'healthX2' } },
  wins_x2: { name: 'x2 Trophies', blurb: 'Double every launch’s Trophies, forever', icon: 'trophy', grant: { pass: 'winsX2' } },
  pad_best: { name: '100 KG Galaxy Mat', blurb: 'Unlocks the x100 Galaxy flip mat', icon: 'portal', grant: { pass: 'padBest' } },
}

/**
 * Rewarded ads (Boxity): watch one to earn this. Placement names are lowercase, digits
 * and hyphens. `cooldownMs` keeps a player from chaining them.
 */
export const AD_REWARDS = {
  'health-potion': { label: 'x2 Strength Potion', icon: 'potionHealth', grant: { item: 'potionHealth' }, cooldownMs: 3 * 60 * 1000 },
  'wins-potion': { label: 'x2 Trophies Potion', icon: 'potionWins', grant: { item: 'potionWins' }, cooldownMs: 3 * 60 * 1000 },
}

/** Sphinx stock shown before the server reports the live count. */
export const SPHINX_STOCK_DEFAULT = 954

/**
 * The three Skill packs under the level bar. They grow with you: each gives `share`
 * of the Skill your next level needs, for `rolls` drops' worth of Wins at that Skill.
 * Packs aren't held back by the level cap.
 */
export const HEALTH_PACKS = [
  { share: 1, rolls: 1 },
  { share: 5, rolls: 4 },
  { share: 20, rolls: 12 },
]

// --- Coming back for more: streaks, quests, combos, lucky gifts, friends ---------------

/**
 * A game day, in UTC: quests reset and login streaks count by it, the same for everyone
 * everywhere (`dayNumber(now)` is the day since 1970).
 */
export const DAY_MS = 24 * 60 * 60 * 1000
export const dayNumber = (now) => Math.floor(now / DAY_MS)

/**
 * Login streak: play on consecutive days and every drop pays STREAK_STEP more Wins per
 * day in a row (day 1 x1, day 2 x1.1 ... day 11 and on x2). Miss a day and it starts again
 * from day 1 - the reason to come back tomorrow.
 */
export const STREAK_STEP = 0.1
export const STREAK_MAX_DAYS = 11
export const streakMultiplier = (days) => 1 + STREAK_STEP * (Math.min(STREAK_MAX_DAYS, Math.max(1, days)) - 1)

/**
 * PERFECT combo: PERFECT throws in a row each pay COMBO_STEP more Wins than the last
 * (the 2nd +10%, the 3rd +20% ... up to +COMBO_MAX); anything less than PERFECT breaks it.
 * Kept for the session, never saved.
 */
export const COMBO_STEP = 0.1
export const COMBO_MAX = 0.5
export const comboBonus = (combo) => 1 + Math.min(COMBO_MAX, COMBO_STEP * Math.max(0, combo - 1))

/**
 * Playing together: every other player in your server (and your world) adds CROWD_STEP
 * to your drops' Wins, up to CROWD_MAX - bring your friends.
 */
export const CROWD_STEP = 0.1
export const CROWD_MAX = 0.3
export const crowdBonus = (others) => 1 + Math.min(CROWD_MAX, CROWD_STEP * Math.max(0, others))

/**
 * Lucky gifts: each drop has LUCKY_CHANCE of landing a surprise on top of its Wins.
 * `weight`s are relative. Wins gifts grow with you (`winsRolls` max-level drops' worth);
 * an egg gift is an egg that fits how far you've got (logic.eggItemFor).
 */
export const LUCKY_CHANCE = 0.08
export const LUCKY_GIFTS = [
  { weight: 45, label: 'Bag of Trophies', icon: 'trophy', grant: { winsRolls: 4 } },
  { weight: 20, label: 'x2 Trophies Potion', icon: 'potionWins', grant: { item: 'potionWins' } },
  { weight: 20, label: 'x2 Strength Potion', icon: 'potionHealth', grant: { item: 'potionHealth' } },
  { weight: 15, label: 'Mystery Egg', icon: 'egg', grant: { egg: true } },
]

/**
 * Daily quests: QUESTS_PER_DAY a day - an EASY, a MEDIUM and a HARD one of different
 * kinds, picked fresh each day for each player - and a bonus chest for finishing all
 * three. Rewards grow with you: `winsRolls` max-level drops' worth of Wins (HARD adds
 * a potion; the chest adds an egg that fits your progress).
 *
 * Each kind counts one thing (`counter`, fed by the session as you play) up to its
 * target; `mode: 'best'` keeps the best single value instead of adding up. `targets` are
 * per tier; `scale` scales them with your deepest drop so far ('total': that many of it in
 * metres, 'best': that share of it). `{n}` in `text` is the target.
 */
export const QUESTS_PER_DAY = 3
export const QUEST_TIERS = [
  { id: 'easy', label: 'EASY', winsRolls: 3 },
  { id: 'medium', label: 'MEDIUM', winsRolls: 6 },
  { id: 'hard', label: 'HARD', winsRolls: 12, item: 'potionWins' },
]
export const QUEST_BONUS = { winsRolls: 15 }
export const QUEST_TYPES = {
  launch: { counter: 'launch', text: 'Launch your pancake {n} times', targets: [5, 12, 25] },
  great: { counter: 'great', text: 'Get {n} GREAT or PERFECT launches', targets: [2, 5, 10] },
  perfect: { counter: 'perfect', text: 'Get {n} PERFECT launches', targets: [1, 3, 6] },
  combo: { counter: 'combo', mode: 'best', text: 'Hit a PERFECT launch combo of {n}', targets: [2, 3, 4] },
  reps: { counter: 'rep', text: 'Flip {n} pancakes', targets: [40, 120, 300] },
  meters: { counter: 'meters', text: 'Fly {n} m high in total', scale: 'total', targets: [4, 10, 25] },
  far: { counter: 'far', mode: 'best', text: 'Fly {n} m high in one launch', scale: 'best', targets: [0.6, 0.8, 0.95] },
  hatch: { counter: 'hatch', text: 'Hatch {n} pets', targets: [1, 3, 6] },
  minutes: { counter: 'minute', text: 'Play for {n} minutes', targets: [5, 15, 30] },
}

// --- Tutorial & badges ------------------------------------------------------------

/**
 * The guide for new players: train, drop, spend the Wins on a new phone, drop deeper,
 * rebirth. Each step completes when its event fires (and, with `health`, once you have
 * that much); after the last the guide is done.
 */
export const TUTORIAL = [
  { text: 'Stand on a flip mat or tap to flip your pancake for Strength', event: 'train', target: 'pad0', health: 30 },
  { text: 'Go to the LAUNCH PAD, hold LAUNCH and let go at the top!', event: 'roll', target: 'roll' },
  { text: 'Buy the Copper Pan with your Trophies!', event: 'buyTire', target: 'tires' },
]

export const BADGES = {
  firstRoll: { name: 'First Launch' },
  firstRebirth: { name: 'First Rebirth' },
  firstPet: { name: 'Pet Owner' },
  firstWall: { name: 'Layer Breaker' },
  kilometer: { name: '1 Kilometre High' },
  space: { name: 'Space Cadet' },
  cosmic: { name: 'Final Flapjack' },
  world2: { name: 'Island Flyer' },
  world3: { name: 'Snow Explorer' },
  world4: { name: 'Lava Legend' },
  secretStar: { name: 'Star Finder' },
}
