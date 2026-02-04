import express from 'express';
import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import  authRoutes  from './routes/auth.routes';
import  apiRoutes  from './routes/api.routes';
import  errorHandler  from './middleware/error.middleware';
import messagesRouter from './routes/messages.routes'
import cookieParser from 'cookie-parser'
import { monitorActiveSessionsAndEnforceBilling } from './services/ai-tutor.service'

const app = express()

// Apply CORS - allow dev frontend and support credentials for cookies
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173'
const allowedOrigins = [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']

app.use(cors({
	origin: (origin, callback) => {
		if (!origin) return callback(null, true)
		if (allowedOrigins.includes(origin)) return callback(null, true)
		return callback(new Error(`CORS origin not allowed: ${origin}`))
	},
	credentials: true,
	methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
	allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}))
// Ensure preflight responses include CORS headers
app.options('*', cors({ origin: allowedOrigins, credentials: true }))

// Configure body parser
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(express.json())
app.use(cookieParser())  // Add this line before your routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/messages', messagesRouter)

// Error handling middleware
app.use(errorHandler);

// Start periodic monitor for active AI sessions (runs every 60 seconds)
setInterval(() => {
	monitorActiveSessionsAndEnforceBilling().catch((err) => console.error('monitor error:', err))
}, 60 * 1000)

export default app;