import express from 'express';
import multer from 'multer';
import { prisma } from '@/utils/database';
import { validate } from '@/middleware/validation';
import { createProductSchema, updateProductSchema } from '@/utils/validation';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { uploadFile } from '@/services/firebase';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/storeadmin/products:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get all products for store
 *     description: Retrieve all products with filtering, search, and pagination
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name, SKU, or brand (case-insensitive)
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
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Product ID
 *                       name:
 *                         type: string
 *                         description: Product name
 *                       sku:
 *                         type: string
 *                         description: Stock Keeping Unit
 *                       brand:
 *                         type: string
 *                         description: Product brand
 *                       category:
 *                         type: string
 *                         description: Product category
 *                       description:
 *                         type: string
 *                         description: Product description
 *                       price:
 *                         type: number
 *                         description: Product price
 *                       gstRate:
 *                         type: number
 *                         description: GST rate
 *                       images:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             url:
 *                               type: string
 *                               format: uri
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                       currentStock:
 *                         type: integer
 *                         description: Current stock quantity
 *                       minStockLevel:
 *                         type: integer
 *                         description: Minimum stock level
 *                       isLowStock:
 *                         type: boolean
 *                         description: Indicates if stock is below minimum level
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
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
 *                       description: Total number of products
 *                     pages:
 *                       type: integer
 *                       description: Total number of pages
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const { category, search, page = 1, limit = 20 } = req.query;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            orderBy: { createdAt: 'asc' }
          },
          inventory: {
            select: {
              currentStock: true,
              minStockLevel: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products: products.map((product: any) => ({
        ...product,
        currentStock: product.inventory[0]?.currentStock || 0,
        minStockLevel: product.inventory[0]?.minStockLevel || 10,
        isLowStock: (product.inventory[0]?.currentStock || 0) <= (product.inventory[0]?.minStockLevel || 10)
      })),
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
 * /api/storeadmin/products/{id}:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get product by ID
 *     description: Retrieve a specific product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Product ID
 *                     name:
 *                       type: string
 *                       description: Product name
 *                     sku:
 *                       type: string
 *                       description: Stock Keeping Unit
 *                     brand:
 *                       type: string
 *                       description: Product brand
 *                     category:
 *                       type: string
 *                       description: Product category
 *                     description:
 *                       type: string
 *                       description: Product description
 *                     price:
 *                       type: number
 *                       description: Product price
 *                     gstRate:
 *                       type: number
 *                       description: GST rate
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           url:
 *                             type: string
 *                             format: uri
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     currentStock:
 *                       type: integer
 *                       description: Current stock quantity
 *                     minStockLevel:
 *                       type: integer
 *                       description: Minimum stock level
 *                     isLowStock:
 *                       type: boolean
 *                       description: Indicates if stock is below minimum level
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const product = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        },
        inventory: {
          select: {
            currentStock: true,
            minStockLevel: true,
            maxStockLevel: true,
            lastRestocked: true
          }
        }
      }
    });

    if (!product) {
      throw createError('Product not found', 404);
    }

    res.json({
      product: {
        ...product,
        currentStock: product.inventory[0]?.currentStock || 0,
        minStockLevel: product.inventory[0]?.minStockLevel || 10,
        maxStockLevel: product.inventory[0]?.maxStockLevel || 1000,
        lastRestocked: product.inventory[0]?.lastRestocked
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/products:
 *   post:
 *     tags: [Store Admin]
 *     summary: Create new product
 *     description: Create a new product with optional images
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit
 *               brand:
 *                 type: string
 *                 description: Product brand
 *               category:
 *                 type: string
 *                 description: Product category
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Product price
 *               gstRate:
 *                 type: number
 *                 description: GST rate
 *               minStockLevel:
 *                 type: integer
 *                 description: Minimum stock level
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (maximum 5 images)
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Product ID
 *                     name:
 *                       type: string
 *                       description: Product name
 *                     sku:
 *                       type: string
 *                       description: Stock Keeping Unit
 *                     brand:
 *                       type: string
 *                       description: Product brand
 *                     category:
 *                       type: string
 *                       description: Product category
 *                     description:
 *                       type: string
 *                       description: Product description
 *                     price:
 *                       type: number
 *                       description: Product price
 *                     gstRate:
 *                       type: number
 *                       description: GST rate
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           url:
 *                             type: string
 *                             format: uri
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     currentStock:
 *                       type: integer
 *                       description: Current stock quantity
 *                     minStockLevel:
 *                       type: integer
 *                       description: Minimum stock level
 *                     isLowStock:
 *                       type: boolean
 *                       description: Indicates if stock is below minimum level
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.post('/', upload.array('images', 5), validate(createProductSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const productData = { ...req.body, storeId };

    // Check if SKU already exists for this store
    const existingProduct = await prisma.product.findFirst({
      where: {
        sku: productData.sku,
        storeId,
        deletedAt: null
      }
    });

    if (existingProduct) {
      throw createError('Product with this SKU already exists', 409);
    }

    const product = await prisma.product.create({
      data: productData,
      include: {
        images: true
      }
    });

    // Create initial inventory record
    await prisma.inventory.create({
      data: {
        productId: product.id,
        storeId,
        currentStock: 0,
        minStockLevel: 10,
        maxStockLevel: 1000
      }
    });

    logger.info('Product created successfully:', {
      productId: product.id,
      productName: product.name,
      storeId
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/products:
 *   put:
 *     tags: [Store Admin]
 *     summary: Update product
 *     description: Update an existing product's details
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *                 description: Product name
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit
 *               brand:
 *                 type: string
 *                 description: Product brand
 *               category:
 *                 type: string
 *                 description: Product category
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Product price
 *               gstRate:
 *                 type: number
 *                 description: GST rate
 *               minStockLevel:
 *                 type: integer
 *                 description: Minimum stock level
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Product ID
 *                     name:
 *                       type: string
 *                       description: Product name
 *                     sku:
 *                       type: string
 *                       description: Stock Keeping Unit
 *                     brand:
 *                       type: string
 *                       description: Product brand
 *                     category:
 *                       type: string
 *                       description: Product category
 *                     description:
 *                       type: string
 *                       description: Product description
 *                     price:
 *                       type: number
 *                       description: Product price
 *                     gstRate:
 *                       type: number
 *                       description: GST rate
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           url:
 *                             type: string
 *                             format: uri
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     currentStock:
 *                       type: integer
 *                       description: Current stock quantity
 *                     minStockLevel:
 *                       type: integer
 *                       description: Minimum stock level
 *                     isLowStock:
 *                       type: boolean
 *                       description: Indicates if stock is below minimum level
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.put('/:id', validate(updateProductSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;
    const updateData = req.body;

    const existingProduct = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!existingProduct) {
      throw createError('Product not found', 404);
    }

    // Check SKU uniqueness if being updated
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku: updateData.sku,
          storeId,
          id: { not: id },
          deletedAt: null
        }
      });

      if (skuExists) {
        throw createError('Product with this SKU already exists', 409);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    logger.info('Product updated successfully:', {
      productId: product.id,
      productName: product.name
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/storeadmin/products:
 *   delete:
 *     tags: [Store Admin]
 *     summary: Delete product
 *     description: Soft delete a product (marks as deleted)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       404:
 *         description: Product not found
 *       403:
 *         description: Forbidden - cannot delete product from another store
 */
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const product = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!product) {
      throw createError('Product not found', 404);
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Product deleted successfully:', {
      productId: id,
      productName: product.name
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;