import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../../utils/database';
import { validate } from '../../middleware/validation';
import { createProductSchema, updateProductSchema } from '../../utils/validation';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { uploadFile } from '../../services/firebase';
import { AuthenticatedRequest, requireStoreAdmin } from '../../middleware/auth';
import { Prisma } from '@prisma/client';



type CategoryRelation = {
  connect: { id: string };
} | {
  create: {
    name: string;
    store: { connect: { id: string } };
  };
};

// Validate product images
const validateProductImages = (required: boolean = false) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        if (required) {
          throw createError('Product images are required', 400);
        }
        return next();
      }

      const files: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        Object.values(req.files).forEach(fileArr => files.push(...fileArr));
      }

      for (const file of files) {
        try {
          // Validate image dimensions using sharp
          const metadata = await sharp(file.buffer).metadata();
          if (!metadata.width || !metadata.height) {
            throw new Error('Invalid image file');
          }
        } catch (err) {
          throw createError('Invalid image file', 400);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: import('multer').FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// -----------------------------------
// GET /products?search=&categoryId=&sortBy=&sortOrder=&page=&limit=
// -----------------------------------
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
// GET by ID
// -----------------------------------
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
router.post('/',
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'images[]', maxCount: 5 }]),
  validateProductImages(true),
  validate(createProductSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const product = await prisma.product.create({
        data: {
          ...productData,
          images: imageUrls,
          inventory: {
            create: {
              currentStock: req.body.inventory?.currentStock !== undefined ? Number(req.body.inventory.currentStock) : 0,
              minStockLevel: req.body.inventory?.minStockLevel !== undefined ? Number(req.body.inventory.minStockLevel) : 10,
              maxStockLevel: req.body.inventory?.maxStockLevel !== undefined ? Number(req.body.inventory.maxStockLevel) : 1000
            }
          }
        },
        include: {
          inventory: true
        }
      });

      logger.info('Product created successfully:', { productId: product.id, productName: product.name, storeId });

      res.status(201).json({
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
  }
);

// -----------------------------------
// Bulk product upload endpoint
// -----------------------------------
interface BulkUploadResult {
  sku: string;
  status: 'success';
  productId: string;
}

interface BulkUploadError {
  sku: string;
  error: string;
}


router.post('/bulk',
  requireStoreAdmin,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(403).json({
          errors: [{
            sku: '',
            error: 'Store access required'
          }]
        });
      }

      const products = req.body.products;
      if (!Array.isArray(products) || products.length === 0) {
        throw createError('No products provided for bulk upload', 400);
      }

      // Ensure all IDs are strings
      products.forEach(product => {
        if (product.categoryId && typeof product.categoryId === 'number') {
          product.categoryId = product.categoryId.toString();
        }
      });

      const results: BulkUploadResult[] = [];
      const errors: BulkUploadError[] = [];

      for (const product of products) {
        try {
          // Basic validation
          if (!product.name || !product.sku || !product.mrp || !product.sellingPrice) {
            throw new Error('Missing required fields');
          }

          // Handle category relation
          let categoryRelation: CategoryRelation | undefined;
          if (product.categoryId) {
            categoryRelation = {
              connect: { id: product.categoryId }
            };
          } else if (product.category) {
            const existingCategory = await prisma.category.findFirst({
              where: {
                name: product.category,
                storeId
              }
            });

            if (existingCategory) {
              categoryRelation = {
                connect: { id: existingCategory.id }
              };
            } else {
              categoryRelation = {
                create: {
                  name: product.category,
                  store: { connect: { id: storeId } }
                }
              };
            }
          }

          // Process images if provided
          let processedImages: string[] = [];
          if (product.images) {
            for (const image of product.images) {
              // If image is base64, upload to Firebase
              if (typeof image === 'string' && image.startsWith('http')) {
                processedImages.push(image);
              } else {
                throw new Error('Only image URLs are allowed for bulk upload');
              }
            }
          }

          // Prepare product data
          const productData: Prisma.ProductCreateInput = {
            name: product.name,
            description: product.description || '',
            brand: product.brand || '',
            sku: product.sku,
            mrp: Number(product.mrp),
            sellingPrice: Number(product.sellingPrice),
            youtubeUrl: product.youtubeUrl || '',
            contentType: product.contentType || null,
            isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
            store: {
              connect: { id: storeId }
            },
            category: categoryRelation,
            images: processedImages
          };

          // Create the product with inventory
          const createdProduct = await prisma.product.create({
            data: productData,
            include: {
              inventory: true
            }
          });

          // Create inventory if provided
          if (product.inventory) {
            await prisma.inventory.create({
              data: {
                productId: createdProduct.id,
                storeId,
                currentStock: Number(product.inventory.currentStock) || 0,
                minStockLevel: Number(product.inventory.minStockLevel) || 10
              }
            });
          }

          results.push({
            sku: product.sku,
            status: 'success' as const,
            productId: createdProduct.id
          });

        } catch (err) {
          errors.push({
            sku: product.sku,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      return res.json({
        results,
        errors
      });

    } catch (err) {
      return next(err);
    }
  }
);

// -----------------------------------
// PUT Update Product
// -----------------------------------
router.put('/:id',
  upload.array('images', 5),
  validateProductImages(false),
  validate(updateProductSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  }
);

// -----------------------------------
// DELETE Product
// -----------------------------------
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
