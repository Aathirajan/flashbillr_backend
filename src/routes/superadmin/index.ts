import express from 'express';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import storeRoutes from './stores';
import userRoutes from './users';
import dashboardRoutes from './dashboard';
import subscriptionRoutes from './subscriptions';
import bankAccountRoutes from './bankAccount';
import featuredBrandRoutes from './featuredBrand';
import socialMediaLinkRoutes from './socialMediaLink';

// =============================
// SUPERADMIN ROUTER STRUCTURE
// =============================
// This router is mounted under /api/superadmin in the main server.
// All sub-routers must use sub-paths like /stores, /users, etc.,
// so that the final API path is always /api/superadmin/<sub-path>.
// =============================
const router = express.Router();

// Apply authentication and authorization to all superadmin routes
router.use(authenticate);
router.use(requireSuperAdmin);

// Mount sub-routes
router.use('/stores', storeRoutes);
router.use('/stores', bankAccountRoutes);
router.use('/stores', featuredBrandRoutes);
router.use('/stores', socialMediaLinkRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/notifications', require('./notifications').default);
router.use('/support-tickets', require('./supportTickets').default);

export default router;