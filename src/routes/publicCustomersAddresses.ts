import express from 'express';
import { prisma } from '../utils/database';
import Joi from 'joi';
import { authenticateCustomer, AuthenticatedCustomerRequest } from '../middleware/customerAuth';

const router = express.Router();

// Validation schema for address
const addressSchema = Joi.object({
  name: Joi.string().required(),
  line1: Joi.string().required(),
  line2: Joi.string().allow(null, ''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.string().required(),
  country: Joi.string().required(),
  phone: Joi.string().allow(null, ''),
  isDefault: Joi.boolean().optional()
});

// List all addresses for the authenticated customer
router.get('/', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const addresses = await prisma.address.findMany({
      where: { userId: customerId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });
    return res.json({ addresses });
  } catch (err) {
    return next(err);
  }
});

// Get a specific address
router.get('/:addressId', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const { addressId } = req.params;
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }
    return res.json({ address });
  } catch (err) {
    return next(err);
  }
});

// Add a new address
router.post('/', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { error, value } = addressSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { customerId } = req.customer!;
    if (value.isDefault) {
      await prisma.address.updateMany({ where: { userId: customerId, isDefault: true }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({
      data: { ...value, userId: customerId }
    });
    return res.status(201).json({ address });
  } catch (err) {
    return next(err);
  }
});

// Update an address
router.put('/:addressId', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { error, value } = addressSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { customerId } = req.customer!;
    const { addressId } = req.params;
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }
    if (value.isDefault) {
      await prisma.address.updateMany({ where: { userId: customerId, isDefault: true }, data: { isDefault: false } });
    }
    const updated = await prisma.address.update({
      where: { id: addressId },
      data: value
    });
    return res.json({ address: updated });
  } catch (err) {
    return next(err);
  }
});

// Delete an address
router.delete('/:addressId', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const { addressId } = req.params;
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }
    await prisma.address.delete({ where: { id: addressId } });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
