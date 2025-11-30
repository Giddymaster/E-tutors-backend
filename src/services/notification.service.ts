import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';

export class NotificationService {
    async sendBookingConfirmation(user: User, bookingDetails: any): Promise<void> {
        const message = `Hello ${user.name}, your booking has been confirmed. Details: ${JSON.stringify(bookingDetails)}`;
        await this.sendNotification(user.email, message);
    }

    async sendReminder(user: User, sessionDetails: any): Promise<void> {
        const message = `Reminder: You have a session scheduled. Details: ${JSON.stringify(sessionDetails)}`;
        await this.sendNotification(user.email, message);
    }

    private async sendNotification(email: string, message: string): Promise<void> {
        // Logic to send notification (e.g., email, SMS)
        console.log(`Sending notification to ${email}: ${message}`);
    }
}