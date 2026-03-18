import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import { signPayload } from '../crypto'

export const activateRouter = Router()

interface FingerprintComponents {
  machine_id: string
  cpu: string
  motherboard: string
  mac: string
  hash: string
}

interface ActivateBody {
  purchaseToken: string
  email: string
  fingerprint: FingerprintComponents
}

activateRouter.post('/', (req, res) => {
  const { purchaseToken, email, fingerprint } = req.body as ActivateBody

  if (
    !purchaseToken ||
    !email ||
    !fingerprint ||
    !fingerprint.machine_id ||
    !fingerprint.cpu ||
    !fingerprint.motherboard ||
    !fingerprint.mac ||
    !fingerprint.hash
  ) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const existing = db
    .prepare('SELECT id FROM licenses WHERE purchase_ref = ?')
    .get(purchaseToken) as { id: string } | undefined

  if (existing) {
    res.status(409).json({ error: 'License already issued for this purchase token' })
    return
  }

  const purchaseMethod = purchaseToken.startsWith('pi_') ? 'stripe' : 'x402'
  const lid = uuidv4()
  const iat = Math.floor(Date.now() / 1000)

  const signingPayload = `${lid}|${email}|${fingerprint.hash}|${iat}`
  const sig = signPayload(signingPayload)

  const licensePayload = {
    lid,
    email,
    pid: purchaseToken,
    fp: {
      machine_id: fingerprint.machine_id,
      cpu: fingerprint.cpu,
      motherboard: fingerprint.motherboard,
      mac: fingerprint.mac,
      hash: fingerprint.hash,
    },
    iat,
    license_type: 'perpetual',
    sig,
  }

  const licenseJson = JSON.stringify(licensePayload)

  db.prepare(`
    INSERT INTO licenses (id, email, fingerprint_hash, issued_at, purchase_ref, purchase_method)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(lid, email, fingerprint.hash, iat, purchaseToken, purchaseMethod)

  res.json({ license: licenseJson })
})
