import { prisma } from '../prisma';

export interface Review {
  id: string
  tutor_id: string
  student_id: string
  booking_id: string | null
  rating: number
  comment: string | null
  is_verified_booking: boolean
  created_at: string
}

export class ReviewService {
  async createReview(
    tutorId: string,
    studentId: string,
    rating: number,
    comment?: string,
    bookingId?: string
  ): Promise<Review> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const inserted = (await prisma.$queryRaw<
      Review[]
    >`INSERT INTO "reviews" (tutor_id, student_id, booking_id, rating, comment, is_verified_booking, created_at)
      VALUES (${tutorId}, ${studentId}, ${bookingId}, ${rating}, ${comment}, ${!!bookingId}, now())
      RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create review')

    await this.updateTutorRating(tutorId)

    return inserted[0]
  }

  async getReviews(
    tutorId: string,
    limit = 20,
    offset = 0
  ): Promise<{
    reviews: Review[]
    total: number
  }> {
    const rows = (await prisma.$queryRaw<
      Review[]
    >`SELECT * FROM "reviews" WHERE tutor_id = ${tutorId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || []

    const countRes = (await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "reviews" WHERE tutor_id = ${tutorId}`) || []

    const total = countRes.length > 0 ? countRes[0].count : 0

    return {
      reviews: rows,
      total,
    }
  }

  async getTutorRatingStats(tutorId: string): Promise<{
    averageRating: number
    totalReviews: number
    distribution: Record<number, number>
  }> {
    const rows = (await prisma.$queryRaw<
      { rating: number }[]
    >`SELECT rating FROM "reviews" WHERE tutor_id = ${tutorId}`) || []

    if (!rows || rows.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    const ratings = rows.map(r => Number(r.rating))
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratings.forEach((r) => {
      if (r >= 1 && r <= 5) distribution[r as keyof typeof distribution]++
    })

    return {
      averageRating: Math.round(average * 10) / 10,
      totalReviews: ratings.length,
      distribution,
    }
  }

  async updateTutorRating(tutorId: string): Promise<void> {
    const stats = await this.getTutorRatingStats(tutorId)

    const tutorRows = (await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "tutor_profiles" WHERE user_id = ${tutorId} LIMIT 1`) || []

    if (tutorRows.length === 0) return

    const tutorIdDb = tutorRows[0].id

    await prisma.$executeRaw`UPDATE "tutor_profiles" SET rating = ${stats.averageRating}, total_reviews = ${stats.totalReviews} WHERE id = ${tutorIdDb}`
  }

  async canReviewBooking(bookingId: string, studentId: string): Promise<boolean> {
    const rows = (await prisma.$queryRaw<
      { status: string, student_id: string }[]
    >`SELECT status, student_id FROM "bookings" WHERE id = ${bookingId} LIMIT 1`) || []

    if (rows.length === 0) return false
    const booking = rows[0]
    if (booking.student_id !== studentId) return false

    return booking.status === 'completed'
  }

  async hasReviewedBooking(bookingId: string): Promise<boolean> {
    const rows = (await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "reviews" WHERE booking_id = ${bookingId} LIMIT 1`) || []

    return rows.length > 0
  }

  async updateReview(
    reviewId: string,
    studentId: string,
    rating: number,
    comment?: string
  ): Promise<Review> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const existingRows = (await prisma.$queryRaw<
      { student_id: string, tutor_id: string }[]
    >`SELECT student_id, tutor_id FROM "reviews" WHERE id = ${reviewId} LIMIT 1`) || []

    if (existingRows.length === 0) throw new Error('Review not found')
    const existing = existingRows[0]
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only update your own reviews')
    }

    const updated = (await prisma.$queryRaw<
      Review[]
    >`UPDATE "reviews" SET rating = ${rating}, comment = ${comment} WHERE id = ${reviewId} RETURNING *`) || []

    if (updated.length === 0) throw new Error('Failed to update review')

    await this.updateTutorRating(existing.tutor_id)

    return updated[0]
  }

  async deleteReview(reviewId: string, studentId: string): Promise<void> {
    const existingRows = (await prisma.$queryRaw<
      { student_id: string, tutor_id: string }[]
    >`SELECT student_id, tutor_id FROM "reviews" WHERE id = ${reviewId} LIMIT 1`) || []

    if (existingRows.length === 0) throw new Error('Review not found')
    const existing = existingRows[0]
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only delete your own reviews')
    }

    await prisma.$executeRaw`DELETE FROM "reviews" WHERE id = ${reviewId}`

    await this.updateTutorRating(existing.tutor_id)
  }
}

export default new ReviewService()
