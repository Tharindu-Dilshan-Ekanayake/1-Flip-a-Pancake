import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'

import { mulberry32 } from '@shared/rng'

import { useQuality } from '../../store/quality'
import { createToyInstances, PropBuilder } from '../blocks'
import { sharedMaterials, STYLE } from '../materials'
import { addPancake } from '../phoneStyles'
import { blendSky, zones } from '../worldLook'
import { COLUMN, LAYER_H, layerY, SKY_BASE } from './launchPath'
import { roll } from './rollControl'
import { skyTheme, startsWorld, themeSkyLook } from './skyThemes'

/** Props per kit (the most any one kind can have on screen), and per layer at full density. */
const KIT_MAX = 28
const PROPS_PER_LAYER = 14
/** Layers drawn round the pancake: one below, the one it's in and two above. */
const BELOW = 1
const ABOVE = 2
const SHOWN_LAYERS = BELOW + ABOVE + 1
/** The giant pillars walling each world: how many round the column, and how far out. */
const PILLARS = 9
const PILLAR_R = 27
/** Floating props keep this far from the column, and out of the camera's side close in. */
const NEAR = 12
const FAR = 50
/** Drifting motes: how many on MEDIUM and HIGH (LOW has no particles), and the box they fill. */
const MOTES = { MEDIUM: 240, HIGH: 420 }
const MOTE_BOX = 46
const MOTE_H = 120

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _up = new Vector3(0, 1, 0)
const _color = new Color()
const WHITE = new Color('#ffffff')
const HIDDEN = new Matrix4().makeScale(0, 0, 0)
/** Per-kit instance counts, reused for every re-layout. */
const counts = new Int16Array(64)
const pillarCounts = new Int16Array(16)

const ball = new IcosahedronGeometry(1, 1)
const lowBall = new IcosahedronGeometry(1, 0)
const disc = new CylinderGeometry(1, 1, 1, 14)
const hex = new CylinderGeometry(1, 1, 1, 6)
const cone = new ConeGeometry(1, 1, 8)
const hexCone = new ConeGeometry(1, 1, 6)
const ring = new TorusGeometry(1, 0.08, 6, 28)
const sphere = new SphereGeometry(1, 16, 10)
const octa = new OctahedronGeometry(1, 0)

/**
 * The giant pillars, one segment per layer (LAYER_H tall, from y = 0), so they stack into
 * unbroken columns all the way up their world.
 */
