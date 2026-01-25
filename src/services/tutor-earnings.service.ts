import { prisma } from '../prisma'

export const tutorEarningsService = {
  /**
   * Transfer funds from student wallet to tutor wallet (on hold) when proposal is accepted
   */
  async captureProposalFunds(
    studentId: string,
    tutorId: string,
    proposalId: string,
    amount: number
  ): Promise<any> {
    if (amount <= 0) throw new Error('Amount must be positive')

    // Check student has sufficient balance
    const student = await prisma.user.findUnique({ where: { id: studentId } })
    if (!student) throw new Error('Student not found')
    if (student.walletBalance.lt(amount)) {
      throw new Error(`Insufficient funds. Balance: $${student.walletBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`)
    }

    // Get tutor
    const tutor = await prisma.user.findUnique({ where: { id: tutorId } })
    if (!tutor) throw new Error('Tutor not found')

    // Deduct from student wallet and add to tutor's pending funds (atomically)
    const result = await prisma.$transaction([
      // Deduct from student
      prisma.user.update({
        where: { id: studentId },
        data: { walletBalance: { decrement: amount } },
      }),
      // Add to tutor's pending funds
      prisma.user.update({
        where: { id: tutorId },
        data: { pendingFunds: { increment: amount } },
      }),
      // Record student debit transaction
      prisma.walletTransaction.create({
        data: {
          userId: studentId,
          amount,
          type: 'debit',
          reason: 'proposal_accepted',
          relatedId: proposalId,
          description: `Payment for proposal ${proposalId.substring(0, 8)}...`,
          status: 'APPROVED',
          balanceBefore: student.walletBalance,
          balanceAfter: student.walletBalance.minus(amount),
          approvedAt: new Date(),
        },
      }),
      // Record tutor earning transaction (on hold)
      prisma.walletTransaction.create({
        data: {
          userId: tutorId,
          amount,
          type: 'earning',
          reason: 'proposal_accepted',
          relatedId: proposalId,
          description: `Earned from proposal ${proposalId.substring(0, 8)}... (On Hold)`,
          status: 'PENDING',
          balanceBefore: tutor.pendingFunds,
          balanceAfter: tutor.pendingFunds.plus(amount),
        },
      }),
    ])

    return {
      studentId,
      tutorId,
      amount,
      message: `Funds transferred to tutor wallet (on hold pending completion)`,
    }
  },

  /**
   * Get tutor earnings summary
   */
  async getTutorEarnings(tutorId: string): Promise<any> {
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        name: true,
        email: true,
        earnedFunds: true,
        pendingFunds: true,
        walletBalance: true,
        withdrawalLimit: true,
      },
    })

    if (!tutor) throw new Error('Tutor not found')

    return {
      tutorId: tutor.id,
      name: tutor.name,
      email: tutor.email,
      totalEarned: tutor.earnedFunds,
      pendingFunds: tutor.pendingFunds,
      availableForWithdrawal: tutor.walletBalance,
      withdrawalLimit: tutor.withdrawalLimit,
      formattedTotalEarned: `$${tutor.earnedFunds.toFixed(2)}`,
      formattedPending: `$${tutor.pendingFunds.toFixed(2)}`,
      formattedAvailable: `$${tutor.walletBalance.toFixed(2)}`,
    }
  },

  /**
   * Request withdrawal by tutor
   */
  async requestWithdrawal(tutorId: string, amount: number, reason?: string): Promise<any> {
    if (amount <= 0) throw new Error('Amount must be positive')

    const tutor = await prisma.user.findUnique({ where: { id: tutorId } })
    if (!tutor) throw new Error('Tutor not found')

    // Check if amount exceeds withdrawal limit
    if (amount > Number(tutor.withdrawalLimit)) {
      throw new Error(`Withdrawal amount exceeds limit of $${tutor.withdrawalLimit.toFixed(2)}`)
    }

    // Check if tutor has sufficient available balance
    if (tutor.walletBalance.lt(amount)) {
      throw new Error(`Insufficient available funds. Current balance: $${tutor.walletBalance.toFixed(2)}`)
    }

    // Create withdrawal request
    const request = await prisma.withdrawalRequest.create({
      data: {
        userId: tutorId,
        amount,
        reason: reason || '',
        status: 'REQUESTED',
      },
    })

    return {
      id: request.id,
      amount,
      status: request.status,
      createdAt: request.createdAt,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
    }
  },

  /**
   * Get tutor withdrawal history
   */
  async getTutorWithdrawals(tutorId: string, limit = 20, skip = 0): Promise<any> {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: tutorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })

    const total = await prisma.withdrawalRequest.count({ where: { userId: tutorId } })

    return {
      withdrawals,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit),
    }
  },

  /**
   * Admin: Approve withdrawal request and transfer funds
   */
  async approveWithdrawal(requestId: string, adminId: string, notes?: string): Promise<any> {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!request) throw new Error('Withdrawal request not found')
    if (request.status !== 'REQUESTED') {
      throw new Error(`Cannot approve withdrawal with status: ${request.status}`)
    }

    const tutor = request.user
    if (tutor.walletBalance.lt(request.amount)) {
      throw new Error('Insufficient funds to approve withdrawal')
    }

    // Deduct from wallet balance and create approval record (atomically)
    const result = await prisma.$transaction([
      // Update withdrawal request to approved
      prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy: adminId,
          notes: notes || '',
        },
      }),
      // Deduct from tutor wallet
      prisma.user.update({
        where: { id: tutor.id },
        data: { walletBalance: { decrement: Number(request.amount) } },
      }),
      // Record transaction
      prisma.walletTransaction.create({
        data: {
          userId: tutor.id,
          amount: request.amount,
          type: 'debit',
          reason: 'withdrawal',
          relatedId: requestId,
          description: `Withdrawal approved and processed`,
          status: 'WITHDRAWN',
          balanceBefore: tutor.walletBalance,
          balanceAfter: tutor.walletBalance.minus(Number(request.amount)),
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      }),
    ])

    return {
      requestId,
      tutorId: tutor.id,
      amount: request.amount,
      status: 'COMPLETED',
      message: 'Withdrawal approved and processed',
    }
  },

  /**
   * Admin: Reject withdrawal request
   */
  async rejectWithdrawal(requestId: string, adminId: string, notes: string): Promise<any> {
    const request = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } })

    if (!request) throw new Error('Withdrawal request not found')
    if (request.status !== 'REQUESTED') {
      throw new Error(`Cannot reject withdrawal with status: ${request.status}`)
    }

    const updated = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        notes: notes || 'Rejected by admin',
      },
    })

    return {
      requestId,
      status: 'REJECTED',
      message: 'Withdrawal request rejected',
    }
  },

  /**
   * Admin: Get all pending withdrawal requests
   */
  async getPendingWithdrawals(limit = 50, skip = 0): Promise<any> {
    const requests = await prisma.withdrawalRequest.findMany({
      where: { status: 'REQUESTED' },
      include: {
        user: {
          select: { id: true, name: true, email: true, walletBalance: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip,
    })

    const total = await prisma.withdrawalRequest.count({ where: { status: 'REQUESTED' } })

    return {
      requests,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit),
    }
  },

  /**
   * Admin: Release funds from pending to earned (when work is complete and student satisfied)
   */
  async releasePendingFunds(tutorId: string, amount: number, proposalId: string, adminId: string): Promise<any> {
    const tutor = await prisma.user.findUnique({ where: { id: tutorId } })
    if (!tutor) throw new Error('Tutor not found')
    if (tutor.pendingFunds.lt(amount)) {
      throw new Error(`Insufficient pending funds. Current: $${tutor.pendingFunds.toFixed(2)}`)
    }

    // Move from pending to earned and wallet balance
    const result = await prisma.$transaction([
      prisma.user.update({
        where: { id: tutorId },
        data: {
          pendingFunds: { decrement: amount },
          earnedFunds: { increment: amount },
          walletBalance: { increment: amount },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: tutorId,
          amount,
          type: 'credit',
          reason: 'proposal_completed',
          relatedId: proposalId,
          description: `Funds released from hold - work completed (Proposal: ${proposalId.substring(0, 8)}...)`,
          status: 'APPROVED',
          balanceBefore: tutor.pendingFunds,
          balanceAfter: tutor.pendingFunds.minus(amount),
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      }),
    ])

    return {
      tutorId,
      amount,
      message: `Funds released from pending to wallet`,
    }
  },
}
