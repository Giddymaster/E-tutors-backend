import { Router } from 'express'
import { getMyStudent, updateMyStudent } from '../controllers/studentController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

router.get('/me', authenticate, getMyStudent)
router.patch('/me', authenticate, updateMyStudent)

export default router
