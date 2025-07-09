import express from 'express';
import { authenticate, requireStoreAdmin } from '../../middleware/auth';
import dashboardRoutes from './dashboard';
import productsRoutes from './products';
import inventoryRoutes from './inventory';
import customersRoutes from './customers';
import ordersRoutes from './orders';
import posRoutes from './pos';
import invoicesRoutes from './invoices';
import notificationsRoutes from './notifications';
import meRoutes from './me';
import categoriesRoutes from './categories';

const router = express.Router();

// Apply authentication and authorization to all store admin routes
router.use(authenticate);
router.use(requireStoreAdmin);

// Mount sub-routes
router.use('/dashboard', dashboardRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customersRoutes);
router.use('/orders', ordersRoutes);
router.use('/pos', posRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/me', meRoutes);
router.use('/categories', categoriesRoutes);

router.use('/support-tickets', require('./supportTickets').default);

export default router;