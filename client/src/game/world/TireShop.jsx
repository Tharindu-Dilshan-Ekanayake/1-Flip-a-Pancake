import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'

import { RARITIES, TIRES } from '@shared/balance'
import { SHOP_STAGES, STAND_SIZE, TIRE_STANDS } from '@shared/world'

import { useGame } from '../../store/game'
import { useQuality } from '../../store/quality'
import { asToyInstance, BlockSet, disposeBlocks, PropBuilder } from '../blocks'
import { createGlowInstances, disposeGlow } from '../glow'
import { standLabelSpec, standState } from '../labels/lobbyLabels'
import { updateWorldLabel } from '../labels/registry'
import { sharedMaterials, STYLE } from '../materials'
import { addPhone, PAN, phoneCase, phoneTrail } from '../phoneStyles'

/** Stand colours by state: green equipped, blue owned, red not yet. */
const STAND_COLORS = {
  equipped: new Color('#3fdc4a'),
  owned: new Color('#38c8ff'),
  buy: new Color('#ff3b3b'),
  locked: new Color('#b0262b'),
}

const _m = new Matrix4()
const _p = new Vector3()
const _halo = new Vector3()
const _haloQ = new Quaternion()
const _haloS = new Vector3()

/** Height of a stand's glowing cap above its pad; the phone stands on it. */
const CAP_TOP = 1.12
/** Showroom pans' scale: the bowl 2.2 m across. */
const SHOWN_PHONE = 2.2
/** A showroom pan's bowl centre, over its stand: it stands on the end of its handle. */
const PHONE_MID = CAP_TOP + (PAN.radius + PAN.handle) * SHOWN_PHONE + 0.05

/**
 * Standing up on its handle with the pancake facing the plaza (east, +X), tipped back a
 * little: the pan's cooking side (+Y) turned to +X, its handle (+Z) down.
 */
const SHOWN_TURN = (() => {
  const basis = new Matrix4().makeBasis(new Vector3(0, 0, -1), new Vector3(1, 0, 0), new Vector3(0, -1, 0))
  basis.premultiply(new Matrix4().makeRotationZ(-0.12))
  const e = new Euler().setFromRotationMatrix(basis, 'XYZ')
  return [e.x, e.y, e.z]
})()

/**
 * Display stands, all in one block set. The first TIRE_STANDS.length blocks are the
 * stands' tops themselves (recoloured by state, so their instance index is the stand
 * index); the trimmings follow.
 */
function buildStands() {
  const set = new BlockSet()
  const slab = STAND_SIZE - 0.4
  for (const stand of TIRE_STANDS) set.addOn(stand.x, stand.y - 0.1, stand.z, slab, 0.3, slab, '#ffffff', STYLE.STUDS)
  for (const stand of TIRE_STANDS) {
    const id = TIRES[stand.index].id
    const { x, y, z } = stand
    const e = slab / 2 + 0.1
    for (const side of [-1, 1]) {
      set.addOn(x, y - 0.1, z + side * e, slab + 0.5, 0.45, 0.3, '#6a4aa8', STYLE.SMOOTH)
      set.addOn(x + side * e, y - 0.1, z, 0.3, 0.45, slab + 0.2, '#6a4aa8', STYLE.SMOOTH)
    }
    // A glowing square ring on the stand in the phone's own colour.
    const glow = phoneTrail(id)
    for (const side of [-1, 1]) {
      set.addOn(x, y + 0.2, z + side * 1.25, 2.68, 0.06, 0.18, glow, STYLE.GLOW)
      set.addOn(x + side * 1.25, y + 0.2, z, 0.18, 0.06, 2.32, glow, STYLE.GLOW)
    }
    // Low pedestal with a cap in the phone's case colour.
    set.addOn(x, y + 0.2, z, 1.1, 0.7, 1.1, '#ffd23a', STYLE.SMOOTH)
    set.addOn(x, y + 0.9, z, 1.5, CAP_TOP - 0.9, 1.5, phoneCase(id), STYLE.GLOW)
  }
  // A blue carpet down the aisle between the two stages, edged in orange light.
  const [front, back] = SHOP_STAGES
  const aisleX = (Math.max(front.minX, back.minX) + Math.min(front.maxX, back.maxX)) / 2
  const length = front.maxZ - front.minZ
  const midZ = (front.minZ + front.maxZ) / 2
  set.addOn(aisleX, 0, midZ, 2.4, 0.06, length, '#1f5fd8', STYLE.SMOOTH)
  for (const side of [-1, 1]) set.addOn(aisleX + side * 1.25, 0, midZ, 0.18, 0.1, length, '#ff9a2e', STYLE.GLOW)
  return set.build(sharedMaterials().blocks)
}

