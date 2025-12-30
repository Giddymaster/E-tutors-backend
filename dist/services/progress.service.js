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
exports.ProgressService = void 0;
const prisma_1 = require("../prisma");
class ProgressService {
    addSessionNote(bookingId, tutorId, studentId, content, topicsCovered, homeworkAssigned, nextFocusAreas, performanceRating) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "session_notes" (booking_id, tutor_id, student_id, content, topics_covered, homework_assigned, next_focus_areas, student_performance_rating, created_at)
      VALUES (${bookingId}, ${tutorId}, ${studentId}, ${content}, ${topicsCovered}, ${homeworkAssigned}, ${nextFocusAreas || []}, ${performanceRating}, now())
      RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create session note');
            return inserted[0];
        });
    }
    getSessionNotes(bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "session_notes" WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 1`) || [];
            return rows.length > 0 ? rows[0] : null;
        });
    }
    getStudentSessionNotes(studentId, tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "session_notes" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY created_at DESC`) || [];
            return rows;
        });
    }
    createLearningGoal(studentId, tutorId, title, description, targetDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "learning_goals" (student_id, tutor_id, title, description, target_date, status, progress_percentage, created_at)
      VALUES (${studentId}, ${tutorId}, ${title}, ${description}, ${targetDate}, 'active', 0, now())
      RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create learning goal');
            return inserted[0];
        });
    }
    getLearningGoals(studentId, tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tutorId) {
                const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "learning_goals" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY created_at DESC`) || [];
                return rows;
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "learning_goals" WHERE student_id = ${studentId} ORDER BY created_at DESC`) || [];
            return rows;
        });
    }
    updateGoalProgress(goalId, studentId, progressPercentage) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = (yield prisma_1.prisma.$queryRaw `SELECT student_id FROM "learning_goals" WHERE id = ${goalId} LIMIT 1`) || [];
            if (existing.length === 0)
                throw new Error('Goal not found');
            if (existing[0].student_id !== studentId)
                throw new Error('Unauthorized: You can only update your own goals');
            const status = progressPercentage >= 100 ? 'completed' : 'active';
            const updated = (yield prisma_1.prisma.$queryRaw `UPDATE "learning_goals" SET progress_percentage = ${Math.min(100, Math.max(0, progressPercentage))}, status = ${status} WHERE id = ${goalId} RETURNING *`) || [];
            if (updated.length === 0)
                throw new Error('Failed to update goal');
            return updated[0];
        });
    }
    completeGoal(goalId, studentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = (yield prisma_1.prisma.$queryRaw `SELECT student_id FROM "learning_goals" WHERE id = ${goalId} LIMIT 1`) || [];
            if (existing.length === 0)
                throw new Error('Goal not found');
            if (existing[0].student_id !== studentId)
                throw new Error('Unauthorized: You can only complete your own goals');
            const updated = (yield prisma_1.prisma.$queryRaw `UPDATE "learning_goals" SET status = 'completed', progress_percentage = 100 WHERE id = ${goalId} RETURNING *`) || [];
            if (updated.length === 0)
                throw new Error('Failed to complete goal');
            return updated[0];
        });
    }
    getOrCreateStudentProgress(studentId, tutorId, subject) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "student_progress" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} AND subject = ${subject} LIMIT 1`) || [];
            if (existing.length > 0)
                return existing[0];
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "student_progress" (student_id, tutor_id, subject, sessions_completed, total_hours, created_at)
      VALUES (${studentId}, ${tutorId}, ${subject}, 0, 0, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create student progress');
            return inserted[0];
        });
    }
    updateStudentProgress(progressId, tutorId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = (yield prisma_1.prisma.$queryRaw `SELECT tutor_id FROM "student_progress" WHERE id = ${progressId} LIMIT 1`) || [];
            if (existing.length === 0)
                throw new Error('Progress record not found');
            if (existing[0].tutor_id !== tutorId)
                throw new Error('Unauthorized: You can only update your students progress');
            // apply allowed updates one-by-one (keeps code simple and safe)
            if (updates.current_level !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET current_level = ${updates.current_level} WHERE id = ${progressId}`;
            }
            if (updates.target_level !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET target_level = ${updates.target_level} WHERE id = ${progressId}`;
            }
            if (updates.sessions_completed !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET sessions_completed = ${updates.sessions_completed} WHERE id = ${progressId}`;
            }
            if (updates.total_hours !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET total_hours = ${updates.total_hours} WHERE id = ${progressId}`;
            }
            if (updates.last_session_date !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET last_session_date = ${updates.last_session_date} WHERE id = ${progressId}`;
            }
            if (updates.average_performance !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "student_progress" SET average_performance = ${updates.average_performance} WHERE id = ${progressId}`;
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "student_progress" WHERE id = ${progressId} LIMIT 1`) || [];
            if (rows.length === 0)
                throw new Error('Failed to fetch updated progress');
            return rows[0];
        });
    }
    getStudentProgress(studentId, tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tutorId) {
                const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "student_progress" WHERE student_id = ${studentId} AND tutor_id = ${tutorId} ORDER BY subject ASC`) || [];
                return rows;
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "student_progress" WHERE student_id = ${studentId} ORDER BY subject ASC`) || [];
            return rows;
        });
    }
}
exports.ProgressService = ProgressService;
exports.default = new ProgressService();
