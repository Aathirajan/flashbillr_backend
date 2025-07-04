import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendLowStockAlert } from '../../services/mailgun';
import Joi from 'joi';
import { validate } from '../../middleware/validation';

const router = express.Router();

const updateInventorySchema = Joi.object({
  currentStock: Joi.number().integer().min(0).optional(),
  minStockLevel: Joi.number().integer().min(0).optional(),
  maxStockLevel: Joi.number().integer().min(0).optional(),
  adjustment: Joi.number().integer().optional(),
  adjustmentReason: Joi.string().max(500).optional()
});

const bulkUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      currentStock: Joi.number().integer().min(0).optional(),
      minStockLevel: Joi.number().integer().min(0).optional(),
      maxStockLevel: Joi.number().integer().min(0).optional(),
      adjustment: Joi.number().integer().optional(),
      adjustmentReason: Joi.string().max(500).optional()
    })
  ).min(1).required()
});

/**
 * @swagger
 * /api/storeadmin/inventory:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all inventory items
 *     description: Retrieve all inventory items with filtering and pagination
 *     parameters:
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter items with low stock (current stock <= min stock level)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search inventory items by product name or SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of inventory items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inventory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Inventory ID
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           category:
 *                             type: string
 *                           brand:
 *                             type: string
 *                       currentStock:
 *                         type: integer
 *                         description: Current stock quantity
 *                       minStockLevel:
 *                         type: integer
 *                         description: Minimum stock level
 *                       maxStockLevel:
 *                         type: integer
 *                         description: Maximum stock level
 *                       lastUpdated:
 *                         type: string
 *                         format: date-time
 *                         description: Last update date
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *                     total:
 *                       type: integer
 *                       description: Total number of items
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { lowStock, search, category, page = 1, limit = 20 } = req.query;

    const where: any = {
      storeId,
      deletedAt: null,
      product: {
        deletedAt: null
      }
    };

    if (lowStock === 'true') {
      where.currentStock = { lte: prisma.inventory.fields.minStockLevel };
    }

    if (search) {
      where.product = {
        ...where.product,
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { brand: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    if (category) {
      where.product = {
        ...where.product,
        category: category as string
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              brand: true,
              category: true,
              sellingPrice: true,
              isActive: true
            }
          }
        },
        orderBy: [
          { currentStock: 'asc' },
          { product: { name: 'asc' } }
        ],
        skip,
        take: Number(limit)
      }),
      prisma.inventory.count({ where })
    ]);

    // Add low stock indicator
    const inventoryWithStatus = inventory.map((item: any) => ({
      ...item,
      isLowStock: item.currentStock <= item.minStockLevel,
      stockStatus: item.currentStock === 0 ? 'OUT_OF_STOCK' : 
                   item.currentStock <= item.minStockLevel ? 'LOW_STOCK' : 'IN_STOCK'
    }));

    res.json({
      inventory: inventoryWithStatus,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/inventory/product/{productId}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get inventory item by product ID
 *     description: Retrieve inventory item details by product ID
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Inventory item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inventory:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Inventory ID
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         sku:
 *                           type: string
 *                         category:
 *                           type: string
 *                         brand:
 *                           type: string
 *                     currentStock:
 *                       type: integer
 *                       description: Current stock quantity
 *                     minStockLevel:
 *                       type: integer
 *                       description: Minimum stock level
 *                     maxStockLevel:
 *                       type: integer
 *                       description: Maximum stock level
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: Last update date
 */
