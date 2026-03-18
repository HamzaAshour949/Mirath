import { Router } from 'express'
import { db } from '../db'

export const statusRouter = Router()

statusRouter.get('/:lid/status', (req, res) => {
  const { lid } = req.params

  const license = db
    .prepare('SELECT revoked_at FROM licenses WHERE id = ?')
    .get(lid) as { revoked_at: number | null } | undefined

  if (!license) {
    res.json({ valid: false, revoked: false })
    return
  }

  const revoked = license.revoked_at !== null
  res.json({ valid: !revoked, revoked })
})
