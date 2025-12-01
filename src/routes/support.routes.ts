import { Router } from 'express'
import { getMessages, postMessage, respondToMessage } from '../controllers/support.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/', getMessages)
router.post('/', authenticate, postMessage)
router.patch('/:id/respond', authenticate, respondToMessage)

export default router
