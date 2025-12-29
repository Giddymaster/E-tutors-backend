import { Request, Response } from 'express'

// Simple demo handler for processing payments. In production replace with
// real gateway integration (Stripe, PayPal) and persist records.
export const processPayment = async (req: Request, res: Response) => {
  try {
    const payload = req.body
    console.info('Received payment payload:', JSON.stringify(payload))

    // Basic validation
    if (!payload || typeof payload.amount !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid payment payload' })
    }

    // In demo mode we just return success. Replace with gateway logic.
    return res.status(200).json({ success: true, demo: true })
  } catch (err) {
    console.error('processPayment error', err)
    return res.status(500).json({ success: false, error: 'Server error processing payment' })
  }
}
