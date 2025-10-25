import { Router } from 'express'
import { createBooking, listBookings, respondBooking } from '../controllers/bookingController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

router.get('/', authenticate, listBookings)
router.post('/', authenticate, createBooking)
router.patch('/:id/respond', authenticate, respondBooking)

export default router
