import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

export const uploadFile = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = ''
): Promise<string> => {
  try {
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const file = bucket.file(filePath);
    
    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    logger.info('File uploaded successfully:', {
      fileName,
      filePath,
      publicUrl
    });
    
    return publicUrl;
  } catch (error) {
    logger.error('Failed to upload file:', {
      fileName,
      folder,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const uploadInvoicePDF = async (
  pdfBuffer: Buffer,
  storeId: string,
  invoiceNumber: string
): Promise<string> => {
  const fileName = `${invoiceNumber}.pdf`;
  const folder = `stores/${storeId}/invoices`;
  return uploadFile(pdfBuffer, fileName, 'application/pdf', folder);
};

export const uploadLRPhoto = async (
  imageBuffer: Buffer,
  orderId: string,
  originalName: string
): Promise<string> => {
  const extension = originalName.split('.').pop();
  const fileName = `lr-${orderId}.${extension}`;
  const folder = `shipments/${orderId}`;
  return uploadFile(imageBuffer, fileName, 'image/jpeg', folder);
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await bucket.file(filePath).delete();
    logger.info('File deleted successfully:', { filePath });
  } catch (error) {
    logger.error('Failed to delete file:', {
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};