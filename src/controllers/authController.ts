import { Request, Response } from 'express'
import { prisma } from '../prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const REFRESH_TOKEN_COOKIE = 'refreshToken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)

    // Normalize and validate role (Prisma expects enum values like 'STUDENT', 'TUTOR')
    let roleValue: any = undefined
    if (role && typeof role === 'string') {
      const up = role.toUpperCase()
      if (['STUDENT', 'TUTOR', 'ADMIN', 'SUPPORT'].includes(up)) {
        roleValue = up
      } else {
        return res.status(400).json({ error: 'Invalid role' })
      }
    }

    // Prisma model uses `passwordHash`
    const createData: any = { name, email, passwordHash: hashed }
    if (roleValue) createData.role = roleValue

    const user = await prisma.user.create({ data: createData })

    // Issue short-lived access token and a refresh token stored as httpOnly cookie
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store only the hashed token in DB (model expects tokenHash)
    await prisma.refreshToken.create({ data: { tokenHash: refreshTokenHash, userId: user.id, expiresAt: refreshExpiry } })

    // set cookie (raw token sent to client)
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry })
    res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    // Ensure we compare against the stored password hash field
    if (!user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store hashed token only
    await prisma.refreshToken.create({ data: { tokenHash: refreshTokenHash, userId: user.id, expiresAt: refreshExpiry } })

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry })
    res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const me = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true, name: true, email: true, role: true } })
  res.json({ user })
}

// Refresh access token using refresh cookie
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const cookie = (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]) as string | undefined
    if (!cookie) return res.status(401).json({ error: 'No refresh token' })

    // hash incoming cookie before lookup
    const cookieHash = crypto.createHash('sha256').update(cookie).digest('hex')

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: cookieHash } })
    if (!stored) return res.status(401).json({ error: 'Invalid refresh token' })
    if (stored.expiresAt < new Date()) {
      // delete expired token(s) by hash
      await prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } })
      return res.status(401).json({ error: 'Refresh token expired' })
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) return res.status(401).json({ error: 'User not found' })

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
    // optionally rotate refresh token
    const newRefresh = crypto.randomBytes(40).toString('hex')
    const newRefreshHash = crypto.createHash('sha256').update(newRefresh).digest('hex')
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.refreshToken.create({ data: { tokenHash: newRefreshHash, userId: user.id, expiresAt: refreshExpiry } })
    // remove old hashed token
    await prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } })

    res.cookie(REFRESH_TOKEN_COOKIE, newRefresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: refreshExpiry })
    res.json({ token: accessToken })
  } catch (err) {
    console.error('refreshToken error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    const cookie = (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]) as string | undefined
    if (cookie) {
      const cookieHash = crypto.createHash('sha256').update(cookie).digest('hex')
      await prisma.refreshToken.deleteMany({ where: { tokenHash: cookieHash } }).catch(() => {})
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('logout error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// Google OAuth handlers
const strip = (s?: string) => (s ? s.replace(/^"(.*)"$/, '$1').trim() : s)
const GOOGLE_CLIENT_ID = strip(process.env.GOOGLE_CLIENT_ID)
const GOOGLE_CLIENT_SECRET = strip(process.env.GOOGLE_CLIENT_SECRET)
const GOOGLE_REDIRECT = strip(process.env.GOOGLE_REDIRECT) || 'http://localhost:4000/api/auth/google/callback'
const CLIENT_OAUTH_REDIRECT = strip(process.env.CLIENT_OAUTH_REDIRECT) || 'http://localhost:5173/oauth/callback'

export const googleAuth = async (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    const msg = '<h1>Google OAuth not configured</h1><p>Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your server environment.</p>'
    return res.status(500).send(msg)
  }
  // include prompt and access_type for a consistent consent experience
  const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&access_type=offline&prompt=consent`
  console.log('Redirecting user to Google OAuth URL:', redirectUri)
  res.redirect(redirectUri)
}

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string
    if (!code) return res.status(400).json({ error: 'Missing code' })
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return res.status(500).json({ error: 'Google OAuth not configured' })

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT,
        grant_type: 'authorization_code'
      })
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('Google token exchange failed', tokenJson)
      const html = `<h1>Google token exchange failed</h1><pre>${JSON.stringify(tokenJson, null, 2)}</pre>`
      return res.status(500).send(html)
    }
    const idToken = tokenJson.id_token
    if (!idToken) return res.status(400).json({ error: 'No id_token received' })

    // Decode ID token (it's a JWT) to get user info payload without verifying here
    const parts = idToken.split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    const email = payload.email
    const name = payload.name || payload.given_name || 'Google User'

    if (!email) return res.status(400).json({ error: 'No email in token' })

    // Find existing user or create a new one
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-12)
      const hashed = await bcrypt.hash(randomPassword, 10)
      // Use `passwordHash` to match Prisma schema
      user = await prisma.user.create({ data: { name, email, passwordHash: hashed, role: 'STUDENT' } })
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    // Redirect to frontend with token as query param
    return res.redirect(`${CLIENT_OAUTH_REDIRECT}?token=${encodeURIComponent(token)}`)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'OAuth callback error' })
  }
}
