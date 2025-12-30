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
exports.getAssignment = exports.acceptProposal = exports.createProposal = exports.createAssignment = exports.listAssignments = void 0;
const prisma_1 = require("../prisma");
const listAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subject = req.query.subject || undefined;
        const q = req.query.q || undefined;
        const where = {};
        if (subject)
            where.title = { contains: subject, mode: 'insensitive' };
        if (q)
            where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
        const assignments = yield prisma_1.prisma.assignment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { proposals: { include: { tutor: { select: { id: true, name: true } } } } }
        });
        res.json({ assignments });
    }
    catch (err) {
        console.error('listAssignments error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.listAssignments = listAssignments;
const createAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const rawUserId = req.userId;
        if (!rawUserId)
            return res.status(401).json({ error: 'Unauthorized' });
        const userId = String(rawUserId);
        const { title, description, budgetMin, budgetMax, files } = req.body;
        if (!title || !description)
            return res.status(400).json({ error: 'title and description are required' });
        const assignment = yield prisma_1.prisma.assignment.create({
            data: {
                title,
                description,
                files: files || null,
                budgetMin: typeof budgetMin === 'number' ? budgetMin : undefined,
                budgetMax: typeof budgetMax === 'number' ? budgetMax : undefined,
                studentId: userId,
            }
        });
        res.status(201).json({ assignment });
    }
    catch (err) {
        console.error('createAssignment error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.createAssignment = createAssignment;
const createProposal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const rawUserId = req.userId;
        if (!rawUserId)
            return res.status(401).json({ error: 'Unauthorized' });
        const tutorId = String(rawUserId);
        const assignmentId = String(req.params.id);
        const { amount, message, deliveryDays } = req.body;
        if (!amount)
            return res.status(400).json({ error: 'amount is required' });
        const assignment = yield prisma_1.prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        // Create proposal
        const proposal = yield prisma_1.prisma.proposal.create({
            data: {
                jobId: assignmentId,
                tutorId: tutorId,
                amount: Number(amount),
                message: message || null,
                deliveryDays: typeof deliveryDays === 'number' ? deliveryDays : null,
            },
            include: { tutor: { select: { id: true, name: true } } }
        });
        res.status(201).json({ proposal });
    }
    catch (err) {
        console.error('createProposal error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.createProposal = createProposal;
const acceptProposal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const rawUserId = req.userId;
        if (!rawUserId)
            return res.status(401).json({ error: 'Unauthorized' });
        const studentId = String(rawUserId);
        const assignmentId = String(req.params.id);
        const proposalId = String(req.params.proposalId);
        const assignment = yield prisma_1.prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.studentId !== studentId)
            return res.status(403).json({ error: 'Only the posting student can accept proposals' });
        const proposal = yield prisma_1.prisma.proposal.findUnique({ where: { id: proposalId } });
        if (!proposal)
            return res.status(404).json({ error: 'Proposal not found' });
        yield prisma_1.prisma.proposal.updateMany({ where: { jobId: assignmentId, id: { not: proposalId } }, data: { status: 'REJECTED' } });
        yield prisma_1.prisma.proposal.update({ where: { id: proposalId }, data: { status: 'ACCEPTED' } });
        yield prisma_1.prisma.assignment.update({ where: { id: assignmentId }, data: { tutorId: proposal.tutorId, status: 'ASSIGNED' } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('acceptProposal error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.acceptProposal = acceptProposal;
const getAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignmentId = String(req.params.id);
        const assignment = yield prisma_1.prisma.assignment.findUnique({ where: { id: assignmentId }, include: { proposals: true } });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        res.json({ assignment });
    }
    catch (err) {
        console.error('getAssignment error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getAssignment = getAssignment;
