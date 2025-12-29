import 'dotenv/config';
import express from 'express';
import { prisma } from './prisma';
import { json } from 'body-parser';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';
import errorMiddleware from './middleware/error.middleware';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Database connection (Prisma + Postgres) — using shared `prisma` from ./prisma

const databaseUrl = process.env.DATABASE_URL || process.env.PG_URI || process.env.PGURL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Set DATABASE_URL in .env or environment');
  process.exit(1);
}

prisma.$connect()
  .then(() => {
    console.log('Connected to Postgres via Prisma');
    // Start the HTTP server after DB is connected
    startServer(PORT);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const startServer = (port: number) => {
  const srv = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })

  srv.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use — trying ${port + 1}`)
      setTimeout(() => startServer(port + 1), 100)
      return
    }
    throw err
  })
}