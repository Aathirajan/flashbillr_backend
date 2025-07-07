import express from 'express';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { createStoreSchema } from '../../utils/validation';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { generatePriceListPDF } from '../../services/pdfGenerator';
import { uploadFile } from '../../services/firebase';

const router = express.Router();

// Check store slug uniqueness
router.get('/check-slug', async (req, res, next) => {
  try {
    const { slug } = req.query;
    if (typeof slug !== 'string' || !slug.match(/^[a-z0-9-]{2,50}$/)) {
      return res.status(400).json({ valid: false, message: 'Invalid slug format.' });
    }
    const existing = await prisma.store.findUnique({ where: { slug } });
    if (existing) {
      return res.json({ valid: false, message: 'Slug already exists.' });
    }
    return res.json({ valid: true, message: 'Slug is available.' });
  } catch (error) {
    next(error);
    return; 
  }
});
/**
 * @swagger
 * /api/superadmin/stores:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get all stores
 *     description: Retrieve all stores with user and order counts
 *     responses:
 *       200:
 *         description: List of stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Store ID
 *                       name:
 *                         type: string
 *                         description: Store name
 *                       slug:
 *                         type: string
 *                         description: Store slug (unique identifier)
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: Store email
 *                       phone:
 *                         type: string
 *                         description: Store phone number
 *                       address:
 *                         type: string
 *                         description: Store address
 *                       isActive:
 *                         type: boolean
 *                         description: Store active status
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Store creation date
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last updated date
 *                       _count:
 *                         type: object
 *                         properties:
 *                           users:
 *                             type: integer
 *                             description: Number of users
 *                           orders:
 *                             type: integer
 *                             description: Number of orders
 *                           products:
 *                             type: integer
 *                             description: Number of products
 */
router.get('/', async (req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            products: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    logger.info('Fetched all stores', { count: stores.length });
    res.json({ stores });
  } catch (error) {
    logger.error('Error fetching all stores', { error });
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/stores/{id}:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get store by ID
 *     description: Retrieve detailed information about a specific store
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Store ID
 *                     name:
 *                       type: string
 *                       description: Store name
 *                     slug:
 *                       type: string
 *                       description: Store slug
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Store email
 *                     phone:
 *                       type: string
 *                       description: Store phone number
 *                     address:
 *                       type: string
 *                       description: Store address
 *                     isActive:
 *                       type: boolean
 *                       description: Store active status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Store creation date
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last updated date
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: User ID
 *                           email:
 *                             type: string
 *                             format: email
 *                             description: User email
 *                           firstName:
 *                             type: string
 *                             description: User first name
 *                           lastName:
 *                             type: string
 *                             description: User last name
 *                           role:
 *                             type: string
 *                             description: User role
 *                           isActive:
 *                             type: boolean
 *                             description: User active status
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: User creation date
 *                     _count:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: integer
 *                           description: Number of orders
 *                         products:
 *                           type: integer
 *                           description: Number of products
 *                         customers:
 *                           type: integer
 *                           description: Number of customers
 *       404:
 *         description: Store not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findFirst({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            orders: true,
            products: true,
            customers: true
          }
        }
      }
    });

    if (!store) {
      logger.warn('Store not found', { storeId: id });
      throw createError('Store not found', 404);
    }
    logger.info('Fetched store by ID', { storeId: id, storeName: store.name });
    res.json({ store });
  } catch (error) {
    logger.error('Error fetching store by ID', { error, storeId: req.params.id });
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/stores:
 *   post:
 *     tags: [Super Admin]
 *     summary: Create new store
 *     description: Create a new store with validation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Store name
 *               slug:
 *                 type: string
 *                 description: Store slug (must be unique)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Store email
 *               phone:
 *                 type: string
 *                 description: Store phone number
 *               address:
 *                 type: string
 *                 description: Store address
 *               isActive:
 *                 type: boolean
 *                 description: Store active status
 *     responses:
 *       201:
 *         description: Store created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Store ID
 *                     name:
 *                       type: string
 *                       description: Store name
 *                     slug:
 *                       type: string
 *                       description: Store slug
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Store email
 *                     phone:
 *                       type: string
 *                       description: Store phone number
 *                     address:
 *                       type: string
 *                       description: Store address
 *                     isActive:
 *                       type: boolean
 *                       description: Store active status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Store creation date
 *       409:
 *         description: Store slug already exists
 */
router.post('/', validate(createStoreSchema), async (req, res, next) => {
  try {
    function parseIntOrNull(value: any) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

const storeData = req.body;

// Validate and convert establishedYear and foundedYear
const parsedEstablishedYear = parseIntOrNull(storeData.establishedYear);
const parsedFoundedYear = parseIntOrNull(storeData.foundedYear);

if (
  (storeData.establishedYear && parsedEstablishedYear === null) ||
  (storeData.foundedYear && parsedFoundedYear === null)
) {
  return res.status(400).json({
    error: 'Invalid value for establishedYear or foundedYear. Expected integer or null.'
  });
}

// Check if slug is unique
const existingStore = await prisma.store.findUnique({
  where: { slug: storeData.slug }
});

if (existingStore) {
  throw createError('Store slug already exists', 409);
}

try {
  const store = await prisma.store.create({
    data: {
      ...storeData,
      establishedYear: parsedEstablishedYear,
      foundedYear: parsedFoundedYear
    }
  });

  logger.info('Store created successfully', {
    storeId: store.id,
    storeName: store.name,
    slug: store.slug
  });

  res.status(201).json({ store });
} catch (prismaError) {
  logger.error('Prisma error creating store', { prismaError, body: req.body });
  let errorMessage = 'Unknown error';
  if (typeof prismaError === 'object' && prismaError !== null && 'message' in prismaError) {
    errorMessage = (prismaError as any).message;
  }
  return res.status(400).json({
    error: 'Failed to create store. Please check your input fields.',
    details: errorMessage
  });
}

  } catch (error) {
    logger.error('Error creating store', { error, body: req.body });
    return next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/stores/{id}:
 *   put:
 *     tags: [Super Admin]
 *     summary: Update store
 *     description: Update store information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Store name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Store email
 *               phone:
 *                 type: string
 *                 description: Store phone number
 *               address:
 *                 type: string
 *                 description: Store address
 *               isActive:
 *                 type: boolean
 *                 description: Store active status
 *     responses:
 *       200:
 *         description: Store updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Store ID
 *                     name:
 *                       type: string
 *                       description: Store name
 *                     slug:
 *                       type: string
 *                       description: Store slug
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Store email
 *                     phone:
 *                       type: string
 *                       description: Store phone number
 *                     address:
 *                       type: string
 *                       description: Store address
 *                     isActive:
 *                       type: boolean
 *                       description: Store active status
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last updated date
 *       404:
 *         description: Store not found
 */
router.put('/:id', validate(createStoreSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if store exists
    const existingStore = await prisma.store.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existingStore) {
      throw createError('Store not found', 404);
    }

    // Check if slug is unique (excluding current store)
    if (updateData.slug !== existingStore.slug) {
      const slugExists = await prisma.store.findFirst({
        where: { 
          slug: updateData.slug,
          id: { not: id }
        }
      });

      if (slugExists) {
        throw createError('Store slug already exists', 409);
      }
    }

    const store = await prisma.store.update({
      where: { id },
      data: updateData
    });

    logger.info('Store updated successfully:', {
      storeId: store.id,
      storeName: store.name
    });

    res.json({ store });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/stores/{id}:
 *   delete:
 *     tags: [Super Admin]
 *     summary: Delete store
 *     description: Soft delete a store (marks as deleted)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       404:
 *         description: Store not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findFirst({
      where: { id, deletedAt: null }
    });

    if (!store) {
      logger.warn('Store not found for deletion', { storeId: id });
      throw createError('Store not found', 404);
    }

    await prisma.store.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Store deleted successfully', {
      storeId: id,
      storeName: store.name
    });

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    logger.error('Error deleting store', { error, storeId: req.params.id });
    next(error);
  }
});

