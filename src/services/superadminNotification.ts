// Helper for creating superadmin notifications for important events
import { createNotification } from './notification';

export async function notifySuperadmin(type: string, message: string, meta?: Record<string, any>) {
  // Optionally, you can store meta as JSON in a new column if needed
  return createNotification({ type, message }); // userId: null for superadmin/global
}

// Event-specific helpers for clarity
export async function notifyStoreAdminPasswordReset(storeName: string, adminName: string) {
  return notifySuperadmin(
    'STOREADMIN_PASSWORD_RESET',
    `Store admin ${adminName} for store ${storeName} has reset their password.`
  );
}

export async function notifyOrderMilestone(storeName: string, orderCount: number) {
  return notifySuperadmin(
    'ORDER_MILESTONE',
    `Store ${storeName} has reached ${orderCount} orders.`
  );
}

export async function notifySupportRequest(storeName: string, requestId: string) {
  return notifySuperadmin(
    'SUPPORT_REQUEST',
    `Support request submitted by ${storeName}. Request ID: ${requestId}`
  );
}

export async function notifySubscriptionExpiry(storeName: string, expiryDate: string) {
  return notifySuperadmin(
    'SUBSCRIPTION_EXPIRY',
    `Subscription for store ${storeName} expires on ${expiryDate}.`
  );
}

export async function notifyRepeatedFailedLogins(userName: string, count: number) {
  return notifySuperadmin(
    'REPEATED_FAILED_LOGINS',
    `${userName} has had ${count} consecutive failed login attempts.`
  );
}

export async function notifyCriticalBankAccountChange(storeName: string, action: string) {
  return notifySuperadmin(
    'BANK_ACCOUNT_CHANGE',
    `Bank account ${action} for store ${storeName}.`
  );
}