const PILLAR_KITS = {
  trunk(p) {
    p.add(disc, { position: [0, LAYER_H / 2, 0], scale: [3.2, LAYER_H, 3.2], color: '#8a5a32' })
    for (let y = 6; y < LAYER_H; y += 11) p.box(0, y, 3.05, 1.2, 4, 0.4, '#6a4224', STYLE.SMOOTH, [0, 0, 0.2])
    // Branches reaching out, each ending in a great clump of leaves.
    for (const [y, a, len] of [
      [14, 0.4, 9],
      [38, 2.6, 11],
      [58, 4.4, 8],
    ]) {
      const dx = Math.cos(a)
      const dz = Math.sin(a)
      p.box(dx * (len / 2 + 2), y, dz * (len / 2 + 2), len, 1.3, 1.3, '#7a4e2a', STYLE.SMOOTH, [0, -a, 0.25])
      p.add(ball, { position: [dx * (len + 3), y + 2.5, dz * (len + 3)], scale: [5, 3.6, 5], color: '#4fbf3a' })
      p.add(ball, { position: [dx * (len + 5.5), y + 1.5, dz * (len + 1.5)], scale: 3, color: '#3aa832' })
      p.add(ball, { position: [dx * (len + 1), y + 4.5, dz * (len + 4)], scale: 2.8, color: '#6ad84e' })
    }
    // Vines hanging down the trunk.
    for (const a of [1.2, 3.6, 5.4]) p.add(disc, { position: [Math.cos(a) * 3.3, 46, Math.sin(a) * 3.3], scale: [0.2, 26, 0.2], color: '#3aa832' })
  },
  candycane(p) {
    p.add(disc, { position: [0, LAYER_H / 2, 0], scale: [1.8, LAYER_H, 1.8], color: '#ffffff', style: STYLE.GLOW })
    // The red stripe winding up it.
    const stripe = new TorusGeometry(1.8, 0.45, 3, 12)
    for (let y = 1.5; y < LAYER_H; y += 3.5) p.add(stripe, { position: [0, y, 0], rotation: [Math.PI / 2 + 0.38, 0, 0], color: '#ff3b5c' })
    for (const y of [20, 52]) p.add(ball, { position: [0, y, 0], scale: [3.2, 1.2, 3.2], color: '#7dff6a' })
  },
  cloudpillar(p) {
    for (let k = 0; k < 10; k += 1) {
      const y = k * 7 + 3
      p.add(ball, { position: [Math.sin(k * 1.7) * 2.2, y, Math.cos(k * 1.3) * 2], scale: 4.5 + Math.sin(k * 2.1) * 1.4, color: k % 3 ? '#ffffff' : '#eef6ff' })
    }
    p.add(ball, { position: [5, 34, 0], scale: [5, 3, 4], color: '#ffffff' })
  },
  crystalspire(p) {
    p.add(hex, { position: [0, LAYER_H / 2, 0], scale: [2.8, LAYER_H, 2.8], color: '#ffffff' })
    for (let y = 4; y < LAYER_H; y += 9) p.box(2.45, y, 0, 0.18, 6, 0.6, '#ffffff', STYLE.GLOW, [0, 0, 0])
    for (const [y, a, s] of [
      [12, 0.6, 1],
      [33, 2.8, 1.3],
      [55, 4.6, 0.9],
    ]) {
      const dx = Math.cos(a) * 3.4
      const dz = Math.sin(a) * 3.4
      p.add(hex, { position: [dx, y, dz], scale: [1.2 * s, 9 * s, 1.2 * s], rotation: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], color: '#f4fbff' })
      p.add(hexCone, { position: [dx * 1.35, y + 5.6 * s, dz * 1.35], scale: [1.2 * s, 3 * s, 1.2 * s], rotation: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], color: '#ffffff', style: STYLE.GLOW })
    }
  },
  honeycomb(p) {
    p.add(hex, { position: [0, LAYER_H / 2, 0], scale: [3.4, LAYER_H, 3.4], color: '#ffb81f' })
    for (let y = 5; y < LAYER_H; y += 10) p.add(new TorusGeometry(3.45, 0.4, 4, 6), { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], color: '#ffd86a' })
    for (const a of [0.5, 2.2, 4.1]) {
      p.add(cone, { position: [Math.cos(a) * 3.3, 30 + a * 5, Math.sin(a) * 3.3], scale: [0.6, 3, 0.6], rotation: [Math.PI, 0, 0], color: '#ff9a1f', style: STYLE.GLOW })
      p.add(ball, { position: [Math.cos(a) * 3.3, 27.5 + a * 5, Math.sin(a) * 3.3], scale: 0.6, color: '#ff9a1f', style: STYLE.GLOW })
    }
  },
  /**
   * A column of star clusters for the Galaxy World: bright cores, each in a swarm of
   * little stars and a couple of four-point sparkles, spiralling up the layer. Drawn
   * white and glowing, so the world's `pillarTint` colours each column.
   */
  starcolumn(p) {
    const r = mulberry32(31)
    for (let k = 0; k < 5; k += 1) {
      const y = 7 + k * 14
      const a = k * 1.9
      const cx = Math.cos(a) * 2.5
      const cz = Math.sin(a) * 2.5
      const core = 1.5 + r() * 0.7
      p.add(ball, { position: [cx, y, cz], scale: core, color: '#ffffff', style: STYLE.GLOW })
      for (let n = 0; n < 8; n += 1) {
        // Denser towards the core, as real clusters are.
        const d = core * 1.6 + r() ** 1.6 * 4.5
        const u = r() * Math.PI * 2
        const v = Math.acos(r() * 2 - 1)
        const size = 0.18 + r() * 0.3
        p.add(lowBall, { position: [cx + Math.sin(v) * Math.cos(u) * d, y + Math.cos(v) * d, cz + Math.sin(v) * Math.sin(u) * d], scale: size, color: '#ffffff', style: STYLE.GLOW })
      }
      for (const s of [1, -1]) {
        const sx = cx + s * (core + 2.4)
        const sy = y + s * 2
        p.box(sx, sy, cz, 2.2, 0.16, 0.16, '#ffffff', STYLE.GLOW)
        p.box(sx, sy, cz, 0.16, 2.2, 0.16, '#ffffff', STYLE.GLOW)
      }
    }
  },
  rainbowpillar(p) {
    const colors = ['#ff5a5a', '#ffa83a', '#ffe23a', '#4fd06a', '#3fa8ff', '#a05aff']
    for (let k = 0; k < 14; k += 1) p.add(hex, { position: [0, k * 5 + 2.5, 0], scale: [2.6, 5, 2.6], rotation: [0, k * 0.3, 0], color: colors[k % colors.length], style: k % 3 === 0 ? STYLE.GLOW : STYLE.SMOOTH })
    for (const y of [18, 46]) p.add(ball, { position: [0, y, 0], scale: [4, 1.4, 4], color: '#ffffff' })
  },
  sunspire(p) {
    p.add(new CylinderGeometry(1.4, 2.8, LAYER_H, 8), { position: [0, LAYER_H / 2, 0], color: '#ffd23a' })
    for (let y = 6; y < LAYER_H; y += 10) p.add(new TorusGeometry(2.6 - y * 0.016, 0.4, 4, 8), { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], color: '#fff6c8', style: STYLE.GLOW })
    for (const [y, a] of [
      [20, 0.5],
      [44, 2.8],
    ]) {
      for (let k = 0; k < 8; k += 1) p.box(Math.cos(a) * 4 + Math.cos(k) * 1.4, y + Math.sin(k) * 1.4, Math.sin(a) * 4, 0.3, 1.6, 0.3, '#fff1a0', STYLE.GLOW, [0, 0, k])
      p.add(ball, { position: [Math.cos(a) * 4, y, Math.sin(a) * 4], scale: 1.2, color: '#ffb81f', style: STYLE.GLOW })
    }
  },
  icespire(p) {
    p.add(new CylinderGeometry(1.7, 3.2, LAYER_H, 7), { position: [0, LAYER_H / 2, 0], color: '#ffffff' })
    for (let y = 8; y < LAYER_H; y += 14) {
      p.add(new TorusGeometry(2.9 - y * 0.017, 0.35, 4, 14), { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], color: '#e8faff', style: STYLE.GLOW })
      for (const a of [0, 2.1, 4.2]) p.add(cone, { position: [Math.cos(a + y) * 3, y - 1.8, Math.sin(a + y) * 3], scale: [0.4, 3, 0.4], rotation: [Math.PI, 0, 0], color: '#ffffff' })
    }
  },
}
const PILLAR_IDS = Object.keys(PILLAR_KITS)

