import express from 'express';
import { prisma } from '../utils/database';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { Address, Order, OrderItem } from '@prisma/client';

const router = express.Router();

/**
 * POST /api/public/orders
 * Place an order as guest or authenticated user
 */
/**
 * @swagger
 * /api/public/orders:
 *   post:
 *     tags: [Public]
 *     summary: Place an order as guest or authenticated user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: string
 *                 description: JSON stringified array of order items
 *               paymentMethod:
 *                 type: string
 *               guestName:
 *                 type: string
 *               guestEmail:
 *                 type: string
 *               guestPhone:
 *                 type: string
 *               address:
 *                 type: string
 *                 description: JSON stringified address object
 *               addressId:
 *                 type: string
 *               paymentScreenshot:
 *                 type: string
 *                 format: binary
 *                 description: Optional payment screenshot file
 *     responses:
 *       201:
 *         description: Order placed successfully
 */
import multer from 'multer';
import { uploadFile } from '../services/firebase';
import { sendPaymentScreenshotEmail } from '../services/mailgun';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post(
  '/orders',
  upload.single('paymentScreenshot'),
  // Validation middleware
  [
    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
      const Joi = require('joi');
      // Address schema (matches Prisma Address model)
      const addressSchema = Joi.object({
        name: Joi.string().allow('', null),
        line1: Joi.string().required(),
        line2: Joi.string().allow('', null),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zip: Joi.string().required(),
        country: Joi.string().required(),
        phone: Joi.string().allow('', null)
      });
      // Order item schema (matches Prisma OrderItem model)
      const orderItemSchema = Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required()
      });
      // Main schema
      const schema = Joi.object({
        items: Joi.string().required(), // Will be parsed and validated below
        paymentMethod: Joi.string().required(),
        guestName: Joi.string().when(Joi.object({ userId: Joi.exist() }).unknown(), {
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        guestEmail: Joi.string().email().when(Joi.object({ userId: Joi.exist() }).unknown(), {
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        guestPhone: Joi.string().pattern(/^[0-9]{10,15}$/).when(Joi.object({ userId: Joi.exist() }).unknown(), {
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        address: Joi.string().when(Joi.object({ userId: Joi.exist() }).unknown(), {
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        addressId: Joi.string().when(Joi.object({ userId: Joi.exist() }).unknown(), {
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        paymentScreenshot: Joi.any()
      });
      // Validate the base fields
      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({ error: error.details.map((d: import('joi').ValidationErrorItem) => d.message).join(', ') });
      }
      // Parse and validate items
      let items;
      try {
        items = JSON.parse(req.body.items);
      } catch {
        return res.status(400).json({ error: 'Invalid items format (must be JSON array)' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
      }
      for (const item of items) {
        const { error: itemErr } = orderItemSchema.validate(item);
        if (itemErr) {
          return res.status(400).json({ error: `Invalid item: ${itemErr.details.map((d: import('joi').ValidationErrorItem) => d.message).join(', ')}` });
        }
      }
      // Parse and validate address if provided
      if (req.body.address) {
        let addressObj;
        try {
          addressObj = JSON.parse(req.body.address);
        } catch {
          return res.status(400).json({ error: 'Invalid address format (must be JSON object)' });
        }
        const { error: addrErr } = addressSchema.validate(addressObj);
        if (addrErr) {
          return res.status(400).json({ error: `Invalid address: ${addrErr.details.map((d: import('joi').ValidationErrorItem) => d.message).join(', ')}` });
        }
      }
      return next();
    }
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      // Parse JSON fields if multipart/form-data
      let items, address;
      if (req.is('multipart/form-data')) {
        try {
          items = JSON.parse(req.body.items);
        } catch {
          return res.status(400).json({ error: 'Invalid items format (must be JSON array)' });
        }
        if (req.body.address) {
          try { address = JSON.parse(req.body.address); } catch { address = undefined; }
        }
      } else {
        items = req.body.items;
        address = req.body.address;
      }
      const { paymentMethod, guestName, guestEmail, guestPhone, addressId } = req.body;
      // Use userId from JWTPayload, not id
      let userId = req.user?.userId;
      let orderAddressId: string | null = null;
      let createdAddress: Address | null = null;

      // Authenticated user: use addressId or create new address
      if (userId) {
        if (addressId) {
          // Use existing address
          const addr = await prisma.address.findUnique({ where: { id: addressId, userId } });
          if (!addr) return res.status(400).json({ error: 'Invalid addressId' });
          orderAddressId = addr.id;
        } else if (address) {
          // Create new address for user
          createdAddress = await prisma.address.create({
            data: { ...address, userId },
          });
          orderAddressId = createdAddress.id;
        } else {
          return res.status(400).json({ error: 'Address required' });
        }
      } else {
        // Guest: require guest info and address
        if (!guestName || !guestEmail || !guestPhone || !address) {
          return res.status(400).json({ error: 'Guest name, email, phone, and address required' });
        }
        // Find or create customer for this guest (by email/phone and storeId)
        let customer = await prisma.customer.findFirst({
          where: {
            storeId: items[0] ? (await prisma.product.findUnique({ where: { id: items[0].productId } }))!.storeId : '',
            OR: [
              { email: guestEmail },
              { phone: guestPhone }
            ]
          }
        });
        if (!customer) {
          // Try to split guestName into firstName/lastName
          let firstName = guestName;
          let lastName = '';
          if (guestName && guestName.includes(' ')) {
            const parts = guestName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }
          customer = await prisma.customer.create({
            data: {
              firstName,
              lastName,
              email: guestEmail,
              phone: guestPhone,
              address: address.line1,
              city: address.city,
              state: address.state,
              pincode: address.zip,
              storeId: items[0] ? (await prisma.product.findUnique({ where: { id: items[0].productId } }))!.storeId : '',
              notes: 'Guest order auto-created',
              isGuest: true,
            }
          });
        }
        // Create address for guest (no userId)
        createdAddress = await prisma.address.create({
          data: { ...address, userId: null, name: 'Guest Address' },
        });
        orderAddressId = createdAddress.id;
        // Attach customerId for use in order creation
        req.body._customerId = customer.id;
      }

      // Calculate order totals (you may want to refactor this for discounts, taxes, etc.)
      let subtotal = 0;
      let gstAmount = 0;
      let totalAmount = 0;
      const orderItems: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>[] = [];
      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) return res.status(400).json({ error: `Product not found: ${item.productId}` });
        const itemTotal = product.sellingPrice * item.quantity;
        subtotal += itemTotal;
        // Assume GST is included in sellingPrice for now
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          totalAmount: itemTotal,
        });
        // gstRate removed, no gstAmount increment
        totalAmount += itemTotal;
      }

      // Generate unique order number (can be improved)
      const orderNumber = 'ORD-' + Date.now();

      // Handle payment screenshot upload if present
      let paymentScreenshotUrl: string | undefined = undefined;
      if (req.file) {
        try {
          paymentScreenshotUrl = await uploadFile(
            req.file.buffer,
            `${orderNumber}_${Date.now()}_${req.file.originalname}`,
            req.file.mimetype,
            'payment-screenshots'
          );
        } catch (uploadErr) {
          return res.status(500).json({ error: 'Failed to upload payment screenshot' });
        }
      }

      // Create order and order items atomically
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          guestName: guestName || null,
          guestEmail: guestEmail || null,
          guestPhone: guestPhone || null,
          addressId: orderAddressId,
          storeId: items[0] ? (await prisma.product.findUnique({ where: { id: items[0].productId } }))!.storeId : '',
          status: 'PAID',
          subtotal,
          totalAmount,
          paymentMethod: paymentMethod || 'CASH',
          paymentScreenshotUrl: paymentScreenshotUrl || null,
          customerId: userId ? undefined : req.body._customerId, // Only for guest orders
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: true,
          address: true,
        },
      });

      // Notify specific store admin(s) about new public order
      try {
        const { createNotification } = await import('../services/notification');
        const store = await prisma.store.findUnique({
          where: { id: order.storeId },
          include: { users: true }
        });
        if (store && store.users && store.users.length > 0) {
          // Notify all store admins (users with STOREADMIN role)
          const adminUsers = store.users.filter(u => u.role === 'STOREADMIN');
          if (adminUsers.length > 0) {
            await Promise.all(adminUsers.map(admin =>
              createNotification({
                type: 'NEW_ORDER',
                message: `New public order placed: #${order.orderNumber} for ₹${order.totalAmount}`,
                userId: admin.id
              })
            ));
          } else {
            // Fallback to global if no admin found
            await createNotification({
              type: 'NEW_ORDER',
              message: `New public order placed: #${order.orderNumber} for ₹${order.totalAmount}`,
              userId: undefined
            });
          }
        } else {
          // Fallback to global if no users found
          await createNotification({
            type: 'NEW_ORDER',
            message: `New public order placed: #${order.orderNumber} for ₹${order.totalAmount}`,
            userId: undefined
          });
        }
      } catch (notifyErr) {
        console.error('Failed to create order notification:', notifyErr);
      }

      // Send payment screenshot notification email if uploaded
      if (paymentScreenshotUrl) {
        try {
          // Use store admin email from env/config, fallback to a default
          const adminEmail = process.env.STOREADMIN_EMAIL || process.env.SUPPORT_EMAIL || 'admin@example.com';
          const storeName = process.env.STORE_NAME || 'Flashbillr';
          await sendPaymentScreenshotEmail(
            adminEmail,
            order.orderNumber,
            storeName,
            paymentScreenshotUrl,
            order.guestName || 'Customer',
            order.guestEmail || req.user?.email || 'N/A'
          );
        } catch (emailErr) {
          // Log but do not fail order creation
          console.error('Failed to send payment screenshot email:', emailErr);
        }
      }

      // TODO: send confirmation email/SMS if needed

      return res.status(201).json({
        message: 'Order placed successfully',
        orderNumber: order.orderNumber,
        orderId: order.id,
        trackingUrl: `/api/public/orders/track?orderNumber=${order.orderNumber}&email=${guestEmail || req.user?.email}`,
        order,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/public/orders/track
 * Track an order by orderNumber and email/phone (guest) or by userId (auth)
 */
/**
 * @swagger
 * /api/public/orders/track:
 *   get:
 *     tags: [Public]
 *     summary: Track an order by orderNumber and email/phone (guest) or by userId (auth)
 *     parameters:
 *       - in: query
 *         name: orderNumber
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking info
 */
router.get('/orders/track', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { orderNumber, email, phone } = req.query;
    let order = null;
    // If authenticated, allow lookup by userId
    if (req.user?.userId) {
      order = await prisma.order.findFirst({
        where: { orderNumber: String(orderNumber), userId: req.user.userId },
        include: { orderItems: true, address: true },
      });
    } else {
      // Guest: require orderNumber and (email or phone)
      if (!orderNumber || (!email && !phone)) {
        return res.status(400).json({ error: 'orderNumber and email or phone are required' });
      }
      order = await prisma.order.findFirst({
        where: {
          orderNumber: String(orderNumber),
          OR: [
            { guestEmail: email ? String(email) : undefined },
            { guestPhone: phone ? String(phone) : undefined },
          ],
        },
        include: { orderItems: true, address: true },
      });
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only return safe fields
    const { id, orderNumber: num, status, createdAt, orderItems, address, guestName } = order;
    res.json({
      orderId: id,
      orderNumber: num,
      status,
      createdAt,
      guestName,
      items: orderItems,
      address,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/addresses
 * List all addresses for the authenticated user
 */
/**
 * @swagger
 * /api/public/addresses:
 *   get:
 *     tags: [Public]
 *     summary: List all addresses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get('/addresses', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const addresses = await prisma.address.findMany({ where: { userId: req.user.userId } });
    res.json({ addresses });
  } catch (error) { next(error); }
});

/**
 * POST /api/public/addresses
 * Add a new address for the authenticated user
 */
/**
 * @swagger
 * /api/public/addresses:
 *   post:
 *     tags: [Public]
 *     summary: Add a new address for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: Address created
 */
router.post('/addresses', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const { name, line1, line2, city, state, zip, country, phone, isDefault } = req.body;
    if (!name || !line1 || !city || !state || !zip || !country) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }
    // If setting as default, unset previous default
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.userId, isDefault: true }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({
      data: { userId: req.user.userId, name, line1, line2, city, state, zip, country, phone, isDefault: !!isDefault },
    });
    res.status(201).json({ address });
  } catch (error) { next(error); }
});

/**
 * PUT /api/public/addresses/:id
 * Update an address for the authenticated user
 */
/**
 * @swagger
 * /api/public/addresses/{id}:
 *   put:
 *     tags: [Public]
 *     summary: Update an address for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated
 */
router.put('/addresses/:id', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== req.user.userId) return res.status(404).json({ error: 'Address not found' });
    const { name, line1, line2, city, state, zip, country, phone, isDefault } = req.body;
    // If setting as default, unset previous default
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.userId, isDefault: true }, data: { isDefault: false } });
    }
    const updated = await prisma.address.update({
      where: { id },
      data: { name, line1, line2, city, state, zip, country, phone, isDefault: !!isDefault },
    });
    res.json({ address: updated });
  } catch (error) { next(error); }
});

