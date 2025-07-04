import express from 'express';
import multer from 'multer';
import { prisma } from '@/utils/database';
import { validate } from '@/middleware/validation';
import { createOrderSchema } from '@/utils/validation';
import { convertNumberToWords } from '@/utils/numberUtils';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { generateInvoicePDF } from '@/services/pdfGenerator';
import { uploadInvoicePDF, uploadLRPhoto } from '@/services/firebase';
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from '@/services/mailgun';
import { InvoiceData as DatabaseInvoiceData } from '@/types';
import { InvoiceData as PDFInvoiceData } from '@/services/pdfGenerator';

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

interface PDFInvoiceItem {
  name: string;
  particulars?: string;
  quantity: number;
  rate: number;
  per: string;
  amount: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

interface InvoiceItem {
  name: string;
  particulars?: string;
  quantity: number;
  rate: number;
  per?: string;
  amount: number;
}

const router = express.Router();

// Configure multer for LR photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/storeadmin/orders:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all orders
 *     description: Retrieve all orders with filtering and pagination
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
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
 *         description: Search orders by order number or customer name
 *     responses:
 *       200:
 *         description: List of orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Order ID
 *                       orderNumber:
 *                         type: string
 *                         description: Order number
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, shipped, delivered, cancelled]
 *                         description: Current order status
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Order creation date
 *                       customer:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           email:
 *                             type: string
 *                             format: email
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
 *                       totalAmount:
 *                         type: number
 *                         description: Total order amount
 *                       paymentMethod:
 *                         type: string
 *                         description: Payment method used
 *                       shippingDetails:
 *                         type: object
 *                         properties:
 *                           address:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           pincode:
 *                             type: string
 *                       lrPhotoUrl:
 *                         type: string
 *                         format: uri
 *                         description: URL of LR photo
 *                       invoiceUrl:
 *                         type: string
 *                         format: uri
 *                         description: URL of invoice PDF
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
 *                       description: Total number of orders
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { status, page = 1, limit = 20, startDate, endDate, search } = req.query;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { phone: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
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
 * /api/storeadmin/orders/{id}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get order by ID
 *     description: Retrieve a specific order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Order ID
 *                     orderNumber:
 *                       type: string
 *                       description: Order number
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, shipped, delivered, cancelled]
 *                       description: Current order status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Order creation date
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
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
 *                     totalAmount:
 *                       type: number
 *                       description: Total order amount
 *                     paymentMethod:
 *                       type: string
 *                       description: Payment method used
 *                     shippingDetails:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         pincode:
 *                           type: string
 *                     lrPhotoUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of LR photo
 *                     invoiceUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of invoice PDF
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           notes:
 *                             type: string
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const order = await prisma.order.findFirst({
      where: { id, storeId, deletedAt: null },
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
        },
        invoices: true
      }
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/orders:
 *   post:
 *     tags: [Store Admin]
 *     summary: Create new order
 *     description: Create a new order with customer details and items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
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
 *               notes:
 *                 type: string
 *                 description: Additional order notes
 *               shippingDetails:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Order ID
 *                     orderNumber:
 *                       type: string
 *                       description: Order number
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, shipped, delivered, cancelled]
 *                       description: Current order status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Order creation date
 *                     totalAmount:
 *                       type: number
 *                       description: Total order amount
 *                     invoiceUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of invoice PDF
 */
