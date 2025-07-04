import express from 'express';
import { prisma } from '@/utils/database';
import { AuthenticatedRequest } from '@/middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/storeadmin/dashboard:
 *   get:
 *     tags: [Store Admin]
 *     summary: Get store admin dashboard data
 *     description: Get comprehensive dashboard statistics and analytics for the store
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
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue (orders + POS)
 *                     totalCustomers:
 *                       type: integer
 *                       description: Total number of customers
 *                     lowStockCount:
 *                       type: integer
 *                       description: Number of products with low stock
 *                     todayOrders:
 *                       type: integer
 *                       description: Number of orders today
 *                     todayRevenue:
 *                       type: number
 *                       description: Revenue today (orders + POS)
 *                     todayPOSReceipts:
 *                       type: integer
 *                       description: Number of POS receipts today
 *                     todayPOSRevenue:
 *                       type: number
 *                       description: POS revenue today
 *                     todayPOSReceived:
 *                       type: number
 *                       description: Amount received today through POS
 *                     monthlyPOSReceipts:
 *                       type: integer
 *                       description: Number of POS receipts in current month
 *                     monthlyPOSRevenue:
 *                       type: number
 *                       description: POS revenue in current month
 *                     monthlyPOSDiscount:
 *                       type: number
 *                       description: Total POS discounts in current month
 *                     monthlyPOSDiscountPercentage:
 *                       type: number
 *                       description: Percentage of POS discounts
 *                     discountTransactionCount:
 *                       type: integer
 *                       description: Number of transactions with discounts
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
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Order creation date
 *                       customerName:
 *                         type: string
 *                         description: Customer name
 *                       totalAmount:
 *                         type: number
 *                         description: Total order amount
 *                       status:
 *                         type: string
 *                         description: Order status
 *                 recentPOSReceipts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Receipt ID
 *                       receiptNumber:
 *                         type: string
 *                         description: Receipt number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Receipt creation date
 *                       customerName:
 *                         type: string
 *                         description: Customer name
 *                       totalAmount:
 *                         type: number
 *                         description: Total receipt amount
 *                       amountReceived:
 *                         type: number
 *                         description: Amount received
 *                       discountAmount:
 *                         type: number
 *                         description: Discount amount
 *                       discountPercentage:
 *                         type: number
 *                         description: Discount percentage
 *                       paymentMethod:
 *                         type: string
 *                         description: Payment method used
 *                 topProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       name:
 *                         type: string
 *                         description: Product name
 *                       category:
 *                         type: string
 *                         description: Product category
 *                       totalQuantity:
 *                         type: integer
 *                         description: Total quantity sold
 *                       orderCount:
 *                         type: integer
 *                         description: Number of orders containing this product
 *                 lowStockProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         description: Product ID
 *                       productName:
 *                         type: string
 *                         description: Product name
 *                       category:
 *                         type: string
 *                         description: Product category
 *                       currentStock:
 *                         type: integer
 *                         description: Current stock quantity
 *                       minStockLevel:
 *                         type: integer
 *                         description: Minimum stock level
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const storeId = req.user!.storeId!;

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get summary statistics
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      lowStockCount,
      todayOrders,
      todayRevenue,
      todayPOSReceipts,
      todayPOSRevenue,
      monthlyPOSReceipts
    ] = await Promise.all([
      prisma.order.count({
        where: { storeId, deletedAt: null }
      }),
      prisma.order.aggregate({
        where: { storeId, deletedAt: null },
        _sum: { totalAmount: true }
      }),
      prisma.customer.count({
        where: { storeId, deletedAt: null }
      }),
      prisma.inventory.count({
        where: {
          storeId,
          deletedAt: null,
          currentStock: { lte: prisma.inventory.fields.minStockLevel }
        }
      }),
      prisma.order.count({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      }),
      prisma.order.aggregate({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        _sum: { totalAmount: true }
      }),
      prisma.pOSReceipt.count({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      }),
      prisma.pOSReceipt.aggregate({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        _sum: { totalAmount: true, amountReceived: true }
      }),
      prisma.pOSReceipt.findMany({
        where: {
          storeId,
          deletedAt: null,
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        select: {
          totalAmount: true,
          amountReceived: true,
          createdAt: true
        }
      })
    ]);

    // Calculate POS discount statistics
    let totalPOSDiscount = 0;
    let totalPOSDiscountPercentage = 0;
    let discountTransactionCount = 0;

    monthlyPOSReceipts.forEach((receipt: any) => {
      if (receipt.amountReceived !== null && receipt.amountReceived < receipt.totalAmount) {
        const discount = receipt.totalAmount - receipt.amountReceived;
        totalPOSDiscount += discount;
        discountTransactionCount++;
      }
    });

    const totalPOSSales = monthlyPOSReceipts.reduce((sum: any, receipt: any) => sum + receipt.totalAmount, 0);
    if (totalPOSSales > 0) {
      totalPOSDiscountPercentage = (totalPOSDiscount / totalPOSSales) * 100;
    }

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { storeId, deletedAt: null },
      include: {
        customer: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get recent POS receipts
    const recentPOSReceipts = await prisma.pOSReceipt.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Add discount calculations to recent POS receipts
    const recentPOSWithDiscounts = recentPOSReceipts.map((receipt: any) => {
      let discountAmount = 0;
      let discountPercentage = 0;

      if (receipt.amountReceived !== null && receipt.amountReceived < receipt.totalAmount) {
        discountAmount = receipt.totalAmount - receipt.amountReceived;
        discountPercentage = (discountAmount / receipt.totalAmount) * 100;
      }

      return {
        ...receipt,
        discountAmount,
        discountPercentage: Math.round(discountPercentage * 100) / 100
      };
    });

    // Get top products from both orders and POS
    const [orderItems, posReceipts] = await Promise.all([
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { storeId, deletedAt: null }
        },
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10
      }),
      prisma.pOSReceipt.findMany({
        where: { storeId, deletedAt: null },
        select: { items: true }
      })
    ]);

    // Process POS items to get product statistics
    const posProductStats: { [key: string]: { quantity: number; count: number } } = {};
    
    posReceipts.forEach((receipt: any) => {
      const items = receipt.items as any[];
      items.forEach((item: any) => {
        if (!posProductStats[item.productId]) {
          posProductStats[item.productId] = { quantity: 0, count: 0 };
        }
        posProductStats[item.productId].quantity += item.quantity;
        posProductStats[item.productId].count += 1;
      });
    });

    // Combine order and POS product statistics
    const combinedProductStats: { [key: string]: { quantity: number; count: number } } = {};

    orderItems.forEach((item: any) => {
      combinedProductStats[item.productId] = {
        quantity: item._sum.quantity || 0,
        count: item._count.productId
      };
    });

    Object.keys(posProductStats).forEach((productId: any) => {
      if (combinedProductStats[productId]) {
        combinedProductStats[productId].quantity += posProductStats[productId].quantity;
        combinedProductStats[productId].count += posProductStats[productId].count;
      } else {
        combinedProductStats[productId] = posProductStats[productId];
      }
    });

    // Get top 5 products with details
    const topProductIds = Object.entries(combinedProductStats)
      .sort((a: any, b: any) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId]: any) => productId);

    const topProductsWithDetails = await Promise.all(
      topProductIds.map(async (productId: any) => {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { name: true, category: true }
        });
        return {
          productId,
          name: product?.name,
          category: product?.category,
          totalQuantity: combinedProductStats[productId].quantity,
          orderCount: combinedProductStats[productId].count
        };
      })
    );

    // Get low stock products
    const lowStockProducts = await prisma.inventory.findMany({
      where: {
        storeId,
        deletedAt: null,
        currentStock: { lte: prisma.inventory.fields.minStockLevel }
      },
      include: {
        product: {
          select: { name: true, category: true }
        }
      },
      take: 10
    });

    res.json({
      summary: {
        totalOrders,
        totalRevenue: (totalRevenue._sum.totalAmount || 0) + (todayPOSRevenue._sum.totalAmount || 0),
        totalCustomers,
        lowStockCount,
        todayOrders,
        todayRevenue: (todayRevenue._sum.totalAmount || 0) + (todayPOSRevenue._sum.totalAmount || 0),
        todayPOSReceipts,
        todayPOSRevenue: todayPOSRevenue._sum.totalAmount || 0,
        todayPOSReceived: todayPOSRevenue._sum.amountReceived || 0,
        monthlyPOSDiscount: totalPOSDiscount,
        monthlyPOSDiscountPercentage: Math.round(totalPOSDiscountPercentage * 100) / 100,
        discountTransactionCount
      },
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      })),
      recentPOSReceipts: recentPOSWithDiscounts.map((receipt: any) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        customerName: receipt.customerName || 'Walk-in Customer',
        totalAmount: receipt.totalAmount,
        amountReceived: receipt.amountReceived,
        discountAmount: receipt.discountAmount,
        discountPercentage: receipt.discountPercentage,
        paymentMethod: receipt.paymentMethod,
        createdAt: receipt.createdAt
      })),
      topProducts: topProductsWithDetails,
      lowStockProducts: lowStockProducts.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        category: item.product.category,
        currentStock: item.currentStock,
        minStockLevel: item.minStockLevel
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;