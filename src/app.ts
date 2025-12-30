import express from 'express';
import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import  authRoutes  from './routes/auth.routes';
import  apiRoutes  from './routes/api.routes';
import  errorHandler  from './middleware/error.middleware';
import messagesRouter from './routes/messages.routes'
import getCorsConfig from './middleware/cors.middleware'
import cookieParser from 'cookie-parser'

const app = express()

// Apply CORS
app.use(getCorsConfig())

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

export default app;