router.post('/', validate(createOrderSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { customerId, items, paymentMethod, notes } = req.body;

    // Get store details
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    // Verify customer exists and belongs to store
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, storeId, deletedAt: null }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Validate products and calculate totals
    let subtotal = 0;
    let totalGST = 0;
    const orderItems: OrderItem[] = [];

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
        throw createError(`Product not found: ${item.productId}`, 404);
      }

      // Check inventory
      const inventory = await prisma.inventory.findFirst({
        where: { productId: item.productId, storeId }
      });

      if (!inventory || inventory.currentStock < item.quantity) {
        throw createError(`Insufficient stock for product: ${product.name}`, 400);
      }

      const itemTotal = item.quantity * product.sellingPrice;
      const gstAmount = (itemTotal * product.gstRate) / 100;
      const itemTotalWithGST = itemTotal + gstAmount;

      subtotal += itemTotal;
      totalGST += gstAmount;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        gstRate: product.gstRate,
        gstAmount,
        totalAmount: itemTotalWithGST
      });
    }

    const totalAmount = subtotal + totalGST;

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { storeId }
    });
    const orderNumber = `ORD-${store.slug.toUpperCase()}-${String(orderCount + 1).padStart(6, '0')}`;

    // Create order with items in a transaction
    const createOrder = await prisma.$transaction(async (tx: any) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          storeId,
          subtotal,
          gstAmount: totalGST,
          totalAmount,
          paymentMethod,
          notes,
          status: 'PAID'
        }
      });

      // Create order items and update inventory
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            ...item
          }
        });

        // Update inventory
        await tx.inventory.updateMany({
          where: { productId: item.productId, storeId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        });
      }

      return newOrder;
    });

    // Generate invoice
    const invoiceCount = await prisma.invoice.count({
      where: { storeId }
    });
    // Get complete order data for response
    const orderData = await prisma.order.findUnique({
      where: { id: createOrder.id },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        storeId: true,
        subtotal: true,
        gstAmount: true,
        totalAmount: true,
        paymentMethod: true,
        notes: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalAmount: true
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            gstNumber: true,
            brandColor: true
          }
        }
      }
    });

    if (!orderData) {
      return next(createError('Order not found', 404));
    }

    const completeOrder = {
      ...orderData,
      subtotal: String(orderData.subtotal),
      gstAmount: String(orderData.gstAmount),
      totalAmount: String(orderData.totalAmount),
      orderItems: orderData.orderItems
    };

    const invoiceNumber = `INV-${store.slug.toUpperCase()}-${String(invoiceCount + 1).padStart(6, '0')}`;

    const invoiceData: DatabaseInvoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString('en-IN'),
      storeName: store.name,
      storeAddress: store.address ?? undefined,
      storePhone: store.phone ?? undefined,
      storeEmail: store.email ?? undefined,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerAddress: customer.address ?? undefined,
      customerPhone: customer.phone,
      items: orderData.orderItems.map((item: { id: string; quantity: number; unitPrice: number; totalAmount: number; product: { name: string; description: string | null } }) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: item.totalAmount
      })) as InvoiceItem[],
      subtotal: orderData.subtotal,
      totalGst: orderData.gstAmount,
      total: orderData.totalAmount,
      totalInWords: convertNumberToWords(orderData.totalAmount),
      paymentMethod: orderData.paymentMethod
    };

    // Create a separate version for PDF generation with the correct type
    const pdfInvoiceData: PDFInvoiceData = {
      invoiceNumber: invoiceData.invoiceNumber,
      date: invoiceData.date,
      storeName: invoiceData.storeName,
      storeAddress: invoiceData.storeAddress,
      storePhone: invoiceData.storePhone,
      storeEmail: invoiceData.storeEmail,
      storeGST: store.gstNumber ?? undefined,
      brandColor: store.brandColor,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      items: orderData.orderItems.map((item: { id: string; quantity: number; unitPrice: number; totalAmount: number; product: { name: string; description: string | null } }) => ({
        name: item.product.name,
        particulars: item.product.description || undefined,
        quantity: item.quantity,
        rate: item.unitPrice,
        per: 'PCS',
        amount: item.totalAmount
      })) as PDFInvoiceItem[],
      total: invoiceData.total,
      totalInWords: invoiceData.totalInWords,
      modeOfPayment: invoiceData.paymentMethod
    };

    const pdfBuffer = await generateInvoicePDF(pdfInvoiceData);
    const pdfUrl = await uploadInvoicePDF(pdfBuffer, storeId, invoiceNumber);

    // Create invoice record
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: createOrder.id,
        storeId,
        customerId,
        subtotal: orderData.subtotal,
        gstAmount: orderData.gstAmount,
        totalAmount: orderData.totalAmount,
        pdfUrl
      }
    });

    // Send order confirmation email if customer has email
    if (customer.email) {
      try {
        await sendOrderConfirmationEmail(
          customer.email,
          orderNumber,
          store.name,
          {
            totalAmount,
            status: 'PAID'
          }
        );
      } catch (emailError) {
        logger.error('Failed to send order confirmation email:', emailError);
      }
    }

    logger.info('Order created successfully:', {
      orderId: createOrder.id,
      orderNumber,
      customerId,
      totalAmount: orderData.totalAmount,
      storeId
    });

    res.status(201).json({ order: completeOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/orders/{id}/status:
 *   patch:
 *     tags: [Store Admin]
 *     summary: Update order status
 *     description: Update the status of an existing order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *                 description: New order status
 *               notes:
 *                 type: string
 *                 description: Status update notes
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Order ID
 *                     status:
 *                       type: string
 *                       description: Updated order status
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Status update timestamp
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const storeId = req.user!.storeId!;

    if (!['PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      throw createError('Invalid order status', 400);
    }

    const order = await prisma.order.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        customer: true
      }
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    const updateData: any = { status };

    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData
    });

    logger.info('Order status updated:', {
      orderId: id,
      oldStatus: order.status,
      newStatus: status
    });

    res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/orders/{id}/ship:
 *   post:
 *     tags: [Store Admin]
 *     summary: Upload LR photo and mark as shipped
 *     description: Upload a photo of the LR (Lorry Receipt) for an order and mark it as shipped
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               lrPhoto:
 *                 type: string
 *                 format: binary
 *                 description: LR photo file
 *               lrNumber:
 *                 type: string
 *                 description: LR number
 *     responses:
 *       200:
 *         description: Order marked as shipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Order ID
 *                     status:
 *                       type: string
 *                       description: Updated order status
 *                     lrPhotoUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL of uploaded LR photo
 *                     lrNumber:
 *                       type: string
 *                       description: LR number
 */
