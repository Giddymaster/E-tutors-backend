import { prisma } from '../prisma'

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
    const rows = (await prisma.$queryRaw<
      NotificationSettings[]
    >`SELECT * FROM "notification_settings" WHERE user_id = ${userId} LIMIT 1`) || []

    if (rows.length === 0) {
      return await this.createDefaultSettings(userId)
    }

    return rows[0]
  }

  async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    const inserted = (await prisma.$queryRaw<
      NotificationSettings[]
    >`INSERT INTO "notification_settings" (user_id, booking_confirmations, booking_reminders, booking_cancellations, new_reviews, review_responses, messages, weekly_summary, promotional_emails, created_at)
      VALUES (${userId}, true, true, true, true, true, true, true, false, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create default notification settings')
    return inserted[0]
  }

  async updateNotificationSettings(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    // Build a simple update by allowed fields
    const allowedKeys = [
      'booking_confirmations',
      'booking_reminders',
      'booking_cancellations',
      'new_reviews',
      'review_responses',
      'messages',
      'weekly_summary',
      'promotional_emails',
    ] as const

    const setClauses: string[] = []
    const values: any[] = []
    for (const key of allowedKeys) {
      if ((updates as any)[key] !== undefined) {
        values.push((updates as any)[key])
        setClauses.push(`"${key}" = ${values.length}`) // will be interpolated below
      }
    }

    if (setClauses.length === 0) {
      // nothing to update, return current settings
      return this.getNotificationSettings(userId)
    }

    let template = `UPDATE "notification_settings" SET `
    const parts: any[] = []
    for (let i = 0; i < setClauses.length; i++) {     
      parts.push(setClauses[i].replace(`${i + 1}`, `\${v${i}}`))
    }
    template += parts.join(', ')
    template += ` WHERE user_id = \${userId} RETURNING *`

    for (const key of allowedKeys) {
      if ((updates as any)[key] !== undefined) {
        await prisma.$executeRaw`UPDATE "notification_settings" SET ${prisma.raw(`"${key}"`)} = ${ (updates as any)[key] } WHERE user_id = ${userId}`
      }
    }

    const rows = (await prisma.$queryRaw<
      NotificationSettings[]
    >`SELECT * FROM "notification_settings" WHERE user_id = ${userId} LIMIT 1`) || []

    if (rows.length === 0) throw new Error('Failed to update notification settings')
    return rows[0]
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
    const inserted = (await prisma.$queryRaw<
      EmailLog[]
    >`INSERT INTO "email_logs" (user_id, email_address, subject, email_type, template_name, status, related_booking_id, related_message_id, sent_at, created_at)
      VALUES (${userId ?? null}, ${emailAddress}, ${subject}, ${emailType}, ${templateName ?? null}, 'sent', ${relatedBookingId ?? null}, ${relatedMessageId ?? null}, now(), now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to log email')
    return inserted[0]
  }

  async logFailedEmail(
    emailAddress: string,
    subject: string,
    emailType: string,
    errorMessage: string,
    userId?: string
  ): Promise<EmailLog> {
    const inserted = (await prisma.$queryRaw<
      EmailLog[]
    >`INSERT INTO "email_logs" (user_id, email_address, subject, email_type, status, error_message, created_at)
      VALUES (${userId ?? null}, ${emailAddress}, ${subject}, ${emailType}, 'failed', ${errorMessage}, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to log failed email')
    return inserted[0]
  }

  async queueNotification(
    userId: string,
    notificationType: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<string> {
    const inserted = (await prisma.$queryRaw<
      { id: string }[]
    >`INSERT INTO "notification_queue" (user_id, notification_type, title, message, data, status, created_at)
      VALUES (${userId}, ${notificationType}, ${title}, ${message}, ${JSON.stringify(data ?? {})}, 'pending', now()) RETURNING id`) || []

    if (inserted.length === 0) throw new Error('Failed to queue notification')
    return inserted[0].id
  }

  async getEmailLogs(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    logs: EmailLog[]
    total: number
  }> {
    const rows = (await prisma.$queryRaw<
      EmailLog[]
    >`SELECT * FROM "email_logs" WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || []

    const countRes = (await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "email_logs" WHERE user_id = ${userId}`) || []

    const total = countRes.length > 0 ? countRes[0].count : 0

    return {
      logs: rows,
      total,
    }
  }

  async getPendingNotifications(userId: string): Promise<any[]> {
    const rows = (await prisma.$queryRaw<
      any[]
    >`SELECT * FROM "notification_queue" WHERE user_id = ${userId} AND status = 'pending' AND retry_count < 3 ORDER BY created_at ASC`) || []

    return rows
  }

  async markNotificationAsProcessed(notificationId: string): Promise<void> {
    await prisma.$executeRaw`UPDATE "notification_queue" SET status = 'sent', updated_at = now() WHERE id = ${notificationId}`
  }

  async retryNotification(notificationId: string, errorLog?: string): Promise<void> {
    const rows = (await prisma.$queryRaw<
      { retry_count: number, max_retries: number }[]
    >`SELECT retry_count, max_retries FROM "notification_queue" WHERE id = ${notificationId} LIMIT 1`) || []

    if (rows.length === 0) throw new Error('Notification not found')

    const existing = rows[0]
    if (existing.retry_count >= existing.max_retries) {
      await prisma.$executeRaw`UPDATE "notification_queue" SET status = 'failed', error_log = ${errorLog ?? null}, updated_at = now() WHERE id = ${notificationId}`
    } else {
      await prisma.$executeRaw`UPDATE "notification_queue" SET retry_count = ${existing.retry_count + 1}, next_retry_at = ${new Date(Date.now() + 5 * 60 * 1000).toISOString()}, error_log = ${errorLog ?? null}, updated_at = now() WHERE id = ${notificationId}`
    }
  }
}

export default new NotificationService()
