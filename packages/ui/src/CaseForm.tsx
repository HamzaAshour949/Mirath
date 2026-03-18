import type { Deceased, Madhab } from '@mirath/core'

interface Props {
  onSubmit: (deceased: Deceased, madhab: Madhab) => void
  locale: 'en' | 'ar'
}

/**
 * Form to enter deceased details and select madhab.
 * Touch-friendly inputs with min 44px tap targets.
 * TODO: implement.
 */
export function CaseForm(_props: Props) {
  return null
}
