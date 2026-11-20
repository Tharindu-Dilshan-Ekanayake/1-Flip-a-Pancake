import { skyLook } from '../worldLook'

/**
 * The sky's worlds, bottom to top (balance ZONES `theme`): each one fills the sky round
 * the climbing pancake with its own scenery, so a launch passes through world after world.
 *
 *   title     the banner when the pancake flies into it
 *   sky       the sky's colours inside it (worldLook.blendSky); the fog takes its horizon
 *   pillars   the giant kit that walls the column all the way up (SkyLayers.jsx: tree
 *             trunks, candy canes, crystal spires... star-cluster columns), and
 *             `pillarTint` the colours they're tinted in turn
 *   props     floating kits round the column, and `propTint` for the ones made to be tinted
 *   motes     colours of the drifting particles (leaves, sprinkles, sparkles, snow, stars)
 *   ring      the glowing ring where each layer starts; `gate` the big one at its first layer
 *   name      the gradient its layers' names are filled with on the HUD
 */
export const SKY_THEMES = {
  forest: {
    title: 'GREEN WORLD',
    sky: { top: '#3f9be8', horizon: '#c8f4b8', sun: '#fff1c4', glow: 0.7, clouds: 0.4, fantasy: 0.5, nebula: ['#e0ffe8', '#9fe8ff'], aurora: 0, moon: 0.35, moonColor: '#ffffff' },
    pillars: 'trunk',
    props: ['canopy', 'island', 'treehouse', 'birdhouse', 'bird', 'island'],
    motes: ['#7dff6a', '#b8ff5a', '#4fd04a', '#ffe27a'],
    ring: '#7dff6a',
    gate: '#3fff5a',
    name: ['#eaffd8', '#8af06a', '#2fa84a'],
  },
  candy: {
    title: 'CANDY WORLD',
    sky: { top: '#ff7ac8', horizon: '#ffe0f2', sun: '#fff0f8', glow: 0.8, clouds: 0.6, fantasy: 0.75, nebula: ['#ffd0f0', '#b48aff'], aurora: 0.3, moon: 0.6, moonColor: '#fff0fa' },
    pillars: 'candycane',
    pillarTint: ['#ffffff', '#ffe0f0', '#e0f4ff'],
    props: ['lolly', 'gumdrop', 'candy', 'pinkcloud', 'gumdrop', 'lolly'],
    propTint: ['#ff5ab8', '#3fd0ff', '#ffd23a', '#7dff6a', '#b48aff'],
    motes: ['#ff5ab8', '#3fd0ff', '#ffe23a', '#7dff6a', '#ffffff'],
    ring: '#ff9ad8',
    gate: '#ff5ab8',
    name: ['#fff0fa', '#ff9ad8', '#d83a9a'],
  },
  clouds: {
    title: 'CLOUD KINGDOM',
    sky: { top: '#5aa8ff', horizon: '#ffffff', sun: '#fff8e0', glow: 0.8, clouds: 0.9, fantasy: 0.6, nebula: ['#ffffff', '#ffe6a8'], aurora: 0, moon: 0.5, moonColor: '#fffbe8' },
    pillars: 'cloudpillar',
    props: ['castle', 'island', 'rainbow', 'balloon', 'cloud', 'island'],
    propTint: ['#ff5a5a', '#ffd23a', '#3fa8ff', '#7dff6a'],
    motes: ['#ffffff', '#e8f4ff', '#fff6d8'],
    ring: '#ffffff',
    gate: '#ffe27a',
    name: ['#ffffff', '#d8eeff', '#7ab8ff'],
  },
  diamond: {
    title: 'DIAMOND WORLD',
    sky: { top: '#140c4a', horizon: '#5ad8ff', sun: '#e0fbff', glow: 1.1, clouds: 0.15, stars: 0.5, fantasy: 1, nebula: ['#5affff', '#ff6ae0'], aurora: 0.8, moon: 0.9, moonColor: '#e8fbff' },
    pillars: 'crystalspire',
    pillarTint: ['#7fe8ff', '#ff8ae0', '#b48aff', '#8affc8'],
    props: ['crystal', 'gem', 'bigdiamond', 'gem', 'crystal', 'gem'],
    propTint: ['#7fe8ff', '#ff5ab8', '#b48aff', '#5affa0', '#ffffff', '#ffd23a'],
    motes: ['#ffffff', '#9ff4ff', '#ffb4f0', '#d8c8ff'],
    ring: '#9ff4ff',
    gate: '#5ae8ff',
    name: ['#ffffff', '#9ff4ff', '#7a5aff'],
  },
  honey: {
    title: 'GOLDEN SYRUP WORLD',
    sky: { top: '#e8781f', horizon: '#ffe8a0', sun: '#ffd27a', glow: 1.3, clouds: 0.5, fantasy: 0.7, nebula: ['#ffd27a', '#ff7a3a'], aurora: 0.2, moon: 0.85, moonColor: '#ffe8a0' },
    pillars: 'honeycomb',
    props: ['syrup', 'island', 'stack', 'honeydrip', 'butter', 'stack'],
    motes: ['#ffd23a', '#ffb81f', '#fff1a0'],
    ring: '#ffd23a',
    gate: '#ffb81f',
    name: ['#fff4c8', '#ffc23a', '#c86a1a'],
  },
  ice: {
    title: 'ICE WORLD',
    sky: { top: '#1a3a7a', horizon: '#d8f4ff', sun: '#e8fbff', glow: 0.8, clouds: 0.4, stars: 0.3, fantasy: 0.9, nebula: ['#9fe8ff', '#5affc8'], aurora: 1, moon: 0.8, moonColor: '#e8f8ff' },
    pillars: 'icespire',
    pillarTint: ['#e0f8ff', '#bfe8ff', '#d8e8ff'],
    props: ['snowflake', 'iceisland', 'ribbon', 'snowflake', 'iceisland', 'iceblock'],
    propTint: ['#ffffff', '#9fe8ff', '#c8d8ff'],
    motes: ['#ffffff', '#e0f8ff', '#bfe8ff'],
    ring: '#bff4ff',
    gate: '#5affc8',
    name: ['#ffffff', '#bff4ff', '#3a8aff'],
  },
  space: {
    title: 'OUTER SPACE',
    sky: { top: '#05061a', horizon: '#1a1440', sun: '#ffe8c8', glow: 0.7, clouds: 0, stars: 1, fantasy: 1, nebula: ['#5a3aff', '#ff5ad8'], aurora: 0.2, moon: 1, moonColor: '#ffd8b0' },
    pillars: null,
    props: ['planet', 'satellite', 'asteroid', 'rocket', 'asteroid', 'star'],
    propTint: ['#ff9a5a', '#5ab8ff', '#ff5a7a', '#7dff6a', '#d8b0ff'],
    motes: ['#ffffff', '#fff6c8', '#c8d8ff'],
    ring: '#b48aff',
    gate: '#ffffff',
    name: ['#f0e8ff', '#b48aff', '#5a3ad8'],
  },
  galaxy: {
    title: 'GALAXY WORLD',
    sky: { top: '#12042a', horizon: '#6a1a8a', sun: '#ffb4f0', glow: 1, clouds: 0, stars: 1, fantasy: 1, nebula: ['#ff5ad8', '#5ae8ff'], aurora: 0.5, moon: 1, moonColor: '#ffb4f0' },
    pillars: 'starcolumn',
    pillarTint: ['#ff8ae0', '#b48aff', '#7fe8ff', '#ffe27a'],
    props: ['cluster', 'swirl', 'cluster', 'blackhole', 'cluster', 'planet'],
    propTint: ['#ff5ad8', '#7a5aff', '#5ae8ff', '#ffd23a'],
    motes: ['#ff8ae0', '#b48aff', '#5ae8ff', '#ffffff'],
    ring: '#ff8ae0',
    gate: '#ff5ad8',
    name: ['#ffe8fa', '#ff8ae0', '#7a2ad8'],
  },
  rainbow: {
    title: 'RAINBOW WORLD',
    sky: { top: '#5a8aff', horizon: '#ffe0f4', sun: '#ffffff', glow: 1, clouds: 0.6, fantasy: 0.9, nebula: ['#ff8ad8', '#8affd8'], aurora: 0.6, moon: 0.6, moonColor: '#fff0fa' },
    pillars: 'rainbowpillar',
    props: ['rainbow', 'cloud', 'kite', 'balloon', 'gem', 'star'],
    propTint: ['#ff5a5a', '#ffa83a', '#ffe23a', '#4fd06a', '#3fa8ff', '#a05aff'],
    motes: ['#ff5a5a', '#ffe23a', '#4fd06a', '#3fa8ff'],
    ring: '#ffffff',
    gate: '#ff6af0',
    name: ['#ffffff', '#ffd23a', '#ff5ab8'],
  },
  dream: {
    title: 'DREAMLAND',
    sky: { top: '#3a2a8a', horizon: '#ffc8f0', sun: '#fff0fa', glow: 0.9, clouds: 0.5, stars: 0.6, fantasy: 1, nebula: ['#ffb4f0', '#b48aff'], aurora: 0.5, moon: 1, moonColor: '#fff4c8' },
    pillars: 'cloudpillar',
    pillarTint: ['#ffd8f4', '#e0d0ff', '#d0f0ff'],
    props: ['pinkcloud', 'castle', 'star', 'gumdrop', 'swirl', 'lolly'],
    propTint: ['#ffb4f0', '#b48aff', '#9fe8ff', '#fff1a0'],
    motes: ['#ffd8f4', '#d8c8ff', '#fff6c8', '#ffffff'],
    ring: '#ffb4f0',
    gate: '#d8a0ff',
    name: ['#ffffff', '#ffc8f0', '#a07aff'],
  },
  sun: {
    title: 'SUN WORLD',
    sky: { top: '#ff6a1a', horizon: '#fff2a0', sun: '#ffffff', glow: 1.6, clouds: 0.4, fantasy: 0.9, nebula: ['#ffd23a', '#ff5a1f'], aurora: 0.3, moon: 1, moonColor: '#fff8d0' },
    pillars: 'sunspire',
    props: ['star', 'swirl', 'gem', 'planet', 'bigdiamond', 'star'],
    propTint: ['#ffd23a', '#ff9a1f', '#fff1a0', '#ff5a1f'],
    motes: ['#fff1a0', '#ffd23a', '#ff9a1f', '#ffffff'],
    ring: '#fff1a0',
    gate: '#ffb81f',
    name: ['#fffbe0', '#ffd23a', '#ff6a1a'],
  },
  infinity: {
    title: 'INFINITY',
    sky: { top: '#0a0a2a', horizon: '#f0e8ff', sun: '#ffffff', glow: 1.2, clouds: 0, stars: 1, fantasy: 1, nebula: ['#ffffff', '#ffd27a'], aurora: 0.8, moon: 1, moonColor: '#ffffff' },
    pillars: 'crystalspire',
    pillarTint: ['#ffffff', '#ffe8a0', '#e8d8ff'],
    props: ['swirl', 'bigdiamond', 'gem', 'blackhole', 'star', 'planet'],
    propTint: ['#ffffff', '#ffd27a', '#e8d8ff', '#9ff4ff'],
    motes: ['#ffffff', '#fff1c8', '#e8d8ff', '#9ff4ff'],
    ring: '#ffffff',
    gate: '#ffe27a',
    name: ['#ffffff', '#fff1c8', '#ffb81f'],
  },
}

