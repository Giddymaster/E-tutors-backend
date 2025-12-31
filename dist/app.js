"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const api_routes_1 = __importDefault(require("./routes/api.routes"));
const error_middleware_1 = __importDefault(require("./middleware/error.middleware"));
const messages_routes_1 = __importDefault(require("./routes/messages.routes"));
const cors_middleware_1 = __importDefault(require("./middleware/cors.middleware"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
// Apply CORS
app.use((0, cors_middleware_1.default)());
// Configure body parser
app.use((0, body_parser_1.json)());
app.use((0, body_parser_1.urlencoded)({ extended: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)()); // Add this line before your routes
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api', api_routes_1.default);
app.use('/api/messages', messages_routes_1.default);
// Error handling middleware
app.use(error_middleware_1.default);
exports.default = app;
