import express from 'express';
import { authenticate } from '../../middleware/auth';
import { createSupportTicket, getSupportTickets, getSupportTicketById } from '../../services/supportTicket';
import { prisma } from '../../utils/database'

const router = express.Router();

// Create a support ticket
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { title, message } = req.body;
    const storeId = req.user.storeId;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    const ticket = await createSupportTicket({ storeId, title, message, storeName: store.name });
    res.status(201).json(ticket);
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to create support ticket' });
    return;
  }
});

// List support tickets (own)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const storeId = req.user.storeId;
    const tickets = await getSupportTickets({ storeId });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
    return;
  }
});

// Get a specific support ticket (own)
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const storeId = req.user.storeId;
    const ticket = await getSupportTicketById(req.params.id);
    if (!ticket || ticket.storeId !== storeId) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json(ticket);
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support ticket' });
    return;
  }
});

export default router;
