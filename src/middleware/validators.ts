import { body, ValidationChain, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

export const registerValidators = (): ValidationChain[] => [
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 15 })
    .withMessage('Password must be 8-15 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must include uppercase, lowercase, and a number'),
  // optional role field: must match Prisma Role enum values when provided
  body('role').optional().isIn(['STUDENT', 'TUTOR', 'ADMIN', 'SUPPORT']).withMessage('Invalid role'),
]

export const loginValidators = (): ValidationChain[] => [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
]

export const runValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}