/**
 * @swagger
 * /api/superadmin/stores/{id}/price-list:
 *   post:
 *     tags: [Super Admin]
 *     summary: Generate price list PDF
 *     description: Generate a PDF containing the store's price list with categorized products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Price list PDF generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 pdfUrl:
 *                   type: string
 *                   format: uri
 *                   description: URL to download the PDF
 *       404:
 *         description: Store not found
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/price-list', async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findFirst({
      where: { id, deletedAt: null },
      include: {
        products: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }]
        }
      }
    });

    if (!store) {
      logger.warn('Store not found for price list generation', { storeId: id });
      throw createError('Store not found', 404);
    }

    // Group products by category
    const categories = store.products.reduce((acc: any, product: any) => {
      const category = acc.find((cat: any) => cat.name === product.category);
      if (category) {
        category.products.push({
          name: product.name || '',
          brand: product.brand ?? undefined,
          mrp: product.mrp || 0,
          sellingPrice: product.sellingPrice || 0
        });
      } else {
        acc.push({
          name: product.category || '',
          products: [{
            name: product.name || '',
            brand: product.brand ?? undefined,
            mrp: product.mrp || 0,
            sellingPrice: product.sellingPrice || 0
          }]
        });
      }
      return acc;
    }, [] as Array<{ name: string; products: Array<{ name: string; brand?: string; mrp: number; sellingPrice: number }> }>);

    const priceListData = {
      storeName: store.name,
      brandColor: store.brandColor,
      categories,
      generatedDate: new Date().toLocaleDateString('en-IN')
    };

    const pdfBuffer = await generatePriceListPDF(priceListData);
    const fileName = `price-list-${store.slug}-${Date.now()}.pdf`;
    const pdfUrl = await uploadFile(pdfBuffer, fileName, 'application/pdf', `stores/${store.id}/price-lists`);

    logger.info('Price list generated successfully', {
      storeId: store.id,
      storeName: store.name,
      pdfUrl
    });

    res.json({ 
      message: 'Price list generated successfully',
      pdfUrl 
    });
  } catch (error) {
    logger.error('Error generating price list PDF', { error, storeId: req.params.id });
    next(error);
  }
});

export default router;
