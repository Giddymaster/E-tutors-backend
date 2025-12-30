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
exports.respondBooking = exports.listBookings = exports.createBooking = void 0;
const prisma_1 = require("../prisma");
const createBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { tutorId, subject, scheduledAt, duration, price } = req.body;
        if (!tutorId || !subject || !scheduledAt || !duration)
            return res.status(400).json({ error: 'Missing fields' });
        const booking = yield prisma_1.prisma.booking.create({ data: { studentId: Number(userId), tutorId: Number(tutorId), subject, scheduledAt: new Date(scheduledAt), duration: Number(duration), price: Number(price || 0) } });
        res.json({ booking });
    }
    catch (err) {
        console.error('createBooking error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.createBooking = createBooking;
const listBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        // @ts-ignore
        const userRole = req.userRole;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (userRole === 'TUTOR') {
            // find tutor profile for user
            const tutor = yield prisma_1.prisma.tutorProfile.findUnique({ where: { userId: String(userId) } });
            if (!tutor)
                return res.json({ bookings: [] });
            const bookings = yield prisma_1.prisma.booking.findMany({ where: { tutorId: tutor.id }, orderBy: { createdAt: 'desc' } });
            return res.json({ bookings });
        }
        // student bookings
        const bookings = yield prisma_1.prisma.booking.findMany({ where: { studentId: Number(userId) }, orderBy: { createdAt: 'desc' } });
        res.json({ bookings });
    }
    catch (err) {
        console.error('listBookings error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.listBookings = listBookings;
const respondBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { action } = req.body; // 'accept' | 'decline'
        if (!id || !action)
            return res.status(400).json({ error: 'Missing id or action' });
        // @ts-ignore
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        // ensure the tutor owns the booking
        const booking = yield prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        // find tutor profile for current user
        const tutor = yield prisma_1.prisma.tutorProfile.findUnique({ where: { userId: String(userId) } });
        if (!tutor || tutor.id !== booking.tutorId)
            return res.status(403).json({ error: 'Forbidden' });
        const status = action === 'accept' ? 'ACCEPTED' : action === 'decline' ? 'DECLINED' : booking.status;
        const updated = yield prisma_1.prisma.booking.update({ where: { id }, data: { status } });
        res.json({ booking: updated });
    }
    catch (err) {
        console.error('respondBooking error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.respondBooking = respondBooking;
