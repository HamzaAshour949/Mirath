import { Router } from 'express'
import { db } from '../db'

export const statusRouter = Router()

/**
 * GET /license/:lid/status
 *
 * Returns whether a license is still valid (not revoked).
 * Called by the Tauri app every 7 days as a background check.
 */
statusRouter.get('/:lid/status', (req, res) => {
  const { lid } = req.params

  const license = db.prepare('SELECT id, revoked_at FROM licenses WHERE id = ?').get(lid) as
    | { id: string; revoked_at: number | null }
    | undefined

  if (!license) {
    return res.status(404).json({ valid: false, revoked: false, reason: 'not_found' })
  }

  const revoked = license.revoked_at !== null

  return res.json({ valid: !revoked, revoked })
})

/**
 * POST /admin/revoke
 *
 * Revokes a license. Protected by ADMIN_TOKEN bearer auth.
 * Called from the admin dashboard.
 */
statusRouter.post('/admin/revoke', (req, res) => {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env['ADMIN_TOKEN']}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { licenseId } = req.body as { licenseId: string }
  if (!licenseId) return res.status(400).json({ error: 'licenseId required' })

  db.prepare('UPDATE licenses SET revoked_at = ? WHERE id = ?')
    .run(Math.floor(Date.now() / 1000), licenseId)

  return res.json({ success: true })
})
