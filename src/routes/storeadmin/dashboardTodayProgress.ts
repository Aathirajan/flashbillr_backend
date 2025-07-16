import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { safeRedisGet, safeRedisSetex, CACHE_TTL } from './dashboardUtils';
import { prisma } from '../../utils/database';

const router = express.Router();

// GET /api/storeadmin/dashboard/today-progress
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const storeId = req.user!.storeId!;
    // Accept optional startDate and endDate query params
    let { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const now = new Date();
    let todayStart, todayEnd, yesterdayStart, yesterdayEnd;
    let cacheKey;
    if (!startDate || !endDate) {
      // Default: today and yesterday
      todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      cacheKey = `today_progress:${storeId}:${now.toDateString()}`;
    } else {
      // Use provided range for "today" and the same-length previous period for "yesterday"
      todayStart = new Date(startDate!);
      todayEnd = new Date(endDate!);
      const diffMs = todayEnd.getTime() - todayStart.getTime();
      yesterdayEnd = new Date(todayStart.getTime() - 1);
      yesterdayStart = new Date(yesterdayEnd.getTime() - diffMs);
      cacheKey = `today_progress:${storeId}:${startDate}:${endDate}`;
    }
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log('[dashboardTodayProgress] Response served from Redis cache for key:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    // Fetch today's and yesterday's revenue/orders/spendings
    const [
      todayOnlineOrders,
      todayInStoreReceipts,
      todaySpendings,
      todayNewCustomers,
      yesterdayOnlineOrders,
      yesterdayInStoreReceipts,
      yesterdaySpendings
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, totalAmount: true, createdAt: true }
      }),
      prisma.pOSReceipt.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, totalAmount: true, items: true, createdAt: true }
      }),
      prisma.spending.findMany({
        where: {
          storeId,
          deletedAt: null,
          date: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, amount: true, type: true, description: true, date: true }
      }),
      prisma.customer.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, firstName: true, lastName: true, city: true, state: true, phone: true, createdAt: true }
      }),
      prisma.order.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
        },
        select: { id: true, totalAmount: true }
      }),
      prisma.pOSReceipt.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
        },
        select: { id: true, totalAmount: true, items: true }
      }),
      prisma.spending.findMany({
        where: {
          storeId,
          deletedAt: null,
          date: { gte: yesterdayStart, lte: yesterdayEnd }
        },
        select: { id: true, amount: true, type: true }
      })
    ]);

    // Orders & Revenue
    const todayOnlineRevenue = todayOnlineOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const todayInStoreRevenue = todayInStoreReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const todayTotalRevenue = todayOnlineRevenue + todayInStoreRevenue;
    const todayOnlineOrderCount = todayOnlineOrders.length;
    const todayInStoreOrderCount = todayInStoreReceipts.length;
    const todayTotalOrderCount = todayOnlineOrderCount + todayInStoreOrderCount;

    const yesterdayOnlineRevenue = yesterdayOnlineOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const yesterdayInStoreRevenue = yesterdayInStoreReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const yesterdayTotalRevenue = yesterdayOnlineRevenue + yesterdayInStoreRevenue;
    const yesterdayOnlineOrderCount = yesterdayOnlineOrders.length;
    const yesterdayInStoreOrderCount = yesterdayInStoreReceipts.length;
    const yesterdayTotalOrderCount = yesterdayOnlineOrderCount + yesterdayInStoreOrderCount;

    // Top Products Today (by quantity, both channels)
    const productSales: { [productId: string]: { quantity: number } } = {};
    // Online
    const todayOrderIds = todayOnlineOrders.map(o => o.id);
    if (todayOrderIds.length > 0) {
      const todayOrderItems = await prisma.orderItem.findMany({
        where: { orderId: { in: todayOrderIds } },
        select: { productId: true, quantity: true }
      });
      todayOrderItems.forEach(item => {
        if (!productSales[item.productId]) productSales[item.productId] = { quantity: 0 };
        productSales[item.productId].quantity += item.quantity;
      });
    }
    // In-store
    todayInStoreReceipts.forEach(receipt => {
      const items = receipt.items as any[];
      items.forEach((item: any) => {
        if (!productSales[item.productId]) productSales[item.productId] = { quantity: 0 };
        productSales[item.productId].quantity += item.quantity;
      });
    });
    const todayTopProductIds = Object.entries(productSales)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId]) => productId);
    const todayTopProducts = await Promise.all(
      todayTopProductIds.map(async productId => {
        const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, category: true } });
        return {
          productId,
          name: product?.name,
          category: product?.category,
          quantity: productSales[productId].quantity
        };
      })
    );

    // Spendings (total and by type)
    const todayTotalSpending = todaySpendings.reduce((sum, s) => sum + (s.amount || 0), 0);
    const todaySpendingByType: { [type: string]: number } = {};
    todaySpendings.forEach(s => {
      if (!todaySpendingByType[s.type]) todaySpendingByType[s.type] = 0;
      todaySpendingByType[s.type] += s.amount;
    });

    // Dopamine cues: progress vs yesterday
    const revenueDelta = todayTotalRevenue - yesterdayTotalRevenue;
    const orderDelta = todayTotalOrderCount - yesterdayTotalOrderCount;
    const spendingDelta = todayTotalSpending - yesterdaySpendings.reduce((sum, s) => sum + (s.amount || 0), 0);

    const progress = {
      revenue: {
        online: todayOnlineRevenue,
        inStore: todayInStoreRevenue,
        total: todayTotalRevenue,
        delta: revenueDelta,
        deltaPercent: yesterdayTotalRevenue === 0 ? null : ((revenueDelta / yesterdayTotalRevenue) * 100).toFixed(2)
      },
      orders: {
        online: todayOnlineOrderCount,
        inStore: todayInStoreOrderCount,
        total: todayTotalOrderCount,
        delta: orderDelta,
        deltaPercent: yesterdayTotalOrderCount === 0 ? null : ((orderDelta / yesterdayTotalOrderCount) * 100).toFixed(2)
      },
      spendings: {
        total: todayTotalSpending,
        byType: todaySpendingByType,
        delta: spendingDelta,
        deltaPercent: (yesterdaySpendings.reduce((sum, s) => sum + (s.amount || 0), 0) === 0) ? null : ((spendingDelta / yesterdaySpendings.reduce((sum, s) => sum + (s.amount || 0), 0)) * 100).toFixed(2)
      },
      topProducts: todayTopProducts,
      newCustomers: {
        count: todayNewCustomers.length,
        customers: todayNewCustomers
      },
      dopamineCues: {
        revenue: revenueDelta > 0 ? '🔥 Up from yesterday!' : revenueDelta < 0 ? '⬇️ Down from yesterday' : 'No change',
        orders: orderDelta > 0 ? '🚀 More orders today!' : orderDelta < 0 ? '📉 Fewer orders than yesterday' : 'No change',
        spendings: spendingDelta > 0 ? '💸 More spent today' : spendingDelta < 0 ? '🤑 Less spent today' : 'No change'
      }
    };

    await safeRedisSetex(cacheKey, CACHE_TTL.DAILY_SUMMARY, JSON.stringify(progress));
    return res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Today progress data unavailable.' });
    return;
  }
});

export default router;
