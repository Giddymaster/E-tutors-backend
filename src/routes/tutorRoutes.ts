import { Router } from 'express'
import { getTutors, createTutor, getTutorById } from '../controllers/tutorController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// List and create
router.get('/', getTutors)
router.post('/', authenticate, createTutor)

// Get single tutor by id (placed after collection routes to avoid accidental conflicts)
router.get('/:id', getTutorById)

export default router
