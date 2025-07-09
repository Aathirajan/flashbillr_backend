import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedCustomerRequest extends Request {
  customer?: {
    customerId: string;
    email: string;
    storeId: string;
  };
}

export function authenticateCustomer(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme') as any;
    req.customer = {
      customerId: decoded.customerId,
      email: decoded.email,
      storeId: decoded.storeId,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
