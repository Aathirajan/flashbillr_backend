import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { prisma } from '../../utils/database';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';

const router = express.Router();

// GET /api/storeadmin/dashboard/top-products
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

    const cacheKey = `top_products:${storeId}:${startDate}:${endDate}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log('[dashboardTopProducts] Response served from Redis cache for key:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    // Single query combining both online and POS data, filtered by date range
    const topProducts = await prisma.$queryRaw`
      WITH product_sales AS (
        SELECT 
          oi."productId",
          SUM(oi.quantity) as total_quantity,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN orders o ON oi."orderId" = o.id
        WHERE o."storeId" = ${storeId}
          AND o."deletedAt" IS NULL
          AND o."createdAt" >= ${startDate}::timestamp
          AND o."createdAt" <= ${endDate}::timestamp
        GROUP BY oi."productId"
        
        UNION ALL
        
        SELECT 
          items."productId",
          SUM(items."quantity") as total_quantity,
          COUNT(DISTINCT pr.id) as order_count
        FROM pos_receipts pr
        JOIN LATERAL jsonb_to_recordset(
          CASE 
            WHEN jsonb_typeof(pr.items) = 'array' THEN pr.items
            ELSE '[]'::jsonb
          END
        ) AS items("productId" text, "quantity" int) ON TRUE
        WHERE pr."storeId" = ${storeId}
          AND pr."deletedAt" IS NULL
          AND pr."createdAt" >= ${startDate}::timestamp
          AND pr."createdAt" <= ${endDate}::timestamp
          AND jsonb_typeof(pr.items) = 'array'
        GROUP BY items."productId"
      ),
      aggregated_sales AS (
        SELECT 
          "productId",
          SUM(total_quantity) as total_quantity,
          SUM(order_count) as total_orders
        FROM product_sales
        GROUP BY "productId"
        ORDER BY total_quantity DESC
        LIMIT 10
      )
      SELECT 
        a.*,
        p.name
      FROM aggregated_sales a
      JOIN products p ON a."productId" = p.id
      ORDER BY a.total_quantity DESC
      LIMIT 5
    `;

    const result = (topProducts as any[]).map(row => ({
      productId: row.productId,
      name: row.name,
      totalQuantity: Number(row.total_quantity),
      orderCount: Number(row.total_orders)
    }));

    await safeRedisSetex(cacheKey, CACHE_TTL.TOP_PRODUCTS, JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Top products data unavailable.' });
    return;
  }
});

export default router;
