import { Router } from 'express'
import { createBooking, getBookings, respondToBooking, createBulkBookings } from '../controllers/bookings.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requirePositiveWalletBalance } from '../middleware/wallet.middleware'

const router = Router()

router.get('/', authenticate, getBookings)
router.post('/', authenticate, requirePositiveWalletBalance, createBooking)
router.post('/bulk', authenticate, requirePositiveWalletBalance, createBulkBookings)
router.patch('/:id/respond', authenticate, respondToBooking)

export default router
