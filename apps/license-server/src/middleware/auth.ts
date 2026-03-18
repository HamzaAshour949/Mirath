import { Request, Response, NextFunction } from 'express'

export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env['ADMIN_TOKEN']
  const authHeader = req.headers['authorization']

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}
