import { Router } from 'express'
import { getConversations, getConversation, sendMessage } from '../controllers/messages.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticate, getConversations)
router.get('/:conversationId', authenticate, getConversation)
router.post('/:conversationId/send', authenticate, sendMessage)

export default router