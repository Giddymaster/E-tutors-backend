import { Request, Response } from 'express'
import { prisma } from '../prisma'

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      totalAssignments,
      totalEarnings,
      totalWalletBalance,
      pendingVerifications,
      activeAISessions,
      newsletterSubscribers,
      pendingWithdrawals
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TUTOR' } }),
      prisma.assignment.count(),
      prisma.user.aggregate({
        where: { role: 'TUTOR' },
        _sum: { earnedFunds: true }
      }),
      prisma.user.aggregate({
        _sum: { walletBalance: true }
      }),
      prisma.user.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.aISession.count({ where: { status: 'ACTIVE' } }),
      prisma.newsletter.count(),
      prisma.withdrawalRequest.count({ where: { status: 'REQUESTED' } })
    ])

    return res.status(200).json({
      totalUsers,
      totalStudents,
      totalTutors,
      totalAssignments,
      totalEarnings: totalEarnings._sum.earnedFunds || 0,
      totalWalletBalance: totalWalletBalance._sum.walletBalance || 0,
      pendingVerifications,
      activeAISessions,
      newsletterSubscribers,
      pendingWithdrawals
    })
  } catch (err: any) {
    console.error('getDashboardStats error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Get all users with pagination and filters
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, role, verified, search } = req.query

    const where: any = {}
    
    if (role) where.role = role
    if (verified !== undefined) where.verified = verified === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          verificationStatus: true,
          walletBalance: true,
          earnedFunds: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    return res.status(200).json({
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  } catch (err: any) {
    console.error('getAllUsers error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Get all assignments with pagination
 */
export const getAllAssignments = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const where: any = {}
    if (status) where.status = status

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          student: {
            select: { id: true, name: true, email: true }
          },
          tutor: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.assignment.count({ where })
    ])

    return res.status(200).json({
      assignments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  } catch (err: any) {
    console.error('getAllAssignments error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Get all transactions with pagination
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const where: any = {}
    if (status) where.status = status

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.walletTransaction.count({ where })
    ])

    return res.status(200).json({
      transactions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  } catch (err: any) {
    console.error('getAllTransactions error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Get pending withdrawal requests
 */
export const getPendingWithdrawals = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: { status: 'REQUESTED' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user: {
            select: { id: true, name: true, email: true, earnedFunds: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.withdrawalRequest.count({ where: { status: 'REQUESTED' } })
    ])

    return res.status(200).json({
      withdrawals,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  } catch (err: any) {
    console.error('getPendingWithdrawals error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Approve or reject a withdrawal request
 */
export const updateWithdrawalStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' })
    }

    if (withdrawal.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Withdrawal already processed' })
    }

    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status,
        notes: status === 'REJECTED' ? rejectionReason : null,
        approvedAt: new Date()
      }
    })

    return res.status(200).json(updated)
  } catch (err: any) {
    console.error('updateWithdrawalStatus error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Update user verification status
 */
export const updateUserVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { verificationStatus } = req.body

    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(verificationStatus)) {
      return res.status(400).json({ error: 'Invalid verification status' })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        verificationStatus,
        verified: verificationStatus === 'VERIFIED'
      }
    })

    return res.status(200).json(user)
  } catch (err: any) {
    console.error('updateUserVerification error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Update user wallet balance (add/subtract funds)
 */
export const updateUserWallet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { amount, description } = req.body

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update wallet balance
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        walletBalance: {
          increment: Number(amount)
        }
      }
    })

    // Create transaction record
    await prisma.walletTransaction.create({
      data: {
        userId: id,
        amount: Number(amount),
        type: Number(amount) > 0 ? 'credit' : 'debit',
        reason: 'admin_adjustment',
        description: description || 'Admin adjustment',
        status: 'APPROVED',
        balanceBefore: user.walletBalance,
        balanceAfter: Number(user.walletBalance) + Number(amount)
      }
    })

    return res.status(200).json(updatedUser)
  } catch (err: any) {
    console.error('updateUserWallet error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Delete a user (soft delete or hard delete)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Hard delete - be careful!
    await prisma.user.delete({ where: { id } })

    return res.status(200).json({ message: 'User deleted successfully' })
  } catch (err: any) {
    console.error('deleteUser error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Get system-wide settings
 */
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    // You can create a Settings table or return env-based configs
    return res.status(200).json({
      paystackEnabled: !!process.env.PAYSTACK_SECRET_KEY,
      aiEnabled: !!process.env.OPENAI_API_KEY,
      emailEnabled: !!process.env.RESEND_API_KEY,
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (err: any) {
    console.error('getSystemSettings error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
