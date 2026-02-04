import OpenAI from 'openai'
import { prisma } from '../prisma'
import { walletService } from './wallet.service'

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

// Helper: call OpenAI with simple retry/backoff for transient errors (rate limits/5xx)
async function callOpenAIWithRetry(callFn: () => Promise<any>, retries = 3, initialDelay = 1000) {
  let attempt = 0
  let delay = initialDelay
  while (attempt < retries) {
    try {
      return await callFn()
    } catch (err: any) {
      attempt += 1
      const status = err?.status || err?.response?.status
      const message = String(err?.message || '')
      // Retry on rate limit (429) or server errors (5xx)
      if (attempt < retries && (status === 429 || (status && status >= 500) || /rate limit|quota/i.test(message))) {
        // exponential backoff
        await new Promise((res) => setTimeout(res, delay))
        delay *= 2
        continue
      }
      // otherwise rethrow
      throw err
    }
  }
}

// Subject-specific system prompts — tuned to behave like a private one-on-one human tutor
// Each prompt instructs the model to teach, not just chat. Responses should be short, stepwise,
// include a small practice task or question, and end with a clear check-for-understanding.
const SUBJECT_PROMPTS: Record<string, string> = {
  MATH: `You are a private one-on-one human tutor in Mathematics. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Rules: (1) Ask at most two diagnostic questions if the student's level is unclear. (2) Teach one small idea at a time. (3) After giving a concise explanation (2–4 sentences), provide a short worked example (one or two lines) and then give a single short practice prompt for the student to try. (4) Do NOT provide full solutions to practice prompts unless the student explicitly requests the answer; instead give hints and stepwise guidance. (5) Frequently check understanding by ending with a question like "Can you try this step?" or "Does that make sense?". Keep responses focused and scaffolded.`,
  PHYSICS: `You are a private one-on-one human tutor in Physics. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Rules: (1) Ask at most two diagnostic questions if the student's level is unclear. (2) Teach one small idea at a time. (3) After a concise explanation (2–4 sentences), provide a short worked example and then a single brief practice prompt. (4) Give stepwise hints rather than full solutions unless explicitly asked. (5) End with a check-for-understanding question.`,
  CHEMISTRY: `You are a private one-on-one human tutor in Chemistry. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Rules: explain one concept briefly, show one short example, then provide a practice prompt and ask the student to attempt it. Offer hints, analogies, and simplifications as needed. End by asking the student to respond or try.`,
  BIOLOGY: `You are a private one-on-one human tutor in Biology. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Explain one idea briefly, give one concrete example, then propose a short task for the student and ask them to try.`,
  ENGLISH: `You are a private one-on-one human tutor in English. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. For writing or grammar help: explain the rule briefly, show a corrected example, then give a short practice exercise and ask the student to try.`,
  HISTORY: `You are a private one-on-one human tutor in History. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Explain a historical concept briefly, give one example or primary-source-style quote, then suggest a short analytical question for the student to answer.`,
  COMPUTER_SCIENCE: `You are a private one-on-one human tutor in Computer Science. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Teach one concept at a time, provide a brief illustrative example, then give one short coding or reasoning prompt for the student to attempt. Provide hints, not full solutions, unless asked.`,
  ECONOMICS: `You are a private one-on-one human tutor in Economics. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Explain one concept briefly, provide a small example or graph description, then give one short question for the student to work on.`,
  GENERAL: `You are a private one-on-one human tutor for general subjects. NEVER identify as an AI or mention models. Adopt a calm, patient, encouraging tone. Ask diagnostic questions when needed, teach one small idea, show a short example, then give a single practice prompt and ask the student to try. Offer hints; avoid full solutions unless requested.`,
}

