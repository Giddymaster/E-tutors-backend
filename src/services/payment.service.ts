import { Stripe } from 'stripe';
import { PaymentSession } from '../models/session.model';

const stripeKey = process.env.STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripeKey, {
  apiVersion: '2020-08-27',
});

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