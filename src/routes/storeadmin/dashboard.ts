/**
 * Storeadmin Dashboard API
 *
 * - Provides rich, dopamine-inducing dashboard metrics for store admins.
 * - All endpoints require authentication and are scoped to the storeadmin's storeId.
 * - Uses Redis for caching heavy queries (graceful fallback if Redis is unavailable).
 * - All monetary values are in rupees. Soft-deleted records are excluded.
 * - Optimized for production: modular, cacheable, secure, and frontend-friendly.
 */
import express from 'express';
import { prisma } from '../../utils/database';
import { AuthenticatedRequest } from '../../middleware/auth';
import dashboardSummaryRouter from './dashboardSummary';
import dashboardMonthlyRouter from './dashboardMonthly';
import dashboardTopProductsRouter from './dashboardTopProducts';
import dashboardLowStockRouter from './dashboardLowStock';
import dashboardCustomersByLocationRouter from './dashboardCustomersByLocation';
import dashboardTodayProgressRouter from './dashboardTodayProgress';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';

const router = express.Router();

// Mount the summary router at /summary
router.use('/summary', dashboardSummaryRouter);
// Mount the monthly router at /monthly
router.use('/monthly', dashboardMonthlyRouter);
// Mount the top products router at /top-products
router.use('/top-products', dashboardTopProductsRouter);
// Mount the low stock router at /low-stock
router.use('/low-stock', dashboardLowStockRouter);
// Mount the customers by location router at /customers-by-location
router.use('/customers-by-location', dashboardCustomersByLocationRouter);
// Mount the today progress router at /today-progress
router.use('/today-progress', dashboardTodayProgressRouter);

// Optimized single query for monthly data
const getMonthlyDataOptimized = async (storeId: string, startDate?: string, endDate?: string) => {
  // Default to current fiscal year if not provided
  const fiscalYearStart = new Date('2025-04-01T00:00:00.000Z');
  const fiscalYearEnd = new Date('2026-03-31T23:59:59.999Z');
  if (!startDate || !endDate) {
    startDate = fiscalYearStart.toISOString();
    endDate = fiscalYearEnd.toISOString();
  }
  const cacheKey = `monthly_data:${storeId}:${startDate}:${endDate}`;
  const cached = await safeRedisGet(cacheKey);

  if (cached) {
    console.log('[dashboard.ts/getMonthlyDataOptimized] Response served from Redis cache for key:', cacheKey);
    return JSON.parse(cached);
  }

  // Single query to get all monthly data for the date range
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
  console.log('[dashboard.ts/getMonthlyDataOptimized] Response served from DB and cached to Redis for key:', cacheKey);
  return monthlyData;
};

