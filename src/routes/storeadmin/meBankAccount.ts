import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/auth';

const router = express.Router();

// Get current store's BankAccount
router.get('/me/bank-account', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const bankAccount = await prisma.bankAccount.findFirst({ where: { storeId: user.storeId } });
    if (!bankAccount) throw createError('BankAccount not found', 404);
    res.json({ bankAccount });
  } catch (error) {
    next(error);
  }
});

// Create BankAccount for current store
router.post('/me/bank-account', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const data = { ...req.body, storeId: user.storeId };
    const bankAccount = await prisma.bankAccount.create({ data });
    res.status(201).json({ bankAccount });
  } catch (error) {
    next(error);
  }
});

// Update BankAccount for current store
router.put('/me/bank-account', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const data = req.body;
    const bankAccount = await prisma.bankAccount.findFirst({ where: { storeId: user.storeId } });
    if (!bankAccount) throw createError('BankAccount not found', 404);
    const updated = await prisma.bankAccount.update({ where: { id: bankAccount.id }, data });
    res.json({ bankAccount: updated });
  } catch (error) {
    next(error);
  }
});

// Delete BankAccount for current store
router.delete('/me/bank-account', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const bankAccount = await prisma.bankAccount.findFirst({ where: { storeId: user.storeId } });
    if (!bankAccount) throw createError('BankAccount not found', 404);
    await prisma.bankAccount.delete({ where: { id: bankAccount.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
