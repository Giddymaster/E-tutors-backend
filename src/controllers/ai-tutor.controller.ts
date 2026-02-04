import { Request, Response } from 'express'
import * as aiTutorService from '../services/ai-tutor.service'

// Create new AI session
export const createSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { subject, durationHours } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' })
    }

    const session = await aiTutorService.createAISession(userId, subject, durationHours)
    return res.status(201).json(session)
  } catch (error: any) {
    console.error('Create AI session error:', error)
    return res.status(500).json({ error: error.message || 'Failed to create session' })
  }
}

// Get all sessions for user
export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const sessions = await aiTutorService.getAISessions(userId)
    return res.status(200).json(sessions)
  } catch (error: any) {
    console.error('Get AI sessions error:', error)
    return res.status(500).json({ error: error.message || 'Failed to get sessions' })
  }
}

// Get specific session with messages
export const getSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const session = await aiTutorService.getAISession(sessionId, userId)
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    return res.status(200).json(session)
  } catch (error: any) {
    console.error('Get AI session error:', error)
    return res.status(500).json({ error: error.message || 'Failed to get session' })
  }
}

// Send message to AI
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params
    const { message } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    const response = await aiTutorService.sendAIMessage(userId, sessionId, message)
    return res.status(200).json(response)
  } catch (error: any) {
    console.error('Send AI message error:', error)

    const msg = String(error?.message || '')
    if (msg.includes('Insufficient')) {
      return res.status(402).json({ error: msg })
    }
    if (msg.includes('AI service not configured')) {
      // 503 Service Unavailable when OPENAI_API_KEY is missing
      return res.status(503).json({ error: 'AI service not configured. Please set OPENAI_API_KEY.' })
    }
    if (msg.match(/quota|rate limit|429|exceeded/i)) {
      return res.status(429).json({ error: msg })
    }

    return res.status(500).json({ error: msg || 'Failed to send message' })
  }
}

// End session
export const endSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params
    const { durationSeconds } = req.body as { durationSeconds?: number }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Attempt to bill for elapsed time and end session
    const result = await aiTutorService.endAISessionWithBilling(sessionId, userId, durationSeconds)
    return res.status(200).json({ message: 'Session ended successfully', charged: result.charged, durationSeconds: result.durationSeconds })
  } catch (error: any) {
    console.error('End AI session error:', error)
    if (String(error?.message || '').includes('Insufficient')) {
      return res.status(402).json({ error: error.message })
    }
    return res.status(500).json({ error: error.message || 'Failed to end session' })
  }
}

// Extend a prepaid session by paying for additional hours
export const extendSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params
    const { hours } = req.body as { hours?: number }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!hours || hours <= 0) return res.status(400).json({ error: 'Invalid extension hours' })

    const result = await aiTutorService.extendAISession(sessionId, userId, hours)
    return res.status(200).json({ message: 'Session extended', addedHours: hours, charged: result.charged })
  } catch (err: any) {
    console.error('Extend session error:', err)
    if (String(err?.message || '').includes('Insufficient')) return res.status(402).json({ error: err.message })
    return res.status(500).json({ error: err.message || 'Failed to extend session' })
  }
}

// Get user's credit balance
export const getCredits = async (req: Request, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const creditInfo = await aiTutorService.getAICredits(userId)

    // Return legacy `credits` value (minutes remaining) for backward compatibility,
    // plus a more descriptive breakdown (hours/minutes) and wallet balance.
    return res.status(200).json({
      credits: creditInfo.minutesRemaining,
      minutesRemaining: creditInfo.minutesRemaining,
      hours: creditInfo.hours,
      minutes: creditInfo.minutes,
      walletBalance: creditInfo.walletBalance,
    })
  } catch (error: any) {
    console.error('Get AI credits error:', error)
    return res.status(500).json({ error: error.message || 'Failed to get credits' })
  }
}

// Purchase credits
export const purchaseCredits = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { credits } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!credits || credits <= 0) {
      return res.status(400).json({ error: 'Invalid credit amount' })
    }

    const user = await aiTutorService.purchaseAICredits(userId, credits)
    return res.status(200).json({ 
      credits: user.aiCredits,
      message: `${credits} credits added successfully`
    })
  } catch (error: any) {
    console.error('Purchase AI credits error:', error)
    return res.status(500).json({ error: error.message || 'Failed to purchase credits' })
  }
}