// Optimized daily summary with single query
const getDailySummaryOptimized = async (storeId: string, startDate?: string, endDate?: string) => {
  // Default to current fiscal year if not provided
  const fiscalYearStart = new Date('2025-04-01T00:00:00.000Z');
  const fiscalYearEnd = new Date('2026-03-31T23:59:59.999Z');
  if (!startDate || !endDate) {
    startDate = fiscalYearStart.toISOString();
    endDate = fiscalYearEnd.toISOString();
  }
  const cacheKey = `daily_summary:${storeId}:${startDate}:${endDate}`;
  const cached = await safeRedisGet(cacheKey);

  if (cached) {
    console.log('[dashboard.ts/getDailySummaryOptimized] Response served from Redis cache for key:', cacheKey);
    return JSON.parse(cached);
  }

  // Use the provided range for "today" and the same-length previous period for "yesterday"
  const todayStart = new Date(startDate);
  const todayEnd = new Date(endDate);
  const diffMs = todayEnd.getTime() - todayStart.getTime();
  const yesterdayEnd = new Date(todayStart.getTime() - 1);
  const yesterdayStart = new Date(yesterdayEnd.getTime() - diffMs);

  // Single comprehensive query for all summary data
  const [summaryData] = await Promise.all([
    prisma.$queryRaw`
      WITH daily_stats AS (
        SELECT 
          'online' as channel,
          CASE 
            WHEN "createdAt" >= ${todayStart} AND "createdAt" <= ${todayEnd} THEN 'today'
            WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd} THEN 'yesterday'
            ELSE 'other'
          END as period,
          COUNT(*) as order_count,
          COALESCE(SUM("totalAmount"), 0) as total_revenue
        FROM orders
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= ${yesterdayStart}
          AND "createdAt" <= ${todayEnd}
        GROUP BY channel, period
        
        UNION ALL
        
        SELECT 
          'pos' as channel,
          CASE 
            WHEN "createdAt" >= ${todayStart} AND "createdAt" <= ${todayEnd} THEN 'today'
            WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd} THEN 'yesterday'
            ELSE 'other'
          END as period,
          COUNT(*) as order_count,
          COALESCE(SUM("totalAmount"), 0) as total_revenue
        FROM pos_receipts
        WHERE "storeId" = ${storeId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= ${yesterdayStart}
          AND "createdAt" <= ${todayEnd}
        GROUP BY channel, period
      )
      SELECT * FROM daily_stats WHERE period IN ('today', 'yesterday')
    `
  ]);

  // Transform results
  const dailyData = {
    today: { online: { orders: 0, revenue: 0 }, pos: { orders: 0, revenue: 0 } },
    yesterday: { online: { orders: 0, revenue: 0 }, pos: { orders: 0, revenue: 0 } }
  };

  type Period = 'today' | 'yesterday';
  type Channel = 'online' | 'pos';
  (summaryData as any[]).forEach(row => {
    const period = row.period as Period;
    const channel = row.channel as Channel;
    dailyData[period][channel].orders = Number(row.order_count);
    dailyData[period][channel].revenue = Number(row.total_revenue);
  });

  await safeRedisSetex(cacheKey, CACHE_TTL.DAILY_SUMMARY, JSON.stringify(dailyData));
  return dailyData;
};

// Optimized top products with single query
const getTopProductsOptimized = async (storeId: string, startDate?: string, endDate?: string) => {
  // Default to current fiscal year if not provided
  const fiscalYearStart = new Date('2025-04-01T00:00:00.000Z');
  const fiscalYearEnd = new Date('2026-03-31T23:59:59.999Z');
  if (!startDate || !endDate) {
    startDate = fiscalYearStart.toISOString();
    endDate = fiscalYearEnd.toISOString();
  }
  const cacheKey = `top_products:${storeId}:${startDate}:${endDate}`;
  const cached = await safeRedisGet(cacheKey);

  if (cached) {
    console.log('[dashboard.ts/getTopProductsOptimized] Response served from Redis cache for key:', cacheKey);
    return JSON.parse(cached);
  }

  // Single query combining both online and POS data, filtered by date range
  const topProducts = await prisma.$queryRaw`
    WITH product_sales AS (
      SELECT 
        oi."productId",
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      JOIN "Order" o ON oi."orderId" = o.id
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
      JOIN LATERAL jsonb_to_recordset(COALESCE(pr.items, '[]'::jsonb)) AS items("productId" text, "quantity" int) ON TRUE
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
      p.name,
      p.category
    FROM aggregated_sales a
    JOIN products p ON a."productId" = p.id
    ORDER BY a.total_quantity DESC
    LIMIT 5
  `;

  const result = (topProducts as any[]).map(row => ({
    productId: row.productId,
    name: row.name,
    category: row.category,
    totalQuantity: Number(row.total_quantity),
    orderCount: Number(row.total_orders)
  }));

  await safeRedisSetex(cacheKey, CACHE_TTL.TOP_PRODUCTS, JSON.stringify(result));
  console.log('[dashboard.ts/getTopProductsOptimized] Response served from DB and cached to Redis for key:', cacheKey);
  return result;
};

