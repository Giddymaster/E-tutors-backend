import supabase from '../supabaseClient'

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

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        booking_id: bookingId,
        rating,
        comment,
        is_verified_booking: !!bookingId,
      })
      .select()
      .single()

    if (reviewError) throw reviewError

    await this.updateTutorRating(tutorId)

    return review
  }

  async getReviews(
    tutorId: string,
    limit = 20,
    offset = 0
  ): Promise<{
    reviews: Review[]
    total: number
  }> {
    const { data, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      reviews: data || [],
      total: count || 0,
    }
  }

  async getTutorRatingStats(tutorId: string): Promise<{
    averageRating: number
    totalReviews: number
    distribution: Record<number, number>
  }> {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('tutor_id', tutorId)

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    const ratings = data.map((r: any) => r.rating)
    const average = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratings.forEach((r: number) => {
      distribution[r as keyof typeof distribution]++
    })

    return {
      averageRating: Math.round(average * 10) / 10,
      totalReviews: ratings.length,
      distribution,
    }
  }

  async updateTutorRating(tutorId: string): Promise<void> {
    const stats = await this.getTutorRatingStats(tutorId)

    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', tutorId)
      .single()

    if (!tutorProfile) return

    await supabase
      .from('tutor_profiles')
      .update({
        rating: stats.averageRating,
        total_reviews: stats.totalReviews,
      })
      .eq('id', tutorProfile.id)
  }

  async canReviewBooking(bookingId: string, studentId: string): Promise<boolean> {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('status, student_id')
      .eq('id', bookingId)
      .single()

    if (error) return false
    if (booking.student_id !== studentId) return false

    return booking.status === 'completed'
  }

  async hasReviewedBooking(bookingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (error) return false
    return !!data
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

    const { data: existing, error: fetchError } = await supabase
      .from('reviews')
      .select('student_id, tutor_id')
      .eq('id', reviewId)
      .single()

    if (fetchError) throw fetchError
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only update your own reviews')
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        rating,
        comment,
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (error) throw error

    await this.updateTutorRating(existing.tutor_id)

    return review
  }

  async deleteReview(reviewId: string, studentId: string): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('reviews')
      .select('student_id, tutor_id')
      .eq('id', reviewId)
      .single()

    if (fetchError) throw fetchError
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only delete your own reviews')
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (error) throw error

    await this.updateTutorRating(existing.tutor_id)
  }
}

export default new ReviewService()
