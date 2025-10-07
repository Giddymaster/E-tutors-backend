import { Router } from 'express'
import { getTutors } from '../controllers/tutorController'

const router = Router()

router.get('/', getTutors)

export default router
