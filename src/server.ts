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

// Global logger middleware to log every request
app.use((req, res, next) => {
  const user = (req as any).user;
  logger.info('Incoming request', {
    time: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    hasAuthToken: Boolean(req.headers.authorization),
    user: user ? {
      id: user.userId || user.id,
      email: user.email
    } : undefined
  });
  next();
});

// Security middleware
app.use(helmet());
const allowedOrigins = [
  'https://store1.com',
  'https://store2.com',
  // Add more storefront domains as needed
];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps, curl, etc.)
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// }));

// Allow all CORS requests for now
app.use(cors());

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
  const healthData = {
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
  };
  if (req.accepts(['html', 'json']) === 'html') {
    // Render a styled HTML health dashboard
    res.send(`<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Health Check - Flashbillr API</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: 'Inter', sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
    .health-container { max-width: 540px; margin: 48px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.09); padding: 36px 30px; }
    h1 { color: #2563eb; margin-top: 0; font-size: 2em; }
    .status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; font-size: 1.2em; }
    .status-dot { width: 16px; height: 16px; border-radius: 50%; display: inline-block; }
    .status-up { background: #22c55e; }
    .status-down { background: #ef4444; }
    .stat-table { width: 100%; border-collapse: collapse; margin: 22px 0 0 0; }
    .stat-table th, .stat-table td { padding: 10px 8px; text-align: left; }
    .stat-table th { background: #f1f5fb; color: #2563eb; font-size: 1.07em; }
    .stat-table tr { border-bottom: 1px solid #e5e7eb; }
    .stat-table td.key { color: #555; font-weight: 600; }
    .stat-table td.value code { background: #f3f4f6; color: #3730a3; border-radius: 4px; padding: 2px 7px; font-size: 1em; }
    .footer { margin-top: 28px; text-align: center; color: #888; font-size: 1em; }
    .icon { color: #2563eb; font-size: 1.1em; margin-right: 6px; }
  </style>
</head>
<body>
  <div class='health-container'>
    <h1><i class="fa-solid fa-heart-pulse"></i> API Health Check</h1>
    <div class='status-row'>
      <span class='icon'><i class="fa-solid fa-server"></i></span>
      <span>Status:</span>
      <span class='status-dot status-up'></span>
      <span style='color:#22c55e; font-weight:700;'>OK</span>
    </div>
    <div class='status-row'>
      <span class='icon'><i class="fa-solid fa-database"></i></span>
      <span>Database:</span>
      <span class='status-dot status-${dbStatus === 'up' ? 'up' : 'down'}'></span>
      <span style='color:${dbStatus === 'up' ? '#22c55e' : '#ef4444'}; font-weight:700;'>${dbStatus.toUpperCase()}</span>
    </div>
    <table class='stat-table'>
      <tr><th>Property</th><th>Value</th></tr>
      <tr><td class='key'><i class="fa-solid fa-layer-group"></i> Service</td><td class='value'><code>${healthData.service}</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-code-branch"></i> Version</td><td class='value'><code>${healthData.version}</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-globe"></i> Environment</td><td class='value'><code>${healthData.environment}</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-clock"></i> Uptime</td><td class='value'><code>${Math.floor(healthData.uptime)}s</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-microchip"></i> Platform</td><td class='value'><code>${healthData.platform}</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-memory"></i> Memory</td><td class='value'><code>RSS: ${(healthData.memory.rss / 1024 / 1024).toFixed(1)} MB</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-id-badge"></i> PID</td><td class='value'><code>${healthData.pid}</code></td></tr>
      <tr><td class='key'><i class="fa-solid fa-calendar-day"></i> Timestamp</td><td class='value'><code>${healthData.timestamp}</code></td></tr>
    </table>
    <div class='footer'>
      &copy; 2025 Flashbillr Team &mdash; All rights reserved.
    </div>
  </div>
</body>
</html>`);
  } else {
    res.status(200).json(healthData);
  }
});

// Landing route
// Serve static files from public directory
app.use(express.static('public'));

// Serve landing page HTML at /
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
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