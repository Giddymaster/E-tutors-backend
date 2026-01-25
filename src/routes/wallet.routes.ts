import { Router } from 'express'
import { getBalance, addFunds, getTransactions, checkBalance } from '../controllers/wallet.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// All wallet routes require authentication
router.use(authenticate)

// Get current balance
router.get('/balance', getBalance)

// Add funds to wallet (called after payment verification)
router.post('/add-funds', addFunds)

// Get transaction history
router.get('/transactions', getTransactions)

// Check if user has sufficient balance
router.post('/check-balance', checkBalance)

export default router
