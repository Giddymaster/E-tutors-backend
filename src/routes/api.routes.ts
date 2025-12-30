import { Router } from 'express';
import { createTutor, getTutors, getMyTutor, updateMyTutor } from '../controllers/tutors.controller';
import { authenticate } from '../middleware/auth.middleware';
import { getMyStudent, upsertMyStudent } from '../controllers/students.controller';
import { processPayment } from '../controllers/payments.controller';

const router = Router();

// Tutor routes
router.post('/tutors', authenticate, createTutor);
router.get('/tutors', getTutors);
// Get tutor by id (public)
import { getTutorById } from '../controllers/tutors.controller';
router.get('/tutors/:id', getTutorById);
router.get('/tutors/me', authenticate, getMyTutor);
router.put('/tutors/:id', updateMyTutor);
// router.delete('/tutors/:id', deleteMyTutor);

// Payments (demo)
router.post('/payments/process', processPayment);

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

export default router;