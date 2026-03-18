import type { CalculationResult, InheritanceCase } from '@mirath/core'

interface Props {
  result: CalculationResult
  inheritanceCase: InheritanceCase
  locale: 'en' | 'ar'
}

/**
 * Results table showing each heir and their share.
 * Flips to RTL layout when locale is 'ar'.
 * TODO: implement.
 */
export function ShareSummaryTable(_props: Props) {
  return null
}
