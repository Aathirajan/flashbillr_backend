import express from 'express';
import { prisma } from '../utils/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, registerSchema } from '../utils/validation';
import { validate } from '../middleware/validation';
import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
// logger removed
import { sendPasswordResetEmail } from '../services/mailgun';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';



const router = express.Router();


router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    // Check if any users exist (only allow first superadmin registration)
    const existingUserCount = await prisma.user.count();
    if (existingUserCount > 0) {
      return next(createError('Registration not allowed. Please contact support.', 403));
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email, deletedAt: null }
    });

    if (existingUser) {
      return next(createError('User already exists', 409));
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create superadmin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'SUPERADMIN',
        isActive: true
      }
    });



    res.status(201).json({
      message: 'Superadmin registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
});


router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: { store: true }
    });

    if (!user) {
      return next(createError('Invalid email or password', 401));
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return next(createError('Invalid email or password', 401));
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId || undefined
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          storeId: user.storeId,
          store: user.store ? {
            id: user.store.id,
            name: user.store.name,
            slug: user.store.slug
          } : null
        }
      }
    });
  } catch (error) {
    return next(createError('Internal server error', 500));
  }
});


router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: { store: true }
    });

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.store?.name);

    console.info('Password reset email sent:', {
      userId: user.id,
      email: user.email
    });

    res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
});


router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      throw createError('Invalid or expired reset token', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, email: decoded.email, deletedAt: null }
    });

    if (!user) {
      throw createError('Invalid reset token', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.info('Password reset successfully:', {
      userId: user.id,
      email: user.email
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
});


router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.info('Password changed successfully:', {
      userId: user.id,
      email: user.email
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
});


router.get('/profile', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandColor: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

export default router;
