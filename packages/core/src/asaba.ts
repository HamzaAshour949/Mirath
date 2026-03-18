import type { Heir, Madhab } from './types'
import type { Fraction } from './types'
import { compare, reduce } from './fractions'

export interface AsabaResult {
  heirId: string
  /** Share of the residue this heir receives (fraction of residue, not of estate) */
  shareOfResidue: Fraction
  reason: string
}

function ofRel(heirs: Heir[], rel: string): Heir[] {
  return heirs.filter((h) => h.relation === rel)
}

function hasRel(heirs: Heir[], ...rels: string[]): boolean {
  return heirs.some((h) => rels.includes(h.relation))
}

/**
 * Male-gets-double split for a group with male/female mix.
 * Returns { maleShare, femaleShare } as fractions of the group's collective share.
 * e.g. 2 sons + 1 daughter → each son gets 2/5, daughter gets 1/5
 */
function maleFemaleShares(males: number, females: number): { maleUnit: number; femaleUnit: number; totalUnits: number } {
  const totalUnits = males * 2 + females * 1
  return { maleUnit: 2, femaleUnit: 1, totalUnits }
}

/**
 * Determines residuary (Asaba) heirs and returns their share of the residue.
 * `fixedShareSum` is the sum of all fixed shares already allocated (as a Fraction).
 * `active` = heirs that are alive and not blocked.
 *
 * Returns an array of AsabaResult. The caller multiplies shareOfResidue by the actual
 * residue fraction to get each heir's estate fraction.
 */
