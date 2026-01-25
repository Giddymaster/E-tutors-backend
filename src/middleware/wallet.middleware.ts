import { Request, Response, NextFunction } from 'express'
import { walletService } from '../services/wallet.service'

/**
 * Require the authenticated user to have a positive wallet balance.
 * Returns 402 Payment Required if balance is zero or negative.
 */
export const requirePositiveWalletBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId: string | undefined = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const bal = await walletService.getBalance(String(userId))
    const hasPositive = (bal.balance && typeof (bal as any).balance.lte === 'function')
      ? !(bal as any).balance.lte(0)
      : Number(bal.balance) > 0

    if (!hasPositive) {
      return res.status(402).json({ error: 'Insufficient wallet balance. Please add funds to continue.' })
    }

    return next()
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Wallet check failed' })
  }
}
