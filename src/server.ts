import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { specs } from './config/swagger';

// Route imports
import superadminRoutes from './routes/superadmin';
import storeadminRoutes from './routes/storeadmin';
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
const allowedOrigins = [
  'https://store1.com',
  'https://store2.com',
  // Add more storefront domains as needed
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customSiteTitle: 'Flashbillr API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Health check endpoint
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

app.get('/health', async (req, res) => {
  // Check DB connection
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'up';
  } catch (e) {
    dbStatus = 'down';
  }
  res.status(200).json({
    status: 'OK',
    service: 'Flashbillr API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    db: dbStatus,
    memory: process.memoryUsage(),
    pid: process.pid,
    platform: process.platform
  });
});

// Landing route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Flashbillr Backend API',
    service: 'Flashbillr API',
    description: 'Multi-tenant fireworks store SaaS backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    docs: '/api-docs',
    health: '/health',
    endpoints: [
      '/api/auth',
      '/api/superadmin',
      '/api/storeadmin',
      '/api/public'
    ]
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/storeadmin', storeadminRoutes);
app.use('/api/public', publicRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Flashbillr Backend running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;