// Diagnostic starter questions per subject (2–3 short questions to estimate level)
const DIAGNOSTIC_QUESTIONS: Record<string, string[]> = {
  MATH: ['Which math topics are you comfortable with?', 'Can you solve linear equations? Give a quick example.', 'What do you want to focus on today?'],
  PHYSICS: ['Which physics topics have you studied?', 'Are you comfortable with basic algebra and vectors?', 'What specific problem do you want to work on?'],
  CHEMISTRY: ['Which chemistry topics are you familiar with?', 'Can you balance a simple chemical equation?', 'What would you like to practice today?'],
  BIOLOGY: ['Which biology areas have you studied?', 'Are you comfortable reading diagrams and processes?', 'What do you want to cover today?'],
  ENGLISH: ['Do you want grammar, writing, or reading help?', 'What level of English are you comfortable with?', 'Do you have a specific text or question?'],
  HISTORY: ['Which historical periods have you studied?', 'Are you comfortable analyzing cause and effect in events?', 'What topic should we focus on?'],
  COMPUTER_SCIENCE: ['Which programming languages do you know?', 'Are you familiar with algorithms and data structures?', 'What would you like to practice today?'],
  ECONOMICS: ['Which economics topics have you covered?', 'Are you comfortable with graphs and basic formulas?', 'What are your learning goals today?'],
  GENERAL: ['What subject or topic do you want to study?', 'What is your current comfort level with this topic?', 'What specific goal do you have for this session?'],
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const createAISession = async (userId: string, subject: string, durationHours?: number) => {
  // Create session and immediately add gentle diagnostic questions from the tutor
  const session = await prisma.aISession.create({
    data: {
      userId,
      subject: subject as any,
      status: 'ACTIVE',
    },
  })

  // If a booking duration was provided, charge the user immediately (prepaid)
  if (durationHours && durationHours > 0) {
    const amount = Number((durationHours * 10).toFixed(2))
    try {
      await walletService.deductFunds(userId, amount, 'ai_tutor', session.id, `AI tutoring booking: ${durationHours}h`)
      // update session title to reflect booking
      await prisma.aISession.update({ where: { id: session.id }, data: { title: `Booked ${durationHours}h` } })
    } catch (err) {
      // If charging fails, remove the created session and bubble up error
      await prisma.aISession.delete({ where: { id: session.id } })
      throw err
    }
  }

  // Prepare diagnostic messages (assistant) with zero credits cost
  const questions = DIAGNOSTIC_QUESTIONS[subject] || DIAGNOSTIC_QUESTIONS.GENERAL
  const messagesToCreate = questions.map((q) => ({
    sessionId: session.id,
    userId,
    role: 'assistant',
    content: q,
    credits: 0,
  }))

  if (messagesToCreate.length) {
    // createMany doesn't return created rows reliably across DBs, use create for each to be safe
    for (const m of messagesToCreate) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.aIMessage.create({ data: m })
    }
  }

  // Add a pinned welcome message that explains the tutor style and expectations
  const welcome = `Welcome — I will act as your private tutor for this session. I will ask a couple of short questions if needed, then teach one small idea at a time. After each explanation I will give a very short example and a single practice prompt for you to try. I will give hints rather than full solutions unless you explicitly ask for the complete answer. To get started, tell me what you'd like to work on or answer the next diagnostic question.`
  await prisma.aIMessage.create({
    data: {
      sessionId: session.id,
      userId,
      role: 'assistant',
      content: welcome,
      credits: 0,
    },
  })

  // Return session including the created diagnostic messages
  const fullSession = await prisma.aISession.findUnique({
    where: { id: session.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  return fullSession || session
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
  // Check if session is prepaid (booking) or user has wallet minutes
  const sessionMeta = await prisma.aISession.findFirst({ where: { id: sessionId, userId }, include: { user: { select: { walletBalance: true } } } })
  if (!sessionMeta) throw new Error('Session not found or inactive')

  const bookingTx = await prisma.walletTransaction.findFirst({
    where: { relatedId: sessionId, type: 'debit', description: { contains: 'booking' } },
  })

  if (!bookingTx) {
    const walletBalance = Number(sessionMeta.user?.walletBalance || 0)
    const minutesAvailable = Math.max(0, Math.floor(walletBalance * 6))
    if (minutesAvailable < 1) throw new Error('Insufficient wallet balance')
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
    // Call OpenAI API with retry/backoff for transient rate limits or server errors
    const client = getOpenAI()
    const completion = await callOpenAIWithRetry(() => client.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost-effectiveness
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    }))

    const aiResponse = completion?.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'

    // Save AI response (no per-message billing; time-based billing applies)
    await prisma.aIMessage.create({
      data: {
        sessionId,
        userId,
        role: 'assistant',
        content: aiResponse,
        credits: 0,
      },
    })

    await prisma.aISession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
        title: session.title || message.substring(0, 50),
      },
    })

    return {
      message: aiResponse,
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    // If OpenAI reports quota/insufficient funds, surface a friendly assistant reply
    const errCode = error?.code || error?.error?.code || error?.error?.type
    const msg = String(error?.message || '')
    if (errCode === 'insufficient_quota' || /insufficient_quota|quota exceeded|quota/i.test(msg)) {
      const fallback = 'Sorry — the tutoring AI is temporarily unavailable due to quota or billing limits. Please try again later or contact support.'
      try {
        await prisma.aIMessage.create({
          data: {
            sessionId,
            userId,
            role: 'assistant',
            content: fallback,
            credits: 0,
          },
        })
      } catch (e) {
        // ignore persistence errors
      }
      return { message: fallback, fallback: true }
    }
    // Bubble up a clearer error for missing configuration
    if (String(error?.message || '').includes('AI service not configured')) {
      throw new Error('AI service not configured: missing OPENAI_API_KEY')
    }
    // Surface rate-limit/quota errors distinctly so controller can map to 429
    if (String(error?.message || '').match(/quota|rate limit|429|exceeded/i)) {
      throw new Error('OpenAI rate limit or quota exceeded: ' + String(error?.message || ''))
    }
    throw new Error('Failed to get AI response: ' + String(error?.message || ''))
  }
}

