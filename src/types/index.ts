export interface User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'student' | 'tutor';
    is_verified: boolean;
}

export interface TutorProfile {
    user_id: string;
    short_bio: string;
    hourly_rate: number;
    availability: string[];
}

export interface PaymentSession {
    session_id: string;
    user_id: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Booking {
    id: string;
    tutor_id: string;
    student_id: string;
    session_time: Date;
    status: 'confirmed' | 'canceled' | 'completed';
}