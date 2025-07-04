import express from 'express';
import { prisma } from '@/utils/database';
import { validate } from '@/middleware/validation';
import { createPOSReceiptSchema } from '@/utils/validation';
import { convertNumberToWords } from '@/utils/numberUtils';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { generateInvoicePDF } from '@/services/pdfGenerator';
import { uploadInvoicePDF } from '@/services/firebase';

const router = express.Router();

/**
 * @swagger
 * /api/storeadmin/pos:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all POS receipts
 *     description: Retrieve all POS receipts with filtering and pagination
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
 *     responses:
 *       200:
 *         description: List of POS receipts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receipts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Receipt ID
 *                       receiptNumber:
 *                         type: string
 *                         description: Receipt number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Receipt creation date
 *                       customerName:
 *                         type: string
 *                         description: Customer name
 *                       customerPhone:
 *                         type: string
 *                         description: Customer phone number
 *                       totalAmount:
 *                         type: number
 *                         description: Total receipt amount
 *                       amountReceived:
 *                         type: number
 *                         description: Amount received
 *                       discountAmount:
 *                         type: number
 *                         description: Discount amount
 *                       discountPercentage:
 *                         type: number
 *                         description: Discount percentage
 *                       paymentMethod:
 *                         type: string
 *                         description: Payment method used
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
 *                       description: Total number of receipts
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

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

    const skip = (Number(page) - 1) * Number(limit);

    const [receipts, total] = await Promise.all([
      prisma.pOSReceipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.pOSReceipt.count({ where })
    ]);

    // Calculate discount information for each receipt
    const receiptsWithDiscounts = receipts.map((receipt: any) => {
      let discountAmount = 0;
      let discountPercentage = 0;

      if (receipt.amountReceived !== null && receipt.amountReceived < receipt.totalAmount) {
        discountAmount = receipt.totalAmount - receipt.amountReceived;
        discountPercentage = (discountAmount / receipt.totalAmount) * 100;
      }

      return {
        ...receipt,
        discountAmount,
        discountPercentage: Math.round(discountPercentage * 100) / 100 // Round to 2 decimal places
      };
    });

    res.json({
      receipts: receiptsWithDiscounts,
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
 * /api/storeadmin/pos/{id}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get POS receipt by ID
 *     description: Retrieve a specific POS receipt by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: POS receipt retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receipt:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Receipt ID
 *                     receiptNumber:
 *                       type: string
 *                       description: Receipt number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Receipt creation date
 *                     customerName:
 *                       type: string
 *                       description: Customer name
 *                     customerPhone:
 *                       type: string
 *                       description: Customer phone number
 *                     totalAmount:
 *                       type: number
 *                       description: Total receipt amount
 *                     amountReceived:
 *                       type: number
 *                       description: Amount received
 *                     discountAmount:
 *                       type: number
 *                       description: Discount amount
 *                     discountPercentage:
 *                       type: number
 *                       description: Discount percentage
 *                     paymentMethod:
 *                       type: string
 *                       description: Payment method used
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
 *                     receiptUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of receipt PDF
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const receipt = await prisma.pOSReceipt.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!receipt) {
      throw createError('POS receipt not found', 404);
    }

    // Calculate discount information
    let discountAmount = 0;
    let discountPercentage = 0;

    if (receipt.amountReceived !== null && receipt.amountReceived < receipt.totalAmount) {
      discountAmount = receipt.totalAmount - receipt.amountReceived;
      discountPercentage = (discountAmount / receipt.totalAmount) * 100;
    }

    res.json({
      receipt: {
        ...receipt,
        discountAmount,
        discountPercentage: Math.round(discountPercentage * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/pos:
 *   post:
 *     tags: [Store Admin]
 *     summary: Create new POS receipt
 *     description: Create a new POS receipt with customer details and items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *                 description: Customer name
 *               customerPhone:
 *                 type: string
 *                 description: Customer phone number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used
 *               amountReceived:
 *                 type: number
 *                 description: Amount received from customer
 *     responses:
 *       201:
 *         description: POS receipt created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receipt:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Receipt ID
 *                     receiptNumber:
 *                       type: string
 *                       description: Receipt number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Receipt creation date
 *                     totalAmount:
 *                       type: number
 *                       description: Total receipt amount
 *                     amountReceived:
 *                       type: number
 *                       description: Amount received
 *                     changeAmount:
 *                       type: number
 *                       description: Change amount
 *                     receiptUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of receipt PDF
 */
