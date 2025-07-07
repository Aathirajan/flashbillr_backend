import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/auth';

const router = express.Router();

// Get all SocialMediaLinks for current store
router.get('/me/social-links', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const socialLinks = await prisma.socialMediaLink.findMany({ where: { storeId: user.storeId } });
    res.json({ socialLinks });
  } catch (error) {
    next(error);
  }
});

// Get single SocialMediaLink
router.get('/me/social-links/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const socialLink = await prisma.socialMediaLink.findUnique({ where: { id } });
    if (!socialLink) throw createError('SocialMediaLink not found', 404);
    res.json({ socialLink });
  } catch (error) {
    next(error);
  }
});

// Create SocialMediaLink for current store
router.post('/me/social-links', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.storeId) throw createError('Store not found for user', 404);
    const data = { ...req.body, storeId: user.storeId };
    const socialLink = await prisma.socialMediaLink.create({ data });
    res.status(201).json({ socialLink });
  } catch (error) {
    next(error);
  }
});

// Update SocialMediaLink
router.put('/me/social-links/:id', async (req: AuthenticatedRequest, res, next) => {
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
router.delete('/me/social-links/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    await prisma.socialMediaLink.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
