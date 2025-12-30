import { Router } from 'express'
import { createBooking, getBookings, respondToBooking, createBulkBookings } from '../controllers/bookings.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticate, getBookings)
router.post('/', authenticate, createBooking)
router.post('/bulk', authenticate, createBulkBookings)
router.patch('/:id/respond', authenticate, respondToBooking)

export default router
