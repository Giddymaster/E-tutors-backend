import { Request, Response } from 'express'
import { prisma } from '../prisma'

export const createBooking = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { tutorId, subject, scheduledAt, duration, price } = req.body
    if (!tutorId || !subject || !scheduledAt || !duration) return res.status(400).json({ error: 'Missing fields' })

    const booking = await (prisma as any).booking.create({ data: { studentId: Number(userId), tutorId: Number(tutorId), subject, scheduledAt: new Date(scheduledAt), duration: Number(duration), price: Number(price || 0) } })
    res.json({ booking })
  } catch (err) {
    console.error('createBooking error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const listBookings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId
    // @ts-ignore
    const userRole = req.userRole
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (userRole === 'TUTOR') {
      // find tutor profile for user
      const tutor = await prisma.tutorProfile.findUnique({ where: { userId: String(userId) } })
      if (!tutor) return res.json({ bookings: [] })
      const bookings = await (prisma as any).booking.findMany({ where: { tutorId: tutor.id }, orderBy: { createdAt: 'desc' } })
      return res.json({ bookings })
    }

    // student bookings
    const bookings = await (prisma as any).booking.findMany({ where: { studentId: Number(userId) }, orderBy: { createdAt: 'desc' } })
    res.json({ bookings })
  } catch (err) {
    console.error('listBookings error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const respondBooking = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    const { action } = req.body // 'accept' | 'decline'
    if (!id || !action) return res.status(400).json({ error: 'Missing id or action' })

    // @ts-ignore
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    // ensure the tutor owns the booking
    const booking = await (prisma as any).booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // find tutor profile for current user
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: String(userId) } })
    if (!tutor || tutor.id !== booking.tutorId) return res.status(403).json({ error: 'Forbidden' })

    const status = action === 'accept' ? 'ACCEPTED' : action === 'decline' ? 'DECLINED' : booking.status
    const updated = await (prisma as any).booking.update({ where: { id }, data: { status } })
    res.json({ booking: updated })
  } catch (err) {
    console.error('respondBooking error', err)
    res.status(500).json({ error: 'Server error' })
  }
}
