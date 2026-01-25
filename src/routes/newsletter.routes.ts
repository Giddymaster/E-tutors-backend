import { Router } from 'express'
import {
  subscribeNewsletter,
  confirmNewsletterSubscription,
  unsubscribeNewsletter,
  getNewsletterSubscribers
} from '../controllers/newsletter.controller'

const router = Router()

// Public routes
router.post('/subscribe', subscribeNewsletter)
router.get('/confirm/:token', confirmNewsletterSubscription)
router.post('/unsubscribe', unsubscribeNewsletter)

// Protected routes (for admin)
router.get('/subscribers', getNewsletterSubscribers)

export default router