/** Every floating prop's merged geometry, built once; about a metre to a few metres across. */
const KITS = {
  canopy(p) {
    p.add(ball, { position: [0, 0, 0], scale: [4.4, 3, 4.4], color: '#4fbf3a' })
    p.add(ball, { position: [2.4, -0.6, 1], scale: 2.6, color: '#3aa832' })
    p.add(ball, { position: [-2.2, 0.4, -1.2], scale: 2.7, color: '#6ad84e' })
    p.add(ball, { position: [0.4, 2, 0.6], scale: 2.2, color: '#7ae05a' })
    p.add(ball, { position: [1.2, 1.2, -2], scale: 0.4, color: '#ff3b5c' })
    p.add(ball, { position: [-1.6, 1, 1.8], scale: 0.4, color: '#ff3b5c' })
  },
  /** A floating island: a rocky underside tapering to a point, a grassy top, a tree and a waterfall spilling off. */
  island(p) {
    p.add(cone, { position: [0, -2.6, 0], scale: [4.2, 5, 4.2], rotation: [Math.PI, 0, 0], color: '#8a7058' })
    p.add(cone, { position: [0.8, -4.2, 0.6], scale: [1.6, 2.6, 1.6], rotation: [Math.PI, 0, 0], color: '#6e5844' })
    p.add(disc, { position: [0, 0, 0], scale: [4.4, 0.6, 4.4], color: '#5ad048' })
    p.add(disc, { position: [0, 0.32, 0], scale: [3.8, 0.12, 3.8], color: '#7ae05a' })
    p.add(disc, { position: [-1.2, 1.6, -0.8], scale: [0.3, 2.6, 0.3], color: '#8a5a32' })
    p.add(ball, { position: [-1.2, 3.4, -0.8], scale: [1.6, 1.3, 1.6], color: '#3fbf3a' })
    p.add(ball, { position: [1.6, 0.8, -1.4], scale: 0.7, color: '#ff8ad8' })
    // The waterfall off its edge, and a pool on top it spills from.
    p.add(disc, { position: [2.2, 0.36, 1.2], scale: [1, 0.06, 1], color: '#5ad8ff', style: STYLE.WATER })
    p.box(3.9, -3, 1.6, 0.9, 6.4, 0.3, '#9fe8ff', STYLE.WATER)
    p.add(ball, { position: [3.9, -6.4, 1.6], scale: [1.2, 0.4, 1.2], color: '#ffffff' })
  },
  /** The same island, deep in snow, with an ice crystal instead of a tree. */
  iceisland(p) {
    p.add(cone, { position: [0, -2.6, 0], scale: [4.2, 5, 4.2], rotation: [Math.PI, 0, 0], color: '#8a98b0' })
    p.add(disc, { position: [0, 0, 0], scale: [4.4, 0.7, 4.4], color: '#ffffff' })
    p.add(hex, { position: [0.6, 2, 0], scale: [0.9, 4, 0.9], rotation: [0.1, 0, 0.15], color: '#9fe8ff', style: STYLE.GLOW })
    p.add(hex, { position: [-1, 1.2, 0.8], scale: [0.6, 2.4, 0.6], rotation: [-0.2, 0, -0.3], color: '#cff4ff', style: STYLE.GLOW })
    p.add(cone, { position: [2.6, -1.6, 0], scale: [0.4, 2, 0.4], rotation: [Math.PI, 0, 0], color: '#e8faff' })
  },
  treehouse(p) {
    p.add(disc, { position: [0, -1.2, 0], scale: [3.2, 0.3, 3.2], color: '#a8743e' })
    p.box(0, 0, 0, 2.6, 2, 2.4, '#f4e2b8', STYLE.SMOOTH)
    p.add(cone, { position: [0, 1.8, 0], scale: [2.3, 1.6, 2.3], rotation: [0, Math.PI / 4, 0], color: '#e8423c' })
    p.box(0, -0.2, 1.22, 0.7, 1.2, 0.05, '#6a3a1e', STYLE.SMOOTH)
    p.add(disc, { position: [0.8, 0.3, 1.22], scale: [0.35, 0.05, 0.35], rotation: [Math.PI / 2, 0, 0], color: '#ffe27a', style: STYLE.GLOW })
    p.add(ball, { position: [0, -2.4, 0], scale: [3.4, 1.4, 3.4], color: '#4fbf3a' })
  },
  leafy(p) {
    for (let i = 0; i < 4; i += 1) p.add(lowBall, { position: [Math.cos(i * 1.6) * 1.2, i * 0.3 - 0.5, Math.sin(i * 1.6) * 1.2], scale: [1.4, 0.35, 0.8], rotation: [0, i, 0.3], color: i % 2 ? '#7ae05a' : '#4fbf3a' })
  },
  birdhouse(p) {
    p.add(disc, { position: [0, -2, 0], scale: [0.15, 3, 0.15], color: '#8a5a32' })
    p.box(0, 0, 0, 1.2, 1.3, 1.2, '#ffd23a', STYLE.SMOOTH)
    p.add(cone, { position: [0, 1.05, 0], scale: [1.1, 0.8, 1.1], rotation: [0, Math.PI / 4, 0], color: '#2fa8ff' })
    p.add(disc, { position: [0, 0.1, 0.61], scale: [0.25, 0.04, 0.25], rotation: [Math.PI / 2, 0, 0], color: '#1b1b1f' })
  },
  bird(p) {
    p.add(ball, { position: [0, 0, 0], scale: [0.5, 0.45, 0.7], color: '#ff6a3a' })
    p.add(ball, { position: [0, 0.35, 0.5], scale: 0.32, color: '#ff6a3a' })
    p.add(cone, { position: [0, 0.32, 0.88], scale: [0.1, 0.25, 0.1], rotation: [Math.PI / 2, 0, 0], color: '#ffd23a' })
    for (const s of [-1, 1]) p.box(s * 0.7, 0.1, 0, 0.9, 0.06, 0.45, '#ff8a5a', STYLE.SMOOTH, [0, 0, s * 0.35])
  },
  lolly(p) {
    p.add(disc, { position: [0, -2.5, 0], scale: [0.18, 4, 0.18], color: '#ffffff' })
    p.add(disc, { position: [0, 0.5, 0], scale: [2, 0.5, 2], rotation: [Math.PI / 2, 0, 0], color: '#ffffff' })
    p.add(ring, { position: [0, 0.5, 0.26], scale: [1.3, 1.3, 2], color: '#ffffff', style: STYLE.GLOW })
    p.add(ring, { position: [0, 0.5, 0.26], scale: [0.65, 0.65, 2], color: '#ffffff', style: STYLE.GLOW })
  },
  gumdrop(p) {
    p.add(new CylinderGeometry(1.2, 1.8, 1.6, 14), { position: [0, 0, 0], color: '#ffffff' })
    p.add(new SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { position: [0, 0.8, 0], color: '#ffffff' })
    for (let k = 0; k < 8; k += 1) p.add(lowBall, { position: [Math.cos(k) * 1.45, Math.sin(k * 3) * 0.6, Math.sin(k) * 1.45], scale: 0.12, color: '#ffffff', style: STYLE.GLOW })
  },
  candy(p) {
    p.add(ball, { position: [0, 0, 0], scale: [1.6, 1.2, 1.2], color: '#ffffff' })
    p.add(cone, { position: [-2, 0, 0], scale: [1, 1.2, 1], rotation: [0, 0, -Math.PI / 2], color: '#ffffff' })
    p.add(cone, { position: [2, 0, 0], scale: [1, 1.2, 1], rotation: [0, 0, Math.PI / 2], color: '#ffffff' })
    p.box(0, 0, 0, 0.5, 2.5, 2.5, '#fff6d8', STYLE.SMOOTH)
  },
  pinkcloud(p) {
    for (const [x, y, z, r] of [
      [0, 0, 0, 2.4],
      [-2.4, -0.5, 0.3, 1.8],
      [2.5, -0.4, -0.2, 1.9],
      [0.9, 1.1, 0.4, 1.6],
    ])
      p.add(ball, { position: [x, y, z], scale: r, color: '#ffd0ec' })
  },
  cloud(p) {
    for (const [x, y, z, r] of [
      [0, 0, 0, 2.4],
      [-2.4, -0.5, 0.3, 1.8],
      [2.5, -0.4, -0.2, 1.9],
      [0.9, 1.1, 0.4, 1.6],
      [-1.1, 0.9, -0.4, 1.5],
    ])
      p.add(ball, { position: [x, y, z], scale: r, color: '#ffffff' })
  },
  castle(p) {
    for (const [x, z, r] of [
      [0, 0, 4],
      [-3.5, 1, 3],
      [3.6, -0.5, 3.2],
    ])
      p.add(ball, { position: [x, -1.6, z], scale: [r, 1.8, r], color: '#ffffff' })
    p.box(0, 1.2, 0, 4.2, 3, 3, '#fff6fb', STYLE.SMOOTH)
    for (const [x, z, h] of [
      [-2.4, 1.2, 5],
      [2.4, 1.2, 5],
      [0, -0.6, 7],
    ]) {
      p.add(disc, { position: [x, h / 2, z], scale: [0.9, h, 0.9], color: '#fff6fb' })
      p.add(cone, { position: [x, h + 0.9, z], scale: [1.2, 1.8, 1.2], color: '#ff6ab8' })
      p.add(disc, { position: [x, h * 0.7, z + 0.85], scale: [0.3, 0.05, 0.3], rotation: [Math.PI / 2, 0, 0], color: '#ffe27a', style: STYLE.GLOW })
    }
    p.box(0.4, 9.2, -0.6, 0.06, 1.4, 0.06, '#8a5a32', STYLE.SMOOTH)
    p.box(0.85, 9.6, -0.6, 0.8, 0.5, 0.05, '#ffd23a', STYLE.GLOW)
  },
  rainbow(p) {
    const colors = ['#ff5a5a', '#ffa83a', '#ffe23a', '#4fd06a', '#3fa8ff', '#a05aff']
    colors.forEach((c, i) => p.add(new TorusGeometry(7 - i * 0.55, 0.3, 6, 24, Math.PI), { position: [0, -2, 0], color: c, style: STYLE.GLOW }))
    p.add(ball, { position: [-6.7, -2.4, 0], scale: 2, color: '#ffffff' })
    p.add(ball, { position: [6.7, -2.4, 0], scale: 2, color: '#ffffff' })
  },
  balloon(p) {
    p.add(sphere, { position: [0, 2, 0], scale: [2.2, 2.6, 2.2], color: '#ff5a5a' })
    p.add(sphere, { position: [0, 2, 0], scale: [2.24, 2.4, 0.9], color: '#ffd23a' })
    p.add(cone, { position: [0, -0.4, 0], scale: [1.1, 1.2, 1.1], rotation: [Math.PI, 0, 0], color: '#ff5a5a' })
    p.box(0, -1.8, 0, 1.1, 0.8, 1.1, '#a8743e', STYLE.SMOOTH)
  },
  crystal(p) {
    for (const [x, z, h, lean] of [
      [0, 0, 4.5, 0],
      [1.3, 0.4, 3, 0.35],
      [-1.2, 0.6, 3.4, -0.4],
      [0.3, -1.2, 2.6, 0.3],
      [-0.6, -0.9, 2.2, -0.3],
    ]) {
      const r = 0.55 + h * 0.08
      p.add(hex, { position: [x, h / 2 - 1.5, z], scale: [r, h, r], rotation: [lean * 0.6, 0, lean], color: '#ffffff' })
      p.add(hexCone, { position: [x + Math.sin(-lean) * -h * 0.5, h - 1.5 + 0.6, z + lean * 0.6 * h * 0.5], scale: [r, 1.3, r], rotation: [lean * 0.6, 0, lean], color: '#ffffff', style: STYLE.GLOW })
    }
    p.add(lowBall, { position: [0, -1.8, 0], scale: [2.2, 0.8, 2], color: '#5a4e7a' })
  },
  gem(p) {
    p.add(octa, { position: [0, 0, 0], scale: [1.2, 1.7, 1.2], color: '#ffffff', style: STYLE.GLOW })
    p.add(octa, { position: [0, 0, 0], scale: [1.35, 0.5, 1.35], color: '#ffffff' })
  },
  bigdiamond(p) {
    // A brilliant cut: a flat crown over a deep pointed pavilion, a glowing heart inside.
    p.add(new CylinderGeometry(2.4, 3.6, 1.4, 8), { position: [0, 1.2, 0], color: '#ffffff' })
    p.add(new ConeGeometry(3.6, 4.6, 8), { position: [0, -2.8, 0], rotation: [Math.PI, 0, 0], color: '#f0faff' })
    p.add(octa, { position: [0, -0.6, 0], scale: [1.2, 1.6, 1.2], color: '#ffffff', style: STYLE.GLOW })
  },
  syrup(p) {
    p.add(disc, { position: [0, 0, 0], scale: [1.1, 3, 1.1], color: '#c06a1a', style: STYLE.GLOW })
    p.add(disc, { position: [0, 1.8, 0], scale: [0.6, 0.6, 0.6], color: '#c06a1a' })
    p.add(disc, { position: [0, 2.3, 0], scale: [0.45, 0.4, 0.45], color: '#e8423c' })
    p.box(0, 0, 1.05, 1.4, 1.4, 0.1, '#fff1d0', STYLE.SMOOTH)
    p.add(ball, { position: [0, 0, 1.12], scale: [0.4, 0.4, 0.05], color: '#4a8a2a' })
  },
  butter(p) {
    p.box(0, 0, 0, 2, 1.3, 1.5, '#fff17a', STYLE.SMOOTH, [0.2, 0.5, 0.1])
    p.box(0, 0.7, 0, 1.6, 0.06, 1.2, '#fff8c0', STYLE.SMOOTH, [0.2, 0.5, 0.1])
  },
  stack(p) {
    addPancake(p, 'ice', { scale: 5 })
  },
  honeydrip(p) {
    p.add(sphere, { position: [0, 0, 0], scale: [1.8, 1.6, 1.8], color: '#e89c1a' })
    p.add(disc, { position: [0, 1.6, 0], scale: [1.3, 0.4, 1.3], color: '#c87a1a' })
    p.add(disc, { position: [0, 1.95, 0], scale: [1.5, 0.3, 1.5], color: '#ffb81f', style: STYLE.GLOW })
    p.box(0, 0.2, 1.75, 1.4, 0.8, 0.1, '#fff1d0', STYLE.SMOOTH)
    for (const a of [0.4, 2, 3.6, 5]) p.add(cone, { position: [Math.cos(a) * 1.4, 1, Math.sin(a) * 1.4], scale: [0.3, 1.4, 0.3], rotation: [Math.PI, 0, 0], color: '#ffb81f', style: STYLE.GLOW })
  },
  snowflake(p) {
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2
      p.box(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0, 2.6, 0.22, 0.12, '#ffffff', STYLE.GLOW, [0, 0, a])
      for (const d of [1.4, 2]) {
        for (const s of [-1, 1]) p.box(Math.cos(a) * d + Math.cos(a + s * 1) * 0.3, Math.sin(a) * d + Math.sin(a + s * 1) * 0.3, 0, 0.7, 0.16, 0.1, '#ffffff', STYLE.GLOW, [0, 0, a + s * 1])
      }
    }
  },
  iceblock(p) {
    p.box(0, 0, 0, 2.6, 2.6, 2.6, '#ffffff', STYLE.SMOOTH, [0.4, 0.6, 0.2])
    p.box(0, 0, 0, 1.6, 1.6, 1.6, '#ffffff', STYLE.GLOW, [0.4, 0.6, 0.2])
  },
  ribbon(p) {
    for (let i = 0; i < 9; i += 1) p.box(i * 1.6 - 6.4, Math.sin(i * 0.8) * 1.4, Math.cos(i * 0.7) * 0.6, 1.7, 4 + Math.sin(i) * 1.5, 0.08, i % 2 ? '#5affc8' : '#7a8aff', STYLE.GLOW, [0, 0.3 * Math.sin(i), 0])
  },
  star(p) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2
      p.add(cone, { position: [Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0], scale: [0.5, 1.4, 0.25], rotation: [0, 0, -a], color: '#fff36a', style: STYLE.GLOW })
    }
    p.add(lowBall, { position: [0, 0, 0], scale: [0.75, 0.75, 0.35], color: '#fff36a', style: STYLE.GLOW })
  },
  planet(p) {
    p.add(sphere, { position: [0, 0, 0], scale: 4, color: '#fff0e0' })
    p.add(sphere, { position: [0, 0.8, 0], scale: [4.05, 0.8, 4.05], color: '#ffffff' })
    p.add(new TorusGeometry(6.2, 0.6, 3, 40), { position: [0, 0, 0], rotation: [Math.PI / 2 - 0.4, 0, 0.2], scale: [1, 1, 0.15], color: '#ffffff', style: STYLE.GLOW })
  },
  satellite(p) {
    p.box(0, 0, 0, 1.2, 1.2, 1.6, '#d8dee8', STYLE.SMOOTH)
    for (const s of [-1, 1]) p.box(s * 2.2, 0, 0, 2.8, 0.06, 1.2, '#2a4fd8', STYLE.GLOW)
    p.add(cone, { position: [0, 0, 1.2], scale: [0.6, 0.5, 0.6], rotation: [-Math.PI / 2, 0, 0], color: '#ffffff' })
  },
  asteroid(p) {
    p.add(lowBall, { position: [0, 0, 0], scale: [2.2, 1.6, 1.8], color: '#8a7a6a' })
    p.add(lowBall, { position: [0.9, 0.6, 1], scale: 0.5, color: '#5a4e44' })
    p.add(lowBall, { position: [-0.8, -0.3, 1.1], scale: 0.4, color: '#5a4e44' })
  },
  rocket(p) {
    p.add(disc, { position: [0, 0, 0], scale: [1, 4, 1], color: '#f4f7fb' })
    p.add(cone, { position: [0, 3, 0], scale: [1, 2, 1], color: '#ff3b5c' })
    p.add(disc, { position: [0, 0.8, 1], scale: [0.45, 0.1, 0.45], rotation: [Math.PI / 2, 0, 0], color: '#5ae8ff', style: STYLE.GLOW })
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2
      p.box(Math.cos(a) * 1.1, -1.6, Math.sin(a) * 1.1, 0.15, 1.6, 1.2, '#ff3b5c', STYLE.SMOOTH, [0, -a, 0])
    }
    p.add(cone, { position: [0, -3, 0], scale: [0.8, 2.2, 0.8], rotation: [Math.PI, 0, 0], color: '#ffb81f', style: STYLE.GLOW })
  },
  swirl(p) {
    p.add(disc, { position: [0, 0, 0], scale: [1.4, 0.4, 1.4], color: '#ffffff', style: STYLE.GLOW })
    for (let k = 0; k < 18; k += 1) {
      const t = k / 18
      for (const arm of [0, Math.PI]) {
        const a = arm + t * Math.PI * 2.2
        const r = 1.5 + t * 6
        p.add(lowBall, { position: [Math.cos(a) * r, 0, Math.sin(a) * r], scale: [1.1 - t * 0.5, 0.25, 1.1 - t * 0.5], color: '#ffffff', style: STYLE.GLOW })
      }
    }
  },
  /** A globular star cluster: a glowing core in a ball of little stars, thickest at the middle. */
  cluster(p) {
    const r = mulberry32(77)
    p.add(ball, { position: [0, 0, 0], scale: 1.9, color: '#ffffff', style: STYLE.GLOW })
    for (let n = 0; n < 40; n += 1) {
      const d = 1.8 + r() ** 2 * 6
      const u = r() * Math.PI * 2
      const v = Math.acos(r() * 2 - 1)
      p.add(lowBall, { position: [Math.sin(v) * Math.cos(u) * d, Math.cos(v) * d, Math.sin(v) * Math.sin(u) * d], scale: 0.14 + r() * 0.3, color: '#ffffff', style: STYLE.GLOW })
    }
    for (const [x, y] of [
      [3.6, 2.4],
      [-3.2, -2.8],
    ]) {
      p.box(x, y, 0, 3, 0.2, 0.2, '#ffffff', STYLE.GLOW)
      p.box(x, y, 0, 0.2, 3, 0.2, '#ffffff', STYLE.GLOW)
    }
  },
  blackhole(p) {
    p.add(sphere, { position: [0, 0, 0], scale: 3, color: '#05010f' })
    p.add(new TorusGeometry(4.6, 0.7, 6, 40), { position: [0, 0, 0], rotation: [Math.PI / 2 - 0.3, 0, 0], color: '#ff8ae0', style: STYLE.GLOW })
    p.add(new TorusGeometry(6.2, 0.3, 4, 40), { position: [0, 0, 0], rotation: [Math.PI / 2 - 0.3, 0, 0], color: '#b48aff', style: STYLE.GLOW })
  },
}
const KIT_IDS = Object.keys(KITS)
/** Kits drawn in white so their world's `propTint` colours them. */
const TINTED = new Set(['lolly', 'gumdrop', 'candy', 'crystal', 'gem', 'bigdiamond', 'snowflake', 'iceblock', 'planet', 'swirl', 'cluster'])

