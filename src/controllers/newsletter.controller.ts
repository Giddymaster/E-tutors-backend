import { Request, Response } from 'express'
import { newsletterService } from '../services/newsletter.service'

export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }

    const result = await newsletterService.subscribe(email)
    return res.status(result.success ? 200 : 400).json(result)
  } catch (error) {
    console.error('Subscribe newsletter error:', error)
    res.status(500).json({ error: 'Failed to subscribe' })
  }
}

export const confirmNewsletterSubscription = async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    const result = await newsletterService.confirmSubscription(token)
    return res.status(result.success ? 200 : 400).json(result)
  } catch (error) {
    console.error('Confirm newsletter error:', error)
    res.status(500).json({ error: 'Failed to confirm subscription' })
  }
}

export const unsubscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }

    const result = await newsletterService.unsubscribe(email)
    return res.status(result.success ? 200 : 400).json(result)
  } catch (error) {
    console.error('Unsubscribe newsletter error:', error)
    res.status(500).json({ error: 'Failed to unsubscribe' })
  }
}

export const getNewsletterSubscribers = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    // In production, verify user is admin
    
    const skip = parseInt(req.query.skip as string) || 0
    const take = parseInt(req.query.take as string) || 50

    const result = await newsletterService.getSubscribers(skip, take)
    return res.json(result)
  } catch (error) {
    console.error('Get subscribers error:', error)
    res.status(500).json({ error: 'Failed to fetch subscribers' })
  }
}