router.post('/', validate(createPOSReceiptSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { customerName, customerPhone, items, paymentMethod, amountReceived } = req.body;

    // Get store details for branding
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    // Validate products exist and calculate totals
    let subtotal = 0;
    let totalGST = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          storeId,
          deletedAt: null,
          isActive: true
        }
      });

      if (!product) {
        throw createError(`Product ${item.productName} not found or inactive`, 404);
      }

      const itemTotal = item.quantity * item.unitPrice;
      const gstAmount = (itemTotal * item.gstRate) / 100;
      const itemTotalWithGST = itemTotal + gstAmount;

      subtotal += itemTotal;
      totalGST += gstAmount;

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        gstAmount,
        totalAmount: itemTotalWithGST
      });

      // Update inventory
      await prisma.inventory.updateMany({
        where: { productId: item.productId, storeId },
        data: {
          currentStock: {
            decrement: item.quantity
          }
        }
      });
    }

    const totalAmount = subtotal + totalGST;

    // Validate amount received if provided
    if (amountReceived !== undefined && amountReceived < 0) {
      throw createError('Amount received cannot be negative', 400);
    }

    // Generate receipt number
    const receiptCount = await prisma.pOSReceipt.count({
      where: { storeId }
    });
    const receiptNumber = `POS-${store.slug.toUpperCase()}-${String(receiptCount + 1).padStart(6, '0')}`;

    // Create POS receipt
    const receipt = await prisma.pOSReceipt.create({
      data: {
        receiptNumber,
        storeId,
        customerName,
        customerPhone,
        items: validatedItems,
        subtotal,
        gstAmount: totalGST,
        totalAmount,
        amountReceived,
        paymentMethod
      }
    });

    // Generate PDF
    // Transform items to match InvoiceData interface
    const transformedItems = items.map((item: any) => ({
      name: item.productName,
      particulars: item.description,
      quantity: item.quantity,
      rate: item.unitPrice,
      per: 'PCS',
      amount: item.totalAmount
    }));

    const invoiceData = {
      invoiceNumber: receiptNumber,
      date: new Date().toLocaleDateString('en-IN'),
      storeName: store.name,
      storeAddress: store.address ?? undefined,
      storePhone: store.phone ?? undefined,
      storeEmail: store.email ?? undefined,
      storeGST: store.gstNumber ?? undefined,
      brandColor: store.brandColor,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      items: transformedItems,
      subtotal,
      totalGST,
      grandTotal: totalAmount,
      paymentMethod,
      notes: amountReceived !== undefined && amountReceived !== totalAmount 
        ? `Amount Received: ₹${amountReceived}${amountReceived < totalAmount ? ` (Discount: ₹${totalAmount - amountReceived})` : ''}`
        : undefined,
      total: totalAmount,
      totalInWords: convertNumberToWords(totalAmount)
    } as const;

    const pdfBuffer = await generateInvoicePDF(invoiceData);
    const pdfUrl = await uploadInvoicePDF(pdfBuffer, storeId, receiptNumber);

    // Update receipt with PDF URL
    await prisma.pOSReceipt.update({
      where: { id: receipt.id },
      data: { pdfUrl }
    });

    // Calculate discount information for response
    let discountAmount = 0;
    let discountPercentage = 0;

    if (amountReceived !== undefined && amountReceived < totalAmount) {
      discountAmount = totalAmount - amountReceived;
      discountPercentage = (discountAmount / totalAmount) * 100;
    }

    logger.info('POS receipt created successfully:', {
      receiptId: receipt.id,
      receiptNumber,
      totalAmount,
      amountReceived,
      discountAmount,
      storeId
    });

    res.status(201).json({
      receipt: {
        ...receipt,
        pdfUrl,
        discountAmount,
        discountPercentage: Math.round(discountPercentage * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/pos/summary/date-range:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get POS receipt summary for date range
 *     description: Get summary statistics for POS receipts within a date range
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the range
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the range
 *     responses:
 *       200:
 *         description: POS receipt summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalReceipts:
 *                       type: integer
 *                       description: Total number of receipts
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue
 *                     totalDiscounts:
 *                       type: number
 *                       description: Total discounts given
 *                     averageReceipt:
 *                       type: number
 *                       description: Average receipt amount
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           productName:
 *                             type: string
 *                           totalQuantity:
 *                             type: integer
 *                           totalRevenue:
 *                             type: number
 *                     paymentMethods:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       description: Revenue by payment method
 *                     hourlyStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: integer
 *                           receipts:
 *                             type: integer
 *                           revenue:
 *                             type: number
 */
router.get('/summary/date-range', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw createError('Start date and end date are required', 400);
    }

    const receipts = await prisma.pOSReceipt.findMany({
      where: {
        storeId,
        deletedAt: null,
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      }
    });

    let totalSales = 0;
    let totalDiscount = 0;
    let totalReceived = 0;
    let receiptCount = receipts.length;

    receipts.forEach((receipt: any) => {
      totalSales += receipt.totalAmount;
      if (receipt.amountReceived !== null) {
        totalReceived += receipt.amountReceived;
        if (receipt.amountReceived < receipt.totalAmount) {
          totalDiscount += (receipt.totalAmount - receipt.amountReceived);
        }
      } else {
        totalReceived += receipt.totalAmount;
      }
    });

    const averageDiscountPercentage = totalSales > 0 ? (totalDiscount / totalSales) * 100 : 0;

    res.json({
      summary: {
        receiptCount,
        totalSales,
        totalDiscount,
        totalReceived,
        averageDiscountPercentage: Math.round(averageDiscountPercentage * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;