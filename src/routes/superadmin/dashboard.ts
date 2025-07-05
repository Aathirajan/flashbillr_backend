import express from 'express';
import { prisma } from '../../utils/database';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/superadmin/dashboard:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get superadmin dashboard data
 *     description: Get comprehensive dashboard statistics and analytics for all stores
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalStores:
 *                       type: integer
 *                       description: Total number of stores
 *                     activeStores:
 *                       type: integer
 *                       description: Number of active stores
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders across all stores
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue across all stores
 *                 monthlyRevenue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: date
 *                         description: Month of the data
 *                       revenue:
 *                         type: number
 *                         description: Total revenue for the month
 *                       orders:
 *                         type: integer
 *                         description: Number of orders in the month
 *                 topStores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Store ID
 *                       name:
 *                         type: string
 *                         description: Store name
 *                       totalOrders:
 *                         type: integer
 *                         description: Total number of orders
 *                       totalRevenue:
 *                         type: number
 *                         description: Total revenue generated
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Order ID
 *                       orderNumber:
 *                         type: string
 *                         description: Order number
 *                       storeName:
 *                         type: string
 *                         description: Store name
 *                       customerName:
 *                         type: string
 *                         description: Customer name
 *                       totalAmount:
 *                         type: number
 *                         description: Total order amount
 *                       status:
 *                         type: string
 *                         description: Order status
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Order creation date
 */
router.get('/', async (req, res, next) => {
  logger.info('Superadmin dashboard accessed', {
    user: req.user ? req.user.userId : 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  try {
    // --- Dashboard logic ---

    // 1. Store Owners (StoreAdmins) and their stores
    const storeOwners = await prisma.user.findMany({
      where: { role: 'STOREADMIN', deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        store: {
          select: { id: true, name: true, createdAt: true, isActive: true }
        }
      }
    });

    // 2. Recent stores
    const recentStores = await prisma.store.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true,
        isActive: true,
        creator: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    // 3. Store growth rate (monthly for last 12 months)
    const storeGrowth = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as stores
      FROM stores
      WHERE "deletedAt" IS NULL AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    // 4. Payments/Subscriptions
    const [
      totalPayments,
      paymentsThisMonth,
      paymentsThisWeek,
      paymentBreakdown,
      recentPayments,
      expiringSubscriptions
    ] = await Promise.all([
      prisma.subscription.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null }
      }),
      prisma.subscription.aggregate({
        _sum: { amount: true },
        where: {
          deletedAt: null,
          startDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.subscription.aggregate({
        _sum: { amount: true },
        where: {
          deletedAt: null,
          startDate: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
        }
      }),
      prisma.subscription.groupBy({
        by: ['storeId'],
        _sum: { amount: true },
        where: { deletedAt: null }
      }),
      prisma.subscription.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          storeId: true,
          amount: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          store: { select: { name: true } }
        }
      }),
      prisma.subscription.findMany({
        where: {
          deletedAt: null,
          endDate: { gte: new Date(), lte: new Date(new Date().setDate(new Date().getDate() + 30)) },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          storeId: true,
          endDate: true,
          store: { select: { name: true } }
        }
      })
    ]);

    // 5. Users
    const [
      totalUsers,
      userGrowth,
      recentUsers
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as users
        FROM users
        WHERE "deletedAt" IS NULL AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      })
    ]);

    // 6. Orders
    const [
      totalOrdersExpanded,
      orderGrowth,
      ordersPerStore
    ] = await Promise.all([
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as orders
        FROM orders
        WHERE "deletedAt" IS NULL AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,
      prisma.order.groupBy({
        by: ['storeId'],
        _count: { id: true },
        where: { deletedAt: null }
      })
    ]);

    // 7. Database/Storage usage
    const [storesCount, usersCount, ordersCount, subscriptionsCount] = await Promise.all([
      prisma.store.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.subscription.count()
    ]);
    // Database size (Postgres only, requires raw SQL)
    let databaseSize = null;
    try {
      const dbSizeResult = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
      if (Array.isArray(dbSizeResult) && dbSizeResult.length > 0) {
        const size = dbSizeResult[0].size;
        databaseSize = typeof size === 'bigint' ? Number(size) : size;
      }
    } catch (e) {
      databaseSize = null;
    }

    // --- END expanded dashboard logic ---

    // Convert BigInt values in raw results for JSON serialization
    const safeStoreGrowth = Array.isArray(storeGrowth)
      ? storeGrowth.map((row: any) => ({
          ...row,
          stores: row.stores !== null && typeof row.stores === 'bigint' ? Number(row.stores) : row.stores,
        }))
      : [];
    const safeUserGrowth = Array.isArray(userGrowth)
      ? userGrowth.map((row: any) => ({
          ...row,
          users: row.users !== null && typeof row.users === 'bigint' ? Number(row.users) : row.users,
        }))
      : [];
    const safeOrderGrowth = Array.isArray(orderGrowth)
      ? orderGrowth.map((row: any) => ({
          ...row,
          orders: row.orders !== null && typeof row.orders === 'bigint' ? Number(row.orders) : row.orders,
        }))
      : [];
    const safePaymentBreakdown = Array.isArray(paymentBreakdown)
      ? paymentBreakdown.map((row: any) => ({
          ...row,
          _sum: {
            amount: row._sum.amount !== null && typeof row._sum.amount === 'bigint' ? Number(row._sum.amount) : row._sum.amount
          }
        }))
      : [];
    const safeOrdersPerStore = Array.isArray(ordersPerStore)
      ? ordersPerStore.map((row: any) => ({
          ...row,
          _count: {
            id: row._count.id !== null && typeof row._count.id === 'bigint' ? Number(row._count.id) : row._count.id
          }
        }))
      : [];

    // Return a single large object
    res.json({
      storeOwners,
      recentStores,
      storeGrowth: safeStoreGrowth,
      payments: {
        totalPayments: totalPayments._sum?.amount !== null && typeof totalPayments._sum?.amount === 'bigint' ? Number(totalPayments._sum.amount) : totalPayments._sum?.amount || 0,
        paymentsThisMonth: paymentsThisMonth._sum?.amount !== null && typeof paymentsThisMonth._sum?.amount === 'bigint' ? Number(paymentsThisMonth._sum.amount) : paymentsThisMonth._sum?.amount || 0,
        paymentsThisWeek: paymentsThisWeek._sum?.amount !== null && typeof paymentsThisWeek._sum?.amount === 'bigint' ? Number(paymentsThisWeek._sum.amount) : paymentsThisWeek._sum?.amount || 0,
        paymentBreakdown: safePaymentBreakdown,
        recentPayments,
        expiringSubscriptions,
      },
      users: {
        totalUsers,
        userGrowth: safeUserGrowth,
        recentUsers,
      },
      orders: {
        totalOrders: totalOrdersExpanded,
        orderGrowth: safeOrderGrowth,
        ordersPerStore: safeOrdersPerStore,
      },
      dbStats: {
        storesCount,
        usersCount,
        ordersCount,
        subscriptionsCount,
        databaseSize,
      },
    });
  } catch (error) {
    logger.error('Error fetching superadmin dashboard:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      user: req.user ? req.user.userId : 'anonymous',
      ip: req.ip
    });
    next(error);
  }
});
export default router;