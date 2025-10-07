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
