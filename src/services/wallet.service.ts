import { prisma } from '../prisma'

export interface WalletBalance {
  userId: string
  balance: any // Decimal type
  formattedBalance: string
}

export interface WalletTransaction {
  id: string
  amount: any // Decimal
  type: string
  reason: string
  description?: string
  balanceBefore: any // Decimal
  balanceAfter: any // Decimal
  createdAt: Date
}

/**
 * Wallet Service: Handles all wallet operations including balance checks,
 * credits, debits, and transaction history
 */
export const walletService = {
  /**
   * Get current wallet balance for a user
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true }
    })

    if (!user) throw new Error('User not found')

    return {
      userId: user.id,
      balance: user.walletBalance,
      formattedBalance: `$${user.walletBalance.toFixed(2)}`
    }
  },

  /**
   * Add funds to wallet (called after successful payment)
   */
  async addFunds(userId: string, amount: number, description?: string): Promise<WalletBalance> {
    if (amount <= 0) throw new Error('Amount must be positive')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const balanceBefore = user.walletBalance
    const balanceAfter = balanceBefore.plus(amount)

    // Update balance and create transaction
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: balanceAfter },
      select: { walletBalance: true }
    })

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'credit',
        reason: 'add_funds',
        description: description || 'Added funds to wallet',
        balanceBefore,
        balanceAfter
      }
    })

    return {
      userId,
      balance: updated.walletBalance,
      formattedBalance: `$${updated.walletBalance.toFixed(2)}`
    }
  },

  /**
   * Deduct funds from wallet (called before booking, posting assignment, using AI tutor)
   * Returns new balance or throws error if insufficient funds
   */
  async deductFunds(
    userId: string,
    amount: number,
    reason: 'book_tutor' | 'post_assignment' | 'ai_tutor',
    relatedId?: string,
    description?: string
  ): Promise<WalletBalance> {
    if (amount <= 0) throw new Error('Amount must be positive')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    // Check if sufficient balance
    if (user.walletBalance.lt(amount)) {
      throw new Error(`Insufficient funds. Balance: $${user.walletBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`)
    }

    const balanceBefore = user.walletBalance
    const balanceAfter = balanceBefore.minus(amount)

    // Deduct and create transaction
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: balanceAfter },
      select: { walletBalance: true }
    })

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'debit',
        reason,
        relatedId,
        description: description || `Charged for ${reason.replace('_', ' ')}`,
        balanceBefore,
        balanceAfter
      }
    })

    return {
      userId,
      balance: updated.walletBalance,
      formattedBalance: `$${updated.walletBalance.toFixed(2)}`
    }
  },

  /**
   * Refund funds to wallet (when booking is cancelled, etc.)
   */
  async refundFunds(
    userId: string,
    amount: number,
    relatedId?: string,
    description?: string
  ): Promise<WalletBalance> {
    if (amount <= 0) throw new Error('Amount must be positive')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const balanceBefore = user.walletBalance
    const balanceAfter = balanceBefore.plus(amount)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: balanceAfter },
      select: { walletBalance: true }
    })

    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'refund',
        reason: 'refund',
        relatedId,
        description: description || 'Refunded to wallet',
        balanceBefore,
        balanceAfter
      }
    })

    return {
      userId,
      balance: updated.walletBalance,
      formattedBalance: `$${updated.walletBalance.toFixed(2)}`
    }
  },

  /**
   * Get transaction history for user
   */
  async getTransactions(userId: string, limit = 20, skip = 0) {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    })

    const total = await prisma.walletTransaction.count({ where: { userId } })

    return {
      transactions,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit)
    }
  }
}
