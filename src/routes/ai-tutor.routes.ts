import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requirePositiveWalletBalance } from '../middleware/wallet.middleware'
import * as aiTutorController from '../controllers/ai-tutor.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Session routes
router.post('/sessions', requirePositiveWalletBalance, aiTutorController.createSession)
router.get('/sessions', aiTutorController.getSessions)
router.get('/sessions/:sessionId', aiTutorController.getSession)
router.post('/sessions/:sessionId/messages', requirePositiveWalletBalance, aiTutorController.sendMessage)
router.patch('/sessions/:sessionId/end', aiTutorController.endSession)
router.post('/sessions/:sessionId/extend', requirePositiveWalletBalance, aiTutorController.extendSession)

// Credits routes
router.get('/credits', aiTutorController.getCredits)
router.post('/credits/purchase', aiTutorController.purchaseCredits)

export default router
