"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidation = exports.loginValidators = exports.registerValidators = void 0;
const express_validator_1 = require("express-validator");
const registerValidators = () => [
    (0, express_validator_1.body)('name').isString().trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isString()
        .isLength({ min: 8, max: 15 })
        .withMessage('Password must be 8-15 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .withMessage('Password must include uppercase, lowercase, and a number'),
    // optional role field: must match Prisma Role enum values when provided
    (0, express_validator_1.body)('role').optional().isIn(['STUDENT', 'TUTOR', 'ADMIN', 'SUPPORT']).withMessage('Invalid role'),
];
exports.registerValidators = registerValidators;
const loginValidators = () => [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isString().notEmpty().withMessage('Password is required'),
];
exports.loginValidators = loginValidators;
const runValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    next();
};
exports.runValidation = runValidation;
