import type { InheritanceCase, CalculationResult } from '@mirath/core'

export const MIRATH_MAGIC = new Uint8Array([0x4d, 0x49, 0x52, 0x54]) // "MIRT"
export const MIRATH_VERSION = 1

export interface MirathFileContent {
  inheritanceCase: InheritanceCase
  result?: CalculationResult
  savedAt: string      // ISO 8601
  appVersion: string
}

/**
 * Encodes a case into the .mirath binary format.
 * Format: [4-byte magic][2-byte version][AES-256-GCM encrypted + zstd compressed JSON]
 *
 * @param content   The case data to encode
 * @param key       32-byte AES key (derived from the app license)
 * @returns         ArrayBuffer of the .mirath file
 * TODO: implement
 */
export async function encodeMirath(
  _content: MirathFileContent,
  _key: Uint8Array
): Promise<ArrayBuffer> {
  throw new Error('encodeMirath() is not yet implemented — see packages/mirath-format/src/index.ts')
}

/**
 * Decodes a .mirath binary file back into case data.
 * TODO: implement
 */
export async function decodeMirath(
  _bytes: ArrayBuffer,
  _key: Uint8Array
): Promise<MirathFileContent> {
  throw new Error('decodeMirath() is not yet implemented — see packages/mirath-format/src/index.ts')
}
