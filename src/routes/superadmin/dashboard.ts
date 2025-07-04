import express from 'express';
import { prisma } from '../../utils/database';

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
  try {
    // Get total counts
    const [
      totalStores,
      activeStores,
      totalOrders,
      totalRevenue,
      recentOrders
    ] = await Promise.all([
      prisma.store.count({ where: { deletedAt: null } }),
      prisma.store.count({ where: { deletedAt: null, isActive: true } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.aggregate({
        where: { deletedAt: null },
        _sum: { totalAmount: true }
      }),
      prisma.order.findMany({
        where: { deletedAt: null },
        include: {
          store: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Get monthly revenue data (last 12 months)
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("totalAmount") as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE "deletedAt" IS NULL 
        AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    // Get top performing stores
    const topStores = await prisma.store.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { orders: true } },
        orders: {
          where: { deletedAt: null },
          select: { totalAmount: true }
        }
      },
      take: 5
    });

    const topStoresWithRevenue = topStores.map((store: any) => ({
      id: store.id,
      name: store.name,
      totalOrders: store._count.orders,
      totalRevenue: store.orders.reduce((sum: any, order: any) => sum + order.totalAmount, 0)
    })).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    res.json({
      summary: {
        totalStores,
        activeStores,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0
      },
      monthlyRevenue,
      topStores: topStoresWithRevenue,
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        storeName: order.store.name,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;