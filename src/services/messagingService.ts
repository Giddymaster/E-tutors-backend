import supabase from '../supabaseClient'

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
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1_id.eq.${userId},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${userId})`
      )
      .maybeSingle()

    if (data) return data

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: userId,
        participant_2_id: otherUserId,
      })
      .select()
      .single()

    if (createError) throw createError
    return newConversation
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data?.reverse() || []
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select()
      .single()

    if (messageError) throw messageError

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      })
      .eq('id', conversationId)

    return message
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)

    if (error) throw error
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError) throw fetchError
    if (message.sender_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own messages')
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)

    if (error) throw error
  }
}

export default new MessagingService()
