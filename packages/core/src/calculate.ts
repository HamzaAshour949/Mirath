import type { InheritanceCase, CalculationResult } from './types'

/**
 * Main entry point for the inheritance calculation engine.
 *
 * Applies Islamic Fara'id rules according to the specified madhab.
 * This function is pure — no side effects, no I/O.
 *
 * TODO: implement per-madhab calculation logic.
 * See context.md for domain term definitions (Hajb, Awl, Radd, etc.)
 */
export function calculate(_inheritanceCase: InheritanceCase): CalculationResult {
  throw new Error('calculate() is not yet implemented — see packages/core/src/calculate.ts')
}
