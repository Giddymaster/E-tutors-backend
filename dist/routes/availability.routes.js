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
const availability_service_1 = __importDefault(require("../services/availability.service"));
const router = (0, express_1.Router)();
router.get('/tutors/:tutorId/availability', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tutorId } = req.params;
        const availability = yield availability_service_1.default.getTutorAvailability(tutorId);
        res.json({ availability });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch availability' });
    }
}));
router.use(auth_middleware_1.authenticate);
router.post('/availability', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dayOfWeek, startTime, endTime } = req.body;
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'dayOfWeek, startTime, and endTime are required' });
        }
        if (dayOfWeek < 0 || dayOfWeek > 6) {
            return res.status(400).json({ error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' });
        }
        const availability = yield availability_service_1.default.setAvailability(tutorId, dayOfWeek, startTime, endTime);
        res.status(201).json({ availability });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create availability' });
    }
}));
router.patch('/availability/:availabilityId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { availabilityId } = req.params;
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        const updates = req.body;
        const availability = yield availability_service_1.default.updateAvailability(availabilityId, tutorId, updates);
        res.json({ availability });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to update availability' });
    }
}));
router.delete('/availability/:availabilityId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { availabilityId } = req.params;
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        yield availability_service_1.default.deleteAvailability(availabilityId, tutorId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to delete availability' });
    }
}));
router.get('/unavailable-dates', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { startDate, endDate } = req.query;
        const dates = yield availability_service_1.default.getUnavailableDates(tutorId, startDate, endDate);
        res.json({ dates });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch unavailable dates' });
    }
}));
router.post('/unavailable-dates', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startAt, endAt, reason } = req.body;
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!startAt || !endAt) {
            return res.status(400).json({ error: 'startAt and endAt are required' });
        }
        const date = yield availability_service_1.default.addUnavailableDate(tutorId, startAt, endAt, reason);
        res.status(201).json({ date });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to add unavailable date' });
    }
}));
router.delete('/unavailable-dates/:dateId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dateId } = req.params;
        const tutorId = req.userId || '';
        if (!tutorId)
            return res.status(401).json({ error: 'Unauthorized' });
        yield availability_service_1.default.removeUnavailableDate(dateId, tutorId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to remove unavailable date' });
    }
}));
exports.default = router;
