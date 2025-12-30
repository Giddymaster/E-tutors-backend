"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tutors_controller_1 = require("../controllers/tutors.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const students_controller_1 = require("../controllers/students.controller");
const payments_controller_1 = require("../controllers/payments.controller");
const router = (0, express_1.Router)();
// Tutor routes
router.post('/tutors', auth_middleware_1.authenticate, tutors_controller_1.createTutor);
router.get('/tutors', tutors_controller_1.getTutors);
// Get tutor by id (public)
const tutors_controller_2 = require("../controllers/tutors.controller");
router.get('/tutors/:id', tutors_controller_2.getTutorById);
router.get('/tutors/me', auth_middleware_1.authenticate, tutors_controller_1.getMyTutor);
router.put('/tutors/:id', tutors_controller_1.updateMyTutor);
// router.delete('/tutors/:id', deleteMyTutor);
// Payments (demo)
router.post('/payments/process', payments_controller_1.processPayment);
// Assignments & proposals
const assignments_routes_1 = __importDefault(require("./assignments.routes"));
router.use('/assignments', assignments_routes_1.default);
// Bookings
const bookings_routes_1 = __importDefault(require("./bookings.routes"));
router.use('/bookings', bookings_routes_1.default);
// Student routes
// router.post('/students', createMyStudent);
router.get('/students', students_controller_1.getMyStudent);
router.put('/students/:id', students_controller_1.updateMyStudent);
// router.delete('/students/:id', deleteMyStudent);
exports.default = router;
