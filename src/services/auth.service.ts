import { User } from '../models/user.model';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const registerUser = async (userData: any): Promise<User> => {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = new User({
        ...userData,
        password_hash: hashedPassword,
    });
    return await newUser.save();
};

export const loginUser = async (email: string, password: string): Promise<string | null> => {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password_hash)) {
        return generateToken(user);
    }
    return null;
};

const generateToken = (user: User): string => {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};