import { Color, Vector3 } from 'three'

import { LIGHTS, SKY } from './sceneStyle'

/**
 * Sky shader uniforms, module-level so other systems (the lobby's world sky, each stage of
 * the kick field) can retint the sky without React: they write `.value` and the next
 * frame shows it.
 */
export const skyUniforms = {
  topColor: { value: new Color(SKY.top) },
  horizonColor: { value: new Color(SKY.horizon) },
  exponent: { value: SKY.exponent },
  /** Towards the sun (the same as the sun light's), its glow's colour and strength. */
  sunDirection: { value: new Vector3(...LIGHTS.sunDirection).normalize() },
  sunColor: { value: new Color(SKY.sun) },
  glow: { value: SKY.glow },
  /** How many thin high clouds streak across it, and how many stars show (0-1 each). */
  clouds: { value: SKY.clouds },
  stars: { value: SKY.stars },
  /**
   * The fantasy sky of the launch (0 in the lobby): swirling nebula clouds in two colours,
   * aurora curtains, and a great glowing moon or planet low in the sky.
   */
  fantasy: { value: 0 },
  nebulaA: { value: new Color('#ffffff') },
  nebulaB: { value: new Color('#ffffff') },
  aurora: { value: 0 },
  moon: { value: 0 },
  moonColor: { value: new Color('#ffffff') },
  time: { value: 0 },
}
