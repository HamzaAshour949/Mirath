import { Router } from 'express'
import { requireAdminToken } from '../middleware/auth'
import { db } from '../db'

export const adminRouter = Router()

adminRouter.post('/revoke', requireAdminToken, (req, res) => {
  const { licenseId } = req.body as { licenseId?: string }

  if (!licenseId) {
    res.status(400).json({ error: 'licenseId required' })
    return
  }

  db.prepare('UPDATE licenses SET revoked_at = ? WHERE id = ?')
    .run(Math.floor(Date.now() / 1000), licenseId)

  res.json({ success: true })
})

adminRouter.get('/stats', requireAdminToken, (_req, res) => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM licenses').get() as { count: number }).count
  const revoked = (db.prepare('SELECT COUNT(*) as count FROM licenses WHERE revoked_at IS NOT NULL').get() as { count: number }).count
  const active = total - revoked

  res.json({ total, active, revoked })
})

adminRouter.get('/licenses', requireAdminToken, (_req, res) => {
  const licenses = db.prepare(
    'SELECT id, email, fingerprint_hash, issued_at, revoked_at, purchase_ref, purchase_method FROM licenses ORDER BY issued_at DESC'
  ).all()

  res.json(licenses)
})
