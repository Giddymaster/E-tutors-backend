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
const review_service_1 = __importDefault(require("../services/review.service"));
const router = (0, express_1.Router)();
router.get('/tutors/:tutorId/reviews', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tutorId } = req.params;
        const limit = Math.min(parseInt(req.query.limit || '20'), 500);
        const offset = parseInt(req.query.offset || '0');
        const result = yield review_service_1.default.getReviews(tutorId, limit, offset);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch reviews' });
    }
}));
router.get('/tutors/:tutorId/rating-stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tutorId } = req.params;
        const stats = yield review_service_1.default.getTutorRatingStats(tutorId);
        res.json({ stats });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch rating stats' });
    }
}));
router.use(auth_middleware_1.authenticate);
router.post('/reviews', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tutorId, rating, comment, bookingId } = req.body;
        const studentId = req.userId || '';
        if (!tutorId || !rating || !studentId) {
            return res.status(400).json({ error: 'tutorId, rating, and authentication are required' });
        }
        if (bookingId) {
            const canReview = yield review_service_1.default.canReviewBooking(bookingId, studentId);
            if (!canReview) {
                return res.status(403).json({ error: 'You can only review completed bookings' });
            }
            const hasReviewed = yield review_service_1.default.hasReviewedBooking(bookingId);
            if (hasReviewed) {
                return res.status(400).json({ error: 'You have already reviewed this booking' });
            }
        }
        const review = yield review_service_1.default.createReview(tutorId, studentId, rating, comment, bookingId);
        res.status(201).json({ review });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create review' });
    }
}));
router.patch('/reviews/:reviewId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const studentId = req.userId || '';
        if (!rating || !studentId) {
            return res.status(400).json({ error: 'rating and authentication are required' });
        }
        const review = yield review_service_1.default.updateReview(reviewId, studentId, rating, comment);
        res.json({ review });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to update review' });
    }
}));
router.delete('/reviews/:reviewId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewId } = req.params;
        const studentId = req.userId || '';
        if (!studentId)
            return res.status(401).json({ error: 'Unauthorized' });
        yield review_service_1.default.deleteReview(reviewId, studentId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(403).json({ error: error.message || 'Failed to delete review' });
    }
}));
exports.default = router;
