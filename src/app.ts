import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import tutorRoutes from './routes/tutorRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Simple request logger for debugging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
	next()
})

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tutors', tutorRoutes)

// Simple debug endpoint
app.get('/api/debug', (req, res) => {
	res.json({ ok: true, env: { googleRedirect: process.env.GOOGLE_REDIRECT ? 'set' : 'unset', jwt: process.env.JWT_SECRET ? 'set' : 'unset' } })
})

app.get('/', (req, res) => res.json({ ok: true, message: 'Excellent Tutors API' }))

export default app
