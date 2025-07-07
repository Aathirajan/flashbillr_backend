import express from 'express';
import { getNotifications, markNotificationAsRead } from '../../services/notification';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// Get notifications for the superadmin (global notifications only)
router.get('/', authenticate, async (req: any, res) => {
  try {
    // For superadmin, userId is undefined to get global notifications
    const notifications = await getNotifications();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.patch('/:id/read', authenticate, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    await markNotificationAsRead(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req: any, res) => {
  try {
    // Mark all global notifications as read
    const prisma = require('../../prisma/client').default || require('../../prisma/client');
    const result = await prisma.notification.updateMany({
      where: { userId: null, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, updatedCount: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const prisma = require('../../prisma/client').default || require('../../prisma/client');
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
