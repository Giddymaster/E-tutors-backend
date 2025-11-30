import { Request, Response } from 'express'
import { prisma } from '../prisma'

export const getMessages = async (req: Request, res: Response) => {
  try {
    const msgs = await (prisma as any).supportMessage.findMany({ orderBy: { createdAt: 'asc' } })
    res.json({ messages: msgs })
  } catch (err) {
    console.error('getMessages error', err)
    res.status(500).json({ error: 'Failed to read messages' })
  }
}

export const postMessage = async (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty message' })

    // @ts-ignore
    const userId = req.userId || null
    // @ts-ignore
    const userRole = req.userRole || null

    const message = await (prisma as any).supportMessage.create({ data: { text: text.trim(), userId: userId ? Number(userId) : undefined, userRole: userRole || undefined } })

    // emit socket event
    const io = (req.app as any).locals.io
    if (io) io.emit('support:message', message)

    res.json({ ok: true, message })
  } catch (err) {
    console.error('postMessage error', err)
    res.status(500).json({ error: 'Failed to save message' })
  }
}

export const respondToMessage = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    const { response } = req.body
    if (!response) return res.status(400).json({ error: 'Empty response' })

    // @ts-ignore
    const responderId = req.userId ? Number(req.userId) : undefined

    const updated = await (prisma as any).supportMessage.update({ where: { id }, data: { response, responderId } })

    const io = (req.app as any).locals.io
    if (io) io.emit('support:response', updated)

    res.json({ ok: true, message: updated })
  } catch (err) {
    console.error('respondToMessage error', err)
    res.status(500).json({ error: 'Failed to save response' })
  }
}
