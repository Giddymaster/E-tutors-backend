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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const messaging_service_1 = __importDefault(require("../services/messaging.service"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/conversations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const conversations = yield messaging_service_1.default.getConversations(userId);
        res.json({ conversations });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
    }
}));
router.post('/conversations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { otherUserId } = req.body;
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!otherUserId) {
            return res.status(400).json({ error: 'otherUserId is required' });
        }
        if (userId === otherUserId) {
            return res.status(400).json({ error: 'Cannot create conversation with yourself' });
        }
        const conversation = yield messaging_service_1.default.getOrCreateConversation(userId, otherUserId);
        res.json({ conversation });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create conversation' });
    }
}));
router.get('/conversations/:conversationId/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const limit = Math.min(parseInt(req.query.limit || '50'), 500);
        const offset = parseInt(req.query.offset || '0');
        const messages = yield messaging_service_1.default.getMessages(conversationId, limit, offset);
        res.json({ messages });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
}));
router.post('/conversations/:conversationId/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const senderId = req.userId || '';
        if (!senderId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        const message = yield messaging_service_1.default.sendMessage(conversationId, senderId, content);
        res.status(201).json({ message });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
}));
router.patch('/messages/:messageId/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId } = req.params;
        yield messaging_service_1.default.markMessageAsRead(messageId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to mark message as read' });
    }
}));
router.delete('/messages/:messageId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId } = req.params;
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        yield messaging_service_1.default.deleteMessage(messageId, userId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to delete message' });
    }
}));
exports.default = router;
