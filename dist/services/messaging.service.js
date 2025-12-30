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
exports.MessagingService = void 0;
const prisma_1 = require("../prisma");
class MessagingService {
    getOrCreateConversation(userId, otherUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "conversations" WHERE (participant_1_id = ${userId} AND participant_2_id = ${otherUserId}) OR (participant_1_id = ${otherUserId} AND participant_2_id = ${userId}) LIMIT 1`) || [];
            if (rows.length > 0)
                return rows[0];
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "conversations" (participant_1_id, participant_2_id, created_at) VALUES (${userId}, ${otherUserId}, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create conversation');
            return inserted[0];
        });
    }
    getConversations(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "conversations" WHERE participant_1_id = ${userId} OR participant_2_id = ${userId} ORDER BY last_message_at DESC`) || [];
            return rows;
        });
    }
    getMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "messages" WHERE conversation_id = ${conversationId} AND is_deleted = false ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || [];
            return rows.reverse();
        });
    }
    sendMessage(conversationId, senderId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "messages" (conversation_id, sender_id, content, created_at) VALUES (${conversationId}, ${senderId}, ${content}, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to send message');
            yield prisma_1.prisma.$executeRaw `UPDATE "conversations" SET last_message_at = now(), last_message_preview = substring(${content} from 1 for 100) WHERE id = ${conversationId}`;
            return inserted[0];
        });
    }
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma_1.prisma.$executeRaw `UPDATE "messages" SET read_at = now() WHERE id = ${messageId}`;
        });
    }
    deleteMessage(messageId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT sender_id FROM "messages" WHERE id = ${messageId} LIMIT 1`) || [];
            if (rows.length === 0)
                throw new Error('Message not found');
            if (rows[0].sender_id !== userId)
                throw new Error('Unauthorized: You can only delete your own messages');
            yield prisma_1.prisma.$executeRaw `UPDATE "messages" SET is_deleted = true WHERE id = ${messageId}`;
        });
    }
}
exports.MessagingService = MessagingService;
exports.default = new MessagingService();
