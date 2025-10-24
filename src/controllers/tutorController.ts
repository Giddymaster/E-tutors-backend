import { Request, Response } from 'express'
import prisma from '../prismaClient'

export const getTutors = async (req: Request, res: Response) => {
  try {
    const tutors = await prisma.tutorProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true } }, reviews: true }
    })
    res.json({ tutors })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const createTutor = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { bio, subjects, hourlyRate, availability } = req.body
    if (!bio || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'bio and subjects are required' })
    }

    // ensure user exists
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // update user role to TUTOR if not already
    if (user.role !== 'TUTOR') {
      await prisma.user.update({ where: { id: Number(userId) }, data: { role: 'TUTOR' } })
    }

    const tutor = await prisma.tutorProfile.create({
      data: {
        userId: Number(userId),
        bio,
        subjects,
        hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : 0,
        availability: availability || null,
      }
    })

    res.json({ tutor })
  } catch (err) {
    console.error(err)
    // unique constraint when tutor profile already exists
    if ((err as any)?.code === 'P2002') {
      return res.status(400).json({ error: 'Tutor profile already exists for this user' })
    }
    res.status(500).json({ error: 'Server error' })
  }
}
