// ─── Domain Types for Islamic Inheritance (Fara'id) ───────────────────────────

export type Madhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali'

export type Gender = 'male' | 'female'

export type HeirRelation =
  // Spouse
  | 'husband'
  | 'wife'
  // Direct lineal
  | 'son'
  | 'daughter'
  | 'son_of_son'           // grandson (paternal line)
  | 'daughter_of_son'      // granddaughter (paternal line)
  // Parents
  | 'father'
  | 'mother'
  // Grandparents
  | 'paternal_grandfather'
  | 'paternal_grandmother'
  | 'maternal_grandmother'
  // Siblings
  | 'full_brother'
  | 'full_sister'
  | 'paternal_half_brother'
  | 'paternal_half_sister'
  | 'maternal_half_brother'
  | 'maternal_half_sister'
  // Nephews (sons of brothers)
  | 'son_of_full_brother'
  | 'son_of_paternal_half_brother'
  // Uncles and their sons
  | 'paternal_uncle'              // father's full brother
  | 'paternal_half_uncle'         // father's paternal half brother
  | 'son_of_paternal_uncle'
  | 'son_of_paternal_half_uncle'

export type ShareType = 'fixed' | 'residuary' | 'excluded' | 'blocked'

export type RemainderMethod = 'awl' | 'radd' | 'none'

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Deceased {
  id: string
  name: string
  gender: Gender
  dateOfDeath?: string       // ISO 8601 date string
  placeOfDeath?: string
  totalEstate: number        // numeric value
  currency: string           // e.g. 'USD', 'SAR', 'EGP'
  notes?: string
}

export interface Heir {
  id: string
  name: string
  gender: Gender
  relation: HeirRelation
  isAlive: boolean           // false = predeceased (affects calculation)
  notes?: string
}

export interface FamilyTreeNode {
  heirId: string
  parentNodeId?: string      // undefined = root (the deceased)
  position?: { x: number; y: number }  // canvas position for rendering
}

export interface InheritanceCase {
  id: string
  title: string
  madhab: Madhab
  deceased: Deceased
  heirs: Heir[]
  familyTree: FamilyTreeNode[]
  notes?: string
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
  appVersion: string
}

// ─── Calculation Output ────────────────────────────────────────────────────────

export interface Fraction {
  numerator: number
  denominator: number
}

export interface HeirShare {
  heirId: string
  shareType: ShareType
  fraction?: Fraction        // e.g. { numerator: 1, denominator: 4 } = 1/4
  amount?: number            // computed monetary amount
  reason: string             // human-readable explanation (for the report)
}

export interface CalculationResult {
  caseId: string
  madhab: Madhab
  shares: HeirShare[]
  totalAllocated: number
  remainderMethod: RemainderMethod
  warnings: string[]         // e.g. madhab-specific notes or edge case alerts
  calculatedAt: string       // ISO 8601
}