const FALLBACK = SKY_THEMES.forest
export const skyTheme = (theme) => SKY_THEMES[theme] ?? FALLBACK

/** Each world's sky, parsed once for worldLook.blendSky. */
const LOOKS = Object.fromEntries(Object.entries(SKY_THEMES).map(([id, t]) => [id, skyLook(t.sky)]))
export const themeSkyLook = (theme) => LOOKS[theme] ?? LOOKS.forest

/** The CSS gradient a layer's (or its world's) name is filled with on the HUD. */
export function floorNameGradient(zones, index) {
  return themeGradient(zones[index]?.theme)
}
export function themeGradient(theme) {
  const [a, b, c] = skyTheme(theme).name
  return `linear-gradient(180deg, ${a} 0%, ${b} 50%, ${c} 100%)`
}

/** Whether layer `index` is the first of its world (where the world's gate stands). */
export const startsWorld = (zones, index) => index === 0 || zones[index]?.theme !== zones[index - 1]?.theme

/** The next world above layer `index`: { theme, title, index, start } or null at the top. */
export function nextWorld(zones, index) {
  for (let i = Math.max(0, index) + 1; i < zones.length; i += 1) {
    if (zones[i].theme !== zones[index]?.theme) return { theme: zones[i].theme, title: skyTheme(zones[i].theme).title, index: i, start: zones[i].start }
  }
  return null
}
