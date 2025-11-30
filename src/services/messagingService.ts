import { prisma }  from '../prisma'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  is_deleted: boolean
  created_at: string
}

export interface Conversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
}

export class MessagingService {
  async getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation> {
    const rows = (await prisma.$queryRaw<
      Conversation[]
    >`SELECT * FROM "conversations" WHERE (participant_1_id = ${userId} AND participant_2_id = ${otherUserId}) OR (participant_1_id = ${otherUserId} AND participant_2_id = ${userId}) LIMIT 1`) || []

    if (rows.length > 0) return rows[0]

    const inserted = (await prisma.$queryRaw<
      Conversation[]
    >`INSERT INTO "conversations" (participant_1_id, participant_2_id, created_at) VALUES (${userId}, ${otherUserId}, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to create conversation')
    return inserted[0]
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const rows = (await prisma.$queryRaw<
      Conversation[]
    >`SELECT * FROM "conversations" WHERE participant_1_id = ${userId} OR participant_2_id = ${userId} ORDER BY last_message_at DESC`) || []
    return rows
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const rows = (await prisma.$queryRaw<
      Message[]
    >`SELECT * FROM "messages" WHERE conversation_id = ${conversationId} AND is_deleted = false ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) || []
    return rows.reverse()
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const inserted = (await prisma.$queryRaw<
      Message[]
    >`INSERT INTO "messages" (conversation_id, sender_id, content, created_at) VALUES (${conversationId}, ${senderId}, ${content}, now()) RETURNING *`) || []

    if (inserted.length === 0) throw new Error('Failed to send message')

    await prisma.$executeRaw`UPDATE "conversations" SET last_message_at = now(), last_message_preview = substring(${content} from 1 for 100) WHERE id = ${conversationId}`

    return inserted[0]
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await prisma.$executeRaw`UPDATE "messages" SET read_at = now() WHERE id = ${messageId}`
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const rows = (await prisma.$queryRaw<
      { sender_id: string }[]
    >`SELECT sender_id FROM "messages" WHERE id = ${messageId} LIMIT 1`) || []

    if (rows.length === 0) throw new Error('Message not found')
    if (rows[0].sender_id !== userId) throw new Error('Unauthorized: You can only delete your own messages')

    await prisma.$executeRaw`UPDATE "messages" SET is_deleted = true WHERE id = ${messageId}`
  }
}

export default new MessagingService()
