"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.createPaymentSession = void 0;
const stripe_1 = require("stripe");
const stripe = new stripe_1.Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27',
});
const createPaymentSession = (amount, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield stripe.checkout.sessions.create({
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
    yield session_model_1.PaymentSession.create({
        session_id: session.id,
        user_id: userId,
        amount,
        status: 'pending',
    });
    return session;
});
exports.createPaymentSession = createPaymentSession;
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
});
exports.handleWebhook = handleWebhook;
