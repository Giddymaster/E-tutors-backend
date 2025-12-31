"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/middleware/cors.middleware.ts
const cors_1 = __importDefault(require("cors"));
const getCorsConfig = () => {
    const FRONTEND_URL = process.env.FRONTEND_URL;
    const NODE_ENV = process.env.NODE_ENV || 'development';
    // Define allowed origins based on environment
    const allowedOrigins = {
        production: [FRONTEND_URL].filter(Boolean),
        staging: [
            'https://staging.tutors-frontend.vercel.app',
            FRONTEND_URL
        ].filter(Boolean),
        development: [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173'
        ]
    };
    const origins = allowedOrigins[NODE_ENV] || allowedOrigins.development;
    // Validate that we have origins for production
    if (NODE_ENV === 'production' && origins.length === 0) {
        console.error('❌ CORS ERROR: FRONTEND_URL not set in production!');
        process.exit(1);
    }
    return (0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) {
                return callback(null, true);
            }
            if (origins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS origin not allowed: ${origin}`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'], // If you use pagination
        maxAge: 3600, // Cache preflight for 1 hour
    });
};
exports.default = getCorsConfig;
