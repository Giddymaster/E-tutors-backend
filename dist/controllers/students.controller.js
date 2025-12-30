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
exports.updateMyStudent = exports.upsertMyStudent = exports.getMyStudent = void 0;
const prisma_1 = require("../prisma");
const getMyStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const rawUserId = req.userId;
        if (!rawUserId)
            return res.status(401).json({ error: 'Unauthorized' });
        const userId = String(rawUserId);
        const student = yield prisma_1.prisma.studentProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, name: true, email: true } } } });
        if (!student)
            return res.status(404).json({ error: 'No student profile' });
        res.json({ student });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getMyStudent = getMyStudent;
const upsertMyStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const rawUserId = req.userId;
        if (!rawUserId)
            return res.status(401).json({ error: 'Unauthorized' });
        const userId = String(rawUserId);
        const { major, year, interests, preferredSubjects, bio, timezone, phone, availability } = req.body;
        const payload = {};
        if (major !== undefined)
            payload.major = major;
        if (year !== undefined)
            payload.year = year;
        if (interests !== undefined)
            payload.interests = Array.isArray(interests) ? interests.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [];
        if (preferredSubjects !== undefined)
            payload.preferredSubjects = Array.isArray(preferredSubjects) ? preferredSubjects.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [];
        if (bio !== undefined)
            payload.bio = bio;
        if (timezone !== undefined)
            payload.timezone = timezone;
        if (phone !== undefined)
            payload.phone = phone;
        if (availability !== undefined)
            payload.availability = availability;
        // Atomic upsert
        const student = yield prisma_1.prisma.studentProfile.upsert({
            where: { userId },
            create: Object.assign({ userId }, payload),
            update: payload,
        });
        res.json({ student });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.upsertMyStudent = upsertMyStudent;
// add this alias so routes importing `updateMyStudent` find a valid handler
exports.updateMyStudent = exports.upsertMyStudent;
