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
const progress_service_1 = __importDefault(require("../services/progress.service"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/session-notes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId, studentId, content, topicsCovered, homeworkAssigned, nextFocusAreas, performanceRating } = req.body;
        const tutorId = req.userId || '';
        if (!bookingId || !studentId || !content || !tutorId) {
            return res.status(400).json({ error: 'bookingId, studentId, content, and authentication are required' });
        }
        const note = yield progress_service_1.default.addSessionNote(bookingId, tutorId, studentId, content, topicsCovered || [], homeworkAssigned, nextFocusAreas, performanceRating);
        res.status(201).json({ note });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create session note' });
    }
}));
router.get('/session-notes/:bookingId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId } = req.params;
        const note = yield progress_service_1.default.getSessionNotes(bookingId);
        res.json({ note });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch session note' });
    }
}));
router.get('/learning-goals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { tutorId } = req.query;
        const goals = yield progress_service_1.default.getLearningGoals(userId, tutorId);
        res.json({ goals });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch learning goals' });
    }
}));
router.post('/learning-goals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, targetDate, tutorId } = req.body;
        const studentId = req.userId || '';
        if (!title || !tutorId || !studentId) {
            return res.status(400).json({ error: 'title, tutorId, and authentication are required' });
        }
        const goal = yield progress_service_1.default.createLearningGoal(studentId, tutorId, title, description, targetDate);
        res.status(201).json({ goal });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create learning goal' });
    }
}));
router.patch('/learning-goals/:goalId/progress', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goalId } = req.params;
        const { progressPercentage } = req.body;
        const studentId = req.userId || '';
        if (progressPercentage === undefined || !studentId) {
            return res.status(400).json({ error: 'progressPercentage and authentication are required' });
        }
        const goal = yield progress_service_1.default.updateGoalProgress(goalId, studentId, progressPercentage);
        res.json({ goal });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to update goal progress' });
    }
}));
router.patch('/learning-goals/:goalId/complete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goalId } = req.params;
        const studentId = req.userId || '';
        if (!studentId)
            return res.status(401).json({ error: 'Unauthorized' });
        const goal = yield progress_service_1.default.completeGoal(goalId, studentId);
        res.json({ goal });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to complete goal' });
    }
}));
router.get('/student-progress', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId || '';
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { tutorId } = req.query;
        const progress = yield progress_service_1.default.getStudentProgress(userId, tutorId);
        res.json({ progress });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch student progress' });
    }
}));
exports.default = router;
