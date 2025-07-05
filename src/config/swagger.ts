import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Flashbillr API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for Flashbillr - Multi-tenant fireworks store SaaS platform',
      contact: {
        name: 'Flashbillr Team',
        email: 'support@flashbillr.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.flashbillr.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        // Error schemas
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          },
          required: ['error']
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error details'
            }
          },
          required: ['error']
        },
        
        // Pagination schema
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          },
          required: ['page', 'limit', 'total', 'pages']
        },

        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['SUPERADMIN', 'STOREADMIN'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            store: {
              $ref: '#/components/schemas/StoreBasic'
            }
          },
          required: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt']
        },

        // Store schemas
        Store: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique store identifier'
            },
            name: {
              type: 'string',
              description: 'Store name'
            },
            slug: {
              type: 'string',
              description: 'Store URL slug'
            },
            brandColor: {
              type: 'string',
              pattern: '^#[0-9A-F]{6}$',
              description: 'Store brand color in hex format'
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Store address'
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Store phone number'
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
              description: 'Store email address'
            },
            gstNumber: {
              type: 'string',
              nullable: true,
              description: 'Store GST number'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether store is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Store creation timestamp'
            }
          },
          required: ['id', 'name', 'slug', 'brandColor', 'isActive', 'createdAt']
        },

        StoreBasic: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique store identifier'
            },
            name: {
              type: 'string',
              description: 'Store name'
            },
            slug: {
              type: 'string',
              description: 'Store URL slug'
            },
            brandColor: {
              type: 'string',
              description: 'Store brand color'
            }
          },
          required: ['id', 'name', 'slug']
        },

        // Product schemas
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique product identifier'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Product description'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            brand: {
              type: 'string',
              nullable: true,
              description: 'Product brand'
            },
            sku: {
              type: 'string',
              description: 'Product SKU'
            },
            mrp: {
              type: 'number',
              description: 'Maximum retail price'
            },
            sellingPrice: {
              type: 'number',
              description: 'Selling price'
            },
            gstRate: {
              type: 'number',
              description: 'GST rate percentage'
            },
            youtubeUrl: {
              type: 'string',
              nullable: true,
              description: 'YouTube video URL'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether product is active'
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductImage'
              },
              description: 'Product images'
            },
            currentStock: {
              type: 'integer',
              description: 'Current stock level'
            },
            minStockLevel: {
              type: 'integer',
              description: 'Minimum stock level'
            },
            isLowStock: {
              type: 'boolean',
              description: 'Whether product is low on stock'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation timestamp'
            }
          },
          required: ['id', 'name', 'category', 'sku', 'mrp', 'sellingPrice', 'gstRate', 'isActive', 'createdAt']
        },

        ProductImage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique image identifier'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Image URL'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Image upload timestamp'
            }
          },
          required: ['id', 'url', 'createdAt']
        },

        // Customer schemas
        Customer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique customer identifier'
            },
            firstName: {
              type: 'string',
              description: 'Customer first name'
            },
            lastName: {
              type: 'string',
              description: 'Customer last name'
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
              description: 'Customer email address'
            },
            phone: {
              type: 'string',
              description: 'Customer phone number'
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Customer address'
            },
            city: {
              type: 'string',
              nullable: true,
              description: 'Customer city'
            },
            state: {
              type: 'string',
              nullable: true,
              description: 'Customer state'
            },
            pincode: {
              type: 'string',
              nullable: true,
              description: 'Customer pincode'
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Customer notes'
            },
            totalOrders: {
              type: 'integer',
              description: 'Total number of orders'
            },
            lastOrderDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last order date'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Customer creation timestamp'
            }
          },
          required: ['id', 'firstName', 'lastName', 'phone', 'createdAt']
        },

        // Order schemas
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique order identifier'
            },
            orderNumber: {
              type: 'string',
              description: 'Order number'
            },
            status: {
              type: 'string',
              enum: ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              description: 'Order status'
            },
            subtotal: {
              type: 'number',
              description: 'Order subtotal'
            },
            gstAmount: {
              type: 'number',
              description: 'Total GST amount'
            },
            totalAmount: {
              type: 'number',
              description: 'Total order amount'
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method used'
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Order notes'
            },
            lrNumber: {
              type: 'string',
              nullable: true,
              description: 'Logistics receipt number'
            },
            lrPhotoUrl: {
              type: 'string',
              nullable: true,
              description: 'LR photo URL'
            },
            shippedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Shipping timestamp'
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Delivery timestamp'
            },
            customer: {
              $ref: '#/components/schemas/Customer'
            },
            orderItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              },
              description: 'Order items'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp'
            }
          },
          required: ['id', 'orderNumber', 'status', 'subtotal', 'gstAmount', 'totalAmount', 'paymentMethod', 'createdAt']
        },

        OrderItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique order item identifier'
            },
            quantity: {
              type: 'integer',
              description: 'Item quantity'
            },
            unitPrice: {
              type: 'number',
              description: 'Unit price'
            },
            gstRate: {
              type: 'number',
              description: 'GST rate percentage'
            },
            gstAmount: {
              type: 'number',
              description: 'GST amount'
            },
            totalAmount: {
              type: 'number',
              description: 'Total item amount'
            },
            product: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Product name'
                },
                sku: {
                  type: 'string',
                  description: 'Product SKU'
                }
              },
              required: ['name', 'sku']
            }
          },
          required: ['id', 'quantity', 'unitPrice', 'gstRate', 'gstAmount', 'totalAmount']
        },

        // POS Receipt schemas
        POSReceipt: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique receipt identifier'
            },
            receiptNumber: {
              type: 'string',
              description: 'Receipt number'
            },
            customerName: {
              type: 'string',
              nullable: true,
              description: 'Customer name'
            },
            customerPhone: {
              type: 'string',
              nullable: true,
              description: 'Customer phone'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    description: 'Product ID'
                  },
                  productName: {
                    type: 'string',
                    description: 'Product name'
                  },
                  quantity: {
                    type: 'integer',
                    description: 'Item quantity'
                  },
                  unitPrice: {
                    type: 'number',
                    description: 'Unit price'
                  },
                  gstRate: {
                    type: 'number',
                    description: 'GST rate'
                  },
                  gstAmount: {
                    type: 'number',
                    description: 'GST amount'
                  },
                  totalAmount: {
                    type: 'number',
                    description: 'Total amount'
                  }
                },
                required: ['productId', 'productName', 'quantity', 'unitPrice', 'gstRate', 'gstAmount', 'totalAmount']
              },
              description: 'Receipt items'
            },
            subtotal: {
              type: 'number',
              description: 'Receipt subtotal'
            },
            gstAmount: {
              type: 'number',
              description: 'Total GST amount'
            },
            totalAmount: {
              type: 'number',
              description: 'Total receipt amount'
            },
            amountReceived: {
              type: 'number',
              nullable: true,
              description: 'Amount actually received'
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method'
            },
            pdfUrl: {
              type: 'string',
              nullable: true,
              description: 'PDF receipt URL'
            },
            discountAmount: {
              type: 'number',
              description: 'Discount amount'
            },
            discountPercentage: {
              type: 'number',
              description: 'Discount percentage'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Receipt creation timestamp'
            }
          },
          required: ['id', 'receiptNumber', 'items', 'subtotal', 'gstAmount', 'totalAmount', 'paymentMethod', 'createdAt']
        },

        // Inventory schemas
        Inventory: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique inventory identifier'
            },
            currentStock: {
              type: 'integer',
              description: 'Current stock level'
            },
            minStockLevel: {
              type: 'integer',
              description: 'Minimum stock level'
            },
            maxStockLevel: {
              type: 'integer',
              description: 'Maximum stock level'
            },
            lastRestocked: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last restock timestamp'
            },
            isLowStock: {
              type: 'boolean',
              description: 'Whether stock is low'
            },
            stockStatus: {
              type: 'string',
              enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
              description: 'Stock status'
            },
            product: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Product ID'
                },
                name: {
                  type: 'string',
                  description: 'Product name'
                },
                sku: {
                  type: 'string',
                  description: 'Product SKU'
                },
                brand: {
                  type: 'string',
                  nullable: true,
                  description: 'Product brand'
                },
                category: {
                  type: 'string',
                  description: 'Product category'
                },
                sellingPrice: {
                  type: 'number',
                  description: 'Selling price'
                },
                isActive: {
                  type: 'boolean',
                  description: 'Whether product is active'
                }
              },
              required: ['id', 'name', 'sku', 'category', 'sellingPrice', 'isActive']
            }
          },
          required: ['id', 'currentStock', 'minStockLevel', 'maxStockLevel', 'isLowStock', 'stockStatus']
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Public',
        description: 'Public endpoints for storefront access'
      },
      {
        name: 'Store Admin',
        description: 'Endpoints for store admin operations (dashboard, products, inventory, customers, orders, POS, invoices)'
      },
      {
        name: 'Super Admin',
        description: 'Endpoints for super admin operations (dashboard, stores, users, subscriptions)'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/storeadmin/*.ts',
    './src/routes/superadmin/*.ts',
    './dist/routes/*.js',
    './dist/routes/storeadmin/*.js',
    './dist/routes/superadmin/*.js'
  ]
};

export const specs = swaggerJsdoc(options);