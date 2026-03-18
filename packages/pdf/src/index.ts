import type { CalculationResult, InheritanceCase } from '@mirath/core'
import type { Locale } from '@mirath/i18n'

/**
 * Generates a professional PDF report from a calculation result.
 * Uses pdfmake-rtl for Arabic RTL support.
 *
 * @returns Blob of the generated PDF
 * TODO: implement
 */
export async function generatePDF(
  _inheritanceCase: InheritanceCase,
  _result: CalculationResult,
  _locale: Locale
): Promise<Blob> {
  throw new Error('generatePDF() is not yet implemented — see packages/pdf/src/index.ts')
}
