import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

async function cleanupOldNotifications() {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  try {
    const { count } = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    logger.info(`Deleted ${count} notifications older than 7 days.`);
  } catch (error) {
    logger.error('Failed to cleanup old notifications:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldNotifications();
