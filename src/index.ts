import express from 'express';
import mongoose from 'mongoose';
import { json } from 'body-parser';
import { authRoutes } from './routes/auth.routes';
import { apiRoutes } from './routes/api.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Database connection
mongoose.connect(process.env.MONGODB_URI as string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})
.catch(err => {
    console.error('Database connection error:', err);
});