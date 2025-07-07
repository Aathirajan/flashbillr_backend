import express from 'express';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import { getSupportTickets, getSupportTicketById, updateSupportTicket, deleteSupportTicket } from '../../services/supportTicket';

const router = express.Router();

// All routes require superadmin
router.use(authenticate, requireSuperAdmin);

// List all support tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await getSupportTickets({});
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
    return;
  }
});

// Get a specific support ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await getSupportTicketById(req.params.id);
    if (!ticket) {
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

// Respond/update/close a support ticket
router.patch('/:id', async (req, res) => {
  try {
    const { status, response } = req.body;
    const ticket = await updateSupportTicket(req.params.id, { status, response });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
});

// Delete a support ticket
router.delete('/:id', async (req, res) => {
  try {
    await deleteSupportTicket(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete support ticket' });
  }
});

export default router;
