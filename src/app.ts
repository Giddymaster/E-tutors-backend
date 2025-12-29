import express from 'express';
import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import  authRoutes  from './routes/auth.routes';
import  apiRoutes  from './routes/api.routes';
import  errorHandler  from './middleware/error.middleware';
import messagesRouter from './routes/messages.routes'

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/messages', messagesRouter)

// Error handling middleware
app.use(errorHandler);

export default app;