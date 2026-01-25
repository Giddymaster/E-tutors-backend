import { Role } from '../../generated';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      user?: { id: string; role: Role };
    }
  }
}

export {};