import { Request, Response } from 'express'
import { prisma } from '../prisma'
import { tutorEarningsService } from '../services/tutor-earnings.service'

export const listAssignments = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string | undefined) || undefined
    const q = (req.query.q as string | undefined) || undefined

    const where: any = {}
    if (subject) where.title = { contains: subject, mode: 'insensitive' }
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { proposals: { include: { tutor: { select: { id: true, name: true } } } } }
    })

    res.json({ assignments })
  } catch (err) {
    console.error('listAssignments error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const createAssignment = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const rawUserId = req.userId
    if (!rawUserId) return res.status(401).json({ error: 'Unauthorized' })
    const userId = String(rawUserId)

    const { title, description, budgetMin, budgetMax, files } = req.body
    if (!title || !description) return res.status(400).json({ error: 'title and description are required' })

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        files: files || null,
        budgetMin: typeof budgetMin === 'number' ? budgetMin : undefined,
        budgetMax: typeof budgetMax === 'number' ? budgetMax : undefined,
        studentId: userId,
      }
    })

    res.status(201).json({ assignment })
  } catch (err) {
    console.error('createAssignment error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const createProposal = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const rawUserId = req.userId
    if (!rawUserId) return res.status(401).json({ error: 'Unauthorized' })
    const tutorId = String(rawUserId)

    const assignmentId = String(req.params.id)
    const { amount, message, deliveryDays } = req.body
    if (!amount) return res.status(400).json({ error: 'amount is required' })

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        jobId: assignmentId,
        tutorId: tutorId,
        amount: Number(amount),
        message: message || null,
        deliveryDays: typeof deliveryDays === 'number' ? deliveryDays : null,
      },
      include: { tutor: { select: { id: true, name: true } } }
    })

    res.status(201).json({ proposal })
  } catch (err) {
    console.error('createProposal error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const acceptProposal = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const rawUserId = req.userId
    if (!rawUserId) return res.status(401).json({ error: 'Unauthorized' })
    const studentId = String(rawUserId)

    const assignmentId = String(req.params.id)
    const proposalId = String(req.params.proposalId)

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })
    if (assignment.studentId !== studentId) return res.status(403).json({ error: 'Only the posting student can accept proposals' })

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } })
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' })

    // Transfer funds from student wallet to tutor (on hold) when proposal is accepted
    const tutorId = proposal.tutorId
    const bidAmount = proposal.amount

    try {
      await tutorEarningsService.captureProposalFunds(studentId, tutorId, proposalId, Number(bidAmount))
    } catch (fundErr: any) {
      return res.status(402).json({ error: fundErr.message || 'Failed to process payment for proposal' })
    }

    await prisma.proposal.updateMany({ where: { jobId: assignmentId, id: { not: proposalId } }, data: { status: 'REJECTED' } })
    await prisma.proposal.update({ where: { id: proposalId }, data: { status: 'ACCEPTED' } })
    await prisma.assignment.update({ where: { id: assignmentId }, data: { tutorId: proposal.tutorId, status: 'ASSIGNED' } })

    res.json({ ok: true, message: 'Proposal accepted. Funds transferred to tutor (on hold pending completion).' })
  } catch (err) {
    console.error('acceptProposal error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const getAssignment = async (req: Request, res: Response) => {
  try {
    const assignmentId = String(req.params.id)
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { proposals: true } })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })
    res.json({ assignment })
  } catch (err) {
    console.error('getAssignment error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
