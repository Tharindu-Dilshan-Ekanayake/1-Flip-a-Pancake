/**
 * The scene's whole look in one place: Sky City - a bright blue sky over a rooftop plaza
 * of pale tiles with a glowing blue walkway, glass towers all round it (hills.js), and the
 * cliff edge to the north where the phones go over.
 *
 * Colours are sRGB hex, exactly as you would pick them in an image editor.
 *
 * Light intensities are three.js physical units: a light of intensity PI (~3.14)
 * lights a surface facing it to its full texture colour. The cool sky fill plus the warm
 * low sun add up to just over that on the ground, which keeps the turf vivid; shadowed
 * ground only gets the cool fill, so shadows read blue and the lit side gold.
 */

/** Style ids (materials STYLE; numbers here so this file stays import-free): glass towers, green-capped cliffs. */
const STYLE_HILL = 14
const STYLE_MESA = 15
const STYLE_LAVA = 7

/** The home team's colours: everything built for the venue uses these. */
export const TEAM = {
  blue: '#1f4fd8',
  navy: '#14234f',
  white: '#f4f7fb',
  gold: '#ffc21a',
}

export const SKY = {
  /** Straight up: a deep, bright blue. */
  top: '#2f7dff',
  /** At eye level: pale sky blue. Fog uses the same colour so the city far below melts into it. */
  horizon: '#cdeaff',
  /** Lower = the deep colour reaches further down towards the horizon. */
  exponent: 0.6,
  /** The sun's glow round its direction, and how strong it is. */
  sun: '#fff0c8',
  glow: 0.6,
  /** High clouds (0 none, 1 plenty), and stars (night stages only). */
  clouds: 0.9,
  stars: 0,
}

export const FOG = {
  color: SKY.horizon,
}

/** Every surface colour in the lobby. */
export const PALETTE = {
  /** The ball shop's yard. */
  shopFloor: '#e8edf6',
  /** Rings painted round the portal on the sideline. */
  apron: '#16245a',
  apronEdge: TEAM.gold,
  /** The pavilions: pale concrete steps (a shade darker every third row), the team's seats. */
  concrete: ['#c9ced6', '#c9ced6', '#b7bdc8'],
  seats: [TEAM.blue, TEAM.white, TEAM.gold],
  standBase: '#8c93a1',
  rail: '#ffffff',
  /** Mown turf, light and dark: the plaza's field, the strip round it and the kick field. */
  turf: ['#2fbf47', '#3ad456'],
  /** The crowd's shirts: mostly the home team's, a few away fans. */
  crowd: [TEAM.blue, '#ffffff', TEAM.gold, '#2f66d6', TEAM.blue, '#ffe27a', '#e8eef8', '#ff5a4a'],
  /** Flags along the roofs. */
  flags: [TEAM.blue, TEAM.white, TEAM.gold],
  /** The city round the stadium: hazy blue-grey and dusky purple towers. */
  city: ['#5a6787', '#6b6f8f', '#4f5a7a', '#776c8c', '#5d7290'],
  /** Car park and service roads beyond the stands. */
  asphalt: '#555b68',
}

/**
 * Each world's venue: the colours everything built for it uses, and whether it's the beach.
 * World 1 is the Backyard Stadium (royal blue, white and gold, a city round it); World 2
 * is Palm Beach (turquoise, coral, sand and white, palms, umbrellas and the ocean round
 * it). The lobby (World.jsx) and the kick field (Lane.jsx) are built from the one for the
 * world you're in, and rebuilt when you step through the portal.
 */
