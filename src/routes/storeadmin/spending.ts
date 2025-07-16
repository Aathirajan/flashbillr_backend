import express from 'express';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { AuthenticatedRequest, requireStoreAdmin } from '../../middleware/auth';
import Joi from 'joi';
import { createError } from '../../middleware/errorHandler';

const router = express.Router();

const createSpendingSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string()
    .valid(
      'FOOD',
      'TRANSPORT',
      'PACKAGING',
      'ELECTRICITY',
      'SOFTWARE',
      'INTERNET',
      'SALARY',
      'FUEL',
      'STOCK',
      'OTHERS'
    )
    .required(),
  description: Joi.string().max(1000).optional(),
  date: Joi.date().required()
});

const updateSpendingSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  type: Joi.string()
    .valid(
      'FOOD',
      'TRANSPORT',
      'PACKAGING',
      'ELECTRICITY',
      'SOFTWARE',
      'INTERNET',
      'SALARY',
      'FUEL',
      'STOCK',
      'OTHERS'
    )
    .optional(),
  description: Joi.string().max(1000).optional(),
  date: Joi.date().optional()
});

// Middleware: Require storeadmin
router.use(requireStoreAdmin);

// GET /spending - List all spendings for the storeadmin's store
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const spendings = await prisma.spending.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { date: 'desc' }
    });
    res.json({ spendings });
  } catch (error) {
    next(error);
  }
});

// GET /spending/:id - Get a single spending entry
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const spending = await prisma.spending.findFirst({
      where: { id, storeId, deletedAt: null }
    });
    if (!spending) throw createError('Spending entry not found', 404);
    res.json({ spending });
  } catch (error) {
    next(error);
  }
});

// POST /spending - Create a spending entry
router.post('/', validate(createSpendingSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { amount, type, description, date } = req.body;
    let spendingDate = date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // If date is date-only, convert to ISO string at midnight UTC
      spendingDate = new Date(date + 'T00:00:00.000Z').toISOString();
    } else if (date instanceof Date) {
      spendingDate = date.toISOString();
    }
    const spending = await prisma.spending.create({
      data: { amount, type, description, date: spendingDate, storeId }
    });
    res.status(201).json({ spending });
  } catch (error) {
    next(error);
  }
});

// PUT /spending/:id - Update a spending entry
router.put('/:id', validate(updateSpendingSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const spending = await prisma.spending.findFirst({ where: { id, storeId, deletedAt: null } });
    if (!spending) throw createError('Spending entry not found', 404);
    let updateData = { ...req.body };
    if (updateData.date) {
      if (typeof updateData.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updateData.date)) {
        updateData.date = new Date(updateData.date + 'T00:00:00.000Z').toISOString();
      } else if (updateData.date instanceof Date) {
        updateData.date = updateData.date.toISOString();
      }
    }
    const updated = await prisma.spending.update({
      where: { id },
      data: updateData
    });
    res.json({ spending: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /spending/:id - Soft delete a spending entry
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { id } = req.params;
    const spending = await prisma.spending.findFirst({ where: { id, storeId, deletedAt: null } });
    if (!spending) throw createError('Spending entry not found', 404);
    await prisma.spending.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Spending entry deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