/**
 * DELETE /api/public/addresses/:id
 * Delete an address for the authenticated user
 */
/**
 * @swagger
 * /api/public/addresses/{id}:
 *   delete:
 *     tags: [Public]
 *     summary: Delete an address for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Address deleted
 */
router.delete('/addresses/:id', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== req.user.userId) return res.status(404).json({ error: 'Address not found' });
    await prisma.address.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

/**
 * GET /api/public/orders/history
 * Get order history for the authenticated user
 */
/**
 * @swagger
 * /api/public/orders/history:
 *   get:
 *     tags: [Public]
 *     summary: Get order history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User order history
 */
router.get('/orders/history', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true, address: true },
    });
    res.json({ orders });
  } catch (error) { next(error); }
});

/**
 * GET /api/public/profile
 * Get the authenticated user's profile
 */
/**
 * @swagger
 * /api/public/profile:
 *   get:
 *     tags: [Public]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
});

/**
 * PUT /api/public/profile
 * Update the authenticated user's profile
 */
/**
 * @swagger
 * /api/public/profile:
 *   put:
 *     tags: [Public]
 *     summary: Update the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated
 */
router.put('/profile', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
    const { firstName, lastName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { firstName, lastName, phone },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    res.json({ user });
  } catch (error) { next(error); }
});

