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

// CORS: allow credentials and a configurable origin for the client.
// By default in development we use the explicit CLIENT_ORIGIN or localhost.
// In production, if CLIENT_ORIGIN is not set, we accept the browser request's
// `Origin` only when its hostname matches the server's hostname. This allows
// the frontend to be hosted on the same domain (or reverse-proxied) without
// requiring an env var while avoiding a wildcard-open policy.
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use((req, res, next) => {
	// If an explicit CLIENT_ORIGIN is configured, use it.
	if (process.env.CLIENT_ORIGIN) {
		return cors({ origin: process.env.CLIENT_ORIGIN, credentials: true })(req, res, next)
	}

	// If not in production, fall back to the configured default (localhost).
	if (process.env.NODE_ENV !== 'production') {
		return cors({ origin: clientOrigin, credentials: true })(req, res, next)
	}

	// Production + no CLIENT_ORIGIN: allow the request's Origin only if it
	// matches the server's hostname. This is a conservative and secure default
	// for deployments where the client is served from the same domain.
	const origin = req.headers.origin as string | undefined
	if (!origin) {
		// Non-browser request or same-origin request without Origin header.
		return cors({ origin: false, credentials: true })(req, res, next)
	}

	try {
		const parsed = new URL(origin)
		// req.hostname comes from the Host header and excludes the port.
		const reqHost = req.hostname
		if (parsed.hostname === reqHost) {
			return cors({ origin: origin, credentials: true })(req, res, next)
		}
	} catch (e) {
		// If parsing fails, fall through to deny CORS.
	}

	// Deny by default when origin does not match.
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

// Simple debug endpoint
app.get('/api/debug', (req, res) => {
	res.json({ ok: true, env: { googleRedirect: process.env.GOOGLE_REDIRECT ? 'set' : 'unset', jwt: process.env.JWT_SECRET ? 'set' : 'unset' } })
})

app.get('/', (req, res) => res.json({ ok: true, message: 'Excellent Tutors API' }))

// If the client has been built, serve it as static assets from /client/dist
// This makes it easy to deploy server + client together: build the client
// (client/dist) and the server will serve the files. We check for existence
// so dev servers without a built client continue to work.
const clientDistPath = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDistPath)) {
	app.use(express.static(clientDistPath))
	// Send index.html for any other route (client-side routing)
	app.get('*', (req, res) => {
		res.sendFile(path.join(clientDistPath, 'index.html'))
	})
}

export default app
