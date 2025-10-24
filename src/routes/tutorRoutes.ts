import { Router } from 'express'
import { getTutors, createTutor } from '../controllers/tutorController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

router.get('/', getTutors)
router.post('/', authenticate, createTutor)

export default router
