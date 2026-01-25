import { Request, Response } from 'express'
import { tutorEarningsService } from '../services/tutor-earnings.service'

/**
 * Get tutor earnings summary
 */
export const getEarnings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const tutorId = req.userId
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    const earnings = await tutorEarningsService.getTutorEarnings(tutorId)
    res.json(earnings)
  } catch (err: any) {
    console.error('getEarnings error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Request withdrawal
 */
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const tutorId = req.userId
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    const { amount, reason } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    const result = await tutorEarningsService.requestWithdrawal(tutorId, amount, reason)
    res.status(201).json(result)
  } catch (err: any) {
    console.error('requestWithdrawal error:', err)
    if (err.message.includes('exceeds limit') || err.message.includes('Insufficient')) {
      return res.status(402).json({ error: err.message })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Get tutor withdrawal history
 */
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const tutorId = req.userId
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    const limit = parseInt(req.query.limit as string) || 20
    const skip = parseInt(req.query.skip as string) || 0

    const result = await tutorEarningsService.getTutorWithdrawals(tutorId, limit, skip)
    res.json(result)
  } catch (err: any) {
    console.error('getWithdrawals error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Admin: Approve withdrawal
 */
export const approveWithdrawal = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const adminId = req.userId
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' })

    // TODO: Verify admin role

    const { requestId, notes } = req.body
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' })
    }

    const result = await tutorEarningsService.approveWithdrawal(requestId, adminId, notes)
    res.json(result)
  } catch (err: any) {
    console.error('approveWithdrawal error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Admin: Reject withdrawal
 */
export const rejectWithdrawal = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const adminId = req.userId
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' })

    // TODO: Verify admin role

    const { requestId, notes } = req.body
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' })
    }

    const result = await tutorEarningsService.rejectWithdrawal(requestId, adminId, notes)
    res.json(result)
  } catch (err: any) {
    console.error('rejectWithdrawal error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Admin: Get all pending withdrawals
 */
export const getPendingWithdrawals = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const adminId = req.userId
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' })

    // TODO: Verify admin role

    const limit = parseInt(req.query.limit as string) || 50
    const skip = parseInt(req.query.skip as string) || 0

    const result = await tutorEarningsService.getPendingWithdrawals(limit, skip)
    res.json(result)
  } catch (err: any) {
    console.error('getPendingWithdrawals error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

/**
 * Admin: Release pending funds to earned
 */
export const releasePendingFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const adminId = req.userId
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' })

    // TODO: Verify admin role

    const { tutorId, amount, proposalId } = req.body
    if (!tutorId || !amount || !proposalId) {
      return res.status(400).json({ error: 'tutorId, amount, and proposalId are required' })
    }

    const result = await tutorEarningsService.releasePendingFunds(tutorId, amount, proposalId, adminId)
    res.json(result)
  } catch (err: any) {
    console.error('releasePendingFunds error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
