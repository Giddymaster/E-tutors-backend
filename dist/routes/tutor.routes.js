"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tutors_controller_1 = require("../controllers/tutors.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// List and create
router.get('/', tutors_controller_1.getTutors);
router.post('/', auth_middleware_1.authenticate, tutors_controller_1.createTutor);
// Authenticated routes for current user
router.get('/me', auth_middleware_1.authenticate, tutors_controller_1.getMyTutor);
router.patch('/me', auth_middleware_1.authenticate, tutors_controller_1.updateMyTutor);
// Get single tutor by id (placed after collection routes to avoid accidental conflicts)
router.get('/:id', tutors_controller_1.getTutorById);
exports.default = router;
