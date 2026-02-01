import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'
import * as adminController from '../controllers/admin.controller'

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate)
router.use(requireAdmin)

// Dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats)

// User management
router.get('/users', adminController.getAllUsers)
router.patch('/users/:id/verification', adminController.updateUserVerification)
router.patch('/users/:id/wallet', adminController.updateUserWallet)
router.delete('/users/:id', adminController.deleteUser)

// Assignment management
router.get('/assignments', adminController.getAllAssignments)

// Transaction management
router.get('/transactions', adminController.getAllTransactions)

// Withdrawal management
router.get('/withdrawals/pending', adminController.getPendingWithdrawals)
router.patch('/withdrawals/:id/status', adminController.updateWithdrawalStatus)

// System settings
router.get('/settings', adminController.getSystemSettings)

export default router
