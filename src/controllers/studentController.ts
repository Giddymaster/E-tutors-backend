import { Request, Response } from 'express'
import prisma from '../prismaClient'

export const getMyStudent = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = Number(req.userId)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const student = await prisma.studentProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, name: true, email: true } } } })
    if (!student) return res.status(404).json({ error: 'No student profile' })
    res.json({ student })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const updateMyStudent = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = Number(req.userId)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const payload: any = {}
    const { major, year, interests, preferredSubjects, bio, timezone, phone, availability } = req.body
    if (major !== undefined) payload.major = major
    if (year !== undefined) payload.year = year
    if (interests !== undefined) payload.interests = Array.isArray(interests) ? interests.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : []
    if (preferredSubjects !== undefined) payload.preferredSubjects = Array.isArray(preferredSubjects) ? preferredSubjects.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : []
    if (bio !== undefined) payload.bio = bio
    if (timezone !== undefined) payload.timezone = timezone
    if (phone !== undefined) payload.phone = phone
    if (availability !== undefined) payload.availability = availability

    // Upsert: if not exists, create
    const existing = await prisma.studentProfile.findUnique({ where: { userId } })
    let student
    if (existing) {
      student = await prisma.studentProfile.update({ where: { userId }, data: payload })
    } else {
      student = await prisma.studentProfile.create({ data: { userId, ...payload } })
    }

    res.json({ student })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
