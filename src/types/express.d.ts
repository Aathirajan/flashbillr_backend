import { User } from '@prisma/client';
import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: string;
      storeId?: string;
    }
    interface Request {
      user?: User;
    }
  }
}
