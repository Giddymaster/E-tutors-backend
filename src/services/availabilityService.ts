import { prisma } from '../prisma'

export interface TutorAvailability {
  id: string
  tutor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export interface UnavailableDate {
  id: string
  tutor_id: string
  start_at: string
  end_at: string
  reason: string | null
  created_at: string
}

export class AvailabilityService {
  async getTutorAvailability(tutorId: string): Promise<TutorAvailability[]> {
    const rows = (await prisma.$queryRaw<
      TutorAvailability[]
    >`SELECT * FROM "tutor_availability" WHERE tutor_id = ${tutorId} AND is_active = true ORDER BY day_of_week ASC`) || []
    return rows
  }

  async setAvailability(
    tutorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): Promise<TutorAvailability> {
    const inserted = (await prisma.$queryRaw<
      TutorAvailability[]
    >`INSERT INTO "tutor_availability" (tutor_id, day_of_week, start_time, end_time, is_active, created_at)
      VALUES (${tutorId}, ${dayOfWeek}, ${startTime}, ${endTime}, true, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create availability')
    return inserted[0]
  }

  async updateAvailability(
    availabilityId: string,
    tutorId: string,
    updates: Partial<TutorAvailability>
  ): Promise<TutorAvailability> {
    const existingRows = (await prisma.$queryRaw<
      { tutor_id: string }[]
    >`SELECT tutor_id FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || []

    if (existingRows.length === 0) throw new Error('Availability not found')
    if (existingRows[0].tutor_id !== tutorId) throw new Error('Unauthorized: You can only update your own availability')

    // apply allowed updates individually
    if (updates.day_of_week !== undefined) {
      await prisma.$executeRaw`UPDATE "tutor_availability" SET day_of_week = ${updates.day_of_week} WHERE id = ${availabilityId}`
    }
    if (updates.start_time !== undefined) {
      await prisma.$executeRaw`UPDATE "tutor_availability" SET start_time = ${updates.start_time} WHERE id = ${availabilityId}`
    }
    if (updates.end_time !== undefined) {
      await prisma.$executeRaw`UPDATE "tutor_availability" SET end_time = ${updates.end_time} WHERE id = ${availabilityId}`
    }
    if (updates.is_active !== undefined) {
      await prisma.$executeRaw`UPDATE "tutor_availability" SET is_active = ${updates.is_active} WHERE id = ${availabilityId}`
    }

    const rows = (await prisma.$queryRaw<
      TutorAvailability[]
    >`SELECT * FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || []

    if (rows.length === 0) throw new Error('Failed to fetch updated availability')
    return rows[0]
  }

  async deleteAvailability(availabilityId: string, tutorId: string): Promise<void> {
    const existingRows = (await prisma.$queryRaw<
      { tutor_id: string }[]
    >`SELECT tutor_id FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || []

    if (existingRows.length === 0) throw new Error('Availability not found')
    if (existingRows[0].tutor_id !== tutorId) throw new Error('Unauthorized: You can only delete your own availability')

    await prisma.$executeRaw`DELETE FROM "tutor_availability" WHERE id = ${availabilityId}`
  }

  async getUnavailableDates(tutorId: string, startDate?: string, endDate?: string): Promise<UnavailableDate[]> {
    // build a simple query with optional bounds
    if (startDate && endDate) {
      const rows = (await prisma.$queryRaw<
        UnavailableDate[]
      >`SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND start_at >= ${startDate} AND end_at <= ${endDate} ORDER BY start_at ASC`) || []
      return rows
    }

    if (startDate) {
      const rows = (await prisma.$queryRaw<
        UnavailableDate[]
      >`SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND start_at >= ${startDate} ORDER BY start_at ASC`) || []
      return rows
    }

    if (endDate) {
      const rows = (await prisma.$queryRaw<
        UnavailableDate[]
      >`SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND end_at <= ${endDate} ORDER BY start_at ASC`) || []
      return rows
    }

    const rows = (await prisma.$queryRaw<
      UnavailableDate[]
    >`SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} ORDER BY start_at ASC`) || []
    return rows
  }

  async addUnavailableDate(
    tutorId: string,
    startAt: string,
    endAt: string,
    reason?: string
  ): Promise<UnavailableDate> {
    const inserted = (await prisma.$queryRaw<
      UnavailableDate[]
    >`INSERT INTO "tutor_unavailable_dates" (tutor_id, start_at, end_at, reason, created_at)
      VALUES (${tutorId}, ${startAt}, ${endAt}, ${reason ?? null}, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create unavailable date')
    return inserted[0]
  }

  async removeUnavailableDate(unavailableDateId: string, tutorId: string): Promise<void> {
    const existingRows = (await prisma.$queryRaw<
      { tutor_id: string }[]
    >`SELECT tutor_id FROM "tutor_unavailable_dates" WHERE id = ${unavailableDateId} LIMIT 1`) || []

    if (existingRows.length === 0) throw new Error('Unavailable date not found')
    if (existingRows[0].tutor_id !== tutorId) throw new Error('Unauthorized: You can only delete your own unavailable dates')

    await prisma.$executeRaw`DELETE FROM "tutor_unavailable_dates" WHERE id = ${unavailableDateId}`
  }

  isSlotAvailable(availability: TutorAvailability[], requestedTime: Date, unavailableDates: UnavailableDate[]): boolean {
    const dayOfWeek = requestedTime.getDay()
    const timeString = requestedTime.toTimeString().substring(0, 5)

    const slot = availability.find((a) => a.day_of_week === dayOfWeek)
    if (!slot) return false

    if (timeString < slot.start_time || timeString > slot.end_time) {
      return false
    }

    const hasConflict = unavailableDates.some((ud) => {
      const start = new Date(ud.start_at)
      const end = new Date(ud.end_at)
      return requestedTime >= start && requestedTime <= end
    })

    return !hasConflict
  }
}

export default new AvailabilityService()