// Optimized low stock products
const getLowStockProductsOptimized = async (storeId: string, startDate?: string, endDate?: string) => {
  // Default to current fiscal year if not provided
  const fiscalYearStart = new Date('2025-04-01T00:00:00.000Z');
  const fiscalYearEnd = new Date('2026-03-31T23:59:59.999Z');
  if (!startDate || !endDate) {
    startDate = fiscalYearStart.toISOString();
    endDate = fiscalYearEnd.toISOString();
  }
  const cacheKey = `low_stock:${storeId}:${startDate}:${endDate}`;
  const cached = await safeRedisGet(cacheKey);

  if (cached) {
    console.log('[dashboard.ts/getLowStockProductsOptimized] Response served from Redis cache for key:', cacheKey);
    return JSON.parse(cached);
  }

  const lowStockProducts = await prisma.$queryRaw`
    SELECT 
      i."productId",
      i."currentStock",
      i."minStockLevel",
      p.name as "productName",
      p.category,
      COUNT(*) OVER() as total_low_stock
    FROM inventory i
    JOIN products p ON i."productId" = p.id
    WHERE i."storeId" = ${storeId}
      AND i."deletedAt" IS NULL
      AND i."currentStock" <= i."minStockLevel"
      AND i."updatedAt" >= ${startDate}::timestamp
      AND i."updatedAt" <= ${endDate}::timestamp
    ORDER BY (i."currentStock"::float / NULLIF(i."minStockLevel", 0)) ASC
    LIMIT 10
  `;

  const result = {
    products: (lowStockProducts as any[]).map(row => ({
      productId: row.productId,
      productName: row.productName,
      category: row.category,
      currentStock: Number(row.currentStock),
      minStockLevel: Number(row.minStockLevel)
    })),
    totalCount: (lowStockProducts as any[])[0]?.total_low_stock || 0
  };

  await safeRedisSetex(cacheKey, CACHE_TTL.LOW_STOCK, JSON.stringify(result));
  console.log('[dashboard.ts/getLowStockProductsOptimized] Response served from DB and cached to Redis for key:', cacheKey);
  return result;
};

