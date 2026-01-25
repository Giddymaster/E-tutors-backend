import { Router } from 'express'
import { listAssignments, createAssignment, createProposal, acceptProposal, getAssignment } from '../controllers/assignments.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requirePositiveWalletBalance } from '../middleware/wallet.middleware'
import { prisma } from '../prisma'

const router = Router()

router.get('/', listAssignments)
router.post('/', authenticate, requirePositiveWalletBalance, createAssignment)
router.get('/:id', getAssignment)
router.post('/:id/proposals', authenticate, createProposal)
router.post('/:id/proposals/:proposalId/accept', authenticate, acceptProposal)
router.delete('/:id/proposals/:proposalId', authenticate, async (req, res) => {
  try {
    // simple delete endpoint, only proposal owner (tutor) or the student can delete
    const userId = String((req as any).userId)
    const assignmentId = String(req.params.id)
    const proposalId = String(req.params.proposalId)

    const p = await prisma.proposal.findUnique({ where: { id: proposalId } })
    if (!p) return res.status(404).json({ error: 'Proposal not found' })
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    if (p.tutorId !== userId && assignment.studentId !== userId) return res.status(403).json({ error: 'Not authorized' })

    await prisma.proposal.delete({ where: { id: proposalId } })
    res.json({ ok: true })
  } catch (err) {
    console.error('delete proposal', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
