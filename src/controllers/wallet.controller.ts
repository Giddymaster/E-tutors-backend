import { Request, Response } from 'express'
import { walletService } from '../services/wallet.service'

export const getBalance = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const balance = await walletService.getBalance(userId)
    res.json(balance)
  } catch (err: any) {
    console.error('getBalance error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to get balance' })
  }
}

export const addFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { amount, description } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    const balance = await walletService.addFunds(userId, amount, description)
    res.json({ success: true, balance })
  } catch (err: any) {
    console.error('addFunds error:', err.message)
    res.status(400).json({ error: err.message || 'Failed to add funds' })
  }
}

export const getTransactions = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = parseInt(req.query.skip as string) || 0

    const result = await walletService.getTransactions(userId, limit, skip)
    res.json(result)
  } catch (err: any) {
    console.error('getTransactions error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to get transactions' })
  }
}

/**
 * Internal endpoint: Check if user has sufficient balance
 * Returns { sufficient: boolean, balance: string, required: string }
 */
export const checkBalance = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { amount } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    const balance = await walletService.getBalance(userId)
    const sufficient = balance.balance.toNumber() >= amount

    res.json({
      sufficient,
      balance: balance.formattedBalance,
      required: `$${amount.toFixed(2)}`,
      shortBy: sufficient ? null : `$${(amount - balance.balance.toNumber()).toFixed(2)}`
    })
  } catch (err: any) {
    console.error('checkBalance error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to check balance' })
  }
}
