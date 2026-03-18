import type { InheritanceCase, CalculationResult, HeirShare, Fraction } from './types'
import { applyHajb } from './hajb'
import { assignFixedShares } from './fixed-shares'
import { assignAsaba } from './asaba'
import { applyAwl, applyRadd } from './awl-radd'
import { add, reduce, ZERO } from './fractions'

export function calculate(inheritanceCase: InheritanceCase): CalculationResult {
  const { id, madhab, deceased, heirs } = inheritanceCase
  const estate = deceased.totalEstate
  const warnings: string[] = []

  // Step 1: apply Hajb — determine blocked heirs
  const blocked = applyHajb(heirs, madhab)

  // Step 2: assign fixed shares to eligible heirs
  const fixedAssignments = assignFixedShares(heirs, madhab, blocked)

  // Separate fixed-share heirs from those pending residuary evaluation
  const fixedOnes = fixedAssignments.filter((a) => a.shareType === 'fixed')
  const pendingResiduary = fixedAssignments.filter((a) => a.shareType === 'residuary')

  // IDs of heirs that already have a fixed share (so asaba.ts can distinguish them)
  const fixedShareHeirIds = new Set(fixedOnes.map((a) => a.heirId))

  // Sum of fixed shares
  const fixedSum: Fraction = fixedOnes.reduce(
    (acc, a) => add(acc, a.fraction),
    ZERO,
  )

  // Step 3: assign residuary shares
  const activeHeirs = heirs.filter((h) => h.isAlive && !blocked.has(h.id))
  const asabaResults = assignAsaba(activeHeirs, madhab, blocked, fixedSum, fixedShareHeirIds)

  const hasAsaba = asabaResults.length > 0

  // Residue fraction = 1 - fixedSum
  const residueN = fixedSum.denominator - fixedSum.numerator
  const residueD = fixedSum.denominator
  const residueFrac: Fraction = reduce({ numerator: residueN, denominator: residueD })

  // Build initial HeirShare list
  const shareMap = new Map<string, HeirShare>()

  // Blocked heirs
  for (const heir of heirs) {
    if (blocked.has(heir.id)) {
      shareMap.set(heir.id, {
        heirId: heir.id,
        shareType: 'blocked',
        reason: 'blocked by a closer heir (hajb hirman)',
      })
    }
  }

  // Dead heirs (not blocked, just predeceased)
  for (const heir of heirs) {
    if (!heir.isAlive && !shareMap.has(heir.id)) {
      shareMap.set(heir.id, {
        heirId: heir.id,
        shareType: 'excluded',
        reason: 'predeceased — does not inherit',
      })
    }
  }

  // Fixed share heirs
  for (const a of fixedOnes) {
    shareMap.set(a.heirId, {
      heirId: a.heirId,
      shareType: 'fixed',
      fraction: a.fraction,
      reason: a.reason,
    })
  }

  // Asaba heirs (their estate fraction = shareOfResidue × residueFrac)
  for (const a of asabaResults) {
    const estateFrac = reduce({
      numerator: a.shareOfResidue.numerator * residueFrac.numerator,
      denominator: a.shareOfResidue.denominator * residueFrac.denominator,
    })
    // Check if this heir already has a fixed share (father with female descendants only)
    const existing = shareMap.get(a.heirId)
    if (existing && existing.shareType === 'fixed' && existing.fraction) {
      // Father gets 1/6 fixed + residue — combine them
      const combined = add(existing.fraction, estateFrac)
      shareMap.set(a.heirId, {
        ...existing,
        fraction: combined,
        reason: existing.reason + ' + residue',
        shareType: 'fixed', // still reported as fixed (it's a Quranic entitlement)
      })
    } else {
      shareMap.set(a.heirId, {
        heirId: a.heirId,
        shareType: 'residuary',
        fraction: estateFrac,
        reason: a.reason,
      })
    }
  }

  // Any pending-residuary heirs with no asaba result are excluded (no heir takes them)
  for (const a of pendingResiduary) {
    if (!shareMap.has(a.heirId)) {
      shareMap.set(a.heirId, {
        heirId: a.heirId,
        shareType: 'excluded',
        reason: 'no residue available or excluded by closer heirs',
      })
    }
  }

  let shares = Array.from(shareMap.values())

  // Step 4: Apply Awl if fixed shares exceed 1
  const awlResult = applyAwl(shares)
  let remainderMethod: 'awl' | 'radd' | 'none' = 'none'
  if (awlResult.applied) {
    shares = awlResult.shares
    remainderMethod = 'awl'
    warnings.push('Awl applied: fixed shares exceeded the estate; all shares reduced proportionally.')
  }

  // Step 5: Apply Radd if fixed shares < 1 and no asaba
  if (!awlResult.applied) {
    const raddResult = applyRadd(shares, madhab, hasAsaba)
    if (raddResult.applied) {
      shares = raddResult.shares
      remainderMethod = 'radd'
    }
  }

  // Step 6: Compute monetary amounts
  shares = shares.map((s) => {
    if (s.fraction) {
      return { ...s, amount: (estate * s.fraction.numerator) / s.fraction.denominator }
    }
    return { ...s, amount: 0 }
  })

  const totalAllocated = shares.reduce((acc, s) => acc + (s.amount ?? 0), 0)

  if (Math.abs(totalAllocated - estate) > 0.01 && remainderMethod === 'none' && !hasAsaba) {
    warnings.push(`Remainder of ${estate - totalAllocated} ${deceased.currency} not allocated (no eligible asaba or radd).`)
  }

  return {
    caseId: id,
    madhab,
    shares,
    totalAllocated,
    remainderMethod,
    warnings,
    calculatedAt: new Date().toISOString(),
  }
}
