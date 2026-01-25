import OpenAI from 'openai'
import { prisma } from '../prisma'

let openaiClient: OpenAI | null = null
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Throw a controlled error so the server doesn't crash on startup
    throw new Error('AI service not configured: missing OPENAI_API_KEY')
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// Subject-specific system prompts
const SUBJECT_PROMPTS: Record<string, string> = {
  MATH: 'You are an expert Mathematics tutor. Help students understand mathematical concepts, solve problems step-by-step, and explain reasoning clearly. Use examples and break down complex problems into manageable steps.',
  PHYSICS: 'You are an expert Physics tutor. Explain physical concepts, laws, and theories clearly. Use real-world examples and help students visualize abstract concepts. Guide them through problem-solving methodically.',
  CHEMISTRY: 'You are an expert Chemistry tutor. Help students understand chemical reactions, molecular structures, and laboratory procedures. Explain concepts from atoms to reactions clearly and safely.',
  BIOLOGY: 'You are an expert Biology tutor. Teach biological concepts, from cells to ecosystems. Use diagrams mentally and connect concepts to real-life applications. Make complex systems understandable.',
  ENGLISH: 'You are an expert English tutor. Help with grammar, writing, literature analysis, and reading comprehension. Provide constructive feedback and explain language rules clearly.',
  HISTORY: 'You are an expert History tutor. Help students understand historical events, their causes, and impacts. Connect past events to present contexts and encourage critical thinking.',
  COMPUTER_SCIENCE: 'You are an expert Computer Science tutor. Teach programming concepts, algorithms, data structures, and software development. Provide code examples and explain logic clearly.',
  ECONOMICS: 'You are an expert Economics tutor. Explain economic principles, market dynamics, and financial concepts. Use real-world examples and help students analyze economic scenarios.',
  GENERAL: 'You are a knowledgeable AI tutor. Help students learn various subjects by providing clear explanations, examples, and guidance. Adapt your teaching style to the student\'s needs.',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const createAISession = async (userId: string, subject: string) => {
  const session = await prisma.aISession.create({
    data: {
      userId,
      subject: subject as any,
      status: 'ACTIVE',
    },
  })
  return session
}

export const getAISessions = async (userId: string) => {
  const sessions = await prisma.aISession.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return sessions
}

export const getAISession = async (sessionId: string, userId: string) => {
  const session = await prisma.aISession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  return session
}

export const sendAIMessage = async (
  userId: string,
  sessionId: string,
  message: string
) => {
  // Check if user has credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  })

  if (!user || user.aiCredits < 1) {
    throw new Error('Insufficient AI credits')
  }

  // Get session and validate
  const session = await prisma.aISession.findFirst({
    where: {
      id: sessionId,
      userId,
      status: 'ACTIVE',
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages for context
      },
    },
  })

  if (!session) {
    throw new Error('Session not found or inactive')
  }

  // Build conversation history
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: SUBJECT_PROMPTS[session.subject] || SUBJECT_PROMPTS.GENERAL,
    },
    ...session.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: message,
    },
  ]

  // Save user message
  await prisma.aIMessage.create({
    data: {
      sessionId,
      userId,
      role: 'user',
      content: message,
      credits: 0, // User messages don't cost credits
    },
  })

  try {
    // Call OpenAI API
    const client = getOpenAI()
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost-effectiveness
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'

    // Save AI response and deduct credit
    await prisma.$transaction([
      prisma.aIMessage.create({
        data: {
          sessionId,
          userId,
          role: 'assistant',
          content: aiResponse,
          credits: 1,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          aiCredits: {
            decrement: 1,
          },
        },
      }),
      prisma.aISession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
          title: session.title || message.substring(0, 50),
        },
      }),
    ])

    return {
      message: aiResponse,
      creditsRemaining: (user.aiCredits || 0) - 1,
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    // Bubble up a clearer error for missing configuration
    if (String(error?.message || '').includes('AI service not configured')) {
      throw new Error('AI service not configured: missing OPENAI_API_KEY')
    }
    throw new Error('Failed to get AI response: ' + error.message)
  }
}

export const endAISession = async (sessionId: string, userId: string) => {
  const session = await prisma.aISession.updateMany({
    where: {
      id: sessionId,
      userId,
    },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
    },
  })
  return session
}

export const purchaseAICredits = async (userId: string, credits: number) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      aiCredits: {
        increment: credits,
      },
    },
  })
  return user
}

export const getAICredits = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  })
  return user?.aiCredits || 0
}
