import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import messagingService from '../services/messagingService'

const router = Router()

router.use(authenticate)

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const conversations = await messagingService.getConversations(userId)
    res.json({ conversations })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' })
  }
})

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { otherUserId } = req.body
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' })
    }

    if (userId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' })
    }

    const conversation = await messagingService.getOrCreateConversation(userId, otherUserId)
    res.json({ conversation })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create conversation' })
  }
})

router.get('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params
    const limit = Math.min(parseInt((req.query.limit as string) || '50'), 500)
    const offset = parseInt((req.query.offset as string) || '0')

    const messages = await messagingService.getMessages(
      conversationId,
      limit,
      offset
    )
    res.json({ messages })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch messages' })
  }
})

router.post('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params
    const { content } = req.body
    const senderId = req.userId || ''
    if (!senderId) return res.status(401).json({ error: 'Unauthorized' })

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' })
    }

    const message = await messagingService.sendMessage(conversationId, senderId, content)
    res.status(201).json({ message })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send message' })
  }
})

router.patch('/messages/:messageId/read', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params
    await messagingService.markMessageAsRead(messageId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark message as read' })
  }
})

router.delete('/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await messagingService.deleteMessage(messageId, userId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to delete message' })
  }
})

export default router
