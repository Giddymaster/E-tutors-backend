import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No token provided' })

  const parts = authHeader.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'Token error' })

  const [scheme, token] = parts
  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Malformed token' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    // attach to request
    // @ts-ignore
    req.userId = decoded.userId
    // @ts-ignore
    req.userRole = decoded.role
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
