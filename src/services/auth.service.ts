import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const registerUser = async (userData: any): Promise<User> => {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = await prisma.user.create({
        data: {
            ...userData,
            passwordHash: hashedPassword,
        },
    });
    return newUser;
};

export const loginUser = async (email: string, password: string): Promise<string | null> => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && bcrypt.compare(password, user.passwordHash)) {
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

export const findUserByEmail = async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id: string) => {
    return await prisma.user.findUnique({ where: { id } });
};