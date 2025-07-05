import { PrismaClient, Notification } from '@prisma/client';

const prisma = new PrismaClient();

export async function createNotification({ type, message, userId }: { type: string; message: string; userId?: string }) {
  return prisma.notification.create({
    data: {
      type,
      message,
      userId: userId ?? null,
    },
  });
}

export async function getNotifications(userId?: string) {
  return prisma.notification.findMany({
    where: {
      OR: [
        { userId: userId ?? undefined },
        { userId: null }, // global notifications
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationAsRead(id: number) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}
