"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const students_controller_1 = require("../controllers/students.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/me', auth_middleware_1.authenticate, students_controller_1.getMyStudent);
router.patch('/me', auth_middleware_1.authenticate, students_controller_1.updateMyStudent);
exports.default = router;
