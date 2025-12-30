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
exports.AvailabilityService = void 0;
const prisma_1 = require("../prisma");
class AvailabilityService {
    getTutorAvailability(tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_availability" WHERE tutor_id = ${tutorId} AND is_active = true ORDER BY day_of_week ASC`) || [];
            return rows;
        });
    }
    setAvailability(tutorId, dayOfWeek, startTime, endTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "tutor_availability" (tutor_id, day_of_week, start_time, end_time, is_active, created_at)
      VALUES (${tutorId}, ${dayOfWeek}, ${startTime}, ${endTime}, true, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create availability');
            return inserted[0];
        });
    }
    updateAvailability(availabilityId, tutorId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingRows = (yield prisma_1.prisma.$queryRaw `SELECT tutor_id FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || [];
            if (existingRows.length === 0)
                throw new Error('Availability not found');
            if (existingRows[0].tutor_id !== tutorId)
                throw new Error('Unauthorized: You can only update your own availability');
            // apply allowed updates individually
            if (updates.day_of_week !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "tutor_availability" SET day_of_week = ${updates.day_of_week} WHERE id = ${availabilityId}`;
            }
            if (updates.start_time !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "tutor_availability" SET start_time = ${updates.start_time} WHERE id = ${availabilityId}`;
            }
            if (updates.end_time !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "tutor_availability" SET end_time = ${updates.end_time} WHERE id = ${availabilityId}`;
            }
            if (updates.is_active !== undefined) {
                yield prisma_1.prisma.$executeRaw `UPDATE "tutor_availability" SET is_active = ${updates.is_active} WHERE id = ${availabilityId}`;
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || [];
            if (rows.length === 0)
                throw new Error('Failed to fetch updated availability');
            return rows[0];
        });
    }
    deleteAvailability(availabilityId, tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingRows = (yield prisma_1.prisma.$queryRaw `SELECT tutor_id FROM "tutor_availability" WHERE id = ${availabilityId} LIMIT 1`) || [];
            if (existingRows.length === 0)
                throw new Error('Availability not found');
            if (existingRows[0].tutor_id !== tutorId)
                throw new Error('Unauthorized: You can only delete your own availability');
            yield prisma_1.prisma.$executeRaw `DELETE FROM "tutor_availability" WHERE id = ${availabilityId}`;
        });
    }
    getUnavailableDates(tutorId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // build a simple query with optional bounds
            if (startDate && endDate) {
                const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND start_at >= ${startDate} AND end_at <= ${endDate} ORDER BY start_at ASC`) || [];
                return rows;
            }
            if (startDate) {
                const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND start_at >= ${startDate} ORDER BY start_at ASC`) || [];
                return rows;
            }
            if (endDate) {
                const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} AND end_at <= ${endDate} ORDER BY start_at ASC`) || [];
                return rows;
            }
            const rows = (yield prisma_1.prisma.$queryRaw `SELECT * FROM "tutor_unavailable_dates" WHERE tutor_id = ${tutorId} ORDER BY start_at ASC`) || [];
            return rows;
        });
    }
    addUnavailableDate(tutorId, startAt, endAt, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const inserted = (yield prisma_1.prisma.$queryRaw `INSERT INTO "tutor_unavailable_dates" (tutor_id, start_at, end_at, reason, created_at)
      VALUES (${tutorId}, ${startAt}, ${endAt}, ${reason !== null && reason !== void 0 ? reason : null}, now()) RETURNING *`) || [];
            if (inserted.length === 0)
                throw new Error('Failed to create unavailable date');
            return inserted[0];
        });
    }
    removeUnavailableDate(unavailableDateId, tutorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingRows = (yield prisma_1.prisma.$queryRaw `SELECT tutor_id FROM "tutor_unavailable_dates" WHERE id = ${unavailableDateId} LIMIT 1`) || [];
            if (existingRows.length === 0)
                throw new Error('Unavailable date not found');
            if (existingRows[0].tutor_id !== tutorId)
                throw new Error('Unauthorized: You can only delete your own unavailable dates');
            yield prisma_1.prisma.$executeRaw `DELETE FROM "tutor_unavailable_dates" WHERE id = ${unavailableDateId}`;
        });
    }
    isSlotAvailable(availability, requestedTime, unavailableDates) {
        const dayOfWeek = requestedTime.getDay();
        const timeString = requestedTime.toTimeString().substring(0, 5);
        const slot = availability.find((a) => a.day_of_week === dayOfWeek);
        if (!slot)
            return false;
        if (timeString < slot.start_time || timeString > slot.end_time) {
            return false;
        }
        const hasConflict = unavailableDates.some((ud) => {
            const start = new Date(ud.start_at);
            const end = new Date(ud.end_at);
            return requestedTime >= start && requestedTime <= end;
        });
        return !hasConflict;
    }
}
exports.AvailabilityService = AvailabilityService;
exports.default = new AvailabilityService();
