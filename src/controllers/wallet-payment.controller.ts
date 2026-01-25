import { Request, Response } from 'express'
import axios from 'axios'
import { walletService } from '../services/wallet.service'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_API_BASE = 'https://api.paystack.co'

/**
 * Initiate a wallet top-up payment via Paystack
 * Returns Paystack authorization URL for frontend redirect
 */
export const initiateWalletPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { email, amount } = req.body
    if (!email || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Email and positive amount are required' })
    }

    // Amount in cents (e.g., 1000 = $10)
    const amountInCents = Math.round(amount * 100)

    try {
      const response = await axios.post(
        `${PAYSTACK_API_BASE}/transaction/initialize`,
        {
          email,
          amount: amountInCents,
          currency: 'USD',
          metadata: {
            userId,
            type: 'wallet_topup',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      )

      const { data, status } = response.data

      if (!status) {
        return res.status(400).json({
          error: 'Failed to initialize payment',
        })
      }

      return res.status(200).json({
        success: true,
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference,
      })
    } catch (err: any) {
      console.error('Paystack initialize error:', err.response?.data || err.message)
      return res.status(500).json({
        error: 'Failed to initialize payment with Paystack',
      })
    }
  } catch (err: any) {
    console.error('initiateWalletPayment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Verify wallet top-up payment and add funds to wallet
 */
export const verifyWalletPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { reference, email } = req.body

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' })
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
        error: 'Payment verification failed',
      })
    }

    // Check if payment was successful
    if (data.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: `Payment status: ${data.status}`,
      })
    }

    // Check currency
    if (data.currency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency',
      })
    }

    // Verify metadata
    if (data.metadata?.type !== 'wallet_topup') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment type',
      })
    }

    // Convert cents back to dollars
    const amountInDollars = data.amount / 100

    // Add funds to wallet
    const walletBalance = await walletService.addFunds(
      userId,
      amountInDollars,
      `Wallet top-up via Paystack (Ref: ${reference})`
    )

    console.info('Wallet top-up successful:', {
      userId,
      reference,
      amount: amountInDollars,
      newBalance: walletBalance.balance,
    })

    return res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        reference,
        amount: amountInDollars,
        newBalance: walletBalance.balance,
        formattedBalance: walletBalance.formattedBalance,
      },
    })
  } catch (err: any) {
    console.error('Paystack verification error:', err.response?.data || err.message)

    if (err.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Payment reference not found',
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Server error verifying payment',
    })
  }
}
