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
exports.ReviewService = void 0;
const prisma_1 = require("../prisma");
class ReviewService {
    createReview(tutorId, studentId, rating, comment, bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "reviews" (tutor_id, student_id, booking_id, rating, comment, is_verified_booking, created_at)
      VALUES (${tutorId}, ${studentId}, ${bookingId}, ${rating}, ${comment}, ${!!bookingId}, now())
      RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create review');
            yield this.updateTutorRating(tutorId);
            return inserted[0];
        });
    }
    getReviews(tutorId_1) {
        return __awaiter(this, arguments, void 0, function* (tutorId, limit = 20, offset = 0) {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "reviews" WHERE tutor_id = ${tutorId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || [];
            const countRes = (yield prisma_1.prisma.$queryRaw `SELECT COUNT(*)::int AS count FROM "reviews" WHERE tutor_id = ${tutorId}`) || [];
            const total = countRes.length > 0 ? countRes[0].count : 0;
            return {
                reviews: rows,
                total,
            };
        });
    }
    getTutorRatingStats(tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT rating FROM "reviews" WHERE tutor_id = ${tutorId}`) || [];
            if (!rows || rows.length === 0) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                };
            }
            const ratings = rows.map(r => Number(r.rating));
            const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            ratings.forEach((r) => {
                if (r >= 1 && r <= 5)
                    distribution[r]++;
            });
            return {
                averageRating: Math.round(average * 10) / 10,
                totalReviews: ratings.length,
                distribution,
            };
        });
    }
    updateTutorRating(tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.getTutorRatingStats(tutorId);
            const tutorRows = (yield prisma_1.prisma.$queryRaw `SELECT id FROM "tutor_profiles" WHERE user_id = ${tutorId} LIMIT 1`) || [];
            if (tutorRows.length === 0)
                return;
            const tutorIdDb = tutorRows[0].id;
            yield prisma_1.prisma.$executeRaw `UPDATE "tutor_profiles" SET rating = ${stats.averageRating}, total_reviews = ${stats.totalReviews} WHERE id = ${tutorIdDb}`;
        });
    }
    canReviewBooking(bookingId, studentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT status, student_id FROM "bookings" WHERE id = ${bookingId} LIMIT 1`) || [];
            if (rows.length === 0)
                return false;
            const booking = rows[0];
            if (booking.student_id !== studentId)
                return false;
            return booking.status === 'completed';
        });
    }
    hasReviewedBooking(bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT id FROM "reviews" WHERE booking_id = ${bookingId} LIMIT 1`) || [];
            return rows.length > 0;
        });
    }
    updateReview(reviewId, studentId, rating, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
            const existingRows = (yield prisma_1.prisma.$queryRaw `SELECT student_id, tutor_id FROM "reviews" WHERE id = ${reviewId} LIMIT 1`) || [];
            if (existingRows.length === 0)
                throw new Error('Review not found');
            const existing = existingRows[0];
            if (existing.student_id !== studentId) {
                throw new Error('Unauthorized: You can only update your own reviews');
            }
            const updated = (yield prisma_1.prisma.$queryRaw `UPDATE "reviews" SET rating = ${rating}, comment = ${comment} WHERE id = ${reviewId} RETURNING *`) || [];
            if (updated.length === 0)
                throw new Error('Failed to update review');
            yield this.updateTutorRating(existing.tutor_id);
            return updated[0];
        });
    }
    deleteReview(reviewId, studentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingRows = (yield prisma_1.prisma.$queryRaw `SELECT student_id, tutor_id FROM "reviews" WHERE id = ${reviewId} LIMIT 1`) || [];
            if (existingRows.length === 0)
                throw new Error('Review not found');
            const existing = existingRows[0];
            if (existing.student_id !== studentId) {
                throw new Error('Unauthorized: You can only delete your own reviews');
            }
            yield prisma_1.prisma.$executeRaw `DELETE FROM "reviews" WHERE id = ${reviewId}`;
            yield this.updateTutorRating(existing.tutor_id);
        });
    }
}
exports.ReviewService = ReviewService;
exports.default = new ReviewService();
