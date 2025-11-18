import supabase from '../supabaseClient'

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
    const { data, error } = await supabase
      .from('session_notes')
      .insert({
        booking_id: bookingId,
        tutor_id: tutorId,
        student_id: studentId,
        content,
        topics_covered: topicsCovered,
        homework_assigned: homeworkAssigned,
        next_focus_areas: nextFocusAreas || [],
        student_performance_rating: performanceRating,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getSessionNotes(bookingId: string): Promise<SessionNote | null> {
    const { data, error } = await supabase
      .from('session_notes')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async getStudentSessionNotes(studentId: string, tutorId: string): Promise<SessionNote[]> {
    const { data, error } = await supabase
      .from('session_notes')
      .select('*')
      .eq('student_id', studentId)
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async createLearningGoal(
    studentId: string,
    tutorId: string,
    title: string,
    description?: string,
    targetDate?: string
  ): Promise<LearningGoal> {
    const { data, error } = await supabase
      .from('learning_goals')
      .insert({
        student_id: studentId,
        tutor_id: tutorId,
        title,
        description,
        target_date: targetDate,
        status: 'active',
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getLearningGoals(studentId: string, tutorId?: string): Promise<LearningGoal[]> {
    let query = supabase
      .from('learning_goals')
      .select('*')
      .eq('student_id', studentId)

    if (tutorId) {
      query = query.eq('tutor_id', tutorId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async updateGoalProgress(
    goalId: string,
    studentId: string,
    progressPercentage: number
  ): Promise<LearningGoal> {
    const { data: existing, error: fetchError } = await supabase
      .from('learning_goals')
      .select('student_id')
      .eq('id', goalId)
      .single()

    if (fetchError) throw fetchError
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only update your own goals')
    }

    const { data, error } = await supabase
      .from('learning_goals')
      .update({
        progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
        status: progressPercentage >= 100 ? 'completed' : 'active',
      })
      .eq('id', goalId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async completeGoal(goalId: string, studentId: string): Promise<LearningGoal> {
    const { data: existing, error: fetchError } = await supabase
      .from('learning_goals')
      .select('student_id')
      .eq('id', goalId)
      .single()

    if (fetchError) throw fetchError
    if (existing.student_id !== studentId) {
      throw new Error('Unauthorized: You can only complete your own goals')
    }

    const { data, error } = await supabase
      .from('learning_goals')
      .update({
        status: 'completed',
        progress_percentage: 100,
      })
      .eq('id', goalId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getOrCreateStudentProgress(
    studentId: string,
    tutorId: string,
    subject: string
  ): Promise<StudentProgress> {
    const { data: existing, error: fetchError } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('tutor_id', tutorId)
      .eq('subject', subject)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existing) return existing

    const { data: newProgress, error: createError } = await supabase
      .from('student_progress')
      .insert({
        student_id: studentId,
        tutor_id: tutorId,
        subject,
        sessions_completed: 0,
        total_hours: 0,
      })
      .select()
      .single()

    if (createError) throw createError
    return newProgress
  }

  async updateStudentProgress(
    progressId: string,
    tutorId: string,
    updates: Partial<StudentProgress>
  ): Promise<StudentProgress> {
    const { data: existing, error: fetchError } = await supabase
      .from('student_progress')
      .select('tutor_id')
      .eq('id', progressId)
      .single()

    if (fetchError) throw fetchError
    if (existing.tutor_id !== tutorId) {
      throw new Error('Unauthorized: You can only update your students progress')
    }

    const { data, error } = await supabase
      .from('student_progress')
      .update(updates)
      .eq('id', progressId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getStudentProgress(studentId: string, tutorId?: string): Promise<StudentProgress[]> {
    let query = supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)

    if (tutorId) {
      query = query.eq('tutor_id', tutorId)
    }

    const { data, error } = await query.order('subject', { ascending: true })

    if (error) throw error
    return data || []
  }
}

export default new ProgressService()
