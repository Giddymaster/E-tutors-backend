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
exports.respondToMessage = exports.postMessage = exports.getMessages = void 0;
const prisma_1 = require("../prisma");
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const msgs = yield prisma_1.prisma.supportMessage.findMany({ orderBy: { createdAt: 'asc' } });
        res.json({ messages: msgs });
    }
    catch (err) {
        console.error('getMessages error', err);
        res.status(500).json({ error: 'Failed to read messages' });
    }
});
exports.getMessages = getMessages;
const postMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text || !text.trim())
            return res.status(400).json({ error: 'Empty message' });
        // @ts-ignore
        const userId = req.userId || null;
        // @ts-ignore
        const userRole = req.userRole || null;
        const message = yield prisma_1.prisma.supportMessage.create({ data: { text: text.trim(), userId: userId ? Number(userId) : undefined, userRole: userRole || undefined } });
        // emit socket event
        const io = req.app.locals.io;
        if (io)
            io.emit('support:message', message);
        res.json({ ok: true, message });
    }
    catch (err) {
        console.error('postMessage error', err);
        res.status(500).json({ error: 'Failed to save message' });
    }
});
exports.postMessage = postMessage;
const respondToMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { response } = req.body;
        if (!response)
            return res.status(400).json({ error: 'Empty response' });
        // @ts-ignore
        const responderId = req.userId ? Number(req.userId) : undefined;
        const updated = yield prisma_1.prisma.supportMessage.update({ where: { id }, data: { response, responderId } });
        const io = req.app.locals.io;
        if (io)
            io.emit('support:response', updated);
        res.json({ ok: true, message: updated });
    }
    catch (err) {
        console.error('respondToMessage error', err);
        res.status(500).json({ error: 'Failed to save response' });
    }
});
exports.respondToMessage = respondToMessage;