export const VENUES = [
  {
    // World 1, the Candy Palace: a blocky candy castle in a valley of candy mountains.
    beach: false,
    candy: true,
    park: 'candy',
    primary: '#ff6aa8',
    dark: '#7a2a6a',
    light: TEAM.white,
    accent: '#ffd23a',
    concrete: PALETTE.concrete,
    wall: '#c4c9d2',
    vip: '#d5dae1',
    glass: '#1c2b46',
    crowd: PALETTE.crowd,
    flags: PALETTE.flags,
    pitch: { north: '#1f4fd8', south: '#14234f', border: '#ffffff', track: '#2a5bd0', apron: '#1b2a63' },
    /** Beyond the turf round the plaza (grass, under the hills), and the turf strip itself. */
    surround: '#3fb23f',
    strip: PALETTE.turf,
    shopFloor: '#c8aaff',
    logo: { rim: '#ffd23a', ring: '#ff6aa8', inner: '#9ef0d0', top: 'CANDY', bottom: 'PALACE' },
    /**
     * The stone canyon's walls: grey and warm stone cliffs stepping up in terraces, mossy
     * on top, with pines, boulders, torches and glowing crystals on their ledges.
     */
    // Candy mountains beyond the castle walls: pastel strata under a frosting cap, lollipops and gumdrops on the ledges.
    hills: { rock: ['#ffb3d1', '#ffd6a5', '#caffbf', '#bde0fe', '#e0bbff'], style: STYLE_MESA, trees: 'candy' },
    endNorth: 'LAUNCH IT!',
    /** The start arch and the ball shop's stages and sign. */
    arch: { pillar: '#ff6aa8', base: '#7a2a6a', glow: '#ffe27a', crest: '#ffd23a' },
    shop: { band: '#ff6aa8', strip: '#ffe27a', post: '#9ef0d0', panel: '#7a2a6a' },
  },
  {
    beach: true,
    primary: '#16b8c4',
    dark: '#0b6f86',
    light: '#ffffff',
    accent: '#ff6f61',
    concrete: ['#eadfc8', '#eadfc8', '#dccfb4'],
    wall: '#e2d5ba',
    vip: '#efe6d2',
    glass: '#13506a',
    crowd: ['#16b8c4', '#ffffff', '#ff6f61', '#ffd27a', '#3fd8ff', '#ff9ab0', '#7ae86a', '#ffffff'],
    flags: ['#16b8c4', '#ff6f61', '#ffffff', '#ffd27a'],
    pitch: { north: '#16b8c4', south: '#ff6f61', border: '#ffffff', track: '#e2bd7a', apron: '#f0d9a0' },
    surround: '#f2dca0',
    strip: ['#f2dca0', '#ead196'],
    shopFloor: '#fbeed0',
    logo: { rim: '#16b8c4', ring: '#ff6f61', inner: '#ffd27a', top: 'TROPIC', bottom: 'SKIES' },
    hills: { rock: ['#e8c890', '#dcb27a', '#cf9c5e', '#c08a4e', '#b07a42'], style: STYLE_HILL, trees: 'palm' },
    endNorth: 'TROPIC SKIES',
    arch: { pillar: '#ff6f61', base: '#0b6f86', glow: '#ffe6b8', crest: '#16b8c4' },
    shop: { band: '#16b8c4', strip: '#bff6ff', post: '#ff6f61', panel: '#0b6f86' },
  },
  {
    // World 3, Frosty Peaks: blue-grey cliffs capped with snow, ice-blue paving, snowy
    // pines, snowmen and ice crystals.
    beach: false,
    park: 'snow',
    primary: '#3a8aff',
    dark: '#1a3a7a',
    light: '#ffffff',
    accent: '#9fe8ff',
    concrete: ['#e8f2fb', '#e8f2fb', '#d8e6f4'],
    wall: '#d8e6f4',
    vip: '#eef6ff',
    glass: '#1a3a7a',
    crowd: ['#3a8aff', '#ffffff', '#9fe8ff', '#ffd27a'],
    flags: ['#3a8aff', '#ffffff', '#9fe8ff'],
    pitch: { north: '#3a8aff', south: '#1a3a7a', border: '#ffffff', track: '#9fe8ff', apron: '#d8e6f4' },
    surround: '#eef6ff',
    strip: ['#eef6ff', '#e0ecf8'],
    shopFloor: '#f4f9ff',
    logo: { rim: '#9fe8ff', ring: '#1a3a7a', inner: '#3a8aff', top: 'FROSTY', bottom: 'PEAKS' },
    hills: { rock: ['#a8b8cc', '#98a8bf', '#8898b0', '#7a8aa4', '#6c7c98'], style: STYLE_MESA, trees: 'snow' },
    endNorth: 'FROSTY PEAKS',
    arch: { pillar: '#3a8aff', base: '#1a3a7a', glow: '#e0f8ff', crest: '#9fe8ff' },
    shop: { band: '#3a8aff', strip: '#e0f8ff', post: '#9fe8ff', panel: '#1a3a7a' },
  },
  {
    // World 4, Lava Kitchen: black volcanic cliffs cracked with glowing lava, dark basalt
    // paving with a glowing path, obsidian spikes and fires.
    beach: false,
    park: 'lava',
    primary: '#ff5a1f',
    dark: '#1a0a08',
    light: '#ffd27a',
    accent: '#ff9a1f',
    concrete: ['#3a2f2c', '#3a2f2c', '#2e2422'],
    wall: '#3a2f2c',
    vip: '#4a3c38',
    glass: '#1a0a08',
    crowd: ['#ff5a1f', '#ffd27a', '#ff9a1f', '#ffffff'],
    flags: ['#ff5a1f', '#1a0a08', '#ffd27a'],
    pitch: { north: '#ff5a1f', south: '#1a0a08', border: '#ffd27a', track: '#3a2f2c', apron: '#2e2422' },
    surround: '#2e2422',
    strip: ['#2e2422', '#352a27'],
    shopFloor: '#4a3c38',
    logo: { rim: '#ff9a1f', ring: '#1a0a08', inner: '#ff5a1f', top: 'LAVA', bottom: 'KITCHEN' },
    hills: { rock: ['#3a302c', '#2f2724', '#28201d', '#221a18', '#1c1513'], style: STYLE_LAVA, trees: 'lava' },
    endNorth: 'LAVA KITCHEN',
    arch: { pillar: '#ff5a1f', base: '#1a0a08', glow: '#ffd27a', crest: '#ff9a1f' },
    shop: { band: '#ff5a1f', strip: '#ffd27a', post: '#ff9a1f', panel: '#1a0a08' },
  },
]
export const venueOf = (world) => VENUES[world] ?? VENUES[0]

export const LIGHTS = {
  /** A cool fill from the blue sky, a soft grey-blue bounce off the rooftop. */
  hemiSky: '#d8e8ff',
  hemiGround: '#c4d2e6',
  hemiIntensity: 2.0,

  /** A bright, high midday sun. */
  sunColor: '#fff0dc',
  sunIntensity: 1.9,
  /**
   * Direction *towards* the sun: high in the north-west, beyond the far end of the runway
   * (the sky's glow sits there too), so shadows fall short and back towards you.
   */
  sunDirection: [-0.4, 0.78, -0.48],
  /** 1 = shadows get no sunlight at all; lower = lighter shadows. */
  shadowIntensity: 0.6,
  /** Blur radius of shadow edges, in shadow-map texels. */
  shadowSoftness: 3,
}
