import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';

const router = express.Router();

// Get all FeaturedBrands for a store
router.get('/:storeId/featured-brands', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const featuredBrands = await prisma.featuredBrand.findMany({ where: { storeId } });
    res.json({ featuredBrands });
  } catch (error) {
    next(error);
  }
});

// Get single FeaturedBrand
router.get('/:storeId/featured-brands/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const featuredBrand = await prisma.featuredBrand.findUnique({ where: { id } });
    if (!featuredBrand) throw createError('FeaturedBrand not found', 404);
    res.json({ featuredBrand });
  } catch (error) {
    next(error);
  }
});

// Create FeaturedBrand
router.post('/:storeId/featured-brands', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };
    const featuredBrand = await prisma.featuredBrand.create({ data });
    res.status(201).json({ featuredBrand });
  } catch (error) {
    next(error);
  }
});

// Update FeaturedBrand
router.put('/:storeId/featured-brands/:id', async (req, res, next) => {
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
router.delete('/:storeId/featured-brands/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.featuredBrand.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
