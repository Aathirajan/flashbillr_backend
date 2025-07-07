import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/auth';

const router = express.Router();

// Get all FeaturedBrands for current store
router.get('/me/featured-brands', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const featuredBrands = await prisma.featuredBrand.findMany({ where: { storeId: user.storeId } });
    res.json({ featuredBrands });
  } catch (error) {
    next(error);
  }
});

// Get single FeaturedBrand
router.get('/me/featured-brands/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const featuredBrand = await prisma.featuredBrand.findUnique({ where: { id } });
    if (!featuredBrand) throw createError('FeaturedBrand not found', 404);
    res.json({ featuredBrand });
  } catch (error) {
    next(error);
  }
});

// Create FeaturedBrand for current store
router.post('/me/featured-brands', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const data = { ...req.body, storeId: user.storeId };
    const featuredBrand = await prisma.featuredBrand.create({ data });
    res.status(201).json({ featuredBrand });
  } catch (error) {
    next(error);
  }
});

// Update FeaturedBrand
router.put('/me/featured-brands/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const featuredBrand = await prisma.featuredBrand.update({ where: { id }, data });
    res.json({ featuredBrand });
  } catch (error) {
    next(error);
  }
});

// Delete FeaturedBrand
router.delete('/me/featured-brands/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    await prisma.featuredBrand.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
