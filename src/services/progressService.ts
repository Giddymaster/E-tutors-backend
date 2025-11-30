import { prisma } from '../prisma';

export interface SessionNote {
  id: string
  booking_id: string
  tutor_id: string
  student_id: string
  content: string
  topics_covered: string[]
  homework_assigned: string | null
  next_focus_areas: string[]
  student_performance_rating: number | null
  created_at: string
}

export interface LearningGoal {
  id: string
  student_id: string
  tutor_id: string
  title: string
  description: string | null
  target_date: string | null
  status: 'active' | 'completed' | 'abandoned'
  progress_percentage: number
  created_at: string
}

export interface StudentProgress {
  id: string
  student_id: string
  tutor_id: string
  subject: string
  current_level: number | null
  target_level: number | null
  sessions_completed: number
  total_hours: number
  last_session_date: string | null
  average_performance: number | null
  created_at: string
}

export class ProgressService {
  async addSessionNote(
    bookingId: string,
    tutorId: string,
    studentId: string,
    content: string,
    topicsCovered: string[],
    homeworkAssigned?: string,
    nextFocusAreas?: string[],
    performanceRating?: number
  ): Promise<SessionNote> {
    const inserted = (await prisma.$queryRaw<
      SessionNote[]
    >`INSERT INTO "session_notes" (booking_id, tutor_id, student_id, content, topics_covered, homework_assigned, next_focus_areas, student_performance_rating, created_at)
      VALUES (${bookingId}, ${tutorId}, ${studentId}, ${content}, ${topicsCovered}, ${homeworkAssigned}, ${nextFocusAreas || []}, ${performanceRating}, now())
      RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create session note')
    return inserted[0]
  }

  async getSessionNotes(bookingId: string): Promise<SessionNote | null> {
    const rows = (await prisma.$queryRaw<
      SessionNote[]
    >`SELECT * FROM "session_notes" WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 1`) || []

    return rows.length > 0 ? rows[0] : null
  }

  async getStudentSessionNotes(studentId: string, tutorId: string): Promise<SessionNote[]> {
    const rows = (await prisma.$queryRaw<
      SessionNote[]
    >`SELECT * FROM "session_notes" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY created_at DESC`) || []

    return rows
  }

  async createLearningGoal(
    studentId: string,
    tutorId: string,
    title: string,
    description?: string,
    targetDate?: string
  ): Promise<LearningGoal> {
    const inserted = (await prisma.$queryRaw<
      LearningGoal[]
    >`INSERT INTO "learning_goals" (student_id, tutor_id, title, description, target_date, status, progress_percentage, created_at)
      VALUES (${studentId}, ${tutorId}, ${title}, ${description}, ${targetDate}, 'active', 0, now())
      RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create learning goal')
    return inserted[0]
  }

  async getLearningGoals(studentId: string, tutorId?: string): Promise<LearningGoal[]> {
    if (tutorId) {
      const rows = (await prisma.$queryRaw<
        LearningGoal[]
      >`SELECT * FROM "learning_goals" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY created_at DESC`) || []
      return rows
    }

    const rows = (await prisma.$queryRaw<
      LearningGoal[]
    >`SELECT * FROM "learning_goals" WHERE student_id = ${studentId} ORDER BY created_at DESC`) || []
    return rows
  }

  async updateGoalProgress(
    goalId: string,
    studentId: string,
    progressPercentage: number
  ): Promise<LearningGoal> {
    const existing = (await prisma.$queryRaw<
      { student_id: string }[]
    >`SELECT student_id FROM "learning_goals" WHERE id = ${goalId} LIMIT 1`) || []

    if (existing.length === 0) throw new Error('Goal not found')
    if (existing[0].student_id !== studentId) throw new Error('Unauthorized: You can only update your own goals')

    const status = progressPercentage >= 100 ? 'completed' : 'active'
    const updated = (await prisma.$queryRaw<
      LearningGoal[]
    >`UPDATE "learning_goals" SET progress_percentage = ${Math.min(100, Math.max(0, progressPercentage))}, status = ${status} WHERE id = ${goalId} RETURNING *`) || []

    if (updated.length === 0) throw new Error('Failed to update goal')
    return updated[0]
  }

  async completeGoal(goalId: string, studentId: string): Promise<LearningGoal> {
    const existing = (await prisma.$queryRaw<
      { student_id: string }[]
    >`SELECT student_id FROM "learning_goals" WHERE id = ${goalId} LIMIT 1`) || []

    if (existing.length === 0) throw new Error('Goal not found')
    if (existing[0].student_id !== studentId) throw new Error('Unauthorized: You can only complete your own goals')

    const updated = (await prisma.$queryRaw<
      LearningGoal[]
    >`UPDATE "learning_goals" SET status = 'completed', progress_percentage = 100 WHERE id = ${goalId} RETURNING *`) || []

    if (updated.length === 0) throw new Error('Failed to complete goal')
    return updated[0]
  }

  async getOrCreateStudentProgress(
    studentId: string,
    tutorId: string,
    subject: string
  ): Promise<StudentProgress> {
    const existing = (await prisma.$queryRaw<
      StudentProgress[]
    >`SELECT * FROM "student_progress" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} AND subject = ${subject} LIMIT 1`) || []

    if (existing.length > 0) return existing[0]

    const inserted = (await prisma.$queryRaw<
      StudentProgress[]
    >`INSERT INTO "student_progress" (student_id, tutor_id, subject, sessions_completed, total_hours, created_at)
      VALUES (${studentId}, ${tutorId}, ${subject}, 0, 0, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create student progress')
    return inserted[0]
  }

  async updateStudentProgress(
    progressId: string,
    tutorId: string,
    updates: Partial<StudentProgress>
  ): Promise<StudentProgress> {
    const existing = (await prisma.$queryRaw<
      { tutor_id: string }[]
    >`SELECT tutor_id FROM "student_progress" WHERE id = ${progressId} LIMIT 1`) || []

    if (existing.length === 0) throw new Error('Progress record not found')
    if (existing[0].tutor_id !== tutorId) throw new Error('Unauthorized: You can only update your students progress')

    // apply allowed updates one-by-one (keeps code simple and safe)
    if (updates.current_level !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET current_level = ${updates.current_level} WHERE id = ${progressId}`
    }
    if (updates.target_level !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET target_level = ${updates.target_level} WHERE id = ${progressId}`
    }
    if (updates.sessions_completed !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET sessions_completed = ${updates.sessions_completed} WHERE id = ${progressId}`
    }
    if (updates.total_hours !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET total_hours = ${updates.total_hours} WHERE id = ${progressId}`
    }
    if (updates.last_session_date !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET last_session_date = ${updates.last_session_date} WHERE id = ${progressId}`
    }
    if (updates.average_performance !== undefined) {
      await prisma.$executeRaw`UPDATE "student_progress" SET average_performance = ${updates.average_performance} WHERE id = ${progressId}`
    }

    const rows = (await prisma.$queryRaw<
      StudentProgress[]
    >`SELECT * FROM "student_progress" WHERE id = ${progressId} LIMIT 1`) || []

    if (rows.length === 0) throw new Error('Failed to fetch updated progress')
    return rows[0]
  }

  async getStudentProgress(studentId: string, tutorId?: string): Promise<StudentProgress[]> {
    if (tutorId) {
      const rows = (await prisma.$queryRaw<
        StudentProgress[]
      >`SELECT * FROM "student_progress" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY subject ASC`) || []
      return rows
    }

    const rows = (await prisma.$queryRaw<
      StudentProgress[]
    >`SELECT * FROM "student_progress" WHERE student_id = ${studentId} ORDER BY subject ASC`) || []
    return rows
  }
}

export default new ProgressService()
