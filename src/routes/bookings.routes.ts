import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { createBooking, getBookings, respondToBooking, createBulkBookings } from '../controllers/bookings.controller'

const router = Router()

router.post('/bulk', authenticate, createBulkBookings)
router.post('/', authenticate, createBooking)
router.get('/', authenticate, getBookings)
router.patch('/:id/respond', authenticate, respondToBooking)

export default router
