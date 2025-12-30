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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("./prisma");
const app_1 = __importDefault(require("./app"));
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || '';
if (FRONTEND_URL)
    console.log(`FRONTEND_URL = ${FRONTEND_URL}`);
// Database connection (Prisma + Postgres) — using shared `prisma` from ./prisma
const databaseUrl = process.env.DATABASE_URL || process.env.PG_URI || process.env.PGURL;
if (!databaseUrl) {
    console.error('Missing DATABASE_URL. Set DATABASE_URL in .env or environment');
    process.exit(1);
}
prisma_1.prisma.$connect()
    .then(() => {
    console.log('Connected to Postgres via Prisma');
    // Start the HTTP server after DB is connected
    startServer(PORT);
})
    .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
});
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.$disconnect();
    process.exit(0);
}));
const startServer = (port) => {
    const srv = app_1.default.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
    srv.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} in use — trying ${port + 1}`);
            setTimeout(() => startServer(port + 1), 100);
            return;
        }
        throw err;
    });
};
