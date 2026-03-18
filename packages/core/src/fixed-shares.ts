import type { Heir, Madhab } from './types'
import type { Fraction } from './types'
import { HALF, QUARTER, EIGHTH, THIRD, SIXTH, ZERO, reduce } from './fractions'

interface ShareAssignment {
  heirId: string
  fraction: Fraction
  reason: string
  shareType: 'fixed' | 'residuary' | 'excluded'
}

function hasRelation(activeHeirs: Heir[], ...rels: string[]): boolean {
  return activeHeirs.some((h) => rels.includes(h.relation))
}

function hasChild(activeHeirs: Heir[]): boolean {
  return hasRelation(activeHeirs, 'son', 'daughter', 'son_of_son', 'daughter_of_son')
}

function hasMaleDescendant(activeHeirs: Heir[]): boolean {
  return hasRelation(activeHeirs, 'son', 'son_of_son')
}

function ofRelation(activeHeirs: Heir[], rel: string): Heir[] {
  return activeHeirs.filter((h) => h.relation === rel)
}

/**
 * Assigns fixed (Quranic) shares to eligible heirs.
 * Returns partial HeirShare entries — residuary heirs are handled separately.
 * The `blocked` set contains IDs already excluded by Hajb.
 */
export function assignFixedShares(
  heirs: Heir[],
  madhab: Madhab,
  blocked: Set<string>,
): ShareAssignment[] {
  const active = heirs.filter((h) => h.isAlive && !blocked.has(h.id))
  const result: ShareAssignment[] = []

  const assign = (heir: Heir, fraction: Fraction, reason: string) => {
    result.push({ heirId: heir.id, fraction: reduce(fraction), reason, shareType: 'fixed' })
  }

  const withChild = hasChild(active)
  const withMaleDescendant = hasMaleDescendant(active)

  // ── Husband ──────────────────────────────────────────────────────────────────
  for (const h of ofRelation(active, 'husband')) {
    if (withChild) {
      assign(h, QUARTER, 'husband with children: 1/4')
    } else {
      assign(h, HALF, 'husband with no children: 1/2')
    }
  }

  // ── Wife / Wives (share equally within their combined fraction) ───────────────
  {
    const wives = ofRelation(active, 'wife')
    if (wives.length > 0) {
      const totalFraction: Fraction = withChild ? EIGHTH : QUARTER
      const label = withChild
        ? `wife${wives.length > 1 ? 's' : ''} with children: 1/8 shared`
        : `wife${wives.length > 1 ? 's' : ''} with no children: 1/4 shared`
      for (const w of wives) {
        assign(w, { numerator: totalFraction.numerator, denominator: totalFraction.denominator * wives.length }, label)
      }
    }
  }

  // ── Daughter(s) — fixed share only when no son ───────────────────────────────
  // With a son, daughters become asaba bi-l-ghair (handled in asaba.ts)
  {
    const daughters = ofRelation(active, 'daughter')
    const sons = ofRelation(active, 'son')
    if (daughters.length > 0 && sons.length === 0) {
      if (daughters.length === 1) {
        assign(daughters[0]!, HALF, 'sole daughter: 1/2')
      } else {
        const each: Fraction = { numerator: 2, denominator: 3 * daughters.length }
        for (const d of daughters) {
          assign(d, each, `${daughters.length} daughters, no son: 2/3 shared`)
        }
      }
    }
  }

  // ── Daughter of Son (granddaughter via son) — fixed share when no son/son_of_son ─
  {
    const dosGroup = ofRelation(active, 'daughter_of_son')
    const sons = ofRelation(active, 'son')
    const sosGroup = ofRelation(active, 'son_of_son')
    const daughters = ofRelation(active, 'daughter')

    if (dosGroup.length > 0 && sons.length === 0 && sosGroup.length === 0) {
      if (daughters.length === 0) {
        // No daughters, no sons, no sons_of_son
        if (dosGroup.length === 1) {
          assign(dosGroup[0]!, HALF, 'sole granddaughter (son line), no daughter/son: 1/2')
        } else {
          const each: Fraction = { numerator: 2, denominator: 3 * dosGroup.length }
          for (const d of dosGroup) {
            assign(d, each, `${dosGroup.length} granddaughters (son line), no daughter/son: 2/3 shared`)
          }
        }
      } else if (daughters.length === 1) {
        // One daughter → daughter_of_son gets 1/6 to complete 2/3
        const each: Fraction = { numerator: 1, denominator: 6 * dosGroup.length }
        for (const d of dosGroup) {
          assign(d, each, 'granddaughter (son line) with 1 daughter: 1/6 to complete 2/3')
        }
      }
      // daughters.length >= 2 → daughter_of_son is blocked (handled in hajb.ts)
    }
  }

  // ── Father ───────────────────────────────────────────────────────────────────
  // If male descendant → 1/6
  // If female descendant only → 1/6 fixed + residue (treated in asaba.ts)
  // If no descendants → pure asaba (residuary)
  {
    const fathers = ofRelation(active, 'father')
    for (const f of fathers) {
      if (withMaleDescendant) {
        assign(f, SIXTH, 'father with male descendant: 1/6')
      } else if (withChild) {
        // Father gets 1/6 fixed + residue — we assign the 1/6 fixed here;
        // asaba.ts will add the residue portion
        assign(f, SIXTH, 'father with female descendant only: 1/6 fixed + residue')
      }
      // else: pure residuary — handled in asaba.ts
    }
  }

  // ── Paternal Grandfather — same rules as father when father absent ────────────
  {
    const grandfathers = ofRelation(active, 'paternal_grandfather')
    for (const gf of grandfathers) {
      if (withMaleDescendant) {
        assign(gf, SIXTH, 'paternal grandfather with male descendant: 1/6')
      } else if (withChild) {
        assign(gf, SIXTH, 'paternal grandfather with female descendant only: 1/6 fixed + residue')
      }
    }
  }

  // ── Mother ───────────────────────────────────────────────────────────────────
  {
    const mothers = ofRelation(active, 'mother')
    if (mothers.length > 0) {
      const m = mothers[0]!
      // Mother's share uses ALL living siblings, even those blocked by a closer heir
      const siblings = heirs.filter(
        (h) =>
          h.isAlive &&
          ['full_brother', 'full_sister', 'paternal_half_brother', 'paternal_half_sister',
            'maternal_half_brother', 'maternal_half_sister'].includes(h.relation),
      )

      const husband = ofRelation(active, 'husband')
      const wife = ofRelation(active, 'wife')
      const father = ofRelation(active, 'father')

      // Umariyyatan: husband + mother + father OR wife + mother + father (no children)
      // Mother gets 1/3 of residue after spouse (= 1/3 of remaining fraction)
      // Agreed by Hanafi, Shafi'i, Hanbali. Maliki: mother still gets 1/3 of whole estate.
      const isUmariyya =
        !withChild &&
        siblings.length === 0 &&
        father.length > 0 &&
        (husband.length > 0 || wife.length > 0)

      if (isUmariyya && madhab !== 'maliki') {
        // Mother gets 1/3 of what remains after the spouse's share
        const spouseFrac: Fraction = husband.length > 0 ? HALF : QUARTER
        // Remaining = 1 - spouseFrac; mother gets 1/3 of that
        const remainN = spouseFrac.denominator - spouseFrac.numerator
        const remainD = spouseFrac.denominator
        // 1/3 × remain = remainN / (3 × remainD)
        const motherFrac: Fraction = { numerator: remainN, denominator: 3 * remainD }
        assign(m, motherFrac, 'Umariyyatan: mother gets 1/3 of residue after spouse')
      } else if (withChild || siblings.length >= 2) {
        assign(m, SIXTH, `mother with ${withChild ? 'children' : '2+ siblings'}: 1/6`)
      } else {
        assign(m, THIRD, 'mother with no children and ≤1 sibling: 1/3')
      }
    }
  }

  // ── Grandmothers ─────────────────────────────────────────────────────────────
  // Paternal grandmother + maternal grandmother share 1/6 equally if both present
  {
    const patGM = ofRelation(active, 'paternal_grandmother')
    const matGM = ofRelation(active, 'maternal_grandmother')
    const total = [...patGM, ...matGM]
    if (total.length > 0) {
      const each: Fraction = { numerator: 1, denominator: 6 * total.length }
      for (const gm of total) {
        assign(gm, each, `grandmother${total.length > 1 ? 's' : ''}: 1/6 shared`)
      }
    }
  }

  // ── Full Sister(s) — fixed share when no brother makes her asaba ─────────────
  // Full sister is asaba ma'al-ghair when daughters/daughter_of_son present (handled in asaba.ts)
  // Fixed share applies when she is not asaba ma'al-ghair and no full brother.
  // In Maliki/Shafi'i/Hanbali: when paternal_grandfather is present, sisters join
  // the muqasama group (asaba) — no fixed share assigned here.
  {
    const fullSisters = ofRelation(active, 'full_sister')
    const fullBrothers = ofRelation(active, 'full_brother')
    const hasDaughterOrGD = hasRelation(active, 'daughter', 'daughter_of_son')
    const gfPresentNonHanafi =
      madhab !== 'hanafi' && ofRelation(active, 'paternal_grandfather').length > 0

    if (fullSisters.length > 0 && fullBrothers.length === 0 && !hasDaughterOrGD && !gfPresentNonHanafi) {
      if (!withMaleDescendant) {
        if (fullSisters.length === 1) {
          assign(fullSisters[0]!, HALF, 'sole full sister: 1/2')
        } else {
          const each: Fraction = { numerator: 2, denominator: 3 * fullSisters.length }
          for (const s of fullSisters) {
            assign(s, each, `${fullSisters.length} full sisters: 2/3 shared`)
          }
        }
      }
    }
  }

  // ── Paternal Half Sister(s) — fixed share ────────────────────────────────────
  {
    const phs = ofRelation(active, 'paternal_half_sister')
    const phb = ofRelation(active, 'paternal_half_brother')
    const fullSisters = ofRelation(active, 'full_sister')
    const fullBrothers = ofRelation(active, 'full_brother')
    const hasDaughterOrGD = hasRelation(active, 'daughter', 'daughter_of_son')
    const gfPresentNonHanafi =
      madhab !== 'hanafi' && ofRelation(active, 'paternal_grandfather').length > 0

    // Not asaba ma'al-ghair situation, no paternal half brother (asaba bi-nafs would handle)
    if (phs.length > 0 && phb.length === 0 && fullBrothers.length === 0 && !hasDaughterOrGD && !gfPresentNonHanafi) {
      if (!withMaleDescendant) {
        if (fullSisters.length === 1) {
          // 1 full sister gets 1/2, paternal half sister(s) get 1/6 total to complete 2/3
          const each: Fraction = { numerator: 1, denominator: 6 * phs.length }
          for (const s of phs) {
            assign(s, each, 'paternal half sister with 1 full sister: 1/6 to complete 2/3')
          }
        } else if (fullSisters.length === 0) {
          if (phs.length === 1) {
            assign(phs[0]!, HALF, 'sole paternal half sister: 1/2')
          } else {
            const each: Fraction = { numerator: 2, denominator: 3 * phs.length }
            for (const s of phs) {
              assign(s, each, `${phs.length} paternal half sisters: 2/3 shared`)
            }
          }
        }
        // fullSisters.length >= 2 → paternal half sisters are blocked (handled in hajb.ts)
      }
    }
  }

  // ── Maternal Half Siblings — fixed share 1/6 each or 1/3 total ───────────────
  {
    const mhs = active.filter((h) =>
      h.relation === 'maternal_half_brother' || h.relation === 'maternal_half_sister',
    )
    if (mhs.length > 0) {
      if (mhs.length === 1) {
        assign(mhs[0]!, SIXTH, 'sole maternal half sibling: 1/6')
      } else {
        const each: Fraction = { numerator: 1, denominator: 3 * mhs.length }
        for (const s of mhs) {
          assign(s, each, `${mhs.length} maternal half siblings: 1/3 shared`)
        }
      }
    }
  }

  // Mark everyone active but not assigned as pending (residuary determination comes next)
  const assignedIds = new Set(result.map((r) => r.heirId))
  for (const heir of active) {
    if (!assignedIds.has(heir.id)) {
      result.push({ heirId: heir.id, fraction: ZERO, reason: 'pending residuary evaluation', shareType: 'residuary' })
    }
  }

  return result
}
