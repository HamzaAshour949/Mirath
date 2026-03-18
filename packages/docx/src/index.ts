import type { CalculationResult, InheritanceCase } from '@mirath/core'
import type { Locale } from '@mirath/i18n'

/**
 * Generates a .docx report from a calculation result.
 * Uses docxtemplater with templates in packages/docx/templates/.
 *
 * @returns ArrayBuffer of the generated .docx file
 * TODO: implement
 */
export async function generateDOCX(
  _inheritanceCase: InheritanceCase,
  _result: CalculationResult,
  _locale: Locale
): Promise<ArrayBuffer> {
  throw new Error('generateDOCX() is not yet implemented — see packages/docx/src/index.ts')
}