router.post('/:id/ship', upload.single('lrPhoto'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { lrNumber } = req.body;
    const storeId = req.user!.storeId!;
    const file = req.file;

    if (!lrNumber) {
      throw createError('LR number is required', 400);
    }

    if (!file) {
      throw createError('LR photo is required', 400);
    }

    const order = await prisma.order.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        customer: true,
        store: {
          select: { name: true }
        }
      }
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    if (order.status !== 'PACKED') {
      throw createError('Order must be in PACKED status to ship', 400);
    }

    // Upload LR photo
    const lrPhotoUrl = await uploadLRPhoto(file.buffer, id, file.originalname);

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        lrNumber,
        lrPhotoUrl,
        shippedAt: new Date()
      }
    });

    // Send shipped email if customer has email
    if (order.customer && order.customer.email) {
      try {
        await sendOrderShippedEmail(
          order.customer.email,
          order.orderNumber,
          order.store.name,
          lrNumber,
          lrPhotoUrl
        );
      } catch (emailError) {
        logger.error('Failed to send order shipped email:', emailError);
      }
    }

    logger.info('Order shipped successfully:', {
      orderId: id,
      orderNumber: order.orderNumber,
      lrNumber,
      lrPhotoUrl
    });

    res.json({ 
      order: updatedOrder,
      message: 'Order marked as shipped successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/orders/{id}/cancel:
 *   post:
 *     tags: [Store Admin]
 *     summary: Cancel order
 *     description: Cancel an existing order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 */
router.post('/:id/cancel', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const storeId = req.user!.storeId!;

    const order = await prisma.order.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        orderItems: true
      }
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw createError('Cannot cancel order in current status', 400);
    }

    // Restore inventory in a transaction
    await prisma.$transaction(async (tx: any) => {
      // Update order status
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: order.notes ? `${order.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`
        }
      });

      // Restore inventory
      for (const item of order.orderItems) {
        await tx.inventory.updateMany({
          where: { productId: item.productId, storeId },
          data: {
            currentStock: {
              increment: item.quantity
            }
          }
        });
      }
    });

    logger.info('Order cancelled successfully:', {
      orderId: id,
      orderNumber: order.orderNumber,
      reason
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/orders/stats/summary:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get order statistics
 *     description: Get statistics about orders
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
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders
 *                     totalRevenue:
 *                       type: number
 *                       description: Total order revenue
 *                     pendingOrders:
 *                       type: integer
 *                       description: Number of pending orders
 *                     processingOrders:
 *                       type: integer
 *                       description: Number of processing orders
 *                     shippedOrders:
 *                       type: integer
 *                       description: Number of shipped orders
 *                     deliveredOrders:
 *                       type: integer
 *                       description: Number of delivered orders
 *                     cancelledOrders:
 *                       type: integer
 *                       description: Number of cancelled orders
 *                 monthlyStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: date
 *                       orderCount:
 *                         type: integer
 *                       revenue:
 *                         type: number
 *                       statusCounts:
 *                         type: object
 *                         additionalProperties:
 *                           type: integer
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
      totalOrders,
      totalRevenue,
      statusCounts,
      monthlyStats
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as orders,
          SUM("totalAmount") as revenue
        FROM orders 
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `
    ]);

    res.json({
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        statusBreakdown: statusCounts.reduce((acc: any, item: any) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      },
      monthlyStats
    });
  } catch (error) {
    next(error);
  }
});

export default router;