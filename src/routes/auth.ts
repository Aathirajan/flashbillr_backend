import express from 'express';
import { prisma } from '@/utils/database';
import { hashPassword, comparePassword, generateToken, generateRandomPassword } from '@/utils/auth';
import { validate } from '@/middleware/validation';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@/utils/validation';
import { createError } from '@/middleware/errorHandler';
// logger removed
import { sendPasswordResetEmail } from '@/services/mailgun';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     firstName:
 *                       type: string
 *                       description: User first name
 *                     lastName:
 *                       type: string
 *                       description: User last name
 *                     role:
 *                       type: string
 *                       enum: [SUPERADMIN, STOREADMIN]
 *                       description: User role
 *                     store:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Store ID
 *                         name:
 *                           type: string
 *                           description: Store name
 *                         slug:
 *                           type: string
 *                           description: Store slug
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: { store: true }
    });

    if (!user || !user.isActive) {
      throw createError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId || undefined
    });

    console.info('User logged in successfully:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        store: user.store ? {
          id: user.store.id,
          name: user.store.name,
          slug: user.store.slug
        } : null
      }
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register first superadmin user
 *     description: Register the first superadmin user (only allowed when no users exist)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: superadmin@flashbillr.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User password
 *                 example: securepassword123
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: User first name
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: User last name
 *                 example: Doe
 *     responses:
 *       201:
 *         description: Superadmin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Registration not allowed (users already exist)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (or user not found - same response for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: If the email exists, a password reset link has been sent.
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
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

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     description: Reset user password using reset token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password (authenticated users)
 *     description: Change password for authenticated users
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Get authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         store:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: Store ID
 *                             name:
 *                               type: string
 *                               description: Store name
 *                             slug:
 *                               type: string
 *                               description: Store slug
 *                             brandColor:
 *                               type: string
 *                               description: Store brand color
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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