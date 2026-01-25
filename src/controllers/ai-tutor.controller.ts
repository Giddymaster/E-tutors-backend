import { Request, Response } from 'express'
import * as aiTutorService from '../services/ai-tutor.service'

// Create new AI session
export const createSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { subject } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' })
    }

    const session = await aiTutorService.createAISession(userId, subject)
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
    
    if (error.message.includes('Insufficient')) {
      return res.status(402).json({ error: error.message })
    }
    
    return res.status(500).json({ error: error.message || 'Failed to send message' })
  }
}

// End session
export const endSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await aiTutorService.endAISession(sessionId, userId)
    return res.status(200).json({ message: 'Session ended successfully' })
  } catch (error: any) {
    console.error('End AI session error:', error)
    return res.status(500).json({ error: error.message || 'Failed to end session' })
  }
}

// Get user's credit balance
export const getCredits = async (req: Request, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const credits = await aiTutorService.getAICredits(userId)
    return res.status(200).json({ credits })
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
