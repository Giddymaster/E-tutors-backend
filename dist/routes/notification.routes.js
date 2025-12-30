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
const notification_service_1 = __importDefault(require("../services/notification.service"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/settings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const settings = yield notification_service_1.default.getNotificationSettings(userId);
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch notification settings' });
    }
}));
router.patch('/settings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const updates = req.body;
        const settings = yield notification_service_1.default.updateNotificationSettings(userId, updates);
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update notification settings' });
    }
}));
router.get('/email-logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const limit = Math.min(parseInt(req.query.limit || '50'), 500);
        const offset = parseInt(req.query.offset || '0');
        const result = yield notification_service_1.default.getEmailLogs(userId, limit, offset);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch email logs' });
    }
}));
exports.default = router;
