import type { InheritanceCase } from '@mirath/core'

interface Props {
  inheritanceCase: InheritanceCase
  onHeirSelect?: (heirId: string) => void
  readOnly?: boolean
}

/**
 * Interactive family tree canvas.
 * Touch-friendly — supports drag, tap, and pinch-zoom on tablets.
 * TODO: implement with a canvas or SVG tree layout library.
 */
export function FamilyTreeCanvas(_props: Props) {
  return null
}
