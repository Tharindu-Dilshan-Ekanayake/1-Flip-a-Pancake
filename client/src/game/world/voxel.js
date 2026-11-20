import { STYLE } from '../materials'

/**
 * Voxel shapes for the blocky lobbies: round things built from cubes. A circle is drawn
 * as one long box per row of cells (its chord, rounded to whole cells), so it reads as a
 * stepped voxel circle for a handful of boxes - a disc of radius 3 is a dozen boxes.
 *
 * All go into a BlockSet (`blocks.add(x, yCentre, z, sx, sy, sz, color, style)`), so
 * they cost no draw calls of their own.
 */

/** Half the chord of a circle of radius `r` at offset `d` from its middle, rounded to whole cells. */
const chord = (r, d, cell) => (Math.abs(d) >= r ? 0 : Math.round(Math.sqrt(r * r - d * d) / cell) * cell)

/**
 * A voxel ring (an annulus; `rIn` 0 for a full disc) lying flat at (cx, cz), filled from
 * height y0 to y1.
 */
export function voxelRing(blocks, cx, cz, rIn, rOut, y0, y1, color, style = STYLE.SMOOTH, cell = 0.5) {
  const h = y1 - y0
  const y = (y0 + y1) / 2
  for (let d = -rOut + cell / 2; d < rOut; d += cell) {
    const outer = chord(rOut, d, cell)
    if (outer <= 0) continue
    const inner = rIn > 0 ? chord(rIn, d, cell) : 0
    if (inner <= 0) {
      blocks.add(cx, y, cz + d, outer * 2, h, cell, color, style)
    } else if (outer > inner) {
      const w = outer - inner
      for (const s of [-1, 1]) blocks.add(cx + s * (inner + w / 2), y, cz + d, w, h, cell, color, style)
    }
  }
}

/** A full voxel disc lying flat. */
export function voxelDisc(blocks, cx, cz, r, y0, y1, color, style = STYLE.SMOOTH, cell = 0.5) {
  voxelRing(blocks, cx, cz, 0, r, y0, y1, color, style, cell)
}

let wheelSerial = 0

/**
 * A voxel disc standing upright, its faces towards ±X (`axis` 'x') or ±Z ('z'), centred
 * at (cx, cy, cz), `thick` thick; `rIn` > 0 makes it a ring.
 */
export function voxelWheel(blocks, cx, cy, cz, rIn, rOut, thick, color, style = STYLE.SMOOTH, axis = 'x', cell = 0.4) {
  // Each wheel a hair bigger or smaller than the last, so two wheels layered together never
  // put a face in the same plane (no z-fighting where their stepped edges line up).
  const grow = (wheelSerial++ % 5) * 0.008
  for (let d = -rOut + cell / 2; d < rOut; d += cell) {
    const outer = chord(rOut, d, cell)
    if (outer <= 0) continue
    const inner = rIn > 0 ? chord(rIn, d, cell) : 0
    const put = (along, w) =>
      axis === 'x' ? blocks.add(cx, cy + d, cz + along, thick, cell + grow, w + grow, color, style) : blocks.add(cx + along, cy + d, cz, w + grow, cell + grow, thick, color, style)
    if (inner <= 0) put(0, outer * 2)
    else if (outer > inner) for (const s of [-1, 1]) put(s * (inner + (outer - inner) / 2), outer - inner)
  }
}

/**
 * A blocky pancake stack at (x, y, z): `layers` golden voxel cakes, a browned edge round
 * each, a pat of butter on top and a syrup drip.
 */
export function voxelPancakes(blocks, x, y, z, r, layers = 3) {
  const h = r * 0.22
  let top = y
  for (let i = 0; i < layers; i += 1) {
    const ri = r * (1 - i * 0.06)
    voxelDisc(blocks, x, z, ri, top, top + h, i % 2 ? '#e8a548' : '#f2b65a', STYLE.SMOOTH, Math.max(0.12, r / 6))
    voxelDisc(blocks, x, z, ri * 0.75, top + h, top + h + 0.02, '#ffd08a', STYLE.SMOOTH, Math.max(0.12, r / 6))
    top += h + 0.02
  }
  voxelDisc(blocks, x, z, r * 0.6, top, top + 0.04, '#c06a1a', STYLE.SMOOTH, Math.max(0.12, r / 6))
  blocks.add(x, top + r * 0.12, z, r * 0.4, r * 0.24, r * 0.4, '#fff17a', STYLE.SMOOTH)
  blocks.add(x + r * 0.8, top - h, z, r * 0.14, h * 2, r * 0.14, '#c06a1a', STYLE.SMOOTH)
  return top
}
