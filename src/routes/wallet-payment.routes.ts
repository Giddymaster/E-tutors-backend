import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { initiateWalletPayment, verifyWalletPayment } from '../controllers/wallet-payment.controller'

const router = Router()

// Initiate wallet top-up payment (get Paystack redirect URL)
router.post('/initiate', authenticate, initiateWalletPayment)

// Verify payment and add funds to wallet
router.post('/verify', authenticate, verifyWalletPayment)

export default router
