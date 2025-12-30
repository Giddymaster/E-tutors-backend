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
exports.processPayment = void 0;
// Simple demo handler for processing payments. In production replace with
// real gateway integration (Stripe, PayPal) and persist records.
const processPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = req.body;
        console.info('Received payment payload:', JSON.stringify(payload));
        // Basic validation
        if (!payload || typeof payload.amount !== 'number') {
            return res.status(400).json({ success: false, error: 'Invalid payment payload' });
        }
        // In demo mode we just return success. Replace with gateway logic.
        return res.status(200).json({ success: true, demo: true });
    }
    catch (err) {
        console.error('processPayment error', err);
        return res.status(500).json({ success: false, error: 'Server error processing payment' });
    }
});
exports.processPayment = processPayment;
