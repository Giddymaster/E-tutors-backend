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
const express_1 = require("express");
const assignments_controller_1 = require("../controllers/assignments.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.get('/', assignments_controller_1.listAssignments);
router.post('/', auth_middleware_1.authenticate, assignments_controller_1.createAssignment);
router.get('/:id', assignments_controller_1.getAssignment);
router.post('/:id/proposals', auth_middleware_1.authenticate, assignments_controller_1.createProposal);
router.post('/:id/proposals/:proposalId/accept', auth_middleware_1.authenticate, assignments_controller_1.acceptProposal);
router.delete('/:id/proposals/:proposalId', auth_middleware_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // simple delete endpoint, only proposal owner (tutor) or the student can delete
        const userId = String(req.userId);
        const assignmentId = String(req.params.id);
        const proposalId = String(req.params.proposalId);
        const p = yield prisma_1.prisma.proposal.findUnique({ where: { id: proposalId } });
        if (!p)
            return res.status(404).json({ error: 'Proposal not found' });
        const assignment = yield prisma_1.prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        if (p.tutorId !== userId && assignment.studentId !== userId)
            return res.status(403).json({ error: 'Not authorized' });
        yield prisma_1.prisma.proposal.delete({ where: { id: proposalId } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('delete proposal', err);
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