router.get('/product/:productId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId } = req.params;
    const storeId = req.user!.storeId!;

    const inventory = await prisma.inventory.findFirst({
      where: { productId, storeId, deletedAt: null },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            brand: true,
            category: true,
            sellingPrice: true,
            isActive: true
          }
        }
      }
    });

    if (!inventory) {
      throw createError('Inventory item not found', 404);
    }

    res.json({
      inventory: {
        ...inventory,
        isLowStock: inventory.currentStock <= inventory.minStockLevel,
        stockStatus: inventory.currentStock === 0 ? 'OUT_OF_STOCK' : 
                     inventory.currentStock <= inventory.minStockLevel ? 'LOW_STOCK' : 'IN_STOCK'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/inventory/product/{productId}:
 *   put:
 *     tags: [Store Admin]
 *     summary: Update inventory item
 *     description: Update inventory levels and thresholds for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentStock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Current stock quantity
 *               minStockLevel:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum stock threshold
 *               maxStockLevel:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum stock threshold
 *               adjustment:
 *                 type: integer
 *                 description: Stock adjustment amount
 *               adjustmentReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for stock adjustment
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inventory:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Inventory ID
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     currentStock:
 *                       type: integer
 *                       description: Updated current stock
 *                     minStockLevel:
 *                       type: integer
 *                       description: Updated minimum stock level
 *                     maxStockLevel:
 *                       type: integer
 *                       description: Updated maximum stock level
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: Last update date
 */
router.put('/product/:productId', validate(updateInventorySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId } = req.params;
    const storeId = req.user!.storeId!;
    const { currentStock, minStockLevel, maxStockLevel, adjustment, adjustmentReason } = req.body;

    const inventory = await prisma.inventory.findFirst({
      where: { productId, storeId, deletedAt: null },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    if (!inventory) {
      throw createError('Inventory item not found', 404);
    }

    const updateData: any = {};

    if (currentStock !== undefined) {
      updateData.currentStock = currentStock;
      updateData.lastRestocked = new Date();
    }

    if (adjustment !== undefined) {
      updateData.currentStock = inventory.currentStock + adjustment;
      updateData.lastRestocked = new Date();
    }

    if (minStockLevel !== undefined) {
      updateData.minStockLevel = minStockLevel;
    }

    if (maxStockLevel !== undefined) {
      updateData.maxStockLevel = maxStockLevel;
    }

    const updatedInventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: updateData
    });

    logger.info('Inventory updated successfully:', {
      productId,
      productName: inventory.product.name,
      oldStock: inventory.currentStock,
      newStock: updatedInventory.currentStock,
      adjustment,
      adjustmentReason,
      storeId
    });

    res.json({ 
      inventory: updatedInventory,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/inventory/bulk-update:
 *   post:
 *     tags: [Store Admin]
 *     summary: Bulk update inventory items
 *     description: Update multiple inventory items in a single request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     currentStock:
 *                       type: integer
 *                       minimum: 0
 *                       description: Current stock quantity
 *                     minStockLevel:
 *                       type: integer
 *                       minimum: 0
 *                       description: Minimum stock threshold
 *                     maxStockLevel:
 *                       type: integer
 *                       minimum: 0
 *                       description: Maximum stock threshold
 *                     adjustment:
 *                       type: integer
 *                       description: Stock adjustment amount
 *                     adjustmentReason:
 *                       type: string
 *                       maxLength: 500
 *                       description: Reason for stock adjustment
 *     responses:
 *       200:
 *         description: Inventory items updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedCount:
 *                   type: integer
 *                   description: Number of items updated
 *                 updatedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Inventory ID
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       currentStock:
 *                         type: integer
 *                         description: Updated current stock
 *                       minStockLevel:
 *                         type: integer
 *                         description: Updated minimum stock level
 *                       maxStockLevel:
 *                         type: integer
 *                         description: Updated maximum stock level
 *                       lastUpdated:
 *                         type: string
 *                         format: date-time
 *                         description: Last update date
 */
router.post('/bulk-update', validate(bulkUpdateSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { updates } = req.body;

    const results = await Promise.all(
      updates.map(async (update: any) => {
        try {
          const inventory = await prisma.inventory.findFirst({
            where: { productId: update.productId, storeId, deletedAt: null },
            include: {
              product: {
                select: { name: true }
              }
            }
          });

          if (!inventory) {
            return {
              productId: update.productId,
              success: false,
              error: 'Inventory item not found'
            };
          }

          const updateData: any = {};

          if (update.currentStock !== undefined) {
            updateData.currentStock = update.currentStock;
            updateData.lastRestocked = new Date();
          }

          if (update.adjustment !== undefined) {
            updateData.currentStock = inventory.currentStock + update.adjustment;
            updateData.lastRestocked = new Date();
          }

          if (update.minStockLevel !== undefined) {
            updateData.minStockLevel = update.minStockLevel;
          }

          if (update.maxStockLevel !== undefined) {
            updateData.maxStockLevel = update.maxStockLevel;
          }

          const updatedInventory = await prisma.inventory.update({
            where: { id: inventory.id },
            data: updateData
          });

          return {
            productId: update.productId,
            productName: inventory.product.name,
            success: true,
            oldStock: inventory.currentStock,
            newStock: updatedInventory.currentStock
          };
        } catch (error) {
          return {
            productId: update.productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Bulk inventory update completed:', {
      totalUpdates: updates.length,
      successCount,
      failureCount,
      storeId
    });

    res.json({
      message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
      results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/inventory/low-stock:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get low stock items
 *     description: Retrieve items with current stock below minimum threshold
 *     responses:
 *       200:
 *         description: List of low stock items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lowStockItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Inventory ID
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           category:
 *                             type: string
 *                           brand:
 *                             type: string
 *                       currentStock:
 *                         type: integer
 *                         description: Current stock quantity
 *                       minStockLevel:
 *                         type: integer
 *                         description: Minimum stock level
 *                       maxStockLevel:
 *                         type: integer
 *                         description: Maximum stock level
 *                       lastUpdated:
 *                         type: string
 *                         format: date-time
 *                         description: Last update date
 */
router.get('/low-stock', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;

    const lowStockItems = await prisma.inventory.findMany({
      where: {
        storeId,
        deletedAt: null,
        currentStock: { lte: prisma.inventory.fields.minStockLevel },
        product: {
          deletedAt: null,
          isActive: true
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            sellingPrice: true
          }
        }
      },
      orderBy: [
        { currentStock: 'asc' },
        { product: { name: 'asc' } }
      ]
    });

    res.json({ lowStockItems });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/inventory/send-low-stock-alert:
 *   post:
 *     tags: [Store Admin]
 *     summary: Send low stock alert email
 *     description: Send email notification about low stock items to store admins
 *     responses:
 *       200:
 *         description: Low stock alert email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 recipients:
 *                   type: array
 *                   items:
 *                     type: string
 *                     description: Email addresses of recipients
 *                 lowStockItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Inventory ID
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           category:
 *                             type: string
 *                           brand:
 *                             type: string
 *                       currentStock:
 *                         type: integer
 *                         description: Current stock quantity
 *                       minStockLevel:
 *                         type: integer
 *                         description: Minimum stock level
 *                       maxStockLevel:
 *                         type: integer
 *                         description: Maximum stock level
 *                       lastUpdated:
 *                         type: string
 *                         format: date-time
 *                         description: Last update date
 */
router.post('/send-low-stock-alert', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;

    // Get store and admin details
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        users: {
          where: {
            role: 'STOREADMIN',
            isActive: true,
            deletedAt: null
          },
          select: { email: true }
        }
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    // Get low stock items
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        storeId,
        deletedAt: null,
        currentStock: { lte: prisma.inventory.fields.minStockLevel },
        product: {
          deletedAt: null,
          isActive: true
        }
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (lowStockItems.length === 0) {
      res.json({ message: 'No low stock items found' });
    }

    // Send email to all store admins
    const emailPromises = store.users.map((user: any) => 
      sendLowStockAlert(
        user.email,
        store.name,
        lowStockItems.map((item: any) => ({
          name: item.product.name,
          currentStock: item.currentStock,
          minStockLevel: item.minStockLevel
        }))
      )
    );

    await Promise.all(emailPromises);

    logger.info('Low stock alert sent successfully:', {
      storeId,
      storeName: store.name,
      lowStockCount: lowStockItems.length,
      adminCount: store.users.length
    });

    res.status(200).json({ 
      message: 'Low stock alert sent successfully',
      lowStockCount: lowStockItems.length,
      emailsSent: store.users.length
    });
  } catch (error) {
    next(error);
  }
});

// Get inventory statistics
router.get('/stats/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;

    const [
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
      categoryStats
    ] = await Promise.all([
      prisma.inventory.count({
        where: { storeId, deletedAt: null }
      }),
      prisma.inventory.count({
        where: {
          storeId,
          deletedAt: null,
          currentStock: { lte: prisma.inventory.fields.minStockLevel }
        }
      }),
      prisma.inventory.count({
        where: {
          storeId,
          deletedAt: null,
          currentStock: 0
        }
      }),
      prisma.$queryRaw`
        SELECT SUM(i."currentStock" * p."sellingPrice") as total_value
        FROM inventory i
        JOIN products p ON i."productId" = p.id
        WHERE i."storeId" = ${storeId}
          AND i."deletedAt" IS NULL
          AND p."deletedAt" IS NULL
      `,
      prisma.$queryRaw`
        SELECT 
          p.category,
          COUNT(*) as product_count,
          SUM(i."currentStock") as total_stock,
          SUM(i."currentStock" * p."sellingPrice") as category_value
        FROM inventory i
        JOIN products p ON i."productId" = p.id
        WHERE i."storeId" = ${storeId}
          AND i."deletedAt" IS NULL
          AND p."deletedAt" IS NULL
        GROUP BY p.category
        ORDER BY category_value DESC
      `
    ]);

    res.json({
      summary: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalStockValue: (totalStockValue as any)[0]?.total_value || 0,
        categoryBreakdown: categoryStats
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;