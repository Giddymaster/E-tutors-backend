import { Router } from 'express';
import { createTutor, getTutors, getMyTutor, updateMyTutor, getTutorById } from '../controllers/tutors.controller';
import { authenticate } from '../middleware/auth.middleware';
import { getMyStudent, upsertMyStudent } from '../controllers/students.controller';
import { processPayment, verifyPaystackPayment } from '../controllers/payments.controller';
import walletRouter from './wallet.routes'

const router = Router();

// Tutor routes
router.get('/tutors', getTutors);
router.post('/tutors', authenticate, createTutor);
// Specific routes (me) must come before parameterized routes (:id)
router.get('/tutors/me', authenticate, getMyTutor);
router.patch('/tutors/me', authenticate, updateMyTutor);
// Get tutor by id (public) - must come after /me
router.get('/tutors/:id', getTutorById);
// router.delete('/tutors/:id', deleteMyTutor);

// Payments (demo)
router.post('/payments/process', processPayment);
router.post('/payments/verify-paystack', verifyPaystackPayment);

// Wallet
router.use('/wallet', walletRouter)

// Wallet payments (Paystack integration)
import walletPaymentRouter from './wallet-payment.routes'
router.use('/wallet-payments', walletPaymentRouter)

// Assignments & proposals
import assignmentsRoutes from './assignments.routes'
router.use('/assignments', assignmentsRoutes)

// Bookings
import bookingsRouter from './bookings.routes'
router.use('/bookings', bookingsRouter)

// Student routes
router.get('/students/me', authenticate, getMyStudent);
router.put('/students/me', authenticate, upsertMyStudent);
// router.delete('/students/:id', deleteMyStudent);

// Newsletter routes
import newsletterRouter from './newsletter.routes'
router.use('/newsletter', newsletterRouter)

// AI Tutor routes
import aiTutorRouter from './ai-tutor.routes'
router.use('/ai-tutor', aiTutorRouter)

// Tutor Earnings routes
import tutorEarningsRouter from './tutor-earnings.routes'
router.use('/tutor-earnings', tutorEarningsRouter)

export default router;