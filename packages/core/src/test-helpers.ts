import type { Heir, InheritanceCase, Madhab, Deceased, HeirRelation } from './types'

let _id = 0
export function nextId(): string {
  return `id-${++_id}`
}

export function makeDeceased(overrides: Partial<Deceased> = {}): Deceased {
  return {
    id: nextId(),
    name: 'Test Deceased',
    gender: 'male',
    totalEstate: 120_000,
    currency: 'USD',
    ...overrides,
  }
}

export function makeHeir(relation: HeirRelation, overrides: Partial<Heir> = {}): Heir {
  return {
    id: nextId(),
    name: relation,
    gender: ['son', 'son_of_son', 'father', 'paternal_grandfather', 'full_brother',
      'paternal_half_brother', 'maternal_half_brother', 'son_of_full_brother',
      'son_of_paternal_half_brother', 'paternal_uncle', 'paternal_half_uncle',
      'son_of_paternal_uncle', 'son_of_paternal_half_uncle', 'husband'].includes(relation)
      ? 'male'
      : 'female',
    relation,
    isAlive: true,
    ...overrides,
  }
}

export function makeCase(
  madhab: Madhab,
  heirs: Heir[],
  deceasedOverrides: Partial<Deceased> = {},
): InheritanceCase {
  return {
    id: nextId(),
    title: 'Test Case',
    madhab,
    deceased: makeDeceased(deceasedOverrides),
    heirs,
    familyTree: heirs.map((h) => ({ heirId: h.id })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appVersion: '0.0.1',
  }
}

export function shareOf(shares: import('./types').HeirShare[], heir: Heir): import('./types').HeirShare | undefined {
  return shares.find((s) => s.heirId === heir.id)
}

export function fractionStr(shares: import('./types').HeirShare[], heir: Heir): string {
  const s = shareOf(shares, heir)
  if (!s || !s.fraction) return `${s?.shareType ?? 'none'}`
  return `${s.fraction.numerator}/${s.fraction.denominator}`
}
