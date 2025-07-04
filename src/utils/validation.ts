import Joi from 'joi';

// Common validation schemas
export const emailSchema = Joi.string().email().required();
export const passwordSchema = Joi.string().min(8).required();
export const phoneSchema = Joi.string().pattern(/^[6-9]\d{9}$/).required();
export const gstSchema = Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/);

// Auth validation schemas
export const loginSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema
});

export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required()
});

// Store validation schemas
export const createStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().min(2).max(50).pattern(/^[a-z0-9-]+$/).required(),
  brandColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  address: Joi.string().max(500).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  gstNumber: gstSchema.optional()
});

// Product validation schemas
export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().min(2).max(100).required(),
  brand: Joi.string().max(100).optional(),
  sku: Joi.string().min(2).max(50).required(),
  mrp: Joi.number().positive().required(),
  sellingPrice: Joi.number().positive().required(),
  gstRate: Joi.number().min(0).max(28).default(18),
  youtubeUrl: Joi.string().uri().optional()
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().min(2).max(100).optional(),
  brand: Joi.string().max(100).optional(),
  sku: Joi.string().min(2).max(50).optional(),
  mrp: Joi.number().positive().optional(),
  sellingPrice: Joi.number().positive().optional(),
  gstRate: Joi.number().min(0).max(28).optional(),
  youtubeUrl: Joi.string().uri().optional()
});

// Customer validation schemas
export const createCustomerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).optional(),
  notes: Joi.string().max(1000).optional()
});

// Order validation schemas
export const createOrderSchema = Joi.object({
  customerId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().optional(), // For display purposes
      quantity: Joi.number().integer().positive().required()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI', 'BANK_TRANSFER').default('CASH'),
  notes: Joi.string().max(1000).optional()
});

// POS validation schemas
export const createPOSReceiptSchema = Joi.object({
  customerName: Joi.string().max(100).optional(),
  customerPhone: phoneSchema.optional(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().required(),
      quantity: Joi.number().integer().positive().required(),
      unitPrice: Joi.number().positive().required(),
      gstRate: Joi.number().min(0).max(28).required()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI').default('CASH'),
  amountReceived: Joi.number().positive().optional()
});

// Image upload validation
export const uploadImagesSchema = Joi.object({
  productId: Joi.string().required()
});

// Password reset validation
export const forgotPasswordSchema = Joi.object({
  email: emailSchema
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordSchema
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema
});