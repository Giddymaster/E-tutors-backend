import { Router } from 'express'
import { createBooking, listBookings, respondBooking } from '../controllers/booking.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticate, listBookings)
router.post('/', authenticate, createBooking)
router.patch('/:id/respond', authenticate, respondBooking)

export default router
