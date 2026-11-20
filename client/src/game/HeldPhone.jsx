import { forwardRef, useEffect, useMemo } from 'react'

import { asToyInstance } from './blocks'
import { handPhoneGeometry } from './handPhone'
import { sharedMaterials } from './materials'

/**
 * The pan in a character's right hand. The avatar moves this group onto its palm every
 * frame (its `handRef`). Its two children are the pan with its pancake in it and the
 * empty pan: `showPancake(group, inPan)` picks one, so while the cake is up in the air
 * the pan stays in your hand, empty.
 */
export const HeldPhone = forwardRef(function HeldPhone({ phoneId }, ref) {
  const full = useMemo(() => asToyInstance(handPhoneGeometry(phoneId, true), sharedMaterials().toy), [phoneId])
  const empty = useMemo(() => {
    const mesh = asToyInstance(handPhoneGeometry(phoneId, false), sharedMaterials().toy)
    mesh.visible = false
    return mesh
  }, [phoneId])
  // The geometry is shared (cached); only the meshes are this hand's.
  useEffect(
    () => () => {
      full.dispose()
      empty.dispose()
    },
    [full, empty],
  )
  return (
    <group ref={ref}>
      <primitive object={full} />
      <primitive object={empty} />
    </group>
  )
})

export default HeldPhone
