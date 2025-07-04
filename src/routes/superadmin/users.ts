import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/database';
import { hashPassword, generateRandomPassword } from '../../utils/auth';
import { sendStoreAdminOnboardingEmail } from '../../services/mailgun';
import { createError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '../../utils/logger';
import Joi from 'joi';
import { validate } from '../../middleware/validation';

const router = express.Router();

const createStoreAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  storeId: Joi.string().required()
});

/**
 * @swagger
 * /api/superadmin/users:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get all users
 *     description: Retrieve all users with store information
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: User ID
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: User email
 *                       firstName:
 *                         type: string
 *                         description: First name
 *                       lastName:
 *                         type: string
 *                         description: Last name
 *                       role:
 *                         type: string
 *                         description: User role
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Store ID
 *                           name:
 *                             type: string
 *                             description: Store name
 *                           slug:
 *                             type: string
 *                             description: Store slug
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: User creation date
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last updated date
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Remove password from response
    const safeUsers = users.map((user: any) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    res.json({ users: safeUsers });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/users/store-admin:
 *   post:
 *     tags: [Super Admin]
 *     summary: Create new store admin
 *     description: Create a new store admin user and send welcome email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStoreAdmin'
 *     responses:
 *       201:
 *         description: Store admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User email
 *                     firstName:
 *                       type: string
 *                       description: First name
 *                     lastName:
 *                       type: string
 *                       description: Last name
 *                     role:
 *                       type: string
 *                       description: User role
 *                     storeId:
 *                       type: string
 *                       description: Store ID
 */
router.post('/store-admin', validate(createStoreAdminSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, firstName, lastName, storeId, phone } = req.body;
    const superAdminId = req.user!.userId;

    // Check if store exists and belongs to the superadmin
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        deletedAt: null,
        createdById: superAdminId
      }
    });

    if (!store) {
      throw createError('Store not found or unauthorized', 404);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw createError('User already exists', 409);
    }

    // Generate temporary password
    const tempPassword = await generateRandomPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Create store admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'STOREADMIN' as const,
        isActive: true,
        storeId,
        createdById: superAdminId.toString() // Convert to string if needed
      }
    });

    // Send onboarding email
    await sendStoreAdminOnboardingEmail(email, store.name, tempPassword);

    logger.info('Store admin created successfully:', {
      userId: user.id,
      email: user.email,
      storeId: store.id,
      storeName: store.name
    });

    res.status(201).json({
      message: 'Store admin created and onboarding email sent',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        storeId: user.storeId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/users/{id}/toggle-status:
 *   patch:
 *     tags: [Super Admin]
 *     summary: Toggle user active status
 *     description: Toggle the active status of a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User email
 *                     isActive:
 *                       type: boolean
 *                       description: User active status
 *       404:
 *         description: User not found
 */
router.patch('/:id/toggle-status', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    logger.info('User status toggled:', {
      userId: id,
      email: user.email,
      newStatus: updatedUser.isActive
    });

    res.json({
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/users/{id}:
 *   delete:
 *     tags: [Super Admin]
 *     summary: Delete user
 *     description: Soft delete a user (marks as deleted)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       404:
 *         description: User not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Prevent deleting superadmin
    if (user.role === 'SUPERADMIN') {
      throw createError('Cannot delete superadmin user', 403);
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('User deleted successfully:', {
      userId: id,
      email: user.email
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;