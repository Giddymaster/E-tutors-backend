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
exports.sendMessage = exports.getConversation = exports.getConversations = void 0;
const prisma_1 = require("../prisma");
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = String(req.userId);
        const conversations = yield prisma_1.prisma.conversation.findMany({
            where: {
                OR: [{ studentId: userId }, { tutorId: userId }],
            },
            include: {
                proposal: { include: { tutor: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                student: { select: { id: true, name: true } },
                tutor: { select: { id: true, name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ conversations });
    }
    catch (err) {
        console.error('getConversations error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getConversations = getConversations;
const getConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = String(req.userId);
        const conversationId = String(req.params.conversationId);
        const conversation = yield prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                student: { select: { id: true, name: true } },
                tutor: { select: { id: true, name: true } },
            },
        });
        if (!conversation)
            return res.status(404).json({ error: 'Conversation not found' });
        if (conversation.studentId !== userId && conversation.tutorId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        res.json({ conversation });
    }
    catch (err) {
        console.error('getConversation error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getConversation = getConversation;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = String(req.userId);
        const conversationId = String(req.params.conversationId);
        const { content } = req.body;
        if (!(content === null || content === void 0 ? void 0 : content.trim()))
            return res.status(400).json({ error: 'Message content is required' });
        const conversation = yield prisma_1.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation)
            return res.status(404).json({ error: 'Conversation not found' });
        if (conversation.studentId !== userId && conversation.tutorId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const message = yield prisma_1.prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content: content.trim(),
            },
            include: { sender: { select: { id: true, name: true } } },
        });
        res.status(201).json({ message });
    }
    catch (err) {
        console.error('sendMessage error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.sendMessage = sendMessage;