/** One layer's prop slots, laid out once per layer from a seeded random: kind, place, turn, size. */
function layoutLayer(index, theme) {
  const r = mulberry32(index * 7919 + 13)
  const kinds = skyTheme(theme).props
  return Array.from({ length: PROPS_PER_LAYER }, (_, k) => {
    // Round the column, out of the camera's side (it hangs south of the pancake, +Z) close in.
    let a = r() * Math.PI * 2
    const d = NEAR + r() * (FAR - NEAR)
    if (d < 30 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.9) a += Math.PI
    return {
      kind: kinds[k % kinds.length],
      x: COLUMN.x + Math.sin(a) * d,
      y: layerY(index) + r() * LAYER_H,
      z: COLUMN.z + Math.cos(a) * d,
      yaw: r() * Math.PI * 2,
      size: 0.8 + r() * 0.7,
      tint: k,
      density: r(),
    }
  })
}

/** Where pillar `k` of a world stands: the same spots all the way up, so the columns run unbroken. */
function pillarSpot(theme, k, out) {
  const seed = theme.length * 1.7
  const a = seed + (k / PILLARS) * Math.PI * 2
  const r = PILLAR_R + Math.sin(k * 2.3 + seed) * 5
  return out.set(COLUMN.x + Math.sin(a) * r, 0, COLUMN.z + Math.cos(a) * r)
}

