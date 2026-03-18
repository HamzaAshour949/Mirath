import type { Heir, HeirRelation, Madhab } from './types'

type RelationSet = Set<HeirRelation>

function relations(heirs: Heir[]): RelationSet {
  return new Set(heirs.map((h) => h.relation))
}

function has(set: RelationSet, ...rels: HeirRelation[]): boolean {
  return rels.some((r) => set.has(r))
}

function hasChild(set: RelationSet): boolean {
  return has(set, 'son', 'daughter', 'son_of_son', 'daughter_of_son')
}

function hasSon(set: RelationSet): boolean {
  return has(set, 'son', 'son_of_son')
}

/**
 * Returns the set of heir IDs that are blocked (hajb hirman — complete exclusion).
 * Heirs not in this set are eligible to inherit.
 */
export function applyHajb(heirs: Heir[], madhab: Madhab): Set<string> {
  const active = heirs.filter((h) => h.isAlive)
  const rel = relations(active)
  const blocked = new Set<string>()

  const block = (condition: boolean, ...ids: string[]) => {
    if (condition) ids.forEach((id) => blocked.add(id))
  }

  const ids = (relation: HeirRelation) =>
    active.filter((h) => h.relation === relation).map((h) => h.id)

  // ── son_of_son: blocked by son ───────────────────────────────────────────────
  block(has(rel, 'son'), ...ids('son_of_son'))

  // ── daughter_of_son: blocked by son
  //    Also blocked by 2+ daughters when no son_of_son present
  block(has(rel, 'son'), ...ids('daughter_of_son'))
  {
    const daughters = active.filter((h) => h.relation === 'daughter')
    const sonsOfSon = active.filter((h) => h.relation === 'son_of_son')
    if (daughters.length >= 2 && sonsOfSon.length === 0) {
      ids('daughter_of_son').forEach((id) => blocked.add(id))
    }
  }

  // ── father: blocks paternal_grandfather, all siblings, nephews, uncles ───────
  if (has(rel, 'father')) {
    block(true, ...ids('paternal_grandfather'))
    block(true, ...ids('full_brother'), ...ids('full_sister'))
    block(true, ...ids('paternal_half_brother'), ...ids('paternal_half_sister'))
    block(true, ...ids('son_of_full_brother'), ...ids('son_of_paternal_half_brother'))
    block(true, ...ids('paternal_uncle'), ...ids('paternal_half_uncle'))
    block(true, ...ids('son_of_paternal_uncle'), ...ids('son_of_paternal_half_uncle'))
  }

  // ── paternal_grandfather: in Hanafi, acts like father for siblings ───────────
  if (madhab === 'hanafi' && has(rel, 'paternal_grandfather') && !has(rel, 'father')) {
    block(true, ...ids('full_brother'), ...ids('full_sister'))
    block(true, ...ids('paternal_half_brother'), ...ids('paternal_half_sister'))
    block(true, ...ids('son_of_full_brother'), ...ids('son_of_paternal_half_brother'))
    block(true, ...ids('paternal_uncle'), ...ids('paternal_half_uncle'))
    block(true, ...ids('son_of_paternal_uncle'), ...ids('son_of_paternal_half_uncle'))
  }

  // ── son (and son_of_son) block nephews, uncles ───────────────────────────────
  // (already covered transitively via father/grandfather rules, but also direct)
  if (hasSon(rel)) {
    block(true, ...ids('son_of_full_brother'), ...ids('son_of_paternal_half_brother'))
    block(true, ...ids('paternal_uncle'), ...ids('paternal_half_uncle'))
    block(true, ...ids('son_of_paternal_uncle'), ...ids('son_of_paternal_half_uncle'))
  }

  // ── maternal half siblings: blocked by any child, father, or paternal_grandfather
  if (hasChild(rel) || has(rel, 'father', 'paternal_grandfather')) {
    block(true, ...ids('maternal_half_brother'), ...ids('maternal_half_sister'))
  }

  // ── paternal_grandmother: blocked by mother (all madhabs)
  //    Also blocked by father in Hanafi, Shafi'i, Hanbali (NOT Maliki)
  block(has(rel, 'mother'), ...ids('paternal_grandmother'))
  if (madhab !== 'maliki') {
    block(has(rel, 'father'), ...ids('paternal_grandmother'))
  }

  // ── maternal_grandmother: blocked by mother
  block(has(rel, 'mother'), ...ids('maternal_grandmother'))
  // Maternal grandmother also blocked by father in Hanafi/Shafi'i/Hanbali
  if (madhab !== 'maliki') {
    block(has(rel, 'father'), ...ids('maternal_grandmother'))
  }

  // ── full_brother blocks paternal_half_brother (as asaba, full takes all residue)
  //    But paternal_half_siblings may still get fixed share (1/6 or 1/2) ...
  //    Actually: full_brother as asaba blocks paternal_half_brother as asaba
  //    and paternal_half_sister's fixed share is also blocked when:
  //    - full_brother exists (he takes all residue, no room for paternal_half_sister's fixed)
  //    Wait — paternal_half_sister is ONLY blocked by full_brother from her FIXED share
  //    in the sense that full_brother as asaba takes the rest.
  //    Actually classical fiqh: paternal_half_sister is blocked (hajb) by:
  //    son, son_of_son, father, paternal_grandfather (Hanafi), full_brother,
  //    two or more full sisters (when no paternal_half_brother)
  block(has(rel, 'full_brother'), ...ids('paternal_half_brother'))
  {
    const fullSisters = active.filter((h) => h.relation === 'full_sister')
    const patHalfBros = active.filter((h) => h.relation === 'paternal_half_brother')
    const patHalfSisBlocked =
      has(rel, 'full_brother') ||
      (fullSisters.length >= 2 && patHalfBros.length === 0)
    block(patHalfSisBlocked, ...ids('paternal_half_sister'))
  }

  // ── son_of_full_brother blocks son_of_paternal_half_brother ──────────────────
  block(has(rel, 'son_of_full_brother'), ...ids('son_of_paternal_half_brother'))

  // ── nephew (son_of_full_brother / son_of_paternal_half_brother) blocked by
  //    full_brother, paternal_half_brother ───────────────────────────────────────
  block(has(rel, 'full_brother', 'paternal_half_brother'), ...ids('son_of_full_brother'))
  block(
    has(rel, 'full_brother', 'paternal_half_brother', 'son_of_full_brother'),
    ...ids('son_of_paternal_half_brother'),
  )

  // ── uncle ladder ─────────────────────────────────────────────────────────────
  // paternal_uncle blocked by all nephews
  block(
    has(rel, 'son_of_full_brother', 'son_of_paternal_half_brother'),
    ...ids('paternal_uncle'),
    ...ids('paternal_half_uncle'),
    ...ids('son_of_paternal_uncle'),
    ...ids('son_of_paternal_half_uncle'),
  )
  // paternal_half_uncle blocked by paternal_uncle
  block(has(rel, 'paternal_uncle'), ...ids('paternal_half_uncle'))
  block(has(rel, 'paternal_uncle'), ...ids('son_of_paternal_uncle'), ...ids('son_of_paternal_half_uncle'))
  // son_of_paternal_uncle blocked by paternal_uncle, paternal_half_uncle
  block(has(rel, 'paternal_half_uncle'), ...ids('son_of_paternal_half_uncle'))
  block(has(rel, 'son_of_paternal_uncle'), ...ids('son_of_paternal_half_uncle'))

  // ── remove any heir blocked for reasons they shouldn't be ────────────────────
  // (a blocked heir's own ID must not also be listed as a blocker)
  return blocked
}
