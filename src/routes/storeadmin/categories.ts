import express from 'express';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { AuthenticatedRequest } from '../../middleware/auth';
import Joi from 'joi';
import { createError } from '../../middleware/errorHandler';

const router = express.Router();

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
});

// GET /categories - List all categories for the store
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// GET /categories/:id - Get category by ID
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const category = await prisma.category.findFirst({
      where: { id, storeId },
    });
    if (!category) throw createError('Category not found', 404);
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

// POST /categories - Create category
router.post('/', validate(createCategorySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { name } = req.body;
    // Prevent duplicate category names per store
    const exists = await prisma.category.findFirst({ where: { storeId, name } });
    if (exists) throw createError('Category with this name already exists', 409);
    const category = await prisma.category.create({
      data: { name, storeId },
    });
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

// PUT /categories/:id - Update category
router.put('/:id', validate(updateCategorySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const { name } = req.body;
    const category = await prisma.category.findFirst({ where: { id, storeId } });
    if (!category) throw createError('Category not found', 404);
    // Prevent duplicate name
    if (name) {
      const exists = await prisma.category.findFirst({ where: { storeId, name, id: { not: id } } });
      if (exists) throw createError('Category with this name already exists', 409);
    }
    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });
    res.json({ category: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /categories/:id - Delete category
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const category = await prisma.category.findFirst({ where: { id, storeId } });
    if (!category) throw createError('Category not found', 404);
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
