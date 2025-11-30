import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const token = await authService.login(req.body);
        res.status(200).json({ token });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        await authService.resetPassword(req.body);
        res.status(200).json({ message: 'Password reset link sent.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const socialSignIn = async (req: Request, res: Response) => {
    try {
        const token = await authService.socialSignIn(req.body);
        res.status(200).json({ token });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};