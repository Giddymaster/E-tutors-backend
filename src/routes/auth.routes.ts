import { Router } from 'express'
import { register, login, me, googleAuth, googleCallback, refreshToken, logout } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { registerValidators, loginValidators, runValidation } from '../middleware/validators'

const router = Router()

router.post('/register', registerValidators(), runValidation, register)
router.post('/login', loginValidators(), runValidation, login)
router.get('/me', authenticate, me)
router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)
router.post('/refresh', refreshToken)
router.post('/logout', authenticate, logout)

export default router
