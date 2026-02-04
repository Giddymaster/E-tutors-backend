import 'dotenv/config';
import { prisma } from './prisma';
import app from './app';

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || ''

if (FRONTEND_URL) console.log(`FRONTEND_URL = ${FRONTEND_URL}`)

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

  // initialize WebSocket server for live session heartbeat and notifications
  try {
    // lazy import to avoid circular deps
    import('./services/websocket.service')
      .then(({ initWebSocketServer }) => {
        initWebSocketServer(srv)
        console.log('WebSocket server initialized')
      })
      .catch((err) => {
        console.warn('Failed to initialize WebSocket server:', err)
      })

  } catch (err) {
    console.warn('Failed to initialize WebSocket server (try/catch):', err)
  }
  srv.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use — trying ${port + 1}`)
      setTimeout(() => startServer(port + 1), 100)
      return
    }
    throw err
  })
}