import { Router } from 'express'
import { getMyStudent, updateMyStudent } from '../controllers/students.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/me', authenticate, getMyStudent)
router.patch('/me', authenticate, updateMyStudent)

export default router
