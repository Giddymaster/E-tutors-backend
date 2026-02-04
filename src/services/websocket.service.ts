import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma'
import { walletService } from './wallet.service'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

const sessionSockets: Map<string, Set<WebSocket>> = new Map()

export function broadcastToSession(sessionId: string, payload: any) {
  const set = sessionSockets.get(sessionId)
  if (!set) return
  const data = JSON.stringify(payload)
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data)
  }
}

export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req) => {
    try {
      const url = req.url || ''
      const base = `http://${req.headers.host}`
      const params = new URL(url, base).searchParams
      const token = params.get('token')
      const sessionId = params.get('sessionId')

      if (!token) {
        ws.close(1008, 'No token')
        return
      }

      let decoded: any
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any
      } catch (err) {
        ws.close(1008, 'Invalid token')
        return
      }

      const userId = String(decoded.userId)

      // Associate socket with sessionId (if provided)
      if (sessionId) {
        if (!sessionSockets.has(sessionId)) sessionSockets.set(sessionId, new Set())
        sessionSockets.get(sessionId)!.add(ws)
      }

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(String(raw))
          if (msg?.type === 'heartbeat' && msg.sessionId) {
            const sid = String(msg.sessionId)
            // Update in-memory last-active map (optional)
            // Check session status and wallet availability
            const sess = await prisma.aISession.findUnique({ where: { id: sid }, include: { user: { select: { id: true, walletBalance: true } } } })
            if (!sess) return
            const walletBalance = Number(sess.user?.walletBalance || 0)
            const minutesAvailable = Math.max(0, Math.floor(walletBalance * 6))
            const secondsAvailable = minutesAvailable * 60
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(sess.createdAt).getTime()) / 1000))

            // If elapsed time exceeds available seconds
            const bookingTx = await prisma.walletTransaction.findFirst({ where: { relatedId: sid, type: 'debit', description: { contains: 'booking' } } })

            if (elapsedSeconds > secondsAvailable) {
              if (bookingTx) {
                // Notify user that booked time has lapsed
                const notice = { type: 'booking_lapsed', sessionId: sid, message: 'Your booked time has lapsed. Extend or end the session.' }
                broadcastToSession(sid, notice)
              } else {
                // Charge up to available seconds and end session
                const chargeSeconds = Math.max(0, secondsAvailable)
                const amount = Number(((chargeSeconds / 3600) * 10).toFixed(2))
                if (amount > 0) {
                  try {
                    await walletService.deductFunds(sess.user.id, amount, 'ai_tutor', sid, `AI tutoring: ${Math.ceil(chargeSeconds/60)} minutes`)
                  } catch (err) {
                    // insufficient funds — just end without charging
                  }
                }
                await prisma.aISession.updateMany({ where: { id: sid, userId: sess.user.id }, data: { status: 'COMPLETED', endedAt: new Date() } })
                await prisma.aIMessage.create({ data: { sessionId: sid, userId: sess.user.id, role: 'assistant', content: 'Session ended due to exhausted balance.', credits: 0 } })
                broadcastToSession(sid, { type: 'session_ended', sessionId: sid, charged: amount })
              }
            }
          }
        } catch (err) {
          // ignore
        }
      })

      ws.on('close', () => {
        if (sessionId) {
          const set = sessionSockets.get(sessionId)
          if (set) {
            set.delete(ws)
            if (set.size === 0) sessionSockets.delete(sessionId)
          }
        }
      })
    } catch (err) {
      // swallow
    }
  })
}

export default { initWebSocketServer, broadcastToSession }
