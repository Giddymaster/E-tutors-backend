"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = exports.generateUniqueId = exports.formatDate = void 0;
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
exports.formatDate = formatDate;
const generateUniqueId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9);
};
exports.generateUniqueId = generateUniqueId;
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
exports.validateEmail = validateEmail;
