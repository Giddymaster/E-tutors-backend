"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = require("../prisma");
class NotificationService {
    getNotificationSettings(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "notification_settings" WHERE user_id = ${userId} LIMIT 1`) || [];
            if (rows.length === 0) {
                return yield this.createDefaultSettings(userId);
            }
            return rows[0];
        });
    }
    createDefaultSettings(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "notification_settings" (user_id, booking_confirmations, booking_reminders, booking_cancellations, new_reviews, review_responses, messages, weekly_summary, promotional_emails, created_at)
      VALUES (${userId}, true, true, true, true, true, true, true, false, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create default notification settings');
            return inserted[0];
        });
    }
    updateNotificationSettings(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
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
            ];
            const setClauses = [];
            const values = [];
            for (const key of allowedKeys) {
                if (updates[key] !== undefined) {
                    values.push(updates[key]);
                    setClauses.push(`"${key}" = ${values.length}`); // will be interpolated below
                }
            }
            if (setClauses.length === 0) {
                // nothing to update, return current settings
                return this.getNotificationSettings(userId);
            }
            let template = `UPDATE "notification_settings" SET `;
            const parts = [];
            for (let i = 0; i < setClauses.length; i++) {
                parts.push(setClauses[i].replace(`${i + 1}`, `\${v${i}}`));
            }
            template += parts.join(', ');
            template += ` WHERE user_id = \${userId} RETURNING *`;
            for (const key of allowedKeys) {
                if (updates[key] !== undefined) {
                    yield prisma_1.prisma.$executeRaw `UPDATE "notification_settings" SET ${prisma_1.prisma.raw(`"${key}"`)} = ${updates[key]} WHERE user_id = ${userId}`;
                }
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "notification_settings" WHERE user_id = ${userId} LIMIT 1`) || [];
            if (rows.length === 0)
                throw new Error('Failed to update notification settings');
            return rows[0];
        });
    }
    logEmail(emailAddress, subject, emailType, userId, templateName, relatedBookingId, relatedMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "email_logs" (user_id, email_address, subject, email_type, template_name, status, related_booking_id, related_message_id, sent_at, created_at)
      VALUES (${userId !== null && userId !== void 0 ? userId : null}, ${emailAddress}, ${subject}, ${emailType}, ${templateName !== null && templateName !== void 0 ? templateName : null}, 'sent', ${relatedBookingId !== null && relatedBookingId !== void 0 ? relatedBookingId : null}, ${relatedMessageId !== null && relatedMessageId !== void 0 ? relatedMessageId : null}, now(), now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to log email');
            return inserted[0];
        });
    }
    logFailedEmail(emailAddress, subject, emailType, errorMessage, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "email_logs" (user_id, email_address, subject, email_type, status, error_message, created_at)
      VALUES (${userId !== null && userId !== void 0 ? userId : null}, ${emailAddress}, ${subject}, ${emailType}, 'failed', ${errorMessage}, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to log failed email');
            return inserted[0];
        });
    }
    queueNotification(userId, notificationType, title, message, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "notification_queue" (user_id, notification_type, title, message, data, status, created_at)
      VALUES (${userId}, ${notificationType}, ${title}, ${message}, ${JSON.stringify(data !== null && data !== void 0 ? data : {})}, 'pending', now()) RETURNING id`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to queue notification');
            return inserted[0].id;
        });
    }
    getEmailLogs(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 50, offset = 0) {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "email_logs" WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || [];
            const countRes = (yield prisma_1.prisma.$queryRaw `SELECT COUNT(*)::int AS count FROM "email_logs" WHERE user_id = ${userId}`) || [];
            const total = countRes.length > 0 ? countRes[0].count : 0;
            return {
                logs: rows,
                total,
            };
        });
    }
    getPendingNotifications(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "notification_queue" WHERE user_id = ${userId} AND status = 'pending' AND retry_count < 3 ORDER BY created_at ASC`) || [];
            return rows;
        });
    }
    markNotificationAsProcessed(notificationId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma_1.prisma.$executeRaw `UPDATE "notification_queue" SET status = 'sent', updated_at = now() WHERE id = ${notificationId}`;
        });
    }
    retryNotification(notificationId, errorLog) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT retry_count, max_retries FROM "notification_queue" WHERE id = ${notificationId} LIMIT 1`) || [];
            if (rows.length === 0)
                throw new Error('Notification not found');
            const existing = rows[0];
            if (existing.retry_count >= existing.max_retries) {
                yield prisma_1.prisma.$executeRaw `UPDATE "notification_queue" SET status = 'failed', error_log = ${errorLog !== null && errorLog !== void 0 ? errorLog : null}, updated_at = now() WHERE id = ${notificationId}`;
            }
            else {
                yield prisma_1.prisma.$executeRaw `UPDATE "notification_queue" SET retry_count = ${existing.retry_count + 1}, next_retry_at = ${new Date(Date.now() + 5 * 60 * 1000).toISOString()}, error_log = ${errorLog !== null && errorLog !== void 0 ? errorLog : null}, updated_at = now() WHERE id = ${notificationId}`;
            }
        });
    }
}
exports.NotificationService = NotificationService;
exports.default = new NotificationService();
