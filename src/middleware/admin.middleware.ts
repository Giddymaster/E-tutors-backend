import { Request, Response, NextFunction } from 'express'

/**
 * Middleware to check if authenticated user has ADMIN role
 * Must be used AFTER authenticate middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole

  if (!userRole) {
    return res.status(401).json({ error: 'Unauthorized: No role found' })
  }

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' })
  }

  next()
}
