import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

const authMiddleware = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            req.user = user;

            if (roles.length && !roles.includes(user.role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    };
};

export default authMiddleware;