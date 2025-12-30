"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const api_routes_1 = __importDefault(require("./routes/api.routes"));
const error_middleware_1 = __importDefault(require("./middleware/error.middleware"));
const messages_routes_1 = __importDefault(require("./routes/messages.routes"));
const app = (0, express_1.default)();
// Configure CORS for production to allow credentials from frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || '';
if (FRONTEND_URL) {
    app.use((0, cors_1.default)({ origin: FRONTEND_URL, credentials: true }));
}
else {
    // default to permissive CORS in development
    app.use((0, cors_1.default)());
}
app.use((0, body_parser_1.json)());
app.use((0, body_parser_1.urlencoded)({ extended: true }));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api', api_routes_1.default);
app.use('/api/messages', messages_routes_1.default);
// Error handling middleware
app.use(error_middleware_1.default);
exports.default = app;
