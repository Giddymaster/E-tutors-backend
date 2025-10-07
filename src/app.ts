import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import tutorRoutes from './routes/tutorRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tutors', tutorRoutes)

app.get('/', (req, res) => res.json({ ok: true, message: 'Excellent Tutors API' }))

export default app