export const endAISession = async (sessionId: string, userId: string) => {
  // Default end without billing: mark completed
  const session = await prisma.aISession.findFirst({ where: { id: sessionId, userId } })
  if (!session) throw new Error('Session not found')

  const updated = await prisma.aISession.updateMany({
    where: { id: sessionId, userId },
    data: { status: 'COMPLETED', endedAt: new Date() },
  })

  return updated
}

// End session and bill for elapsed tutoring time (seconds)
export const endAISessionWithBilling = async (sessionId: string, userId: string, durationSeconds?: number) => {
  const session = await prisma.aISession.findFirst({ where: { id: sessionId, userId } })
  if (!session) throw new Error('Session not found')

  // If session already completed or cancelled, do nothing (idempotent)
  if (session.status !== 'ACTIVE') {
    return { charged: 0, durationSeconds: 0, updated: null }
  }

  // If durationSeconds not provided, compute using createdAt -> now
  let seconds = durationSeconds
  if (typeof seconds === 'undefined' || seconds === null) {
    const started = session.createdAt
    seconds = Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000))
  }

  // Billing policy: $10 per 3600 seconds
    const hoursUsed = seconds / 3600
    let amount = Math.max(0, Number((hoursUsed * 10).toFixed(2)))

  // Check if this session was prepaid at booking time. If so, do not charge again here.
  const bookingTx = await prisma.walletTransaction.findFirst({
    where: {
      relatedId: sessionId,
      type: 'debit',
      description: { contains: 'booking' },
    },
  })

  if (!bookingTx) {
    if (amount > 0) {
      // Deduct funds using walletService (throws if insufficient)
      await walletService.deductFunds(userId, amount, 'ai_tutor', sessionId, `AI tutoring: ${Math.ceil(seconds/60)} minutes`)
    }
  } else {
    // Already prepaid — nothing to charge now.
    amount = 0
  }

  // Mark session completed
  const updated = await prisma.aISession.updateMany({
    where: { id: sessionId, userId },
    data: { status: 'COMPLETED', endedAt: new Date() },
  })

  return { charged: amount, durationSeconds: seconds, updated }
}

