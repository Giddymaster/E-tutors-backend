import { Request, Response } from 'express'
import { prisma } from '../prisma'

export const createBooking = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const studentId = req.userId
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' })

    const { tutorId, subject, scheduledAt, duration, price, assignmentId } = req.body
    if (!tutorId || !scheduledAt) {
      return res.status(400).json({ error: 'tutorId and scheduledAt are required' })
    }

    // ensure tutor exists
    const tutor = await prisma.user.findUnique({ where: { id: String(tutorId) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    const bookingData: any = {
      studentId: String(studentId),
      tutorId: String(tutorId),
      scheduledAt: new Date(scheduledAt),
      price: typeof price === 'number' ? price : 0,
      status: 'REQUESTED'
    }

    // include assignmentId only when provided to avoid null assignment error
    if (assignmentId) bookingData.assignmentId = String(assignmentId)

    const booking = await prisma.booking.create({
      data: bookingData
    })

    res.json({ booking })
  } catch (err) {
    console.error('createBooking error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const getBookings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const asStudent = await prisma.booking.findMany({ where: { studentId: String(userId) }, orderBy: { scheduledAt: 'desc' } })
    const asTutor = await prisma.booking.findMany({ where: { tutorId: String(userId) }, orderBy: { scheduledAt: 'desc' } })

    // combine, dedupe by id and return
    const map = new Map<string, any>()
    asStudent.forEach(b => map.set(b.id, b))
    asTutor.forEach(b => map.set(b.id, b))

    res.json({ bookings: Array.from(map.values()) })
  } catch (err) {
    console.error('getBookings error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const respondToBooking = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = String(req.params.id)
    const { action } = req.body // expected: 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' })

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // only the assigned tutor can accept/reject
    if (String(booking.tutorId) !== String(userId)) return res.status(403).json({ error: 'Forbidden' })

    const updated = await prisma.booking.update({ where: { id }, data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } })
    res.json({ booking: updated })
  } catch (err) {
    console.error('respondToBooking error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const createBulkBookings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const studentId = req.userId
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' })

    const { tutorId, subject, sessions } = req.body
    if (!tutorId || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: 'tutorId and sessions[] are required' })
    }

    // ensure tutor exists
    const tutor = await prisma.user.findUnique({ where: { id: String(tutorId) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    // prepare booking data
    const bookingData = sessions.map((s: any) => ({
      studentId: String(studentId),
      tutorId: String(tutorId),
      scheduledAt: new Date(s.scheduledAt),
      duration: typeof s.duration === 'number' ? s.duration : Number(s.duration || 0),
      price: typeof s.price === 'number' ? s.price : Number(s.price || 0),
      notes: s.notes || undefined,
      status: 'REQUESTED',
      assignmentId: s.assignmentId ? String(s.assignmentId) : undefined
    }))

    // create all bookings in a transaction so it's atomic
    const created = await prisma.$transaction(bookingData.map((d: any) => prisma.booking.create({ data: d })))

    res.json({ bookings: created })
  } catch (err) {
    console.error('createBulkBookings error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
