import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { createProductSchema, updateProductSchema } from '../../utils/validation';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { uploadFile } from '../../services/firebase';
import { validateProductImages } from '../../middleware/validateProductImages';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// -----------------------------------
// GET /products?search=&categoryId=&sortBy=&sortOrder=&page=&limit=
// -----------------------------------
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const {
      search,
      categoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query as any;

    const where: any = {
      storeId,
      deletedAt: null
    };

    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          inventory: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products: products.map(product => ({
        ...product,
        currentStock: product.inventory[0]?.currentStock || 0,
        minStockLevel: product.inventory[0]?.minStockLevel || 10,
        isLowStock: (product.inventory[0]?.currentStock || 0) <= (product.inventory[0]?.minStockLevel || 10),
        images: product.images || []
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

// -----------------------------------
// Bulk Upload (CSV or JSON)
// -----------------------------------
router.post('/bulk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    const products: any[] = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      throw createError('No products provided in bulk upload', 400);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const item of products) {
      const { sku } = item;
      const existing = await prisma.product.findFirst({
        where: { sku, storeId, deletedAt: null }
      });

      if (existing) {
        skipped.push(sku);
        continue;
      }

      const product = await prisma.product.create({
        data: { ...item, storeId }
      });

      await prisma.inventory.create({
        data: {
          productId: product.id,
          storeId,
          currentStock: 0,
          minStockLevel: 10,
          maxStockLevel: 1000
        }
      });

      created.push(sku);
    }

    res.json({
      message: 'Bulk upload completed',
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------
// GET by ID
// -----------------------------------
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const product = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null },
      include: {
        inventory: true
      }
    });

    if (!product) throw createError('Product not found', 404);

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

// -----------------------------------
// POST Create Product
// -----------------------------------
router.post('/', upload.fields([{ name: 'images', maxCount: 5 }, { name: 'images[]', maxCount: 5 }]), validateProductImages(true), validate(createProductSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;
    // Ensure mrp and sellingPrice are numbers, not strings
    const productData = {
      ...req.body,
      storeId,
      mrp: req.body.mrp !== undefined ? Number(req.body.mrp) : undefined,
      sellingPrice: req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : undefined
    };

    const existingProduct = await prisma.product.findFirst({
      where: { sku: productData.sku, storeId, deletedAt: null }
    });

    if (existingProduct) throw createError('Product with this SKU already exists', 409);

    let imageUrls: string[] = [];
    const files: Express.Multer.File[] = [];
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        Object.values(req.files).forEach(fileArr => files.push(...fileArr));
      }
    }
    if (files.length > 0) {
      for (const file of files) {
        // Process image: resize to max 1024px width, convert to JPEG, quality 80
        const processedBuffer = await sharp(file.buffer)
          .resize({ width: 1024, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        const fileName = `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}.jpg`;
        const folder = `stores/${storeId}/products`;
        const url = await uploadFile(processedBuffer, fileName, 'image/jpeg', folder);
        imageUrls.push(url);
      }
    }

    // Create product with images
    const product = await prisma.product.create({
      data: {
        ...productData,
        images: imageUrls
      }
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        storeId,
        currentStock: 0,
        minStockLevel: 10,
        maxStockLevel: 1000
      }
    });

    logger.info('Product created successfully:', { productId: product.id, productName: product.name, storeId });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------
// PUT Update Product
// -----------------------------------
router.put('/:id', upload.array('images', 5), validateProductImages(false), validate(updateProductSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;
    const updateData = req.body;

    const existingProduct = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!existingProduct) throw createError('Product not found', 404);

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku: updateData.sku, storeId, id: { not: id }, deletedAt: null }
      });

      if (skuExists) throw createError('Product with this SKU already exists', 409);
    }

    // Always delete all existing images from cloud
    const currentImages: string[] = Array.isArray(existingProduct.images) ? existingProduct.images : [];
    const { deleteFile } = await import('../../services/firebase');
    for (const url of currentImages) {
      const match = url.match(/https:\/\/storage.googleapis.com\/(.+)/);
      if (match) {
        const filePath = match[1];
        try {
          await deleteFile(filePath);
        } catch (err) {
          logger.error('Failed to delete image from cloud:', { url, error: err instanceof Error ? err.message : err });
        }
      }
    }
    // Add new uploads
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files as Express.Multer.File[]) {
        const processedBuffer = await sharp(file.buffer)
          .resize({ width: 1024, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        const fileName = `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}.jpg`;
        const folder = `stores/${storeId}/products`;
        const url = await uploadFile(processedBuffer, fileName, 'image/jpeg', folder);
        imageUrls.push(url);
      }
    }
    // If no files uploaded, images will be empty array

    // Remove forbidden fields before updating
    delete updateData.currentStock;
    delete updateData.images;

    // Update product fields including images
    const product = await prisma.product.update({
      where: { id },
      data: { ...updateData, images: imageUrls }
    });

    logger.info('Product updated successfully:', { productId: product.id, productName: product.name });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------
// DELETE Product
// -----------------------------------
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user!.storeId!;

    const product = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null }
    });

    if (!product) throw createError('Product not found', 404);

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Product deleted successfully:', { productId: id, productName: product.name });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
