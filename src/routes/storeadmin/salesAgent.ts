import express from 'express';
import { prisma } from '../../utils/database';

console.log('LOADED SALES AGENT ROUTER', __filename);
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const router = express.Router({ mergeParams: true });

// List all sales agents for a store
router.get('/', async (req: express.Request<{ storeId: string }>, res, next) => {
    try {
        const storeId = req.params.storeId as string;
        const agents = await prisma.salesAgent.findMany({ where: { storeId, active: true } });
        logger.info('Listed sales agents', { storeId, action: 'list_agents', count: agents.length });
        res.json({ agents });
    } catch (error) {
        next(error);
    }
});

// Create a new sales agent for a store
router.post('/', async (req: express.Request<{ storeId: string }>, res, next) => {
    try {
        const storeId = req.params.storeId as string;
        if (!storeId) {
            logger.error('Missing storeId in route params', { params: req.params, body: req.body });
            return res.status(400).json({ error: 'Missing storeId in route params' });
        }
        logger.info('Creating sales agent', { storeId, body: req.body });
        const data = { ...req.body, storeId };
        const agent = await prisma.salesAgent.create({ data });
        logger.info('Created sales agent', { storeId, agentId: agent.id, action: 'create_agent' });
        return res.status(201).json({ agent });
    } catch (error) {
        return next(error);
    }
});

// IMPORTANT: /summary and /:id/summary must be above /:id for correct routing
// Get summary for all sales agents in a store
router.get('/summary', async (req: express.Request<{ storeId: string }>, res, next) => {
    logger.info('HIT /summary UNIQUE', { url: req.originalUrl, params: req.params });
    try {
        const storeId = req.params.storeId as string;
        const agents = await prisma.salesAgent.findMany({ where: { storeId, active: true } });
        if (!agents.length) return res.json({ agents: [] });

        // Get all POS receipts for this store, grouped by salesAgentId
        const receipts = await prisma.pOSReceipt.findMany({
            where: { storeId, salesAgentId: { not: null } },
            select: { id: true, totalAmount: true, salesAgentId: true }
        });
        // Group receipts by agent
        const receiptsByAgent: { [agentId: string]: { id: string, totalAmount: number }[] } = {};
        receipts.forEach(r => {
            if (!r.salesAgentId) return;
            if (!receiptsByAgent[r.salesAgentId]) receiptsByAgent[r.salesAgentId] = [];
            receiptsByAgent[r.salesAgentId].push(r);
        });
        const summary = agents.map(agent => {
            const agentReceipts = receiptsByAgent[agent.id] || [];
            const totalSales = agentReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
            const commission = totalSales * (agent.commissionRate / 100);
            return {
                ...agent,
                totalSales,
                commission,
                receiptsCount: agentReceipts.length,
            };
        });
        logger.info('Fetched summary for all sales agents', { storeId, action: 'summary_all_agents', count: summary.length });
        res.json({ agents: summary });
    } catch (error) {
        return next(error);
    }
});

// Get summary for a sales agent
router.get('/:id/summary', async (req: express.Request<{ storeId: string; id: string }>, res, next) => {
    logger.info('HIT /:id/summary UNIQUE', { url: req.originalUrl, params: req.params });
    try {
        const { id, storeId } = req.params;
        const agent = await prisma.salesAgent.findFirst({ where: { id, storeId } });
        if (!agent) throw createError('SalesAgent not found', 404);

        // Get all POS receipts for this agent
        const receipts = await prisma.pOSReceipt.findMany({
            where: { storeId, salesAgentId: id },
            select: { id: true, totalAmount: true, createdAt: true }
        });
        const totalSales = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
        const commission = totalSales * (agent.commissionRate / 100);

        logger.info('Fetched summary for sales agent', { storeId, agentId: id, action: 'summary_agent' });
        res.json({
            agent: {
                ...agent,
                totalSales,
                commission,
                receiptsCount: receipts.length,
            },
            receipts,
        });
    } catch (error) {
        next(error);
    }
});

// Get a specific sales agent by id
router.get('/:id', async (req: express.Request<{ storeId: string; id: string }>, res, next) => {
    try {
        const { id, storeId } = req.params;
        const agent = await prisma.salesAgent.findFirst({ where: { id, storeId } });
        if (!agent) throw createError('SalesAgent not found', 404);
        logger.info('Fetched sales agent', { storeId, agentId: id, action: 'get_agent' });
        res.json({ agent });
    } catch (error) {
        next(error);
    }
});

// Update a specific sales agent by id
router.put('/:id', async (req: express.Request<{ storeId: string; id: string }>, res, next) => {
    try {
        const { id, storeId } = req.params;
        const data = req.body;
        const agent = await prisma.salesAgent.update({ where: { id }, data: { ...data, storeId } });
        res.json({ agent });
    } catch (error) {
        next(error);
    }
});

// Deactivate (soft delete) a sales agent
router.delete('/:id', async (req: express.Request<{ storeId: string; id: string }>, res, next) => {
    try {
        const { id, storeId } = req.params;
        await prisma.salesAgent.update({ where: { id, storeId }, data: { active: false } });
        logger.info('Deactivated sales agent', { storeId, agentId: id, action: 'deactivate_agent' });
        res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

export default router;
