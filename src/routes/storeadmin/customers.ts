import express from 'express';
import { prisma } from '@/utils/database';
import { validate } from '@/middleware/validation';
import { createCustomerSchema } from '@/utils/validation';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import Joi from 'joi';

const router = express.Router();

const updateCustomerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).optional(),
  notes: Joi.string().max(1000).optional()
});

/**
 * @swagger
 * /api/storeadmin/customers:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all customers
 *     description: Retrieve all customers for the authenticated store with pagination and statistics
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search customers by name, phone, or email
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter customers by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter customers by state
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
 *         description: List of customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Customer ID
 *                       firstName:
 *                         type: string
 *                         description: Customer first name
 *                       lastName:
 *                         type: string
 *                         description: Customer last name
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: Customer email
 *                       phone:
 *                         type: string
 *                         description: Customer phone number
 *                       address:
 *                         type: string
 *                         description: Customer address
 *                       city:
 *                         type: string
 *                         description: Customer city
 *                       state:
 *                         type: string
 *                         description: Customer state
 *                       pincode:
 *                         type: string
 *                         description: Customer pincode
 *                       notes:
 *                         type: string
 *                         description: Additional notes
 *                       totalOrders:
 *                         type: integer
 *                         description: Total number of orders
 *                       lastOrderDate:
 *                         type: string
 *                         format: date-time
 *                         description: Date of last order
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Customer creation date
 *                       updatedAt:
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
 *                       description: Total number of customers
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { search, page = 1, limit = 20, city, state } = req.query;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state as string, mode: 'insensitive' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: {
                where: { deletedAt: null }
              }
            }
          },
          orders: {
            where: { deletedAt: null },
            select: {
              totalAmount: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.customer.count({ where })
    ]);

    // Calculate customer statistics
    const customersWithStats = customers.map((customer: any) => {
      const totalOrders = customer._count.orders;
      const lastOrderDate = customer.orders[0]?.createdAt || null;
      
      return {
        ...customer,
        totalOrders,
        lastOrderDate,
        orders: undefined, // Remove orders from response
        _count: undefined // Remove count from response
      };
    });

    res.json({
      customers: customersWithStats,
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
 * /api/storeadmin/customers/{id}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get customer by ID
 *     description: Retrieve a customer by ID with order history and statistics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Customer ID
 *                     firstName:
 *                       type: string
 *                       description: Customer first name
 *                     lastName:
 *                       type: string
 *                       description: Customer last name
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Customer email
 *                     phone:
 *                       type: string
 *                       description: Customer phone number
 *                     address:
 *                         type: string
 *                         description: Customer address
 *                     city:
 *                         type: string
 *                         description: Customer city
 *                     state:
 *                         type: string
 *                         description: Customer state
 *                     pincode:
 *                         type: string
 *                         description: Customer pincode
 *                     notes:
 *                         type: string
 *                         description: Additional notes
 *                     totalOrders:
 *                         type: integer
 *                         description: Total number of orders
 *                     lastOrderDate:
 *                         type: string
 *                         format: date-time
 *                         description: Date of last order
 *                     orders:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: Order ID
 *                             totalAmount:
 *                               type: number
 *                               description: Total amount of the order
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                               description: Order creation date
 *                     createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Customer creation date
 *                     updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last update date
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        orders: {
          where: { deletedAt: null },
          include: {
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
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Calculate customer statistics
    const totalOrders = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum: any, order: any) => sum + order.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = customer.orders[0]?.createdAt || null;

    res.json({
      customer: {
        ...customer,
        statistics: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/customers:
 *   post:
 *     tags: [Store Admin]
 *     summary: Create a new customer
 *     description: Create a new customer for the authenticated store
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phone
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Customer first name
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Customer last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               phone:
 *                 type: string
 *                 pattern: /^[6-9]\d{9}$/
 *                 description: Customer phone number (10 digits, starts with 6-9)
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 description: Customer address
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: Customer city
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 description: Customer state
 *               pincode:
 *                 type: string
 *                 pattern: /^[1-9][0-9]{5}$/
 *                 description: Customer pincode (6 digits)
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Customer ID
 *                     firstName:
 *                       type: string
 *                       description: Customer first name
 *                     lastName:
 *                       type: string
 *                       description: Customer last name
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Customer email
 *                     phone:
 *                       type: string
 *                       description: Customer phone number
 *                     address:
 *                       type: string
 *                       description: Customer address
 *                     city:
 *                       type: string
 *                       description: Customer city
 *                     state:
 *                       type: string
 *                       description: Customer state
 *                     pincode:
 *                       type: string
 *                       description: Customer pincode
 *                     notes:
 *                       type: string
 *                       description: Additional notes
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Customer creation date
 */