/**
 * GET /api/public/orders/guest-history
 * Get order history for a guest by email or phone
 */
/**
 * @swagger
 * /api/public/orders/guest-history:
 *   get:
 *     tags: [Public]
 *     summary: Get order history for a guest by email or phone
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guest order history
 */
router.get('/orders/guest-history', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          email ? { guestEmail: String(email) } : undefined,
          phone ? { guestPhone: String(phone) } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true, address: true },
    });
    res.json({ orders });
  } catch (error) { next(error); }
});

import crypto from 'crypto';
import { hash } from 'bcryptjs';
import { sendPasswordResetEmail } from '../services/mailgun';

/**
 * POST /api/public/password/forgot
 * Request password reset (magic link)
 */
/**
 * @swagger
 * /api/public/password/forgot:
 *   post:
 *     tags: [Public]
 *     summary: Request password reset (magic link)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success)
 */
router.post('/password/forgot', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond with success (never leak if user exists)
    if (!user) return res.json({ success: true });
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    // Send magic link email (implement your own mailer or reuse Mailgun)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, token, process.env.STORE_NAME || 'Flashbillr');
    return res.json({ success: true });
  } catch (error) { next(error); }
});

/**
 * POST /api/public/password/reset
 * Reset password using magic link token
 */
/**
 * @swagger
 * /api/public/password/reset:
 *   post:
 *     tags: [Public]
 *     summary: Reset password using magic link token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/password/reset', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token }, include: { user: true } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    // Update user password
    const hashed = await hash(password, 12);
    await prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } });
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
