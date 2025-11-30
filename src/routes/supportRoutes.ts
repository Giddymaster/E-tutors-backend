import { Router } from 'express'
import { getMessages, postMessage, respondToMessage } from '../controllers/supportController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

router.get('/', getMessages)
router.post('/', authenticate, postMessage)
router.patch('/:id/respond', authenticate, respondToMessage)

export default router
