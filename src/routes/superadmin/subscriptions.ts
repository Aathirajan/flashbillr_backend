import express from 'express';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import Joi from 'joi';

const router = express.Router();

const createSubscriptionSchema = Joi.object({
  storeId: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  amount: Joi.number().positive().required(),
  notes: Joi.string().max(1000).optional()
});

/**
 * @swagger
 * /api/superadmin/subscriptions:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get all subscriptions
 *     description: Retrieve all active subscriptions with store information
 *     responses:
 *       200:
 *         description: List of subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Subscription ID
 *                       storeId:
 *                         type: string
 *                         description: Store ID
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Store ID
 *                           name:
 *                             type: string
 *                             description: Store name
 *                           slug:
 *                             type: string
 *                             description: Store slug
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription start date
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription end date
 *                       amount:
 *                         type: number
 *                         description: Subscription amount
 *                       status:
 *                         type: string
 *                         description: Subscription status
 *                       notes:
 *                         type: string
 *                         description: Additional notes
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription creation date
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last updated date
 */
router.get('/', async (_req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { deletedAt: null },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/subscriptions/store/{storeId}:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get subscriptions by store
 *     description: Retrieve all subscriptions for a specific store
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: List of store subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Subscription ID
 *                       storeId:
 *                         type: string
 *                         description: Store ID
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription start date
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription end date
 *                       amount:
 *                         type: number
 *                         description: Subscription amount
 *                       status:
 *                         type: string
 *                         description: Subscription status
 *                       notes:
 *                         type: string
 *                         description: Additional notes
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription creation date
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last updated date
 */
router.get('/store/:storeId', async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const subscriptions = await prisma.subscription.findMany({
      where: { 
        storeId,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/subscriptions:
 *   post:
 *     tags: [Super Admin]
 *     summary: Create subscription
 *     description: Create a new subscription for a store
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeId:
 *                 type: string
 *                 description: Store ID
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Subscription start date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Subscription end date
 *               amount:
 *                 type: number
 *                 description: Subscription amount
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Subscription ID
 *                     storeId:
 *                       type: string
 *                       description: Store ID
 *                     store:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: Store name
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Subscription start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: Subscription end date
 *                     amount:
 *                       type: number
 *                       description: Subscription amount
 *                     status:
 *                       type: string
 *                       description: Subscription status
 *                     notes:
 *                       type: string
 *                       description: Additional notes
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Subscription creation date
 *       404:
 *         description: Store not found
 */
router.post('/', validate(createSubscriptionSchema), async (req, res, next) => {
  try {
    const { storeId, startDate, endDate, amount, notes } = req.body;

    // Check if store exists
    const store = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    const subscription = await prisma.subscription.create({
      data: {
        storeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        amount,
        notes,
        status: 'ACTIVE'
      },
      include: {
        store: {
          select: {
            name: true
          }
        }
      }
    });

    logger.info('Subscription created successfully:', {
      subscriptionId: subscription.id,
      storeId,
      storeName: store.name,
      amount
    });

    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

// Update subscription status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(status)) {
      throw createError('Invalid subscription status', 400);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id, deletedAt: null }
    });

    if (!subscription) {
      throw createError('Subscription not found', 404);
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: { status }
    });

    logger.info('Subscription status updated:', {
      subscriptionId: id,
      oldStatus: subscription.status,
      newStatus: status
    });

    res.json({ subscription: updatedSubscription });
  } catch (error) {
    next(error);
  }
});

// Get expiring subscriptions (within 30 days)
router.get('/expiring', async (_req, res, next) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        endDate: {
          lte: thirtyDaysFromNow
        }
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { endDate: 'asc' }
    });

    res.json({ expiringSubscriptions });
  } catch (error) {
    next(error);
  }
});

export default router;
