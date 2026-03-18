import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'

export const activateRouter = Router()

interface FingerprintComponents {
  machine_id: string
  cpu: string
  motherboard: string
  mac: string
}

interface ActivateBody {
  purchaseToken: string
  fingerprint: FingerprintComponents
  email: string
}

/**
 * POST /activate
 *
 * Validates a purchase token, signs a license with the Ed25519 private key,
 * stores it in the DB, and returns the signed license JSON.
 *
 * The signed license JSON is stored by the Tauri app as license.lic.
 *
 * TODO: implement Ed25519 signing with @noble/ed25519
 * TODO: implement purchase token validation (Stripe + x402)
 */
activateRouter.post('/', async (req, res) => {
  const { purchaseToken, fingerprint, email } = req.body as ActivateBody

  if (!purchaseToken || !fingerprint || !email) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // TODO: validate purchaseToken against Stripe/x402
  // For now, accept any non-empty token (remove in production)

  const licenseId = uuidv4()
  const issuedAt = Math.floor(Date.now() / 1000)

  const payload = {
    lid: licenseId,
    pid: 'mirath-v1',
    fp: fingerprint,
    iat: issuedAt,
    license_type: 'perpetual',
  }

  // TODO: sign payload with Ed25519 private key from process.env.ED25519_PRIVATE_KEY
  const sig = 'NOT_YET_SIGNED'

  const licenseFile = { ...payload, sig }

  // Store in DB
  db.prepare(`
    INSERT INTO licenses (id, email, fingerprint_hash, issued_at, purchase_ref, purchase_method)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(licenseId, email, JSON.stringify(fingerprint), issuedAt, purchaseToken, 'stripe')

  return res.json(licenseFile)
})