router.post('/', validate(createCustomerSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const customerData = { ...req.body, storeId };

    // Check if customer with same phone already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone: customerData.phone,
        storeId,
        deletedAt: null
      }
    });

    if (existingCustomer) {
      throw createError('Customer with this phone number already exists', 409);
    }

    const customer = await prisma.customer.create({
      data: customerData
    });

    logger.info('Customer created successfully:', {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      storeId
    });

    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/customers/{id}:
 *   put:
 *     tags: [Store Admin]
 *     summary: Update a customer
 *     description: Update an existing customer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Customer first name
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Customer last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               phone:
 *                 type: string
 *                 pattern: /^[6-9]\d{9}$/
 *                 description: Customer phone number (10 digits, starts with 6-9)
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 description: Customer address
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: Customer city
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 description: Customer state
 *               pincode:
 *                 type: string
 *                 pattern: /^[1-9][0-9]{5}$/
 *                 description: Customer pincode (6 digits)
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Customer ID
 *                     firstName:
 *                       type: string
 *                       description: Customer first name
 *                     lastName:
 *                       type: string
 *                       description: Customer last name
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Customer email
 *                     phone:
 *                       type: string
 *                       description: Customer phone number
 *                     address:
 *                       type: string
 *                       description: Customer address
 *                     city:
 *                       type: string
 *                       description: Customer city
 *                     state:
 *                       type: string
 *                       description: Customer state
 *                     pincode:
 *                       type: string
 *                       description: Customer pincode
 *                     notes:
 *                       type: string
 *                       description: Additional notes
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last update date
 */
router.put('/:id', validate(updateCustomerSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;
    const updateData = req.body;

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!existingCustomer) {
      throw createError('Customer not found', 404);
    }

    // Check phone uniqueness if being updated
    if (updateData.phone && updateData.phone !== existingCustomer.phone) {
      const phoneExists = await prisma.customer.findFirst({
        where: {
          phone: updateData.phone,
          storeId,
          id: { not: id },
          deletedAt: null
        }
      });

      if (phoneExists) {
        throw createError('Customer with this phone number already exists', 409);
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    logger.info('Customer updated successfully:', {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`
    });

    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/customers/{id}:
 *   delete:
 *     tags: [Store Admin]
 *     summary: Delete a customer
 *     description: Soft delete a customer (mark as deleted)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 */
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        _count: {
          select: {
            orders: {
              where: { deletedAt: null }
            }
          }
        }
      }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Check if customer has orders
    if (customer._count.orders > 0) {
      throw createError('Cannot delete customer with existing orders', 400);
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Customer deleted successfully:', {
      customerId: id,
      customerName: `${customer.firstName} ${customer.lastName}`
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get customer statistics
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
      totalCustomers,
      newCustomersThisMonth,
      topCustomers
    ] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.customer.findMany({
        where: { storeId, deletedAt: null },
        include: {
          orders: {
            where: { deletedAt: null },
            select: { totalAmount: true }
          }
        },
        take: 10
      })
    ]);

    // Calculate top customers by total spent
    const customersWithSpending = topCustomers.map((customer: any) => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      totalSpent: customer.orders.reduce((sum: any, order: any) => sum + order.totalAmount, 0),
      totalOrders: customer.orders.length
    })).sort((a: any, b: any) => b.totalSpent - a.totalSpent).slice(0, 5);

    res.json({
      summary: {
        totalCustomers,
        newCustomersThisMonth,
        topCustomers: customersWithSpending
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;