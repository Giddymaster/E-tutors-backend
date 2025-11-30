export interface PaymentSession {
    session_id: string;
    user_id: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    created_at: Date;
    updated_at: Date;
}