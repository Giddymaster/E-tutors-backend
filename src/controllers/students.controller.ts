import { Request, Response } from 'express'
import { prisma } from '../prisma'

export const getMyStudent = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const rawUserId = req.userId
    if (!rawUserId) return res.status(401).json({ error: 'Unauthorized' })
    const userId = String(rawUserId)

    const student = await prisma.studentProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, name: true, email: true } } } })
    if (!student) return res.status(404).json({ error: 'No student profile' })
    res.json({ student })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const upsertMyStudent = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const rawUserId = req.userId
    if (!rawUserId) return res.status(401).json({ error: 'Unauthorized' })
    const userId = String(rawUserId)

    const { major, year, interests, preferredSubjects, bio, timezone, phone, availability } = req.body

    const payload: Record<string, any> = {}
    if (major !== undefined) payload.major = major
    if (year !== undefined) payload.year = year
    if (interests !== undefined) payload.interests = Array.isArray(interests) ? interests.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : []
    if (preferredSubjects !== undefined) payload.preferredSubjects = Array.isArray(preferredSubjects) ? preferredSubjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : []
    if (bio !== undefined) payload.bio = bio
    if (timezone !== undefined) payload.timezone = timezone
    if (phone !== undefined) payload.phone = phone
    if (availability !== undefined) payload.availability = availability

    // Atomic upsert
    const student = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, ...payload },
      update: payload,
    })

    res.json({ student })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

// add this alias so routes importing `updateMyStudent` find a valid handler
export const updateMyStudent = upsertMyStudent
