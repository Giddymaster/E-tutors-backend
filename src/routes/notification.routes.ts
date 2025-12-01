import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import notificationService from '../services/notification.service'

const router = Router()

router.use(authenticate)

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const settings = await notificationService.getNotificationSettings(userId)
    res.json({ settings })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notification settings' })
  }
})

router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const updates = req.body

    const settings = await notificationService.updateNotificationSettings(userId, updates)
    res.json({ settings })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update notification settings' })
  }
})

router.get('/email-logs', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const limit = Math.min(parseInt((req.query.limit as string) || '50'), 500)
    const offset = parseInt((req.query.offset as string) || '0')

    const result = await notificationService.getEmailLogs(userId, limit, offset)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch email logs' })
  }
})

export default router
