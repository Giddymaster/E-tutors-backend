import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import authRoutes from './routes/authRoutes'
import tutorRoutes from './routes/tutorRoutes'
import supportRoutes from './routes/supportRoutes'
import bookingRoutes from './routes/bookingRoutes'
import studentRoutes from './routes/studentRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Simple request logger for debugging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
	next()
})

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || ''
const allowedOrigins = rawOrigins
	.split(',')
	.map(s => s.trim())
	.filter(Boolean)

app.use((req, res, next) => {
	const origin = req.headers.origin as string | undefined

	if (allowedOrigins.length > 0) {
		if (!origin) return cors({ origin: false, credentials: true })(req, res, next)

		// Exact match check
		if (allowedOrigins.includes(origin)) {
			return cors({ origin: origin, credentials: true })(req, res, next)
		}

		try {
			const parsed = new URL(origin)
			const host = parsed.hostname
			for (const entry of allowedOrigins) {
				if (entry.startsWith('.')) {
					const suffix = entry.slice(1)
					if (host === suffix || host.endsWith('.' + suffix)) {
						return cors({ origin: origin, credentials: true })(req, res, next)
					}
				}
			}
		} catch (e) {
			// ignore parse errors
		}

		return cors({ origin: false, credentials: true })(req, res, next)
	}

	if (process.env.NODE_ENV !== 'production') {
		return cors({ origin: clientOrigin, credentials: true })(req, res, next)
	}

	if (!origin) {
		return cors({ origin: false, credentials: true })(req, res, next)
	}

	try {
		const parsed = new URL(origin)
		const reqHost = req.hostname
		if (parsed.hostname === reqHost) {
			return cors({ origin: origin, credentials: true })(req, res, next)
		}
	} catch (e) {
		// parsing failed, deny
	}

	return cors({ origin: false, credentials: true })(req, res, next)
})
app.use(cookieParser())
app.use(helmet())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tutors', tutorRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/bookings', bookingRoutes)

app.get('/api/debug', (req, res) => {
	res.json({ ok: true, env: { googleRedirect: process.env.GOOGLE_REDIRECT ? 'set' : 'unset', jwt: process.env.JWT_SECRET ? 'set' : 'unset' } })
})

app.get('/', (req, res) => res.json({ ok: true, message: 'Excellent Tutors API' }))

const clientDistPath = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDistPath)) {
	app.use(express.static(clientDistPath))
	app.get('*', (req, res) => {
		res.sendFile(path.join(clientDistPath, 'index.html'))
	})
}

export default app
