import { Request, Response } from 'express'
import prisma from '../prismaClient'

export const getTutors = async (req: Request, res: Response) => {
  try {
    // Support optional query params for server-side searching & pagination
    const q = (req.query.q as string | undefined) || undefined
    const subject = (req.query.subject as string | undefined) || undefined
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)

  const where: any = {}
  const minRate = typeof req.query.minRate !== 'undefined' ? Number(req.query.minRate) : undefined
  const maxRate = typeof req.query.maxRate !== 'undefined' ? Number(req.query.maxRate) : undefined
  const minRating = typeof req.query.minRating !== 'undefined' ? Number(req.query.minRating) : undefined
  const sort = (req.query.sort as string | undefined) || 'rating_desc'

    if (q) {
      // Search in tutor bio, subjects, or user name (case-insensitive)
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { subjects: { has: q } },
        { user: { name: { contains: q, mode: 'insensitive' } } }
      ]
    }

    if (subject) {
      // ensure subject filter (exact subject token)
      where.subjects = { has: subject }
    }

    if (typeof minRate !== 'undefined' && !isNaN(minRate)) {
      where.hourlyRate = { ...(where.hourlyRate || {}), gte: minRate }
    }
    if (typeof maxRate !== 'undefined' && !isNaN(maxRate)) {
      where.hourlyRate = { ...(where.hourlyRate || {}), lte: maxRate }
    }
    if (typeof minRating !== 'undefined' && !isNaN(minRating)) {
      where.rating = { gte: minRating }
    }

    let orderBy: any = { rating: 'desc' }
    if (sort === 'rate_asc') orderBy = { hourlyRate: 'asc' }
    else if (sort === 'rate_desc') orderBy = { hourlyRate: 'desc' }
    else if (sort === 'rating_asc') orderBy = { rating: 'asc' }
    else if (sort === 'rating_desc') orderBy = { rating: 'desc' }

    const [total, tutors] = await Promise.all([
      prisma.tutorProfile.count({ where }),
      prisma.tutorProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } }, reviews: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      })
    ])

    res.json({ tutors, meta: { total, page, limit } })
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

export const getTutorById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid id' })

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviews: true
      }
    })

    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    res.json({ tutor })
  } catch (err) {
    console.error('getTutorById error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
