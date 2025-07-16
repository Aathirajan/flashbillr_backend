import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';
import { prisma } from '../../utils/database';

const router = express.Router();

// GET /api/storeadmin/dashboard/low-stock
// Always returns data for the current fiscal year unless startDate or endDate is explicitly provided in the query.
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const storeId = req.user!.storeId!;
    // Parse query parameters
    let { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Use dynamic fiscal year calculation
    const { start: fiscalYearStart, end: fiscalYearEnd } = getCurrentFiscalYearRange();
    if (!startDate || !endDate) {
      startDate = fiscalYearStart.toISOString();
      endDate = fiscalYearEnd.toISOString();
    }

    const cacheKey = `low_stock:${storeId}:${startDate}:${endDate}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log('[dashboardLowStock] Response served from Redis cache for key:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    // Use updatedAt for filtering; fallback to createdAt if needed
    const lowStockProducts = await prisma.$queryRaw`
      SELECT 
        i."productId",
        i."currentStock",
        i."minStockLevel",
        p.name as "productName",
        COUNT(*) OVER() as total_low_stock
      FROM inventory i
      JOIN products p ON i."productId" = p.id
      WHERE i."storeId" = ${storeId}
        AND i."deletedAt" IS NULL
        AND i."currentStock" <= i."minStockLevel"
        AND i."minStockLevel" > 0
        AND i."updatedAt" >= ${startDate}::timestamp
        AND i."updatedAt" <= ${endDate}::timestamp
      ORDER BY (i."currentStock"::float / NULLIF(i."minStockLevel", 0)) ASC
      LIMIT 10
    `;
    console.log('Raw lowStockProducts:', lowStockProducts);

    const result = {
      products: (lowStockProducts as any[]).map(row => ({
        productId: row.productId,
        productName: row.productName,

        currentStock: Number(row.currentStock),
        minStockLevel: Number(row.minStockLevel)
      })),
      totalCount: (lowStockProducts as any[])[0] ? Number((lowStockProducts as any[])[0].total_low_stock) : 0
    };

    await safeRedisSetex(cacheKey, CACHE_TTL.LOW_STOCK, JSON.stringify(result));
    console.log('[dashboardLowStock] Response served from DB and cached to Redis for key:', cacheKey);
    return res.json(result);
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Low stock data unavailable.' });
    return;
  }
});

export default router;
