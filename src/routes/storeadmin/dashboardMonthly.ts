import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { prisma } from '../../utils/database';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';

const router = express.Router();

// GET /api/storeadmin/dashboard/monthly
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

    const cacheKey = `monthly_data:${storeId}:${startDate}:${endDate}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log('[dashboardMonthly] Response served from Redis cache for key:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    // Query for monthly online and in-store data for the given date range
    const [onlineData, posData] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM "createdAt") as year,
          EXTRACT(MONTH FROM "createdAt") as month,
          COUNT(*) as order_count,
          COALESCE(SUM("totalAmount"), 0) as total_revenue
        FROM orders
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= ${startDate}::timestamp
          AND "createdAt" <= ${endDate}::timestamp
        GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
        ORDER BY year, month
      `,
      prisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM "createdAt") as year,
          EXTRACT(MONTH FROM "createdAt") as month,
          COUNT(*) as receipt_count,
          COALESCE(SUM("totalAmount"), 0) as total_revenue
        FROM pos_receipts
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= ${startDate}::timestamp
          AND "createdAt" <= ${endDate}::timestamp
        GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
        ORDER BY year, month
      `
    ]);
    console.log('[dashboardMonthly] Response served from DB and cached to Redis for key:', cacheKey);

    // Transform to monthly arrays for the selected date range
    const monthlyData = {
      monthlyOnlineRevenue: new Array(12).fill(0),
      monthlyInStoreRevenue: new Array(12).fill(0),
      monthlyOnlineOrders: new Array(12).fill(0),
      monthlyInStoreOrders: new Array(12).fill(0),
    };

    // Map all online data into the arrays for the months in the selected range
    (onlineData as any[]).forEach(row => {
      const monthIndex = Number(row.month) - 1;
      const revenue = Number(row.total_revenue);
      const orders = Number(row.order_count);
      monthlyData.monthlyOnlineRevenue[monthIndex] = revenue;
      monthlyData.monthlyOnlineOrders[monthIndex] = orders;
    });

    // Map all POS data into the arrays for the months in the selected range
    (posData as any[]).forEach(row => {
      const monthIndex = Number(row.month) - 1;
      const revenue = Number(row.total_revenue);
      const orders = Number(row.receipt_count);
      monthlyData.monthlyInStoreRevenue[monthIndex] = revenue;
      monthlyData.monthlyInStoreOrders[monthIndex] = orders;
    });

    await safeRedisSetex(cacheKey, CACHE_TTL.MONTHLY_DATA, JSON.stringify(monthlyData));
    return res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: 'Monthly dashboard data unavailable.' });
    return;
  }
});

export default router;
