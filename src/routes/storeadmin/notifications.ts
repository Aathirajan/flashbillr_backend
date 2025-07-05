import express from 'express';
import { getNotifications, markNotificationAsRead } from '../../services/notification';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// Get notifications for the logged-in store admin
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const notifications = await getNotifications(userId);
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

export default router;