// Monitor active AI sessions and enforce billing when wallet balance is exhausted.
export const monitorActiveSessionsAndEnforceBilling = async () => {
  try {
    const now = new Date()
    // Find active sessions with user wallet balance
    const sessions = await prisma.aISession.findMany({
      where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, walletBalance: true } } },
    })

    for (const sess of sessions) {
      const userId = sess.userId
      const walletBalance = Number(sess.user?.walletBalance || 0)
      const minutesAvailable = Math.max(0, Math.floor(walletBalance * 6))
      const secondsAvailable = minutesAvailable * 60

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(sess.createdAt).getTime()) / 1000))

      // Check if session was prepaid (booking transaction exists)
      const bookingTx = await prisma.walletTransaction.findFirst({
        where: { relatedId: sess.id, type: 'debit', description: { contains: 'booking' } },
      })

      // If user has no available seconds and session has elapsed any time and not prepaid, end immediately
      if (!bookingTx && secondsAvailable <= 0 && elapsedSeconds > 0) {
        await endAISessionWithBilling(sess.id, userId, 0)
        continue
      }

      // If elapsed time exceeds available seconds
      if (elapsedSeconds > secondsAvailable) {
        if (bookingTx) {
          // Prepaid: notify user (create assistant message) to extend instead of auto-ending
          const existingNotice = await prisma.aIMessage.findFirst({
            where: {
              sessionId: sess.id,
              role: 'assistant',
              content: { contains: 'booked time has lapsed' },
            },
          })
          if (!existingNotice) {
            const msg = await prisma.aIMessage.create({
              data: {
                sessionId: sess.id,
                userId: sess.userId,
                role: 'assistant',
                content: 'Your booked time has lapsed. You can extend the session by paying $10 per hour, or end the session now.',
                credits: 0,
              },
            })
            // notify connected websocket clients for this session
            try {
              const ws = await import('./websocket.service')
              ws.broadcastToSession(sess.id, { type: 'booking_lapsed', sessionId: sess.id, message: msg.content })
            } catch (err) {
              // ignore websocket errors
            }
          }
        } else {
          // Not prepaid: charge up to available seconds and end session
          await endAISessionWithBilling(sess.id, userId, Math.max(0, secondsAvailable))
        }
      }
    }
  } catch (err: any) {
    console.error('AI session monitor error:', err)
  }
}

export const extendAISession = async (sessionId: string, userId: string, hours: number) => {
  const session = await prisma.aISession.findFirst({ where: { id: sessionId, userId } })
  if (!session) throw new Error('Session not found')
  if (hours <= 0) throw new Error('Invalid extension hours')

  const amount = Number((hours * 10).toFixed(2))

  // Deduct extension funds
  await walletService.deductFunds(userId, amount, 'ai_tutor', sessionId, `AI tutoring booking extension: ${hours}h`)

  // Update session title to reflect extension
  const newTitle = session.title ? `${session.title} +${hours}h` : `Booked ${hours}h (extended)`
  await prisma.aISession.update({ where: { id: sessionId }, data: { title: newTitle } })

  // Notify in session messages
  await prisma.aIMessage.create({
    data: {
      sessionId,
      userId,
      role: 'assistant',
      content: `Session extended by ${hours} hour(s).`,
      credits: 0,
    },
  })

  return { charged: amount }
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
  // Compute available tutoring time from user's wallet balance.
  // Policy: $10 in wallet => 60 minutes (1 hour) of service.
  // Therefore $1 => 6 minutes. minutesRemaining = floor(walletBalance * 6).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true, aiCredits: true },
  })

  const balanceNum = user?.walletBalance ? Number(user.walletBalance) : 0
  const minutesRemaining = Math.max(0, Math.floor(balanceNum * 6))
  const hours = Math.floor(minutesRemaining / 60)
  const minutes = minutesRemaining % 60

  return {
    minutesRemaining,
    hours,
    minutes,
    walletBalance: balanceNum,
    // keep legacy aiCredits for backward-compatibility if needed
    aiCredits: user?.aiCredits ?? 0,
  }
}
