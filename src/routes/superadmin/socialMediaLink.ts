import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';

const router = express.Router();

// Get all SocialMediaLinks for a store
router.get('/:storeId/social-links', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const socialLinks = await prisma.socialMediaLink.findMany({ where: { storeId } });
    res.json({ socialLinks });
  } catch (error) {
    next(error);
  }
});

// Get single SocialMediaLink
router.get('/:storeId/social-links/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const socialLink = await prisma.socialMediaLink.findUnique({ where: { id } });
    if (!socialLink) throw createError('SocialMediaLink not found', 404);
    res.json({ socialLink });
  } catch (error) {
    next(error);
  }
});

// Create SocialMediaLink
router.post('/:storeId/social-links', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };
    const socialLink = await prisma.socialMediaLink.create({ data });
    res.status(201).json({ socialLink });
  } catch (error) {
    next(error);
  }
});

// Update SocialMediaLink
router.put('/:storeId/social-links/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const socialLink = await prisma.socialMediaLink.update({ where: { id }, data });
    res.json({ socialLink });
  } catch (error) {
    next(error);
  }
});

// Delete SocialMediaLink
router.delete('/:storeId/social-links/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.socialMediaLink.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
