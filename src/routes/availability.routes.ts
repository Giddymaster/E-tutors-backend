import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import availabilityService from '../services/availability.service'

const router = Router()

router.get('/tutors/:tutorId/availability', async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params
    const availability = await availabilityService.getTutorAvailability(tutorId)
    res.json({ availability })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch availability' })
  }
})

router.use(authenticate)

router.post('/availability', async (req: Request, res: Response) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'dayOfWeek, startTime, and endTime are required' })
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
    }

    const availability = await availabilityService.setAvailability(tutorId, dayOfWeek, startTime, endTime)
    res.status(201).json({ availability })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create availability' })
  }
})

router.patch('/availability/:availabilityId', async (req: Request, res: Response) => {
  try {
    const { availabilityId } = req.params
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })
    const updates = req.body

    const availability = await availabilityService.updateAvailability(availabilityId, tutorId, updates)
    res.json({ availability })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to update availability' })
  }
})

router.delete('/availability/:availabilityId', async (req: Request, res: Response) => {
  try {
    const { availabilityId } = req.params
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    await availabilityService.deleteAvailability(availabilityId, tutorId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to delete availability' })
  }
})

router.get('/unavailable-dates', async (req: Request, res: Response) => {
  try {
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })
    const { startDate, endDate } = req.query

    const dates = await availabilityService.getUnavailableDates(
      tutorId,
      startDate as string | undefined,
      endDate as string | undefined
    )
    res.json({ dates })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch unavailable dates' })
  }
})

router.post('/unavailable-dates', async (req: Request, res: Response) => {
  try {
    const { startAt, endAt, reason } = req.body
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    if (!startAt || !endAt) {
      return res.status(400).json({ error: 'startAt and endAt are required' })
    }

    const date = await availabilityService.addUnavailableDate(tutorId, startAt, endAt, reason)
    res.status(201).json({ date })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add unavailable date' })
  }
})

router.delete('/unavailable-dates/:dateId', async (req: Request, res: Response) => {
  try {
    const { dateId } = req.params
    const tutorId = req.userId || ''
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' })

    await availabilityService.removeUnavailableDate(dateId, tutorId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to remove unavailable date' })
  }
})

export default router
