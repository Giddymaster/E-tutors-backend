import { Request, Response, NextFunction } from 'express'

export const authorizeRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // `userRole` is set by authenticate middleware
    if (!req.userRole) return res.status(403).json({ error: 'Forbidden' })
    if (req.userRole !== role) return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}
