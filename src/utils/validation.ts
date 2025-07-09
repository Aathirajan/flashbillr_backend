import Joi from 'joi';

// --- Common Validation Schemas ---
export const emailSchema = Joi.string().email().required();
export const passwordSchema = Joi.string().min(8).required();
export const phoneSchema = Joi.string().pattern(/^[6-9]\d{9}$/).required();
export const gstSchema = Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/);

// --- Auth Validation ---
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

// --- Store Validation ---
export const createStoreSchema = Joi.object({
  // Basic Info
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().min(2).max(50).pattern(/^[a-z0-9-]+$/).required(),
  tagline: Joi.string().max(255).allow('', null).optional(),
  logo: Joi.string().uri().allow('', null).optional(),
  brandColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),

  // Contact & Identity
  phone: phoneSchema.allow('', null).optional(),
  email: emailSchema.required(),
  whatsapp: Joi.string().allow('', null).optional(),
  address: Joi.string().max(500).allow('', null).optional(),
  ownerName: Joi.string().max(100).allow('', null).optional(),
  gstNumber: gstSchema.allow('', null).optional(),
  license: Joi.string().allow('', null).optional(),
  certification: Joi.string().allow('', null).optional(),
  establishedYear: Joi.number().integer().allow(null).optional(),

  // Description
  description: Joi.string().max(1000).allow('', null).optional(),
  foundedYear: Joi.number().integer().allow(null).optional(),
  experience: Joi.string().max(255).allow('', null).optional(),
  mission: Joi.string().max(1000).allow('', null).optional(),
  vision: Joi.string().max(1000).allow('', null).optional(),

  // Payment
  upiId: Joi.string().max(100).allow('', null).optional(),
  qrCodeUrl: Joi.string().uri().allow('', null).optional(),

  // Features
  isPosEnabled: Joi.boolean().default(true).optional(),

  // SEO
  seoTitle: Joi.string().max(100).allow('', null).optional(),
  seoDescription: Joi.string().max(300).allow('', null).optional(),
  seoKeywords: Joi.string().max(300).allow('', null).optional(),

  // System
  isActive: Joi.boolean().default(true).optional(),
  createdById: Joi.string().required()
});

export const updateStoreSchema = createStoreSchema.fork(
  Object.keys(createStoreSchema.describe().keys),
  (schema) => schema.optional()
);

// --- Product Validation ---
export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  categoryId: Joi.string().required(), // should match a valid UUID or CUID
  brand: Joi.string().max(100).optional(),
  sku: Joi.string().min(2).max(50).required(),
  mrp: Joi.number().positive().required(),
  sellingPrice: Joi.number().positive().required(),
  contentType: Joi.string()
    .valid('BOX', 'PIECE', 'PACKET')
    .required(),
  youtubeUrl: Joi.string().uri().optional()
});

export const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys),
  (schema) => schema.optional()
);


// --- Customer Validation ---
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

// --- Order Validation ---
export const createOrderSchema = Joi.object({
  customerId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().optional(),
      quantity: Joi.number().integer().positive().required()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI', 'BANK_TRANSFER').default('CASH'),
  notes: Joi.string().max(1000).optional()
});

// --- POS Receipt Validation ---
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

// --- Image Upload Validation ---
export const uploadImagesSchema = Joi.object({
  productId: Joi.string().required()
});

// --- Password Reset & Change ---
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
