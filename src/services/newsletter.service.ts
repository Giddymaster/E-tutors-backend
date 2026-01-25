import { Resend } from 'resend'
import { prisma } from '../prisma'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mastertrack.com'
const APP_URL = process.env.APP_URL || 'https://mastertrack-tutors.vercel.app'

export const newsletterService = {
  /**
   * Subscribe a user to the newsletter
   * Generates a confirmation token and sends confirmation email
   */
  async subscribe(email: string) {
    try {
      // Check if already subscribed
      const existing = await prisma.newsletter.findUnique({
        where: { email }
      })

      if (existing && existing.isConfirmed) {
        return { success: false, message: 'Already subscribed' }
      }

      // Generate confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex')

      // Save or update subscriber
      const subscriber = await prisma.newsletter.upsert({
        where: { email },
        update: {
          confirmationToken,
          isConfirmed: false,
          unsubscribedAt: null
        },
        create: {
          email,
          confirmationToken,
          isConfirmed: false
        }
      })

      // Send confirmation email
      const confirmationUrl = `${APP_URL}/newsletter/confirm/${confirmationToken}`
      
      await resend.emails.send({
        from: 'Mastertrack Tutors <noreply@mastertrack.com>',
        to: email,
        subject: 'Confirm Your Mastertrack Tutors Newsletter Subscription',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #13aa05;">Confirm Your Newsletter Subscription</h2>
            <p>Thank you for subscribing to Mastertrack Tutors!</p>
            <p>Please click the button below to confirm your email address:</p>
            <a href="${confirmationUrl}" style="display: inline-block; background-color: #13aa05; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Confirm Subscription
            </a>
            <p>Or copy and paste this link:</p>
            <p style="word-break: break-all; color: #666;">${confirmationUrl}</p>
            <p>This link will expire in 7 days.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't subscribe to this newsletter, you can ignore this email.</p>
          </div>
        `
      })

      // Send admin notification
      await resend.emails.send({
        from: 'Mastertrack Tutors <noreply@mastertrack.com>',
        to: ADMIN_EMAIL,
        subject: `New Newsletter Subscriber: ${email}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h3>New Newsletter Subscriber</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subscribed at:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> Awaiting confirmation</p>
            <p><a href="${APP_URL}/admin/newsletter">View all subscribers</a></p>
          </div>
        `
      })

      return {
        success: true,
        message: 'Subscription created. Please check your email for confirmation link.'
      }
    } catch (error) {
      console.error('Newsletter subscribe error:', error)
      throw error
    }
  },

  /**
   * Confirm newsletter subscription via token
   */
  async confirmSubscription(token: string) {
    try {
      const subscriber = await prisma.newsletter.findUnique({
        where: { confirmationToken: token }
      })

      if (!subscriber) {
        return { success: false, message: 'Invalid confirmation token' }
      }

      if (subscriber.isConfirmed) {
        return { success: false, message: 'Already confirmed' }
      }

      // Update subscriber
      await prisma.newsletter.update({
        where: { id: subscriber.id },
        data: {
          isConfirmed: true,
          confirmedAt: new Date(),
          confirmationToken: null // Clear token after use
        }
      })

      // Send confirmation received email
      await resend.emails.send({
        from: 'Mastertrack Tutors <noreply@mastertrack.com>',
        to: subscriber.email,
        subject: 'Welcome to Mastertrack Tutors Newsletter!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #13aa05;">Welcome! 🎉</h2>
            <p>Your email has been confirmed!</p>
            <p>You'll now receive our weekly updates about:</p>
            <ul>
              <li>New tutoring opportunities</li>
              <li>Platform announcements</li>
              <li>Tips for students and tutors</li>
              <li>Exclusive offers and discounts</li>
            </ul>
            <p>Thank you for being part of the Mastertrack Tutors community!</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              <a href="${APP_URL}/newsletter/unsubscribe/${token}" style="color: #999;">Unsubscribe from this newsletter</a>
            </p>
          </div>
        `
      })

      return { success: true, message: 'Email confirmed successfully!' }
    } catch (error) {
      console.error('Newsletter confirm error:', error)
      throw error
    }
  },

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(email: string) {
    try {
      const subscriber = await prisma.newsletter.findUnique({
        where: { email }
      })

      if (!subscriber) {
        return { success: false, message: 'Email not found' }
      }

      await prisma.newsletter.update({
        where: { id: subscriber.id },
        data: { unsubscribedAt: new Date() }
      })

      // Send confirmation email
      await resend.emails.send({
        from: 'Mastertrack Tutors <noreply@mastertrack.com>',
        to: email,
        subject: 'You have been unsubscribed',
        html: `
          <p>You have been successfully unsubscribed from our newsletter.</p>
          <p>You won't receive any more emails from us.</p>
        `
      })

      return { success: true, message: 'Unsubscribed successfully' }
    } catch (error) {
      console.error('Newsletter unsubscribe error:', error)
      throw error
    }
  },

  /**
   * Get all confirmed subscribers (for admin)
   */
  async getSubscribers(skip: number = 0, take: number = 50) {
    try {
      const [subscribers, total] = await Promise.all([
        prisma.newsletter.findMany({
          where: { isConfirmed: true, unsubscribedAt: null },
          skip,
          take,
          orderBy: { confirmedAt: 'desc' }
        }),
        prisma.newsletter.count({
          where: { isConfirmed: true, unsubscribedAt: null }
        })
      ])

      return { subscribers, total }
    } catch (error) {
      console.error('Get subscribers error:', error)
      throw error
    }
  }
}
