import { Request, Response } from 'express'
import { prisma } from '../prisma'

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).userId)

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ studentId: userId }, { tutorId: userId }],
      },
      include: {
        proposal: { include: { tutor: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ conversations })
  } catch (err) {
    console.error('getConversations error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).userId)
    const conversationId = String(req.params.conversationId)

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
      },
    })

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    if (conversation.studentId !== userId && conversation.tutorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    res.json({ conversation })
  } catch (err) {
    console.error('getConversation error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).userId)
    const conversationId = String(req.params.conversationId)
    const { content } = req.body

    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' })

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    if (conversation.studentId !== userId && conversation.tutorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
      },
      include: { sender: { select: { id: true, name: true } } },
    })

    res.status(201).json({ message })
  } catch (err) {
    console.error('sendMessage error', err)
    res.status(500).json({ error: 'Server error' })
  }
}