export function assignAsaba(
  heirs: Heir[],
  madhab: Madhab,
  blocked: Set<string>,
  fixedShareSum: Fraction,
  fixedShareHeirIds: Set<string>,
): AsabaResult[] {
  const active = heirs.filter((h) => h.isAlive && !blocked.has(h.id))
  const result: AsabaResult[] = []

  // Residue fraction = 1 - fixedShareSum
  // If residue ≤ 0, no asaba (Awl case — handled elsewhere)
  const residueN = fixedShareSum.denominator - fixedShareSum.numerator
  const residueD = fixedShareSum.denominator
  if (residueN <= 0) return []

  const assign = (heir: Heir, shareOfResidue: Fraction, reason: string) => {
    result.push({ heirId: heir.id, shareOfResidue, reason })
  }

  // ── Asaba bi-l-nafs: male residuaries in priority order ──────────────────────
  // Priority: son > son_of_son > father > paternal_grandfather > full_brother >
  //           paternal_half_brother > son_of_full_brother > son_of_paternal_half_brother >
  //           paternal_uncle > paternal_half_uncle > son_of_paternal_uncle > son_of_paternal_half_uncle

  // Sons + daughters (asaba bi-l-ghair) ─────────────────────────────────────────
  {
    const sons = ofRel(active, 'son')
    const daughters = active.filter((h) => h.relation === 'daughter' && !fixedShareHeirIds.has(h.id))
    if (sons.length > 0) {
      const { maleUnit, femaleUnit, totalUnits } = maleFemaleShares(sons.length, daughters.length)
      for (const s of sons) {
        assign(s, { numerator: maleUnit, denominator: totalUnits }, 'son: asaba bi-l-nafs/ghair')
      }
      for (const d of daughters) {
        assign(d, { numerator: femaleUnit, denominator: totalUnits }, 'daughter with son: asaba bi-l-ghair')
      }
      return result
    }
  }

  // Sons of sons + daughters of sons (asaba bi-l-ghair) ────────────────────────
  {
    const sos = ofRel(active, 'son_of_son')
    const dos = active.filter((h) => h.relation === 'daughter_of_son' && !fixedShareHeirIds.has(h.id))
    // Also: daughters of deceased (if no sons) can make son_of_son's group take them as asaba
    const deceasedDaughtersAsAsaba = active.filter(
      (h) => h.relation === 'daughter' && !fixedShareHeirIds.has(h.id),
    )
    if (sos.length > 0) {
      const femalesInGroup = [...dos, ...deceasedDaughtersAsAsaba]
      const { maleUnit, femaleUnit, totalUnits } = maleFemaleShares(sos.length, femalesInGroup.length)
      for (const s of sos) {
        assign(s, { numerator: maleUnit, denominator: totalUnits }, 'son_of_son: asaba bi-l-nafs/ghair')
      }
      for (const d of femalesInGroup) {
        assign(d, { numerator: femaleUnit, denominator: totalUnits }, 'granddaughter/daughter with son_of_son: asaba bi-l-ghair')
      }
      return result
    }
  }

  // Father — pure residuary (no children) ──────────────────────────────────────
  // Note: father with female descendants only gets 1/6 fixed + residue;
  // that residue portion is handled here (fixedShareHeirIds already contains father in that case)
  {
    const fathers = ofRel(active, 'father')
    if (fathers.length > 0) {
      // Father already got 1/6 fixed if female descendants present, or gets full residue here
      assign(fathers[0]!, { numerator: 1, denominator: 1 }, 'father: residuary')
      return result
    }
  }

  // Paternal grandfather — with or without siblings ────────────────────────────
  {
    const gfs = ofRel(active, 'paternal_grandfather')
    if (gfs.length > 0) {
      const gf = gfs[0]!

      // In Hanafi, grandfather acts like father (blocks siblings completely — done in hajb.ts)
      // So here he simply takes all residue
      if (madhab === 'hanafi') {
        assign(gf, { numerator: 1, denominator: 1 }, 'paternal grandfather: residuary (Hanafi)')
        return result
      }

      // Maliki / Shafi'i / Hanbali: grandfather coexists with full and paternal half siblings
      // Best-of-three for grandfather:
      //   1. 1/3 of total estate
      //   2. Muqasama (treated as a male sibling among all siblings)
      //   3. 1/6 of total estate (if there are also fixed-share heirs reducing residue)
      const fullBros = ofRel(active, 'full_brother')
      const fullSis = ofRel(active, 'full_sister')
      const patHalfBros = ofRel(active, 'paternal_half_brother')
      const patHalfSis = ofRel(active, 'paternal_half_sister')
      const siblings = [...fullBros, ...fullSis, ...patHalfBros, ...patHalfSis]

      if (siblings.length === 0) {
        // No siblings — grandfather takes all residue
        assign(gf, { numerator: 1, denominator: 1 }, 'paternal grandfather: sole residuary')
        return result
      }

      // Muqasama: grandfather counts as 1 male sibling
      const siblingMaleCount = fullBros.length + patHalfBros.length
      const siblingFemaleCount = fullSis.length + patHalfSis.length
      const muqUnits = (siblingMaleCount + 1 /* grandfather */ ) * 2 + siblingFemaleCount
      const gfMuqasamaShare: Fraction = { numerator: 2, denominator: muqUnits }

      // 1/3 of total residue (as fraction of residue)
      const gfThirdOfEstate: Fraction = { numerator: 1, denominator: 3 }

      // gfSixthOfEstate as share of residue: (1/6) / (residueN/residueD) = residueD / (6 * residueN)
      const gfSixthAsResidueShare: Fraction = reduce({ numerator: residueD, denominator: 6 * residueN })

      // Best for grandfather:
      const muqBetter = compare(gfMuqasamaShare, gfThirdOfEstate) >= 0
        ? compare(gfMuqasamaShare, gfSixthAsResidueShare) >= 0
          ? gfMuqasamaShare
          : gfSixthAsResidueShare
        : compare(gfThirdOfEstate, gfSixthAsResidueShare) >= 0
          ? gfThirdOfEstate
          : gfSixthAsResidueShare

      assign(gf, muqBetter, `paternal grandfather with siblings: best of muqasama/1/3/1/6 (${madhab})`)

      // Remaining residue goes to full siblings (prefer full over paternal half)
      // Share of residue left for siblings = 1 - gfShare
      const gfN = muqBetter.numerator
      const gfD = muqBetter.denominator
      const sibResN = gfD - gfN
      const sibResD = gfD

      if (sibResN > 0) {
        const activeSiblings = fullBros.length > 0 || fullSis.length > 0
          ? [...fullBros, ...fullSis]
          : [...patHalfBros, ...patHalfSis]

        const sibMales = activeSiblings.filter((s) =>
          s.relation === 'full_brother' || s.relation === 'paternal_half_brother',
        )
        const sibFemales = activeSiblings.filter((s) =>
          s.relation === 'full_sister' || s.relation === 'paternal_half_sister',
        )
        const { maleUnit, femaleUnit, totalUnits } = maleFemaleShares(sibMales.length, sibFemales.length)

        for (const s of sibMales) {
          assign(s, reduce({ numerator: maleUnit * sibResN, denominator: totalUnits * sibResD }),
            `sibling with grandfather: muqasama share (${madhab})`)
        }
        for (const s of sibFemales) {
          assign(s, reduce({ numerator: femaleUnit * sibResN, denominator: totalUnits * sibResD }),
            `sibling with grandfather: muqasama share (${madhab})`)
        }
      }
      return result
    }
  }

  // Full brothers + full sisters (asaba bi-l-nafs / bi-l-ghair) ─────────────────
  {
    const fb = ofRel(active, 'full_brother')
    const fs = active.filter((h) => h.relation === 'full_sister' && !fixedShareHeirIds.has(h.id))
    // Full sisters as asaba ma'al-ghair (alongside daughters / daughters_of_son)
    const fsAsGhair = active.filter(
      (h) => h.relation === 'full_sister' && fixedShareHeirIds.has(h.id),
    )

    const hasDaughterLineForGhair = hasRel(active, 'daughter', 'daughter_of_son')

    if (fb.length > 0) {
      const { maleUnit, femaleUnit, totalUnits } = maleFemaleShares(fb.length, fs.length)
      for (const b of fb) {
        assign(b, { numerator: maleUnit, denominator: totalUnits }, 'full brother: asaba bi-l-nafs')
      }
      for (const s of fs) {
        assign(s, { numerator: femaleUnit, denominator: totalUnits }, 'full sister with full brother: asaba bi-l-ghair')
      }
      return result
    }

    // Full sisters as asaba ma'al-ghair (no full brother, daughters present)
    if (fs.length > 0 && hasDaughterLineForGhair) {
      for (const s of [...fs, ...fsAsGhair]) {
        assign(s, { numerator: 1, denominator: fs.length + fsAsGhair.length },
          'full sister(s): asaba ma\'al-ghair with daughter(s)')
      }
      return result
    }
  }

  // Paternal half brothers + paternal half sisters ──────────────────────────────
  {
    const phb = ofRel(active, 'paternal_half_brother')
    const phs = active.filter((h) => h.relation === 'paternal_half_sister' && !fixedShareHeirIds.has(h.id))
    const phsGhair = active.filter(
      (h) => h.relation === 'paternal_half_sister' && fixedShareHeirIds.has(h.id),
    )
    const hasDaughterLineForGhair = hasRel(active, 'daughter', 'daughter_of_son')

    if (phb.length > 0) {
      const { maleUnit, femaleUnit, totalUnits } = maleFemaleShares(phb.length, phs.length)
      for (const b of phb) {
        assign(b, { numerator: maleUnit, denominator: totalUnits }, 'paternal half brother: asaba bi-l-nafs')
      }
      for (const s of phs) {
        assign(s, { numerator: femaleUnit, denominator: totalUnits }, 'paternal half sister with paternal half brother: asaba bi-l-ghair')
      }
      return result
    }

    if (phs.length > 0 && hasDaughterLineForGhair) {
      for (const s of [...phs, ...phsGhair]) {
        assign(s, { numerator: 1, denominator: phs.length + phsGhair.length },
          'paternal half sister(s): asaba ma\'al-ghair with daughter(s)')
      }
      return result
    }
  }

  // Sons of full brothers ───────────────────────────────────────────────────────
  {
    const sofb = ofRel(active, 'son_of_full_brother')
    if (sofb.length > 0) {
      for (const s of sofb) {
        assign(s, { numerator: 1, denominator: sofb.length }, 'son of full brother: asaba')
      }
      return result
    }
  }

  // Sons of paternal half brothers ──────────────────────────────────────────────
  {
    const sophb = ofRel(active, 'son_of_paternal_half_brother')
    if (sophb.length > 0) {
      for (const s of sophb) {
        assign(s, { numerator: 1, denominator: sophb.length }, 'son of paternal half brother: asaba')
      }
      return result
    }
  }

  // Paternal uncle ──────────────────────────────────────────────────────────────
  {
    const pu = ofRel(active, 'paternal_uncle')
    if (pu.length > 0) {
      for (const u of pu) {
        assign(u, { numerator: 1, denominator: pu.length }, 'paternal uncle: asaba')
      }
      return result
    }
  }

  // Paternal half uncle ─────────────────────────────────────────────────────────
  {
    const phu = ofRel(active, 'paternal_half_uncle')
    if (phu.length > 0) {
      for (const u of phu) {
        assign(u, { numerator: 1, denominator: phu.length }, 'paternal half uncle: asaba')
      }
      return result
    }
  }

  // Son of paternal uncle ───────────────────────────────────────────────────────
  {
    const sopu = ofRel(active, 'son_of_paternal_uncle')
    if (sopu.length > 0) {
      for (const s of sopu) {
        assign(s, { numerator: 1, denominator: sopu.length }, 'son of paternal uncle: asaba')
      }
      return result
    }
  }

  // Son of paternal half uncle ──────────────────────────────────────────────────
  {
    const sophu = ofRel(active, 'son_of_paternal_half_uncle')
    if (sophu.length > 0) {
      for (const s of sophu) {
        assign(s, { numerator: 1, denominator: sophu.length }, 'son of paternal half uncle: asaba')
      }
      return result
    }
  }

  return result
}
