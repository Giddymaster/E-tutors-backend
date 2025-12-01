import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import reviewService from '../services/review.service'

const router = Router()

router.get('/tutors/:tutorId/reviews', async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 500)
    const offset = parseInt((req.query.offset as string) || '0')

    const result = await reviewService.getReviews(tutorId, limit, offset)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch reviews' })
  }
})

router.get('/tutors/:tutorId/rating-stats', async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params
    const stats = await reviewService.getTutorRatingStats(tutorId)
    res.json({ stats })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch rating stats' })
  }
})

router.use(authenticate)

router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { tutorId, rating, comment, bookingId } = req.body
    const studentId = req.userId || ''

    if (!tutorId || !rating || !studentId) {
      return res.status(400).json({ error: 'tutorId, rating, and authentication are required' })
    }

    if (bookingId) {
      const canReview = await reviewService.canReviewBooking(bookingId, studentId)
      if (!canReview) {
        return res.status(403).json({ error: 'You can only review completed bookings' })
      }

      const hasReviewed = await reviewService.hasReviewedBooking(bookingId)
      if (hasReviewed) {
        return res.status(400).json({ error: 'You have already reviewed this booking' })
      }
    }

    const review = await reviewService.createReview(tutorId, studentId, rating, comment, bookingId)
    res.status(201).json({ review })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create review' })
  }
})

router.patch('/reviews/:reviewId', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params
    const { rating, comment } = req.body
    const studentId = req.userId || ''

    if (!rating || !studentId) {
      return res.status(400).json({ error: 'rating and authentication are required' })
    }

    const review = await reviewService.updateReview(reviewId, studentId, rating, comment)
    res.json({ review })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to update review' })
  }
})

router.delete('/reviews/:reviewId', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params
    const studentId = req.userId || ''
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' })

    await reviewService.deleteReview(reviewId, studentId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to delete review' })
  }
})

export default router
