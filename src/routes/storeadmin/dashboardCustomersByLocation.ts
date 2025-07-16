import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { prisma } from '../../utils/database';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';

const router = express.Router();

// GET /api/storeadmin/dashboard/customers-by-location
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const storeId = req.user!.storeId!;
    // Accept optional startDate and endDate query params
    let { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Default to current fiscal year if not provided
    const { start: fiscalYearStart, end: fiscalYearEnd } = getCurrentFiscalYearRange();
    if (!startDate || !endDate) {
      startDate = fiscalYearStart.toISOString();
      endDate = fiscalYearEnd.toISOString();
    }

    const cacheKey = `customer_locations:${storeId}:${startDate}:${endDate}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log('[dashboardCustomersByLocation] Response served from Redis cache for key:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    const locations = await prisma.$queryRaw`
      SELECT 
        c.city,
        c.state,
        COUNT(DISTINCT c.id) as customer_count
      FROM customers c
      WHERE c."storeId" = ${storeId}
        AND c."deletedAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM orders o 
          WHERE o."customerId" = c.id 
            AND o."deletedAt" IS NULL
            AND o."createdAt" >= ${startDate}::timestamp
            AND o."createdAt" <= ${endDate}::timestamp
        )
      GROUP BY c.city, c.state
      ORDER BY customer_count DESC
      LIMIT 50
    `;
    console.log('[dashboardCustomersByLocation] Response served from DB and cached to Redis for key:', cacheKey);

    const result = (locations as any[]).map(row => ({
      city: row.city,
      state: row.state,
      count: Number(row.customer_count)
    }));

    await safeRedisSetex(cacheKey, CACHE_TTL.CUSTOMER_LOCATIONS, JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Customer location data unavailable.' });
    return;
  }
});

export default router;
