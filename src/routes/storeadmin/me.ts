import express from 'express';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { updateStoreAdminSchema } from '../../utils/validation/storeAdmin';
import { createError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/auth';

const router = express.Router();

// Get own profile
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    if (!user) throw createError('User not found', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Update own profile
router.patch('/', validate(updateStoreAdminSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const updateData = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw createError('User not found', 404);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
