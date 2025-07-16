import express from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { CACHE_TTL, safeRedisGet, safeRedisSetex } from '../../routes/storeadmin/dashboardUtils';
import { prisma } from '../../utils/database';
import { getCurrentFiscalYearRange } from './fiscalYearUtils';

const router = express.Router();

// GET /api/storeadmin/dashboard/summary
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

        // Cache key for summary (include date range)
        const cacheKey = `dashboard_summary:${storeId}:${startDate}:${endDate}`;
        const cached = await safeRedisGet(cacheKey);
        if (cached) {
            console.log('[dashboardSummary] Response served from Redis cache for key:', cacheKey);
            return res.json(JSON.parse(cached));
        }

        // Fetch summary metrics filtered by date range
        const [
            totalOrders,
            totalOrderRevenue,
            totalPOSRevenue,
            totalCustomers,
            lowStockCount
        ] = await Promise.all([
            prisma.order.count({ where: { storeId, deletedAt: null, createdAt: { gte: new Date(startDate!), lte: new Date(endDate!) } } }),
            prisma.order.aggregate({ where: { storeId, deletedAt: null, createdAt: { gte: new Date(startDate!), lte: new Date(endDate!) } }, _sum: { totalAmount: true } }),
            prisma.pOSReceipt.aggregate({ where: { storeId, deletedAt: null, createdAt: { gte: new Date(startDate!), lte: new Date(endDate!) } }, _sum: { totalAmount: true } }),
            prisma.customer.count({ where: { storeId, deletedAt: null, createdAt: { gte: new Date(startDate!), lte: new Date(endDate!) } } }),
            prisma.inventory.count({ where: { storeId, deletedAt: null, currentStock: { lte: prisma.inventory.fields.minStockLevel }, updatedAt: { gte: new Date(startDate!), lte: new Date(endDate!) } } })
        ]);

        // For today’s metrics, keep the original logic (today only)
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const [
            todayOrders,
            todayOrderRevenue,
            todayPOSReceipts,
            todayPOSRevenue
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    storeId,
                    deletedAt: null,
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            prisma.order.aggregate({
                where: {
                    storeId,
                    deletedAt: null,
                    createdAt: { gte: todayStart, lte: todayEnd }
                },
                _sum: { totalAmount: true }
            }),
            prisma.pOSReceipt.count({
                where: {
                    storeId,
                    deletedAt: null,
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            prisma.pOSReceipt.aggregate({
                where: {
                    storeId,
                    deletedAt: null,
                    createdAt: { gte: todayStart, lte: todayEnd }
                },
                _sum: { totalAmount: true }
            })
        ]);

        const summary = {
            totalOrders,
            totalRevenue: (totalOrderRevenue._sum.totalAmount || 0) + (totalPOSRevenue._sum.totalAmount || 0),
            totalCustomers,
            lowStockCount,
            todayOrders,
            todayRevenue: (todayOrderRevenue._sum.totalAmount || 0) + (todayPOSRevenue._sum.totalAmount || 0),
            todayPOSReceipts,
            todayPOSRevenue: todayPOSRevenue._sum.totalAmount || 0
        };

        await safeRedisSetex(cacheKey, CACHE_TTL.DAILY_SUMMARY, JSON.stringify(summary));
        return res.json(summary);
    } catch (error) {
        return res.status(500).json({ error: 'Dashboard summary unavailable.' });
    }
});

export default router;
