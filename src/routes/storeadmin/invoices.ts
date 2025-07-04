import express from 'express';
import { prisma } from '../../utils/database';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/storeadmin/invoices:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all invoices
 *     description: Retrieve all invoices with filtering and pagination
 *     parameters:
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search invoices by invoice number
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pos, order]
 *         description: Filter by invoice type (POS or Order)
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Invoice ID
 *                       invoiceNumber:
 *                         type: string
 *                         description: Invoice number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Invoice creation date
 *                       totalAmount:
 *                         type: number
 *                         description: Total invoice amount
 *                       isPos:
 *                         type: boolean
 *                         description: Whether it's a POS invoice
 *                       order:
 *                         type: object
 *                         properties:
 *                           orderNumber:
 *                             type: string
 *                             description: Order number
 *                           customer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                                 format: email
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             productId:
 *                               type: string
 *                             productName:
 *                               type: string
 *                             quantity:
 *                               type: integer
 *                             price:
 *                               type: number
 *                             subtotal:
 *                               type: number
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
 *                       description: Total number of invoices
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { page = 1, limit = 20, startDate, endDate, search, type } = req.query;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (search) {
      where.invoiceNumber = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    if (type === 'pos') {
      where.isPos = true;
    } else if (type === 'order') {
      where.isPos = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      invoices,
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
 * /api/storeadmin/invoices/{id}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get invoice by ID
 *     description: Retrieve a specific invoice by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoice:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Invoice ID
 *                     invoiceNumber:
 *                       type: string
 *                       description: Invoice number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Invoice creation date
 *                     totalAmount:
 *                       type: number
 *                       description: Total invoice amount
 *                     isPos:
 *                       type: boolean
 *                       description: Whether it's a POS invoice
 *                     order:
 *                       type: object
 *                       properties:
 *                         orderNumber:
 *                           type: string
 *                           description: Order number
 *                         customer:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             phone:
 *                               type: string
 *                             email:
 *                               type: string
 *                               format: email
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           productId:
 *                             type: string
 *                           productName:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           price:
 *                             type: number
 *                           subtotal:
 *                             type: number
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           paymentMethod:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const invoice = await prisma.invoice.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                    brand: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/invoices/stats/summary:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get invoice statistics
 *     description: Get statistics about invoices
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Invoice statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: integer
 *                       description: Total number of invoices
 *                     totalRevenue:
 *                       type: number
 *                       description: Total invoice revenue
 *                     orderInvoices:
 *                       type: integer
 *                       description: Number of order invoices
 *                     posInvoices:
 *                       type: integer
 *                       description: Number of POS invoices
 *                 monthlyStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: date
 *                       invoiceCount:
 *                         type: integer
 *                       revenue:
 *                         type: number
 *                       posInvoices:
 *                         type: integer
 *                       orderInvoices:
 *                         type: integer
 */
router.get('/stats/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { startDate, endDate } = req.query;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      totalInvoices,
      totalRevenue,
      orderInvoices,
      posInvoices,
      monthlyStats
    ] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      prisma.invoice.count({
        where: { ...where, isPos: false }
      }),
      prisma.invoice.count({
        where: { ...where, isPos: true }
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as invoice_count,
          SUM("totalAmount") as revenue,
          COUNT(CASE WHEN "isPos" = true THEN 1 END) as pos_invoices,
          COUNT(CASE WHEN "isPos" = false THEN 1 END) as order_invoices
        FROM invoices 
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `
    ]);

    res.json({
      summary: {
        totalInvoices,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        orderInvoices,
        posInvoices
      },
      monthlyStats
    });
  } catch (error) {
    next(error);
  }
});

export default router;