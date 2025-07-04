import express from 'express';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import storeRoutes from './stores';
import userRoutes from './users';
import dashboardRoutes from './dashboard';
import subscriptionRoutes from './subscriptions';

const router = express.Router();

// Apply authentication and authorization to all superadmin routes
router.use(authenticate);
router.use(requireSuperAdmin);

// Mount sub-routes
router.use('/stores', storeRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subscriptions', subscriptionRoutes);

export default router;