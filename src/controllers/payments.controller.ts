import { Request, Response } from 'express'
import axios from 'axios'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_API_BASE = 'https://api.paystack.co'

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

// Verify Paystack payment
export const verifyPaystackPayment = async (req: Request, res: Response) => {
  try {
    const { reference, email, method } = req.body

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference is required' })
    }

    // Verify payment with Paystack
    const response = await axios.get(
      `${PAYSTACK_API_BASE}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const { data, status } = response.data

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed' 
      })
    }

    // Check if payment was successful
    if (data.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: `Payment status: ${data.status}`,
      })
    }

    // Check amount (amount is in cents for USD, so 3000 cents = $30)
    const expectedAmount = 3000 // $30 USD in cents
    if (data.amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount mismatch',
      })
    }

    // Check currency
    if (data.currency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency',
      })
    }

    // Payment verified successfully
    console.info('Paystack payment verified:', {
      reference,
      email,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    })

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        reference,
        amount: data.amount,
        status: data.status,
        customer: data.customer,
      },
    })
  } catch (err: any) {
    console.error('Paystack verification error:', err.response?.data || err.message)
    
    if (err.response?.status === 404) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment reference not found' 
      })
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Server error verifying payment' 
    })
  }
}
