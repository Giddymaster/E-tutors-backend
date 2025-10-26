import { Router } from 'express'
import { getTutors, createTutor, getTutorById, getMyTutor, updateMyTutor } from '../controllers/tutorController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// List and create
router.get('/', getTutors)
router.post('/', authenticate, createTutor)

// Authenticated routes for current user
router.get('/me', authenticate, getMyTutor)
router.patch('/me', authenticate, updateMyTutor)

// Get single tutor by id (placed after collection routes to avoid accidental conflicts)
router.get('/:id', getTutorById)

export default router
