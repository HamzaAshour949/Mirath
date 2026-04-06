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
 * Format: [4-byte magic][2-byte version][12-byte IV][encrypted payload]
 * Payload: JSON compressed via CompressionStream, encrypted with AES-256-GCM.
 *
 * @param content   The case data to encode
 * @param key       32-byte AES key (derived from the app license)
 * @returns         ArrayBuffer of the .mirath file
 */
export async function encodeMirath(
  content: MirathFileContent,
  key: Uint8Array
): Promise<ArrayBuffer> {
  const json = JSON.stringify(content)
  const jsonBytes = new TextEncoder().encode(json)

  // Compress using CompressionStream (deflate — widely supported)
  const compressed = await compress(jsonBytes)

  // Encrypt with AES-256-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    compressed
  )

  // Build final binary: magic(4) + version(2) + iv(12) + encrypted(N)
  const version = new Uint8Array(2)
  version[0] = (MIRATH_VERSION >> 8) & 0xff
  version[1] = MIRATH_VERSION & 0xff

  const result = new Uint8Array(4 + 2 + 12 + encrypted.byteLength)
  result.set(MIRATH_MAGIC, 0)
  result.set(version, 4)
  result.set(iv, 6)
  result.set(new Uint8Array(encrypted), 18)

  return result.buffer
}

/**
 * Decodes a .mirath binary file back into case data.
 */
export async function decodeMirath(
  bytes: ArrayBuffer,
  key: Uint8Array
): Promise<MirathFileContent> {
  const data = new Uint8Array(bytes)

  // Validate magic bytes
  for (let i = 0; i < 4; i++) {
    if (data[i] !== MIRATH_MAGIC[i]) {
      throw new Error('Invalid .mirath file: magic bytes mismatch')
    }
  }

  // Validate version
  const version = (data[4] << 8) | data[5]
  if (version !== MIRATH_VERSION) {
    throw new Error(`Unsupported .mirath version: ${version}`)
  }

  // Extract IV and encrypted payload
  const iv = data.slice(6, 18)
  const encrypted = data.slice(18)

  // Decrypt with AES-256-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  const compressed = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )

  // Decompress
  const jsonBytes = await decompress(new Uint8Array(compressed))
  const json = new TextDecoder().decode(jsonBytes)

  return JSON.parse(json) as MirathFileContent
}

async function compress(input: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(input)
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = cs.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

async function decompress(input: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate')
  const writer = ds.writable.getWriter()
  writer.write(input)
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
