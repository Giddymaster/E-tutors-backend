import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  getEarnings,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getPendingWithdrawals,
  releasePendingFunds,
} from '../controllers/tutor-earnings.controller'

const router = Router()

// Tutor routes (authenticated)
router.get('/earnings', authenticate, getEarnings)
router.post('/withdrawal-request', authenticate, requestWithdrawal)
router.get('/withdrawals', authenticate, getWithdrawals)

// Admin routes (authenticated, should verify admin role in controllers)
router.post('/admin/withdraw/approve', authenticate, approveWithdrawal)
router.post('/admin/withdraw/reject', authenticate, rejectWithdrawal)
router.get('/admin/withdrawals/pending', authenticate, getPendingWithdrawals)
router.post('/admin/release-pending-funds', authenticate, releasePendingFunds)

export default router
