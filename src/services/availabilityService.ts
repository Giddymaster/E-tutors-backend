import supabase from '../supabaseClient'

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
    const { data, error } = await supabase
      .from('tutor_availability')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return data || []
  }

  async setAvailability(
    tutorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): Promise<TutorAvailability> {
    const { data, error } = await supabase
      .from('tutor_availability')
      .insert({
        tutor_id: tutorId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateAvailability(
    availabilityId: string,
    tutorId: string,
    updates: Partial<TutorAvailability>
  ): Promise<TutorAvailability> {
    const { data: existing, error: fetchError } = await supabase
      .from('tutor_availability')
      .select('tutor_id')
      .eq('id', availabilityId)
      .single()

    if (fetchError) throw fetchError
    if (existing.tutor_id !== tutorId) {
      throw new Error('Unauthorized: You can only update your own availability')
    }

    const { data, error } = await supabase
      .from('tutor_availability')
      .update(updates)
      .eq('id', availabilityId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAvailability(availabilityId: string, tutorId: string): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('tutor_availability')
      .select('tutor_id')
      .eq('id', availabilityId)
      .single()

    if (fetchError) throw fetchError
    if (existing.tutor_id !== tutorId) {
      throw new Error('Unauthorized: You can only delete your own availability')
    }

    const { error } = await supabase
      .from('tutor_availability')
      .delete()
      .eq('id', availabilityId)

    if (error) throw error
  }

  async getUnavailableDates(tutorId: string, startDate?: string, endDate?: string): Promise<UnavailableDate[]> {
    let query = supabase.from('tutor_unavailable_dates').select('*').eq('tutor_id', tutorId)

    if (startDate) {
      query = query.gte('start_at', startDate)
    }
    if (endDate) {
      query = query.lte('end_at', endDate)
    }

    const { data, error } = await query.order('start_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async addUnavailableDate(
    tutorId: string,
    startAt: string,
    endAt: string,
    reason?: string
  ): Promise<UnavailableDate> {
    const { data, error } = await supabase
      .from('tutor_unavailable_dates')
      .insert({
        tutor_id: tutorId,
        start_at: startAt,
        end_at: endAt,
        reason,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeUnavailableDate(unavailableDateId: string, tutorId: string): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('tutor_unavailable_dates')
      .select('tutor_id')
      .eq('id', unavailableDateId)
      .single()

    if (fetchError) throw fetchError
    if (existing.tutor_id !== tutorId) {
      throw new Error('Unauthorized: You can only delete your own unavailable dates')
    }

    const { error } = await supabase
      .from('tutor_unavailable_dates')
      .delete()
      .eq('id', unavailableDateId)

    if (error) throw error
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
