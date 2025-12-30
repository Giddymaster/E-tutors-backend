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
exports.googleCallback = exports.googleAuth = exports.logout = exports.refreshToken = exports.me = exports.login = exports.register = void 0;
const prisma_1 = require("../prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const existing = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: 'Email already in use' });
        const hashed = yield bcrypt_1.default.hash(password, 10);
        // Normalize and validate role (Prisma expects enum values like 'STUDENT', 'TUTOR')
        let roleValue = undefined;
        if (role && typeof role === 'string') {
            const up = role.toUpperCase();
            if (['STUDENT', 'TUTOR', 'ADMIN', 'SUPPORT'].includes(up)) {
                roleValue = up;
            }
            else {
                return res.status(400).json({ error: 'Invalid role' });
            }
        }
        // Prisma model uses `passwordHash`
        const createData = { name, email, passwordHash: hashed };
        if (roleValue)
            createData.role = roleValue;
        const user = yield prisma_1.prisma.user.create({ data: createData });
        // Ensure a student profile exists for STUDENT users (creates a lightweight profile record)
        try {
            if ((user.role || 'STUDENT') === 'STUDENT') {
                yield prisma_1.prisma.studentProfile.create({ data: { userId: user.id } }).catch(() => { });
            }
        }
        catch (e) {
            // ignore profile creation errors; profile can be created later via upsert endpoint
        }
        // Issue short-lived access token and a refresh token stored as httpOnly cookie
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Store only the hashed token in DB (model expects tokenHash)
        yield prisma_1.prisma.refreshToken.create({ data: { tokenHash: refreshTokenHash, userId: user.id, expiresAt: refreshExpiry } });
        // set cookie (raw token sent to client)
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry });
        res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (err) {
        // Log stack for debugging
        console.error(err instanceof Error ? err.stack : err);
        // TEMP: include message in response to aid debugging; remove this before returning to production
        res.status(500).json({ error: 'Server error', detail: err instanceof Error ? err.message : String(err) });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Missing email or password' });
        const user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        // Ensure we compare against the stored password hash field
        if (!user.passwordHash)
            return res.status(401).json({ error: 'Invalid credentials' });
        const match = yield bcrypt_1.default.compare(password, user.passwordHash);
        if (!match)
            return res.status(401).json({ error: 'Invalid credentials' });
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Store hashed token only
        yield prisma_1.prisma.refreshToken.create({ data: { tokenHash: refreshTokenHash, userId: user.id, expiresAt: refreshExpiry } });
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry });
        res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.login = login;
const me = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const user = yield prisma_1.prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true, name: true, email: true, role: true } });
    res.json({ user });
});
exports.me = me;
// Refresh access token using refresh cookie
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cookie = (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]);
        if (!cookie)
            return res.status(401).json({ error: 'No refresh token' });
        // hash incoming cookie before lookup
        const cookieHash = crypto_1.default.createHash('sha256').update(cookie).digest('hex');
        const stored = yield prisma_1.prisma.refreshToken.findFirst({ where: { tokenHash: cookieHash } });
        if (!stored)
            return res.status(401).json({ error: 'Invalid refresh token' });
        if (stored.expiresAt < new Date()) {
            // delete expired token(s) by hash
            yield prisma_1.prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } });
            return res.status(401).json({ error: 'Refresh token expired' });
        }
        const user = yield prisma_1.prisma.user.findUnique({ where: { id: stored.userId } });
        if (!user)
            return res.status(401).json({ error: 'User not found' });
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        // optionally rotate refresh token
        const newRefresh = crypto_1.default.randomBytes(40).toString('hex');
        const newRefreshHash = crypto_1.default.createHash('sha256').update(newRefresh).digest('hex');
        const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        yield prisma_1.prisma.refreshToken.create({ data: { tokenHash: newRefreshHash, userId: user.id, expiresAt: refreshExpiry } });
        // remove old hashed token
        yield prisma_1.prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } });
        res.cookie(REFRESH_TOKEN_COOKIE, newRefresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry });
        res.json({ token: accessToken });
    }
    catch (err) {
        console.error('refreshToken error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cookie = (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]);
        if (cookie) {
            const cookieHash = crypto_1.default.createHash('sha256').update(cookie).digest('hex');
            yield prisma_1.prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } }).catch(() => { });
        }
        res.clearCookie(REFRESH_TOKEN_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        return res.json({ ok: true });
    }
    catch (err) {
        console.error('logout error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.logout = logout;
// Google OAuth handlers
const strip = (s) => (s ? s.replace(/^"(.*)"$/, '$1').trim() : s);
const GOOGLE_CLIENT_ID = strip(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = strip(process.env.GOOGLE_CLIENT_SECRET);
const GOOGLE_REDIRECT = strip(process.env.GOOGLE_REDIRECT) || 'http://localhost:4000/api/auth/google/callback';
const CLIENT_OAUTH_REDIRECT = strip(process.env.CLIENT_OAUTH_REDIRECT) || 'http://localhost:5173/oauth/callback';
const googleAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!GOOGLE_CLIENT_ID) {
        const msg = '<h1>Google OAuth not configured</h1><p>Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your server environment.</p>';
        return res.status(500).send(msg);
    }
    // include prompt and access_type for a consistent consent experience
    const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&access_type=offline&prompt=consent`;
    console.log('Redirecting user to Google OAuth URL:', redirectUri);
    res.redirect(redirectUri);
});
exports.googleAuth = googleAuth;
const googleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const code = req.query.code;
        if (!code)
            return res.status(400).json({ error: 'Missing code' });
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
            return res.status(500).json({ error: 'Google OAuth not configured' });
        // Exchange code for tokens
        const tokenRes = yield fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT,
                grant_type: 'authorization_code'
            })
        });
        const tokenJson = yield tokenRes.json();
        if (!tokenRes.ok) {
            console.error('Google token exchange failed', tokenJson);
            const html = `<h1>Google token exchange failed</h1><pre>${JSON.stringify(tokenJson, null, 2)}</pre>`;
            return res.status(500).send(html);
        }
        const idToken = tokenJson.id_token;
        if (!idToken)
            return res.status(400).json({ error: 'No id_token received' });
        // Decode ID token (it's a JWT) to get user info payload without verifying here
        const parts = idToken.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const email = payload.email;
        const name = payload.name || payload.given_name || 'Google User';
        if (!email)
            return res.status(400).json({ error: 'No email in token' });
        // Find existing user or create a new one
        let user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-12);
            const hashed = yield bcrypt_1.default.hash(randomPassword, 10);
            // Use `passwordHash` to match Prisma schema
            user = yield prisma_1.prisma.user.create({ data: { name, email, passwordHash: hashed, role: 'STUDENT' } });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        // Redirect to frontend with token as query param
        return res.redirect(`${CLIENT_OAUTH_REDIRECT}?token=${encodeURIComponent(token)}`);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'OAuth callback error' });
    }
});
exports.googleCallback = googleCallback;
