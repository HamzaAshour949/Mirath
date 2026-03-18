import type { HeirShare, Madhab } from './types'
import type { Fraction } from './types'
import { add, reduce, compare, ZERO } from './fractions'

/**
 * Awl (عول): When fixed shares sum > 1, all shares are reduced proportionally.
 * The denominator is increased to equal the sum of all numerators.
 *
 * e.g. shares of 1/2 + 1/3 + 1/4 = 6/12 + 4/12 + 3/12 = 13/12
 * → new denominator = 13, shares become 6/13, 4/13, 3/13
 */
export function applyAwl(shares: HeirShare[]): { shares: HeirShare[]; applied: boolean } {
  const fixed = shares.filter((s) => s.shareType === 'fixed' && s.fraction)

  // Bring all to a common denominator
  const lcmDenom = fixed.reduce((acc, s) => {
    const d = s.fraction!.denominator
    return lcm(acc, d)
  }, 1)

  const numeratorSum = fixed.reduce((acc, s) => {
    return acc + s.fraction!.numerator * (lcmDenom / s.fraction!.denominator)
  }, 0)

  if (numeratorSum <= lcmDenom) {
    return { shares, applied: false }
  }

  // Awl: new denominator = numeratorSum
  const awlShares = shares.map((s) => {
    if (s.shareType !== 'fixed' || !s.fraction) return s
    const newNumerator = s.fraction.numerator * (lcmDenom / s.fraction.denominator)
    return {
      ...s,
      fraction: reduce({ numerator: newNumerator, denominator: numeratorSum }),
    }
  })

  return { shares: awlShares, applied: true }
}

/**
 * Radd (رد): When fixed shares sum < 1 and there are no asaba heirs,
 * the remainder is returned proportionally to eligible fixed-share heirs.
 *
 * Spouse (husband/wife) does NOT receive radd in Maliki, Shafi'i, Hanbali.
 * In Hanafi: spouse receives radd only when they are the SOLE heir.
 */
export function applyRadd(
  shares: HeirShare[],
  madhab: Madhab,
  hasAsaba: boolean,
): { shares: HeirShare[]; applied: boolean } {
  if (hasAsaba) return { shares, applied: false }

  const spouseRelations = new Set(['husband', 'wife'])

  // Compute sum of fixed shares
  const fixed = shares.filter((s) => s.shareType === 'fixed' && s.fraction)
  if (fixed.length === 0) return { shares, applied: false }

  const lcmDenom = fixed.reduce((acc, s) => lcm(acc, s.fraction!.denominator), 1)
  const numeratorSum = fixed.reduce(
    (acc, s) => acc + s.fraction!.numerator * (lcmDenom / s.fraction!.denominator),
    0,
  )

  if (numeratorSum >= lcmDenom) return { shares, applied: false }

  // Remainder numerator (in units of lcmDenom denominator)
  const remainderN = lcmDenom - numeratorSum

  // Who gets radd?
  // In Hanafi: everyone including spouse (but spouse only if sole heir)
  // In Maliki/Shafi'i/Hanbali: everyone except spouse
  const raddEligible = shares.filter((s) => {
    if (s.shareType !== 'fixed' || !s.fraction) return false
    if (madhab === 'hanafi') return true
    // For other madhabs: skip spouses unless they are the only fixed-share heir
    return true // we'll handle spouse exclusion below
  })

  const nonSpouseFixed = fixed.filter((s) => {
    // We need to know the relation — it's stored on the heir, not on HeirShare
    // We use a heuristic: reason string contains 'husband' or 'wife'
    return !s.reason.includes('husband') && !s.reason.includes('wife')
  })

  const spouseFixed = fixed.filter(
    (s) => s.reason.includes('husband') || s.reason.includes('wife'),
  )

  let raddRecipients: HeirShare[]

  if (madhab === 'hanafi') {
    // Spouse gets radd only if they are the sole heir
    if (nonSpouseFixed.length === 0) {
      raddRecipients = spouseFixed
    } else {
      raddRecipients = nonSpouseFixed
    }
  } else {
    // Maliki, Shafi'i, Hanbali: no radd to spouse
    raddRecipients = nonSpouseFixed.length > 0 ? nonSpouseFixed : []
  }

  if (raddRecipients.length === 0) return { shares, applied: false }

  // Distribute remainder proportionally among radd recipients
  const raddDenom = raddRecipients.reduce(
    (acc, s) => acc + s.fraction!.numerator * (lcmDenom / s.fraction!.denominator),
    0,
  )

  const raddMap = new Map<string, Fraction>()
  for (const s of raddRecipients) {
    const originalN = s.fraction!.numerator * (lcmDenom / s.fraction!.denominator)
    const totalN = originalN + (originalN / raddDenom) * remainderN
    // Express as fraction: originalN * (raddDenom + remainderN) / (raddDenom * lcmDenom)
    const newN = originalN * (raddDenom + remainderN)
    const newD = raddDenom * lcmDenom
    raddMap.set(s.heirId, reduce({ numerator: newN, denominator: newD }))
  }

  const newShares = shares.map((s) => {
    const newFrac = raddMap.get(s.heirId)
    if (!newFrac) return s
    return { ...s, fraction: newFrac, reason: s.reason + ' (+ radd)' }
  })

  return { shares: newShares, applied: true }
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}
