import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/client';
import { json } from 'body-parser';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';
import errorMiddleware from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Database connection (Prisma + Postgres)
const prisma = new PrismaClient();

const databaseUrl = process.env.DATABASE_URL || process.env.PG_URI || process.env.PGURL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Set DATABASE_URL in .env or environment');
  process.exit(1);
}

prisma.$connect()
  .then(() => {
    console.log('Connected to Postgres via Prisma');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});