import express, { Response } from 'express';
import { prisma } from '../utils/database';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Public]
 *     summary: Get project information
 *     description: Returns a detailed explanation of the project, its features, and metadata.
 *     responses:
 *       200:
 *         description: Project information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 repository:
 *                   type: string
 *                 author:
 *                   type: string
 */
router.get('/', (_, res: Response) => {
  res.json({
    name: 'Flashbillr Backend',
    description: 'Flashbillr is a robust backend service designed to support fast, scalable, and secure billing and order management for stores. It provides APIs for authentication, product management, order processing, and reporting.',
    features: [
      'User authentication and authorization',
      'Store and product management',
      'Order processing and tracking',
      'PDF invoice generation',
      'Email notifications',
      'Comprehensive API documentation (Swagger)',
      'Robust error handling and logging',
      'Rate limiting and security best practices',
      'Database integration with Prisma/PostgreSQL',
      'Environment-based configuration',
    ],
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    // repository: 'https://github.com/Aathirajan/flashbillr_backend',
    author: 'Aathi rajan',
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Public]
 *     summary: Get service health status
 *     description: Returns detailed health information about the backend service, including uptime, version, environment, database status, and current time.
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 database:
 *                   type: string
 *                 currentTime:
 *                   type: string
 */
router.get('/health', async (_, res: Response) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    currentTime: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/public/store/{slug}:
 *   get:
 *     tags: [Public]
 *     summary: Get store by slug
 *     description: Get public store information by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Store slug
 *         example: my-store
 *     responses:
 *       200:
 *         description: Store information retrieved successfully
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
 *                     brandColor:
 *                       type: string
 *                       description: Store brand color
 *                     address:
 *                       type: string
 *                       nullable: true
 *                       description: Store address
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       description: Store phone
 *                     email:
 *                       type: string
 *                       nullable: true
 *                       description: Store email
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/store/:storeId', async (req: any, res: any, next: any) => {
  try {
    const { storeId } = req.params;

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
        deletedAt: null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brandColor: true,
        address: true,
        phone: true,
        email: true
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    res.json({ store });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/public/store/{slug}/products:
 *   get:
 *     tags: [Public]
 *     summary: Get products for a store
 *     description: Get public product listing for a store with filtering and pagination
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Store slug
 *         example: my-store
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category
 *         example: fireworks
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name, brand, or category
 *         example: sparkler
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: Product description
 *                       category:
 *                         type: string
 *                         description: Product category
 *                       brand:
 *                         type: string
 *                         nullable: true
 *                         description: Product brand
 *                       mrp:
 *                         type: number
 *                         description: Maximum retail price
 *                       sellingPrice:
 *                         type: number
 *                         description: Selling price
 *                       youtubeUrl:
 *                         type: string
 *                         nullable: true
 *                         description: YouTube video URL
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Product image URLs
 *                       inStock:
 *                         type: boolean
 *                         description: Whether product is in stock
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/store/:storeId/products', async (req: any, res: any, next: any) => {
  try {
    const { storeId } = req.params;
    const { category, search, page = 1, limit = 20 } = req.query;

    // First, get the store
    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
        deletedAt: null,
        isActive: true
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    const where: any = {
      storeId: store.id,
      deletedAt: null,
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [
          { categoryId: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: Number(limit),
        include: {
          category: true
        }
      }),
      prisma.product.count({ where })
    ]);

    // Format products for public display, including category name
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.category ? product.category.name : null,
      brand: product.brand,
      sku: product.sku,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      youtubeUrl: product.youtubeUrl,
      inStock: product.currentStock && product.currentStock > 0,
      currentStock: product.currentStock || 0
    }));

    res.json({
      products: formattedProducts,
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
 * /api/public/store/{slug}/categories:
 *   get:
 *     tags: [Public]
 *     summary: Get product categories for a store
 *     description: Get list of all product categories available in a store
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Store slug
 *         example: my-store
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of product categories
 *                   example: ["fireworks", "sparklers", "rockets"]
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/store/:storeId/categories', async (req: any, res: any, next: any) => {
  try {
    const { storeId } = req.params;

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
        deletedAt: null,
        isActive: true
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    const categories = await prisma.category.findMany({
      where: {
        storeId: store.id
      },
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/public/store/{storeId}/products/{productId}:
 *   get:
 *     tags: [Public]
 *     summary: Get single product details
 *     description: Get detailed information about a specific product
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *         example: clp1234567890
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: clp1234567890
 *     responses:
 *       200:
 *         description: Product details retrieved successfully
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
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: Product description
 *                     category:
 *                       type: string
 *                       description: Product category
 *                     brand:
 *                       type: string
 *                       nullable: true
 *                       description: Product brand
 *                     sku:
 *                       type: string
 *                       description: Product SKU
 *                     mrp:
 *                       type: number
 *                       description: Maximum retail price
 *                     sellingPrice:
 *                       type: number
 *                       description: Selling price
 *                     youtubeUrl:
 *                       type: string
 *                       nullable: true
 *                       description: YouTube video URL
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Product image URLs
 *                     inStock:
 *                       type: boolean
 *                       description: Whether product is in stock
 *                     currentStock:
 *                       type: integer
 *                       description: Current stock quantity
 *       404:
 *         description: Store or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/store/:storeId/products/:productId', async (req: any, res: any, next: any) => {
  try {
    const { storeId, productId } = req.params;

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
        deletedAt: null,
        isActive: true
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: store.id,
        deletedAt: null,
        isActive: true
      },
      include: {
        inventory: {
          select: { currentStock: true },
        },
      },
    });

    if (!product) {
      throw createError('Product not found', 404);
    }

    // Format product for public display
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      brand: product.brand,
      sku: product.sku,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      youtubeUrl: product.youtubeUrl,
      inStock: (product.inventory && product.inventory[0]?.currentStock > 0) || false,
      currentStock: product.inventory && product.inventory[0]?.currentStock || 0
    };

    res.json({ product: formattedProduct });
  } catch (error) {
    next(error);
  }
});

export default router;
