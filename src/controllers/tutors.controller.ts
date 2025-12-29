import { Request, Response } from 'express'
import { prisma } from '../prisma'

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
        // subjects are stored as JSON arrays; use JSON 'contains' to test membership.
        // For "any of" semantics we add an OR entry per token.
        where.OR.push(
          ...expandedSubjects.map((tok: string) => ({ subjects: { contains: tok } }))
        )
      }
    }

    if (subject) {
      // expand subject via synonyms and match any of them
      const subs = expandToken(subject)
      if (subs.length > 0) {
        // add OR entries for each synonym token using JSON containment
        where.OR = where.OR || []
        where.OR.push(
          ...subs.map((s: string) => ({ subjects: { contains: s } }))
        )
      } else {
        // treat as JSON contains single token
        where.subjects = { contains: subject }
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

    const ratingSort = sort === 'rating_desc' || sort === 'rating_asc'

    // If client requested sorting by rating (a computed field), fetch all matching tutors,
    // compute ratings and then sort in-memory before paginating. This avoids ordering by
    // a non-existent `rating` column in the TutorProfile model.
    let total = await prisma.tutorProfile.count({ where })
    let tutors: any[] = []

    if (ratingSort) {
      // fetch all matching tutors (no pagination) so we can compute rating-based order
      tutors = await prisma.tutorProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // let the database handle pagination and ordering for non-rating sorts
      tutors = await prisma.tutorProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      })
    }

    // compute accepted bookings count and average rating per tutor efficiently
    const tutorIds = tutors.map((t: any) => t.id)

    let bookingCounts: Array<{ tutorId: string; _count: { _all: number } }> = []
    let reviewAgg: Array<{ tutorId: string; _avg: { rating: number | null }; _count: { _all: number } }> = []

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

    const bookingCountMap = new Map<string, number>()
    bookingCounts.forEach((b) => bookingCountMap.set(String(b.tutorId), b._count._all))
    const reviewMap = new Map<string, { avg: number | null; count: number }>()
    reviewAgg.forEach((r) => reviewMap.set(String(r.tutorId), { avg: r._avg.rating ?? null, count: r._count._all }))

    // attach computed fields to tutors
    let tutorsWithMeta = tutors.map((t: any) => ({
      ...t,
      completedCount: bookingCountMap.get(String(t.id)) || 0,
      ratingComputed: (reviewMap.get(String(t.id))?.avg ?? 0) ?? 0,
      reviewsCount: reviewMap.get(String(t.id))?.count || 0
    }))

    // If rating sort was requested, sort in-memory and then apply pagination
    if (ratingSort) {
      tutorsWithMeta.sort((a, b) => {
        const aRating = Number(a.ratingComputed || 0)
        const bRating = Number(b.ratingComputed || 0)
        return sort === 'rating_desc' ? bRating - aRating : aRating - bRating
      })

      // apply pagination after sorting
      const start = (page - 1) * limit
      tutorsWithMeta = tutorsWithMeta.slice(start, start + limit)
    }

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
    const user = await prisma.user.findUnique({ where: { id: String(userId) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // update user role to TUTOR if not already
    if (user.role !== 'TUTOR') {
      await prisma.user.update({ where: { id: String(userId) }, data: { role: 'TUTOR' } })
    }

    // If a tutor profile already exists for this user, return it instead of creating a duplicate
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: String(userId) } })
    if (existing) {
      return res.json({ tutor: existing, message: 'Tutor profile already exists' })
    }

    // normalize subjects (trim, lowercase) before saving to make searches reliable
    const subjectsNormalized = Array.isArray(subjects)
      ? subjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      : []

    const tutor = await prisma.tutorProfile.create({
      data: {
        userId: String(userId),
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
    const id = String(req.params.id).trim()
    if (!id) return res.status(400).json({ error: 'Invalid id' })

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    })

    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    // load reviews separately because 'reviews' is not a valid include property on TutorProfile
    const reviews = await prisma.review.findMany({ where: { tutorId: tutor.id } })

    res.json({ tutor: { ...tutor, reviews } })
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
      where: { userId: String(userId) },
      include: { user: { select: { id: true, name: true, email: true } } }
    })

    // If no tutor profile exists for the current user, return a 200 with tutor: null
    // so clients can safely check and avoid treating this as an application error.
    if (!tutor) return res.json({ tutor: null })

    // load reviews separately because 'reviews' is not a valid include property on TutorProfile
    const reviews = await prisma.review.findMany({ where: { tutorId: tutor.id } })
    return res.json({ tutor: { ...tutor, reviews } })
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
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: String(userId) } })
    if (!existing) return res.status(404).json({ error: 'Tutor profile not found' })

    // normalize subjects if provided and ensure we always provide a string[] (avoid null)
    const subjectsNormalized: string[] = Array.isArray(subjects) && subjects.length > 0
      ? subjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      : (Array.isArray(existing.subjects) ? existing.subjects as string[] : [])

    const updated = await prisma.tutorProfile.update({
      where: { userId: String(userId) },
      data: {
        bio: typeof bio === 'string' ? bio : existing.bio,
        subjects: subjectsNormalized,
        hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : existing.hourlyRate,
        availability: typeof availability === 'string' ? availability : (existing.availability === null ? undefined : existing.availability),
      }
    })

    res.json({ tutor: updated })
  } catch (err) {
    console.error('updateMyTutor error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
