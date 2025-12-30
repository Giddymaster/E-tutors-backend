import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password_hash: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'tutor'],
        required: true,
    },
    is_verified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const User = model('User', userSchema);

export { User }  // Make sure User is exported
// or
export default User