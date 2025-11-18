import supabase from '../supabaseClient'

export interface NotificationSettings {
  id: string
  user_id: string
  booking_confirmations: boolean
  booking_reminders: boolean
  booking_cancellations: boolean
  new_reviews: boolean
  review_responses: boolean
  messages: boolean
  weekly_summary: boolean
  promotional_emails: boolean
  created_at: string
}

export interface EmailLog {
  id: string
  user_id: string | null
  email_address: string
  subject: string
  email_type: string
  template_name: string | null
  status: 'queued' | 'sent' | 'failed' | 'bounced' | 'complained'
  recipient_id: string | null
  related_booking_id: string | null
  related_message_id: string | null
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export class NotificationService {
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return await this.createDefaultSettings(userId)
    }

    return data
  }

  async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .insert({
        user_id: userId,
        booking_confirmations: true,
        booking_reminders: true,
        booking_cancellations: true,
        new_reviews: true,
        review_responses: true,
        messages: true,
        weekly_summary: true,
        promotional_emails: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateNotificationSettings(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async logEmail(
    emailAddress: string,
    subject: string,
    emailType: string,
    userId?: string,
    templateName?: string,
    relatedBookingId?: string,
    relatedMessageId?: string
  ): Promise<EmailLog> {
    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        user_id: userId,
        email_address: emailAddress,
        subject,
        email_type: emailType,
        template_name: templateName,
        status: 'sent',
        related_booking_id: relatedBookingId,
        related_message_id: relatedMessageId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async logFailedEmail(
    emailAddress: string,
    subject: string,
    emailType: string,
    errorMessage: string,
    userId?: string
  ): Promise<EmailLog> {
    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        user_id: userId,
        email_address: emailAddress,
        subject,
        email_type: emailType,
        status: 'failed',
        error_message: errorMessage,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async queueNotification(
    userId: string,
    notificationType: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<string> {
    const { data: notification, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        message,
        data,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error
    return notification.id
  }

  async getEmailLogs(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    logs: EmailLog[]
    total: number
  }> {
    const { data, error, count } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      logs: data || [],
      total: count || 0,
    }
  }

  async getPendingNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async markNotificationAsProcessed(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) throw error
  }

  async retryNotification(notificationId: string, errorLog?: string): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('notification_queue')
      .select('retry_count, max_retries')
      .eq('id', notificationId)
      .single()

    if (fetchError) throw fetchError

    if (existing.retry_count >= existing.max_retries) {
      await supabase
        .from('notification_queue')
        .update({
          status: 'failed',
          error_log: errorLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
    } else {
      await supabase
        .from('notification_queue')
        .update({
          retry_count: existing.retry_count + 1,
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          error_log: errorLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
    }
  }
}

export default new NotificationService()
