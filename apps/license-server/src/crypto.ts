import { createHash, sign, verify, KeyObject, createPrivateKey, createPublicKey } from 'crypto'

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

function loadPrivateKey(): KeyObject {
  const b64 = process.env['ED25519_PRIVATE_KEY']
  if (!b64) throw new Error('ED25519_PRIVATE_KEY is not set')
  const der = Buffer.from(b64, 'base64')
  return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

export function signPayload(payload: string): string {
  const privateKey = loadPrivateKey()
  const sig = sign(null, Buffer.from(payload, 'utf8'), privateKey)
  return sig.toString('base64')
}

export function verifyPayload(payload: string, signatureB64: string, publicKeyB64: string): boolean {
  const der = Buffer.from(publicKeyB64, 'base64')
  const publicKey = createPublicKey({ key: der, format: 'der', type: 'spki' })
  const sig = Buffer.from(signatureB64, 'base64')
  return verify(null, Buffer.from(payload, 'utf8'), publicKey, sig)
}
