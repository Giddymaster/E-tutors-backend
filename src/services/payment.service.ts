import { Stripe } from 'stripe';
import { PaymentSessionModel } from '../models/session.model'; // Adjusted to use named export

const stripeKey = process.env.STRIPE_SECRET_KEY!; // Add ! to assert it's not undefined

const stripe = new Stripe(stripeKey, {
  apiVersion: '2020-08-27',
});

interface PaymentSession {
  session_id: string;
  user_id: string;
  amount: number;
  status: string;
}

export const createPaymentSession = async (amount: number, userId: string) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tutoring Session',
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  });

  const paymentSession: PaymentSession = {
    session_id: session.id,
    user_id: userId,
    amount,
    status: 'pending',
  };

  await PaymentSessionModel.create(paymentSession); // Ensure create method is available

  return session;
};

export const handleWebhook = async (req: any, res: any) => {
  const event = req.body;

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Handle successful payment here
      break;
    // Handle other event types as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send('Received');
};