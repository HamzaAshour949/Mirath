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