// Optimized customer locations
const getCustomerLocationsOptimized = async (storeId: string, startDate?: string, endDate?: string) => {
  // Default to current fiscal year if not provided
  const fiscalYearStart = new Date('2025-04-01T00:00:00.000Z');
  const fiscalYearEnd = new Date('2026-03-31T23:59:59.999Z');
  if (!startDate || !endDate) {
    startDate = fiscalYearStart.toISOString();
    endDate = fiscalYearEnd.toISOString();
  }
  const cacheKey = `customer_locations:${storeId}:${startDate}:${endDate}`;
  const cached = await safeRedisGet(cacheKey);

  if (cached) {
    console.log('[dashboard.ts/getCustomerLocationsOptimized] Response served from Redis cache for key:', cacheKey);
    return JSON.parse(cached);
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

  const result = (locations as any[]).map(row => ({
    city: row.city,
    state: row.state,
    count: Number(row.customer_count)
  }));

  await safeRedisSetex(cacheKey, CACHE_TTL.CUSTOMER_LOCATIONS, JSON.stringify(result));
  console.log('[dashboard.ts/getCustomerLocationsOptimized] Response served from DB and cached to Redis for key:', cacheKey);
  return result;
};

// Main optimized endpoint
// PRODUCTION-READY: Caching, security, and graceful Redis fallback are enforced. No sensitive info is leaked.
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

    // Execute all optimized queries in parallel
    const [
      monthlyData,
      dailySummary,
      topProducts,
      lowStockData,
      customerLocations,
      totalStats
    ] = await Promise.all([
      getMonthlyDataOptimized(storeId, startDate, endDate),
      getDailySummaryOptimized(storeId, startDate, endDate),
      getTopProductsOptimized(storeId, startDate, endDate),
      getLowStockProductsOptimized(storeId, startDate, endDate),
      getCustomerLocationsOptimized(storeId, startDate, endDate),

      // Single query for total stats (cached separately if needed)
      prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM orders WHERE "storeId" = ${storeId} AND "deletedAt" IS NULL) as total_orders,
          (SELECT COALESCE(SUM("totalAmount"), 0) FROM orders WHERE "storeId" = ${storeId} AND "deletedAt" IS NULL) as total_order_revenue,
          (SELECT COALESCE(SUM("totalAmount"), 0) FROM pos_receipts WHERE "storeId" = ${storeId} AND "deletedAt" IS NULL) as total_pos_revenue,
          (SELECT COUNT(*) FROM customers WHERE "storeId" = ${storeId} AND "deletedAt" IS NULL) as total_customers
      `
    ]);

    const totalStatsData = (totalStats as any[])[0];
    const totalRevenue = Number(totalStatsData.total_order_revenue) + Number(totalStatsData.total_pos_revenue);

    // Calculate today's metrics
    const todayOnlineRevenue = dailySummary.today.online.revenue;
    const todayPosRevenue = dailySummary.today.pos.revenue;
    const todayTotalRevenue = todayOnlineRevenue + todayPosRevenue;
    const todayOnlineOrders = dailySummary.today.online.orders;
    const todayPosOrders = dailySummary.today.pos.orders;
    const todayTotalOrders = todayOnlineOrders + todayPosOrders;

    // Calculate yesterday's metrics for comparison
    const yesterdayOnlineRevenue = dailySummary.yesterday.online.revenue;
    const yesterdayPosRevenue = dailySummary.yesterday.pos.revenue;
    const yesterdayTotalRevenue = yesterdayOnlineRevenue + yesterdayPosRevenue;
    const yesterdayOnlineOrders = dailySummary.yesterday.online.orders;
    const yesterdayPosOrders = dailySummary.yesterday.pos.orders;
    const yesterdayTotalOrders = yesterdayOnlineOrders + yesterdayPosOrders;

    // Calculate deltas
    const revenueDelta = todayTotalRevenue - yesterdayTotalRevenue;
    const orderDelta = todayTotalOrders - yesterdayTotalOrders;

    // Response structure
    res.json({
      summary: {
        totalOrders: Number(totalStatsData.total_orders),
        totalRevenue,
        totalCustomers: Number(totalStatsData.total_customers),
        lowStockCount: lowStockData.totalCount,
        todayOrders: todayTotalOrders,
        todayRevenue: todayTotalRevenue,
        todayPOSReceipts: todayPosOrders,
        todayPOSRevenue: todayPosRevenue,
        todayPOSReceived: todayPosRevenue // Simplified - could be separate query if needed
      },

      topProducts,
      lowStockProducts: lowStockData.products,
      customersByLocation: customerLocations,

      // Monthly data
      ...monthlyData,

      // Today's progress with optimized structure
      todayProgress: {
        revenue: {
          online: todayOnlineRevenue,
          inStore: todayPosRevenue,
          total: todayTotalRevenue,
          delta: revenueDelta,
          deltaPercent: yesterdayTotalRevenue === 0 ? null :
            ((revenueDelta / yesterdayTotalRevenue) * 100).toFixed(2)
        },
        orders: {
          online: todayOnlineOrders,
          inStore: todayPosOrders,
          total: todayTotalOrders,
          delta: orderDelta,
          deltaPercent: yesterdayTotalOrders === 0 ? null :
            ((orderDelta / yesterdayTotalOrders) * 100).toFixed(2)
        },
        dopamineCues: {
          revenue: revenueDelta > 0 ? '🔥 Up from yesterday!' :
            revenueDelta < 0 ? '⬇️ Down from yesterday' : 'No change',
          orders: orderDelta > 0 ? '🚀 More orders today!' :
            orderDelta < 0 ? '📉 Fewer orders than yesterday' : 'No change'
        }
      },

    });

  } catch (error) {
    // Generic error, do not leak sensitive info
    res.status(500).json({ error: 'Dashboard data unavailable. Please try again later.' });
  }
});

// Cache warming endpoint (call this via cron job)
router.post('/warm-cache', async (req: AuthenticatedRequest, res) => {
  try {
    const storeId = req.user!.storeId!;
    // Use current fiscal year dynamically
    const { start: fiscalYearStart, end: fiscalYearEnd } = getCurrentFiscalYearRange();
    const fiscalYearStartISO = fiscalYearStart.toISOString();
    const fiscalYearEndISO = fiscalYearEnd.toISOString();

    // Pre-warm all caches for the fiscal year
    await Promise.all([
      getMonthlyDataOptimized(storeId, fiscalYearStartISO, fiscalYearEndISO),
      getTopProductsOptimized(storeId, fiscalYearStartISO, fiscalYearEndISO),
      getLowStockProductsOptimized(storeId, fiscalYearStartISO, fiscalYearEndISO),
      getCustomerLocationsOptimized(storeId, fiscalYearStartISO, fiscalYearEndISO)
    ]);

    res.json({ message: 'Cache warmed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

export default router;
