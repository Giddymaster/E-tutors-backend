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

    // Synonyms map for common subject tokens. Expand queries to include aliases
    // so searching for 'math' matches 'mathematics' and 'calculus', etc.
    const synonymsMap: Record<string, string[]> = {
      math: ['mathematics', 'calculus', 'algebra'],
      maths: ['mathematics', 'calculus', 'algebra'],
      mathematics: ['math', 'calculus'],
      calculus: ['math', 'mathematics'],
      algebra: ['math', 'mathematics'],
      'computer science': ['computer science', 'cs', 'programming'],
      programming: ['computer science', 'cs']
    }

    const expandToken = (t: string) => {
      const k = String(t || '').trim().toLowerCase()
      const set = new Set<string>()
      if (!k) return [] as string[]
      set.add(k)
      if (synonymsMap[k]) synonymsMap[k].forEach((s) => set.add(s))
      return Array.from(set)
    }

    if (q) {
      // build tokens from each word in the query and expand via synonyms
      const qTrim = String(q).trim()
      const words = qTrim.split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean)
      const expandedSubjects = Array.from(new Set(words.flatMap(expandToken)))

      // Search in tutor bio, subjects (any expanded token), or user name (case-insensitive)
      where.OR = [
        { bio: { contains: qTrim, mode: 'insensitive' } },
        { user: { name: { contains: qTrim, mode: 'insensitive' } } }
      ]

      if (expandedSubjects.length > 0) {
        // use hasSome so any of the expanded tokens will match the subjects array
        where.OR.push({ subjects: { hasSome: expandedSubjects } })
      }
    }

    if (subject) {
      // expand subject via synonyms and match any of them
      const subs = expandToken(subject)
      if (subs.length > 0) {
        where.subjects = { hasSome: subs }
      } else {
        where.subjects = { has: subject }
      }
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
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      })
    ])

    // compute accepted bookings count and average rating per tutor efficiently
    const tutorIds = tutors.map((t: any) => t.id)

    let bookingCounts: Array<{ tutorId: number; _count: { _all: number } }> = []
    let reviewAgg: Array<{ tutorId: number; _avg: { rating: number | null }; _count: { _all: number } }> = []

    if (tutorIds.length > 0) {
      bookingCounts = (await prisma.booking.groupBy({
        by: ['tutorId'],
        where: { tutorId: { in: tutorIds }, status: 'ACCEPTED' },
        _count: { _all: true }
      })) as any

      reviewAgg = (await prisma.review.groupBy({
        by: ['tutorId'],
        where: { tutorId: { in: tutorIds } },
        _avg: { rating: true },
        _count: { _all: true }
      })) as any
    }

    const bookingCountMap = new Map<number, number>()
    bookingCounts.forEach((b) => bookingCountMap.set(b.tutorId, b._count._all))
    const reviewMap = new Map<number, { avg: number | null; count: number }>()
    reviewAgg.forEach((r) => reviewMap.set(r.tutorId, { avg: r._avg.rating ?? null, count: r._count._all }))

    // attach computed fields to tutors
    const tutorsWithMeta = tutors.map((t: any) => ({
      ...t,
      completedCount: bookingCountMap.get(t.id) || 0,
      ratingComputed: (reviewMap.get(t.id)?.avg ?? t.rating) ?? 0,
      reviewsCount: reviewMap.get(t.id)?.count || 0
    }))

    res.json({ tutors: tutorsWithMeta, meta: { total, page, limit } })
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

    // If a tutor profile already exists for this user, return it instead of creating a duplicate
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: Number(userId) } })
    if (existing) {
      return res.json({ tutor: existing, message: 'Tutor profile already exists' })
    }

    // normalize subjects (trim, lowercase) before saving to make searches reliable
    const subjectsNormalized = Array.isArray(subjects)
      ? subjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      : []

    const tutor = await prisma.tutorProfile.create({
      data: {
        userId: Number(userId),
        bio,
        subjects: subjectsNormalized,
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

export const getMyTutor = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const tutor = await prisma.tutorProfile.findUnique({
      where: { userId: Number(userId) },
      include: { user: { select: { id: true, name: true, email: true } }, reviews: true }
    })

    if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' })
    res.json({ tutor })
  } catch (err) {
    console.error('getMyTutor error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const updateMyTutor = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { bio, subjects, hourlyRate, availability } = req.body

    // basic validation
    if (bio && typeof bio !== 'string') return res.status(400).json({ error: 'Invalid bio' })
    if (subjects && !Array.isArray(subjects)) return res.status(400).json({ error: 'Subjects must be an array' })

    // ensure tutor exists
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: Number(userId) } })
    if (!existing) return res.status(404).json({ error: 'Tutor profile not found' })

    // normalize subjects if provided
    const subjectsNormalized = Array.isArray(subjects) && subjects.length > 0
      ? subjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      : existing.subjects

    const updated = await prisma.tutorProfile.update({
      where: { userId: Number(userId) },
      data: {
        bio: typeof bio === 'string' ? bio : existing.bio,
        subjects: subjectsNormalized,
        hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : existing.hourlyRate,
        availability: typeof availability === 'string' ? availability : existing.availability,
      }
    })

    res.json({ tutor: updated })
  } catch (err) {
    console.error('updateMyTutor error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
