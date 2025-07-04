import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { logger } from '../utils/logger';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY!,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    data: Buffer;
    contentType: string;
  }>;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const messageData = {
      from: process.env.MAILGUN_FROM_EMAIL!,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      attachment: options.attachments
    };

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN!, messageData);
    
    logger.info('Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: result.id
    });
  } catch (error) {
    logger.error('Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Email templates
export const sendStoreAdminOnboardingEmail = async (
  email: string,
  storeName: string,
  tempPassword: string
): Promise<void> => {
  const subject = `Welcome to ${storeName} - Your Flashbillr Store Admin Account`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Welcome to ${storeName}!</h2>
      <p>Your store admin account has been created successfully on Flashbillr.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Login Credentials:</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      </div>
      
      <p><strong>Important:</strong> Please change your password after your first login for security.</p>
      
      <p>Login URL: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>Flashbillr Team</p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, html });
};

export const sendOrderConfirmationEmail = async (
  customerEmail: string,
  orderNumber: string,
  storeName: string,
  orderDetails: any
): Promise<void> => {
  const subject = `Order Confirmation - ${orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Order Confirmed!</h2>
      <p>Thank you for your order from ${storeName} via Flashbillr.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount}</p>
        <p><strong>Status:</strong> ${orderDetails.status}</p>
      </div>
      
      <p>We'll notify you when your order is shipped.</p>
      
      <p>Best regards,<br>${storeName}<br><em>Powered by Flashbillr</em></p>
    </div>
  `;
  
  await sendEmail({ to: customerEmail, subject, html });
};

export const sendOrderShippedEmail = async (
  customerEmail: string,
  orderNumber: string,
  storeName: string,
  lrNumber: string,
  lrPhotoUrl?: string
): Promise<void> => {
  const subject = `Order Shipped - ${orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Your Order Has Been Shipped!</h2>
      <p>Great news! Your order from ${storeName} is on its way.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Shipping Details:</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>LR Number:</strong> ${lrNumber}</p>
        ${lrPhotoUrl ? `<p><strong>LR Receipt:</strong> <a href="${lrPhotoUrl}">View Receipt</a></p>` : ''}
      </div>
      
      <p>Your order will be delivered soon. Please keep the LR number for tracking.</p>
      
      <p>Best regards,<br>${storeName}<br><em>Powered by Flashbillr</em></p>
    </div>
  `;
  
  await sendEmail({ to: customerEmail, subject, html });
};

/**
 * Notify store admin when a payment screenshot is uploaded for an order.
 * @param adminEmail Store admin or notification recipient
 * @param orderNumber Order number
 * @param storeName Store name
 * @param screenshotUrl Public URL to payment screenshot
 * @param customerName Customer or guest name
 * @param customerEmail Customer or guest email
 */
export const sendPaymentScreenshotEmail = async (
  adminEmail: string,
  orderNumber: string,
  storeName: string,
  screenshotUrl: string,
  customerName: string,
  customerEmail: string
): Promise<void> => {
  const subject = `Payment Screenshot Uploaded for Order ${orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Payment Screenshot Uploaded</h2>
      <p>A customer has uploaded a payment screenshot for their order.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Customer Name:</strong> ${customerName}</p>
        <p><strong>Customer Email:</strong> ${customerEmail}</p>
        <p><strong>Store:</strong> ${storeName}</p>
        <p><strong>Screenshot:</strong> <a href="${screenshotUrl}">View Screenshot</a></p>
      </div>
      <p>Please review the payment screenshot and process the order accordingly.</p>
      <p>Best regards,<br>${storeName}<br><em>Powered by Flashbillr</em></p>
    </div>
  `;
  await sendEmail({ to: adminEmail, subject, html });
};

export const sendLowStockAlert = async (
  adminEmail: string,
  storeName: string,
  lowStockProducts: Array<{ name: string; currentStock: number; minStockLevel: number }>
): Promise<void> => {
  const subject = `Low Stock Alert - ${storeName}`;
  const productList = lowStockProducts
    .map(p => `<li>${p.name}: ${p.currentStock} units (Min: ${p.minStockLevel})</li>`)
    .join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">Low Stock Alert!</h2>
      <p>The following products in ${storeName} are running low on stock:</p>
      
      <ul style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${productList}
      </ul>
      
      <p>Please restock these items to avoid stockouts.</p>
      
      <p>Best regards,<br>Flashbillr System</p>
    </div>
  `;
  
  await sendEmail({ to: adminEmail, subject, html });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  storeName?: string
): Promise<void> => {
  const subject = 'Password Reset Request - Flashbillr';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Password Reset Request</h2>
      <p>You have requested to reset your password${storeName ? ` for ${storeName}` : ''} on Flashbillr.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Reset Password</a>
      </div>
      
      <p>If you didn't request this password reset, please ignore this email.</p>
      <p>This link will expire in 1 hour for security reasons.</p>
      
      <p>Best regards,<br>Flashbillr Team</p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, html });
};

export const sendSubscriptionReminderEmail = async (
  adminEmail: string,
  storeName: string,
  expiryDate: Date,
  daysRemaining: number
): Promise<void> => {
  const subject = `Subscription Reminder - ${storeName} | Flashbillr`;
  const urgencyColor = daysRemaining <= 1 ? '#EF4444' : daysRemaining <= 7 ? '#F59E0B' : '#3B82F6';
  const urgencyText = daysRemaining <= 1 ? 'URGENT' : daysRemaining <= 7 ? 'Important' : 'Reminder';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${urgencyColor};">${urgencyText}: Subscription Expiring Soon</h2>
      <p>Your Flashbillr subscription for ${storeName} is expiring soon.</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
        <h3>Subscription Details:</h3>
        <p><strong>Store:</strong> ${storeName}</p>
        <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString('en-IN')}</p>
        <p><strong>Days Remaining:</strong> ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}</p>
      </div>
      
      ${daysRemaining <= 1 ? 
        '<p style="color: #EF4444; font-weight: bold;">⚠️ Your subscription expires today! Please renew immediately to avoid service interruption.</p>' :
        '<p>Please contact our support team to renew your subscription and avoid service interruption.</p>'
      }
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Need help?</strong> Contact our support team:</p>
        <p>📧 Email: support@flashbillr.com</p>
        <p>📞 Phone: +91-XXXXXXXXXX</p>
      </div>
      
      <p>Best regards,<br>Flashbillr Team</p>
    </div>
  `;
  
  await sendEmail({ to: adminEmail, subject, html });
};