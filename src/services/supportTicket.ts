import { prisma } from '../utils/database'
import { notifySupportRequest } from './superadminNotification';

// Create a support ticket (Storeadmin)
export async function createSupportTicket({ storeId, title, message, storeName }: { storeId: string; title: string; message: string; storeName: string }) {
  const ticket = await prisma.supportTicket.create({
    data: { storeId, title, message },
  });
  // Notify superadmin
  await notifySupportRequest(storeName, ticket.id);
  return ticket;
}

// Get tickets (Storeadmin: only own, Superadmin: all)
export async function getSupportTickets({ storeId }: { storeId?: string }) {
  return prisma.supportTicket.findMany({
    where: storeId ? { storeId } : {},
    orderBy: { createdAt: 'desc' },
  });
}

// Get ticket by ID (with access control in route)
export async function getSupportTicketById(id: string) {
  return prisma.supportTicket.findUnique({ where: { id } });
}

// Update/respond/close a ticket (Superadmin)
export async function updateSupportTicket(id: string, data: { status?: string; response?: string }) {
  return prisma.supportTicket.update({
    where: { id },
    data,
  });
}

// Delete a ticket (Superadmin)
export async function deleteSupportTicket(id: string) {
  return prisma.supportTicket.delete({ where: { id } });
}
