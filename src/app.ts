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
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Simple request logger for debugging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
	next()
})

// CORS: allow credentials and a configurable origin for the client
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(cookieParser())
app.use(helmet())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tutors', tutorRoutes)
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