/** Every showroom phone, standing on its stand, merged into one mesh. */
function buildPhones(light) {
  const p = new PropBuilder()
  for (const stand of TIRE_STANDS) {
    const id = TIRES[stand.index].id
    // Standing on its cap, however long this one is.
    const mid = PHONE_MID
    addPhone(p, id, { position: [stand.x, stand.y + mid, stand.z], rotation: SHOWN_TURN, scale: SHOWN_PHONE, light })
  }
  return asToyInstance(p.build(), sharedMaterials().toy)
}

/**
 * The phone shop: twenty-four display stands on the two showroom stages, each with its
 * phone standing on it, screen lit, a soft glow behind it in its rarity's colour. Stands
 * recolour and their labels rewrite as you buy and equip. Three draw calls: stands,
 * phones, halos.
 */
export function TireShop() {
  // As a string: the profile is a fresh copy after every update (a drop, a rep...).
  const ownedKey = useGame((s) => s.profile.ownedTires.join(','))
  const equipped = useGame((s) => s.profile.equippedTire)
  const level = useQuality((s) => s.level)
  const standsRef = useRef(null)
  const halosRef = useRef(null)

  const assets = useMemo(() => {
    const stands = buildStands()
    // On LOW the display pans use lighter parts (they're small on screen; it keeps the lobby in budget).
    const phones = buildPhones(level === 'LOW')
    const count = TIRES.length
    // A soft glow behind each phone in its rarity's colour: the rarer, the brighter it reads.
    const halos = createGlowInstances(count, 0.45)
    TIRES.forEach((tire, i) => halos.setColorAt(i, new Color(RARITIES[tire.rarity]?.color ?? '#ffffff')))
    halos.count = count
    return { stands, phones, halos }
  }, [level])

  useEffect(
    () => () => {
      disposeBlocks(assets.stands)
      disposeGlow(assets.halos)
      assets.phones.geometry.dispose()
      assets.phones.dispose()
    },
    [assets],
  )

  // Recolour stands and rewrite their labels whenever ownership changes.
  useEffect(() => {
    const stands = standsRef.current
    const profile = { ownedTires: ownedKey.split(','), equippedTire: equipped }
    for (const stand of TIRE_STANDS) {
      const state = standState(profile, stand.index)
      stands?.setColorAt(stand.index, STAND_COLORS[state])
      updateWorldLabel(`stand-${stand.index}`, standLabelSpec(stand.index, state))
    }
    if (stands?.instanceColor) stands.instanceColor.needsUpdate = true
  }, [ownedKey, equipped])

  useFrame((state) => {
    const halos = halosRef.current
    if (!halos) return
    const t = state.clock.elapsedTime
    for (const stand of TIRE_STANDS) {
      _p.set(stand.x, stand.y + PHONE_MID, stand.z)
      // Set back behind the phone as seen from the camera, so it glows round it, not over it.
      _halo.copy(_p).sub(state.camera.position).normalize().multiplyScalar(1.4).add(_p)
      const pulse = 1 + Math.sin(t * 1.6 + stand.index) * 0.05
      halos.setMatrixAt(stand.index, _m.compose(_halo, _haloQ, _haloS.setScalar(SHOWN_PHONE * 2.3 * pulse)))
    }
    halos.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive ref={standsRef} object={assets.stands} />
      <primitive object={assets.phones} />
      <primitive ref={halosRef} object={assets.halos} />
    </>
  )
}

export default TireShop