const moteVertex = /* glsl */ `
  attribute float aPick;
  uniform float uBase;
  uniform float uScroll;
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uColors[4];
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    // Wrapped round the pancake's height, streaming down past it as it climbs.
    p.y = mod(p.y - uScroll, ${MOTE_H.toFixed(1)}) - ${(MOTE_H / 2).toFixed(1)} + uBase;
    p.x += sin(uTime * 0.7 + position.y * 0.3) * 1.2;
    p.z += cos(uTime * 0.6 + position.x * 0.2) * 1.2;
    int i = int(aPick * 3.99);
    vColor = i == 0 ? uColors[0] : i == 1 ? uColors[1] : i == 2 ? uColors[2] : uColors[3];
    vTwinkle = 0.6 + 0.4 * sin(uTime * 4.0 + aPick * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + aPick) * (300.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`
const moteFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    // A little four-point glint on top of the soft dot.
    float glint = max(0.0, 1.0 - abs(c.x) * 14.0) * smoothstep(0.5, 0.0, abs(c.y)) + max(0.0, 1.0 - abs(c.y) * 14.0) * smoothstep(0.5, 0.0, abs(c.x));
    gl_FragColor = vec4(vColor * (0.8 + glint), (a * 0.85 + glint * 0.5) * vTwinkle * uOpacity);
    #include <colorspace_fragment>
  }
