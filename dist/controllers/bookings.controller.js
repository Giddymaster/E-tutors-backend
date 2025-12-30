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
exports.createBulkBookings = exports.respondToBooking = exports.getBookings = exports.createBooking = void 0;
const prisma_1 = require("../prisma");
const createBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const studentId = req.userId;
        if (!studentId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { tutorId, subject, scheduledAt, duration, price, assignmentId } = req.body;
        if (!tutorId || !scheduledAt) {
            return res.status(400).json({ error: 'tutorId and scheduledAt are required' });
        }
        // ensure tutor exists
        const tutor = yield prisma_1.prisma.user.findUnique({ where: { id: String(tutorId) } });
        if (!tutor)
            return res.status(404).json({ error: 'Tutor not found' });
        const bookingData = {
            studentId: String(studentId),
            tutorId: String(tutorId),
            scheduledAt: new Date(scheduledAt),
            price: typeof price === 'number' ? price : 0,
            status: 'REQUESTED'
        };
        // include assignmentId only when provided to avoid null assignment error
        if (assignmentId)
            bookingData.assignmentId = String(assignmentId);
        const booking = yield prisma_1.prisma.booking.create({
            data: bookingData
        });
        res.json({ booking });
    }
    catch (err) {
        console.error('createBooking error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.createBooking = createBooking;
const getBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const asStudent = yield prisma_1.prisma.booking.findMany({ where: { studentId: String(userId) }, orderBy: { scheduledAt: 'desc' } });
        const asTutor = yield prisma_1.prisma.booking.findMany({ where: { tutorId: String(userId) }, orderBy: { scheduledAt: 'desc' } });
        // combine, dedupe by id and return
        const map = new Map();
        asStudent.forEach(b => map.set(b.id, b));
        asTutor.forEach(b => map.set(b.id, b));
        res.json({ bookings: Array.from(map.values()) });
    }
    catch (err) {
        console.error('getBookings error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getBookings = getBookings;
const respondToBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const id = String(req.params.id);
        const { action } = req.body; // expected: 'accept' | 'reject'
        if (!['accept', 'reject'].includes(action))
            return res.status(400).json({ error: 'Invalid action' });
        const booking = yield prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        // only the assigned tutor can accept/reject
        if (String(booking.tutorId) !== String(userId))
            return res.status(403).json({ error: 'Forbidden' });
        const updated = yield prisma_1.prisma.booking.update({ where: { id }, data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } });
        res.json({ booking: updated });
    }
    catch (err) {
        console.error('respondToBooking error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.respondToBooking = respondToBooking;
const createBulkBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const studentId = req.userId;
        if (!studentId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { tutorId, subject, sessions } = req.body;
        if (!tutorId || !Array.isArray(sessions) || sessions.length === 0) {
            return res.status(400).json({ error: 'tutorId and sessions[] are required' });
        }
        // ensure tutor exists
        const tutor = yield prisma_1.prisma.user.findUnique({ where: { id: String(tutorId) } });
        if (!tutor)
            return res.status(404).json({ error: 'Tutor not found' });
        // prepare booking data
        const bookingData = sessions.map((s) => ({
            studentId: String(studentId),
            tutorId: String(tutorId),
            scheduledAt: new Date(s.scheduledAt),
            duration: typeof s.duration === 'number' ? s.duration : Number(s.duration || 0),
            price: typeof s.price === 'number' ? s.price : Number(s.price || 0),
            notes: s.notes || undefined,
            status: 'REQUESTED',
            assignmentId: s.assignmentId ? String(s.assignmentId) : undefined
        }));
        // create all bookings in a transaction so it's atomic
        const created = yield prisma_1.prisma.$transaction(bookingData.map((d) => prisma_1.prisma.booking.create({ data: d })));
        res.json({ bookings: created });
    }
    catch (err) {
        console.error('createBulkBookings error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.createBulkBookings = createBulkBookings;
