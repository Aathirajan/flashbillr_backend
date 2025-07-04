import { prisma } from '../utils/database';
import { sendSubscriptionReminderEmail } from '../services/mailgun';
import { logger } from '../utils/logger';

interface SubscriptionCheck {
  id: string;
  storeId: string;
  storeName: string;
  endDate: Date;
  daysRemaining: number;
  adminEmails: string[];
}

const checkExpiringSubscriptions = async (): Promise<void> => {
  try {
    logger.info('Starting subscription expiry check...');

    // Calculate date ranges for different reminder intervals
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));

    // Find subscriptions expiring within 30 days
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: thirtyDaysFromNow
        }
      },
      include: {
        store: {
          include: {
            users: {
              where: {
                role: 'STOREADMIN',
                isActive: true,
                deletedAt: null
              },
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (expiringSubscriptions.length === 0) {
      logger.info('No expiring subscriptions found');
      return;
    }

    logger.info(`Found ${expiringSubscriptions.length} expiring subscriptions`);

    const subscriptionChecks: SubscriptionCheck[] = expiringSubscriptions.map((sub: any) => {
      const daysRemaining = Math.ceil((sub.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const adminEmails = sub.store.users.map((user: any) => user.email);

      return {
        id: sub.id,
        storeId: sub.storeId,
        storeName: sub.store.name,
        endDate: sub.endDate,
        daysRemaining,
        adminEmails
      };
    });

    // Send reminders based on days remaining
    const emailPromises: Promise<void>[] = [];

    for (const check of subscriptionChecks) {
      // Send reminders at 30, 7, and 1 day intervals
      if (check.daysRemaining <= 30 && check.daysRemaining > 7) {
        // 30-day reminder (send only once when exactly 30 days or less but more than 7)
        if (check.daysRemaining <= 30 && check.daysRemaining > 20) {
          for (const email of check.adminEmails) {
            emailPromises.push(
              sendSubscriptionReminderEmail(
                email,
                check.storeName,
                check.endDate,
                check.daysRemaining
              )
            );
          }
        }
      } else if (check.daysRemaining <= 7 && check.daysRemaining > 1) {
        // 7-day reminder
        for (const email of check.adminEmails) {
          emailPromises.push(
            sendSubscriptionReminderEmail(
              email,
              check.storeName,
              check.endDate,
              check.daysRemaining
            )
          );
        }
      } else if (check.daysRemaining <= 1) {
        // Final reminder (1 day or less)
        for (const email of check.adminEmails) {
          emailPromises.push(
            sendSubscriptionReminderEmail(
              email,
              check.storeName,
              check.endDate,
              check.daysRemaining
            )
          );
        }
      }
    }

    // Send all emails
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      logger.info(`Sent ${emailPromises.length} subscription reminder emails`);
    }

    // Mark expired subscriptions
    const expiredSubscriptions = await prisma.subscription.updateMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        endDate: {
          lt: now
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    if (expiredSubscriptions.count > 0) {
      logger.info(`Marked ${expiredSubscriptions.count} subscriptions as expired`);
    }

    logger.info('Subscription expiry check completed successfully');

  } catch (error) {
    logger.error('Error checking subscription expiry:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Run the check if this script is executed directly
if (require.main === module) {
  checkExpiringSubscriptions()
    .then((): any => {
      logger.info('Subscription check script completed');
      process.exit(0);
    })
    .catch((error: any) => {
      logger.error('Subscription check script failed:', error);
      process.exit(1);
    });
}

export { checkExpiringSubscriptions };