import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';

const router = express.Router();

// List all bank accounts for a store
router.get('/:storeId/bank-accounts', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const bankAccounts = await prisma.bankAccount.findMany({ where: { storeId } });
    res.json({ bankAccounts });
  } catch (error) {
    next(error);
  }
});

// Create a new bank account for a store
router.post('/:storeId/bank-accounts', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };
    const bankAccount = await prisma.bankAccount.create({ data });
    res.status(201).json({ bankAccount });
  } catch (error) {
    next(error);
  }
});

// Get a specific bank account by id
router.get('/:storeId/bank-accounts/:id', async (req, res, next) => {
  try {
    const { storeId, id } = req.params;
    const bankAccount = await prisma.bankAccount.findFirst({ where: { id, storeId } });
    if (!bankAccount) throw createError('BankAccount not found', 404);
    res.json({ bankAccount });
  } catch (error) {
    next(error);
  }
});

// Update a specific bank account by id
router.put('/:storeId/bank-accounts/:id', async (req, res, next) => {
  try {
    const { storeId, id } = req.params;
    const data = req.body;
    const bankAccount = await prisma.bankAccount.update({ where: { id }, data });
    res.json({ bankAccount });
  } catch (error) {
    next(error);
  }
});


// Delete a specific bank account by id
router.delete('/:storeId/bank-accounts/:id', async (req, res, next) => {
  try {
    const { storeId, id } = req.params;
    await prisma.bankAccount.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
