import app from './app'
import dotenv from 'dotenv'
import * as http from 'http'
import * as socketIO from 'socket.io'

dotenv.config()

// Check for critical environment variables and warn if missing
if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not set. Prisma will fail to connect without it.')
}
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using a default secret is insecure for production.')
}

const PORT = process.env.PORT || 4000

const server = http.createServer(app)

const io = (new (socketIO as any).Server(server, { cors: { origin: '*' } })) as socketIO.Server

(app as any).locals.io = io

io.on('connection', (socket: socketIO.Socket) => {
  console.log('Socket connected', socket.id)
  socket.on('disconnect', () => console.log('Socket disconnected', socket.id))
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
