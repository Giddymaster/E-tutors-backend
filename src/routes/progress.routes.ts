import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import progressService from '../services/progress.service'

const router = Router()

router.use(authenticate)

router.post('/session-notes', async (req: Request, res: Response) => {
  try {
    const { bookingId, studentId, content, topicsCovered, homeworkAssigned, nextFocusAreas, performanceRating } =
      req.body
    const tutorId = req.userId || ''

    if (!bookingId || !studentId || !content || !tutorId) {
      return res.status(400).json({ error: 'bookingId, studentId, content, and authentication are required' })
    }

    const note = await progressService.addSessionNote(
      bookingId,
      tutorId,
      studentId,
      content,
      topicsCovered || [],
      homeworkAssigned,
      nextFocusAreas,
      performanceRating
    )

    res.status(201).json({ note })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create session note' })
  }
})

router.get('/session-notes/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params
    const note = await progressService.getSessionNotes(bookingId)
    res.json({ note })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch session note' })
  }
})

router.get('/learning-goals', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { tutorId } = req.query

    const goals = await progressService.getLearningGoals(userId, tutorId as string | undefined)
    res.json({ goals })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch learning goals' })
  }
})

router.post('/learning-goals', async (req: Request, res: Response) => {
  try {
    const { title, description, targetDate, tutorId } = req.body
    const studentId = req.userId || ''

    if (!title || !tutorId || !studentId) {
      return res.status(400).json({ error: 'title, tutorId, and authentication are required' })
    }

    const goal = await progressService.createLearningGoal(
      studentId,
      tutorId,
      title,
      description,
      targetDate
    )

    res.status(201).json({ goal })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create learning goal' })
  }
})

router.patch('/learning-goals/:goalId/progress', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params
    const { progressPercentage } = req.body
    const studentId = req.userId || ''

    if (progressPercentage === undefined || !studentId) {
      return res.status(400).json({ error: 'progressPercentage and authentication are required' })
    }

    const goal = await progressService.updateGoalProgress(goalId, studentId, progressPercentage)
    res.json({ goal })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to update goal progress' })
  }
})

router.patch('/learning-goals/:goalId/complete', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params
    const studentId = req.userId || ''
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' })

    const goal = await progressService.completeGoal(goalId, studentId)
    res.json({ goal })
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to complete goal' })
  }
})

router.get('/student-progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { tutorId } = req.query

    const progress = await progressService.getStudentProgress(userId, tutorId as string | undefined)
    res.json({ progress })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch student progress' })
  }
})

export default router