`

function createMotes(count) {
  const r = mulberry32(99)
  const positions = new Float32Array(count * 3)
  const picks = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = COLUMN.x + (r() - 0.5) * 2 * MOTE_BOX
    positions[i * 3 + 1] = r() * MOTE_H
    positions[i * 3 + 2] = COLUMN.z + (r() - 0.5) * 2 * MOTE_BOX
    picks[i] = r()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aPick', new BufferAttribute(picks, 1))
  const material = new ShaderMaterial({
    uniforms: {
      uBase: { value: 0 },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1.6 },
      uOpacity: { value: 0 },
      uColors: { value: [new Color(), new Color(), new Color(), new Color()] },
    },
    vertexShader: moteVertex,
    fragmentShader: moteFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.visible = false
  return points
}

/**
 * The sky the pancake climbs through, world after world (skyThemes.js): giant pillars
 * walling the column - tree trunks in the Green World, candy canes, cloud towers, crystal
 * spires, honeycomb, ice - floating props round it, a glowing ring where each layer starts
 * and a big gate where each world begins, drifting motes (leaves, sprinkles, sparkles,
 * snow, stars) and the sky's colours blending from world to world.
 *
 * Only the layers by the pancake are drawn, one instanced mesh per kind showing, re-placed
 * only when it enters a new layer. LOW has fewer props and no motes (no particles).
 */
export default function SkyLayers() {
  const scene = useThree((s) => s.scene)
  const density = useQuality((s) => s.settings.decorDensity)
  const particles = useQuality((s) => s.settings.particles)
  const level = useQuality((s) => s.level)
  const groupRef = useRef(null)
  const kitsRef = useRef(null)
  const pillarsRef = useRef(null)
  const ringRef = useRef(null)
  const gateRef = useRef(null)
  const motesRef = useRef(null)
  const shownFor = useRef({ floor: -99, density: -1, startedAt: -1, world: null })

  const kits = useMemo(() => {
    const build = (table, ids, max) =>
      ids.map((id) => {
        const p = new PropBuilder()
        table[id](p)
        const mesh = createToyInstances(p.build(), sharedMaterials().toy, max)
        mesh.visible = false
        return mesh
      })
    return { props: build(KITS, KIT_IDS, KIT_MAX), pillars: build(PILLAR_KITS, PILLAR_IDS, PILLARS * SHOWN_LAYERS) }
  }, [])
  const rings = useMemo(() => {
    const p = new PropBuilder()
    p.add(new TorusGeometry(1, 0.012, 4, 64), { rotation: [Math.PI / 2, 0, 0], color: '#ffffff', style: STYLE.GLOW })
    const mesh = createToyInstances(p.build(), sharedMaterials().toy, SHOWN_LAYERS + 1)
    mesh.visible = false
    return mesh
  }, [])
  const gates = useMemo(() => {
    // A world's gate: a fat glowing ring with a halo and studs of light round it.
    const p = new PropBuilder()
    p.add(new TorusGeometry(1, 0.06, 8, 72), { rotation: [Math.PI / 2, 0, 0], color: '#ffffff', style: STYLE.GLOW })
    p.add(new TorusGeometry(1.12, 0.015, 4, 72), { rotation: [Math.PI / 2, 0, 0], color: '#ffffff', style: STYLE.GLOW })
    for (let k = 0; k < 12; k += 1) {
      const a = (k / 12) * Math.PI * 2
      p.add(octa, { position: [Math.cos(a), 0, Math.sin(a)], scale: [0.07, 0.12, 0.07], color: '#ffffff', style: STYLE.GLOW })
    }
    const mesh = createToyInstances(p.build(), sharedMaterials().toy, 2)
    mesh.visible = false
    return mesh
  }, [])
  const motes = useMemo(() => (particles ? createMotes(MOTES[level] ?? MOTES.MEDIUM) : null), [particles, level])

  useEffect(
    () => () => {
      for (const mesh of [...kits.props, ...kits.pillars]) {
        mesh.geometry.dispose()
        mesh.dispose()
      }
      rings.geometry.dispose()
      rings.dispose()
      gates.geometry.dispose()
      gates.dispose()
    },
    [kits, rings, gates],
  )
  useEffect(
    () => () => {
      if (!motes) return
      motes.geometry.dispose()
      motes.material.dispose()
    },
    [motes],
  )

  useFrame((state, rawDelta) => {
    const up = roll.active && roll.position.y > SKY_BASE * 0.5
    if (groupRef.current) groupRef.current.visible = up
    if (!up) {
      shownFor.current.floor = -99
      return
    }
    const delta = Math.min(rawDelta, 0.05)
    const list = zones()
    const floor = Math.max(0, roll.floor)
    const theme = list[floor]?.theme
    const look = skyTheme(theme)
    // The sky blends towards the world the pancake is in.
    blendSky(themeSkyLook(theme), 1 - Math.exp(-2.5 * delta), scene.fog)

    const mote = motesRef.current
    if (mote) {
      const u = mote.material.uniforms
      u.uBase.value = roll.position.y
      u.uScroll.value = roll.position.y * 0.55
      u.uTime.value = state.clock.elapsedTime
      u.uOpacity.value += ((roll.phase === 'air' || roll.landed ? 1 : 0) - u.uOpacity.value) * (1 - Math.exp(-3 * delta))
      mote.visible = true
    }

    // Spinning gates and the gentle turn of the props are in the instance matrices; only
    // rebuilt when the pancake moves into another layer.
    const gate = gateRef.current
    if (gate && gate.count > 0) gate.rotation.y += delta * 0.4

    const shown = shownFor.current
    if (shown.floor === floor && shown.density === density && shown.startedAt === roll.startedAt) return
    shown.floor = floor
    shown.density = density
    shown.startedAt = roll.startedAt
    if (mote && shown.world !== theme) {
      shown.world = theme
      const colors = mote.material.uniforms.uColors.value
      for (let i = 0; i < 4; i += 1) colors[i].set(look.motes[i % look.motes.length])
    }

    const propMeshes = kitsRef.current?.children
    const pillarMeshes = pillarsRef.current?.children
    const ringMesh = ringRef.current
    if (!propMeshes || !pillarMeshes || !ringMesh || !gate) return
    counts.fill(0)
    pillarCounts.fill(0)
    let ringCount = 0
    let gateCount = 0
    const pillarStep = density < 0.6 ? 2 : 1
    for (let i = floor - BELOW; i <= floor + ABOVE; i += 1) {
      if (i < 0 || i >= list.length) continue
      const layerTheme = list[i].theme
      const t = skyTheme(layerTheme)
      // The world's pillars, a segment for this layer.
      const pi = PILLAR_IDS.indexOf(t.pillars)
      if (pi >= 0) {
        const mesh = pillarMeshes[pi]
        for (let k = 0; k < PILLARS; k += pillarStep) {
          pillarSpot(layerTheme, k, _p)
          _p.y = layerY(i)
          _q.setFromAxisAngle(_up, k * 1.9 + i * 0.6)
          const w = 0.85 + ((k * 37) % 10) / 30
          _s.set(w, 1, w)
          const n = pillarCounts[pi]
          mesh.setMatrixAt(n, _m.compose(_p, _q, _s))
          mesh.setColorAt(n, t.pillarTint ? _color.set(t.pillarTint[k % t.pillarTint.length]) : WHITE)
          pillarCounts[pi] += 1
        }
      }
      for (const slot of layoutLayer(i, layerTheme)) {
        if (slot.density > density) continue
        const ki = KIT_IDS.indexOf(slot.kind)
        if (ki < 0 || counts[ki] >= KIT_MAX) continue
        const mesh = propMeshes[ki]
        _p.set(slot.x, slot.y, slot.z)
        _q.setFromAxisAngle(_up, slot.yaw)
        _s.setScalar(slot.size)
        mesh.setMatrixAt(counts[ki], _m.compose(_p, _q, _s))
        mesh.setColorAt(counts[ki], TINTED.has(slot.kind) && t.propTint ? _color.set(t.propTint[slot.tint % t.propTint.length]) : WHITE)
        counts[ki] += 1
      }
      // The ring where this layer starts - or, where a world begins, its great gate.
      _p.set(COLUMN.x, layerY(i), COLUMN.z)
      _q.identity()
      if (startsWorld(list, i) && gateCount < 2) {
        _s.setScalar(15)
        gate.setMatrixAt(gateCount, _m.compose(_p.set(0, layerY(i) - gate.position.y, 0), _q, _s))
        gate.setColorAt(gateCount, _color.set(t.gate))
        gateCount += 1
      } else {
        _s.setScalar(9)
        ringMesh.setMatrixAt(ringCount, _m.compose(_p, _q, _s))
        ringMesh.setColorAt(ringCount, _color.set(t.ring))
        ringCount += 1
      }
    }
    const finish = (mesh, count) => {
      for (let k = count; k < mesh.count; k += 1) mesh.setMatrixAt(k, HIDDEN)
      mesh.count = count
      mesh.visible = count > 0
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    KIT_IDS.forEach((_, k) => finish(propMeshes[k], counts[k]))
    PILLAR_IDS.forEach((_, k) => finish(pillarMeshes[k], pillarCounts[k]))
    finish(ringMesh, ringCount)
    finish(gate, gateCount)
  })

  return (
    <group ref={groupRef} visible={false}>
      <group ref={kitsRef}>
        {kits.props.map((mesh) => (
          <primitive key={mesh.uuid} object={mesh} />
        ))}
      </group>
      <group ref={pillarsRef}>
        {kits.pillars.map((mesh) => (
          <primitive key={mesh.uuid} object={mesh} />
        ))}
      </group>
      <primitive ref={ringRef} object={rings} />
      {/* The gates turn slowly about the column: their mesh sits on it. */}
      <group position={[COLUMN.x, 0, COLUMN.z]}>
        <primitive ref={gateRef} object={gates} />
      </group>
      {motes && <primitive ref={motesRef} object={motes} />}
    </group>
  )
}
