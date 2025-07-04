import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeGST?: string;
  brandColor: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryNote?: string;
  modeOfPayment?: string;
  suppliersRef?: string;
  otherReference?: string;
  buyersOrderNo?: string;
  dispatchDocumentNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  items: Array<{
    name: string;
    particulars?: string;
    quantity: number;
    rate: number;
    per?: string;
    amount: number;
  }>;
  serviceTax?: {
    onAssessableValue: number;
    rate: number;
    amount: number;
  };
  swachhBharatCess?: {
    rate: number;
    amount: number;
  };
  krishiKalyanCess?: {
    rate: number;
    amount: number;
  };
  total: number;
  totalInWords: string;
  companyServiceTaxNo?: string;
  authorizedSignatory?: string;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 20, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 20;

      // Draw outer border
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
         .stroke();

      // Header section
      const headerY = margin + 10;
      
      // INVOICE title (centered)
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('INVOICE', 0, headerY, { align: 'center', width: pageWidth });

      // Company details (left side)
      const companyY = headerY + 30;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(data.storeName, margin + 10, companyY);

      let yPos = companyY + 15;
      if (data.storeAddress) {
        const addressLines = data.storeAddress.split('\n');
        addressLines.forEach(line => {
          doc.fontSize(10)
             .font('Helvetica')
             .text(line, margin + 10, yPos);
          yPos += 12;
        });
      }

      // Right side header info
      const rightHeaderX = pageWidth - 200;
      const rightHeaderY = companyY;
      
      // Draw vertical line separating left and right
      doc.moveTo(rightHeaderX - 20, headerY + 20)
         .lineTo(rightHeaderX - 20, companyY + 100)
         .stroke();

      // Header table structure
      const headerTableData = [
        ['Invoice No.', data.invoiceNumber, 'Dated', data.date],
        ['Delivery Note', data.deliveryNote || '', 'Mode/Terms of Payment', data.modeOfPayment || ''],
        ['Supplier\'s Ref.', data.suppliersRef || '', 'Other Reference(s)', data.otherReference || ''],
        ['Buyer\'s Order No.', data.buyersOrderNo || '', 'Dated', ''],
        ['Despatch Document No.', data.dispatchDocumentNo || '', 'Delivery Note Date', data.deliveryNoteDate || ''],
        ['Despatched through', data.dispatchedThrough || '', 'Destination', data.destination || ''],
        ['Terms of Delivery', data.termsOfDelivery || '', '', '']
      ];

      let headerTableY = companyY;
      const col1X = rightHeaderX - 10;
      const col2X = rightHeaderX + 60;
      const col3X = rightHeaderX + 120;
      const col4X = rightHeaderX + 180;

      headerTableData.forEach((row, index) => {
        // Draw horizontal lines
        if (index === 0) {
          doc.moveTo(col1X, headerTableY - 5)
             .lineTo(pageWidth - margin, headerTableY - 5)
             .stroke();
        }
        
        doc.moveTo(col1X, headerTableY + 10)
           .lineTo(pageWidth - margin, headerTableY + 10)
           .stroke();

        // Draw vertical lines
        doc.moveTo(col1X, headerTableY - 5)
           .lineTo(col1X, headerTableY + 10)
           .stroke();
        doc.moveTo(col2X, headerTableY - 5)
           .lineTo(col2X, headerTableY + 10)
           .stroke();
        doc.moveTo(col3X, headerTableY - 5)
           .lineTo(col3X, headerTableY + 10)
           .stroke();
        doc.moveTo(col4X, headerTableY - 5)
           .lineTo(col4X, headerTableY + 10)
           .stroke();
        doc.moveTo(pageWidth - margin, headerTableY - 5)
           .lineTo(pageWidth - margin, headerTableY + 10)
           .stroke();

        // Add text
        doc.fontSize(8)
           .font('Helvetica')
           .text(row[0], col1X + 2, headerTableY - 2, { width: 48 })
           .text(row[1], col2X + 2, headerTableY - 2, { width: 58 })
           .text(row[2], col3X + 2, headerTableY - 2, { width: 58 })
           .text(row[3], col4X + 2, headerTableY - 2, { width: 58 });

        headerTableY += 15;
      });

      // Customer section (Buyer)
      const buyerY = headerTableY + 20;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Buyer', margin + 10, buyerY);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(data.customerName, margin + 10, buyerY + 20);

      yPos = buyerY + 35;
      if (data.customerAddress) {
        const addressLines = data.customerAddress.split('\n');
        addressLines.forEach(line => {
          doc.fontSize(10)
             .font('Helvetica')
             .text(line, margin + 10, yPos);
          yPos += 12;
        });
      }

      // Items table
      const tableY = buyerY + 120;
      const tableHeight = 300;
      
      // Draw table border
      doc.rect(margin + 10, tableY, pageWidth - 2 * margin - 20, tableHeight)
         .stroke();

      // Table headers
      const slX = margin + 15;
      const particularsX = margin + 40;
      const quantityX = pageWidth - 320;
      const rateX = pageWidth - 270;
      const perX = pageWidth - 220;
      const amountX = pageWidth - 150;

      // Header row
      doc.moveTo(margin + 10, tableY + 20)
         .lineTo(pageWidth - margin - 10, tableY + 20)
         .stroke();

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Sl', slX, tableY + 5)
         .text('Particulars', particularsX, tableY + 5)
         .text('Quantity', quantityX, tableY + 5)
         .text('Rate', rateX, tableY + 5)
         .text('per', perX, tableY + 5)
         .text('Amount', amountX, tableY + 5);

      // Vertical lines for table
      doc.moveTo(slX + 20, tableY)
         .lineTo(slX + 20, tableY + tableHeight)
         .stroke();
      doc.moveTo(quantityX - 10, tableY)
         .lineTo(quantityX - 10, tableY + tableHeight)
         .stroke();
      doc.moveTo(rateX - 10, tableY)
         .lineTo(rateX - 10, tableY + tableHeight)
         .stroke();
      doc.moveTo(perX - 10, tableY)
         .lineTo(perX - 10, tableY + tableHeight)
         .stroke();
      doc.moveTo(amountX - 10, tableY)
         .lineTo(amountX - 10, tableY + tableHeight)
         .stroke();

      // Table items
      let itemY = tableY + 30;
      doc.font('Helvetica');

      data.items.forEach((item, index) => {
        doc.fontSize(10)
           .text((index + 1).toString(), slX, itemY)
           .text(item.name, particularsX, itemY, { width: 200 });
        
        if (item.particulars) {
          doc.fontSize(9)
             .text(item.particulars, particularsX, itemY + 12, { width: 200 });
        }

        doc.fontSize(10)
           .text(item.quantity.toString(), quantityX, itemY)
           .text(item.rate.toFixed(2), rateX, itemY)
           .text(item.per || '', perX, itemY)
           .text(item.amount.toFixed(2), amountX, itemY);

        itemY += 40;
      });

      // Service Tax section
      if (data.serviceTax) {
        itemY += 20;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Service Tax (On Assessable Value ${data.serviceTax.onAssessableValue.toFixed(2)})`, particularsX, itemY)
           .text(`${data.serviceTax.rate}%`, rateX, itemY)
           .text(data.serviceTax.amount.toFixed(2), amountX, itemY);
      }

      // Cess sections
      if (data.swachhBharatCess) {
        itemY += 20;
        doc.fontSize(10)
           .text('Swachh Bharat Cess', particularsX, itemY)
           .text(`${data.swachhBharatCess.rate}%`, rateX, itemY)
           .text(data.swachhBharatCess.amount.toFixed(2), amountX, itemY);
      }

      if (data.krishiKalyanCess) {
        itemY += 20;
        doc.fontSize(10)
           .text('Krishi Kalyan Cess', particularsX, itemY)
           .text(`${data.krishiKalyanCess.rate}%`, rateX, itemY)
           .text(data.krishiKalyanCess.amount.toFixed(2), amountX, itemY);
      }

      // Total line
      const totalY = tableY + tableHeight - 30;
      doc.moveTo(margin + 10, totalY)
         .lineTo(pageWidth - margin - 10, totalY)
         .stroke();

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Total', rateX, totalY + 5)
         .text(`₹ ${data.total.toFixed(2)}`, amountX, totalY + 5);

      // Amount in words
      const wordsY = tableY + tableHeight + 10;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Amount Chargeable (in words)', margin + 10, wordsY)
         .text(`E. & O.E.`, pageWidth - 100, wordsY);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(data.totalInWords, margin + 10, wordsY + 20);

      // Footer section
      const footerY = pageHeight - 150;
      
      // Service Tax No.
      if (data.companyServiceTaxNo) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Company's Service Tax No.: ${data.companyServiceTaxNo}`, margin + 10, footerY);
      }

      // Authorized Signatory
      if (data.authorizedSignatory) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`for ${data.storeName}`, pageWidth - 150, footerY + 20)
           .text('Authorised Signatory', pageWidth - 150, footerY + 80);
      }

      // Computer Generated Invoice
      doc.fontSize(8)
         .font('Helvetica')
         .text('This is a Computer Generated Invoice', 0, pageHeight - 40, {
           align: 'center',
           width: pageWidth
         });

      doc.end();

      logger.info('Invoice PDF generated successfully:', {
        invoiceNumber: data.invoiceNumber,
        storeName: data.storeName
      });

    } catch (error) {
      logger.error('Failed to generate invoice PDF:', {
        invoiceNumber: data.invoiceNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     PriceListData:
 *       type: object
 *       description: Data structure for generating price list PDF
 *       required:
 *         - storeName
 *         - brandColor
 *         - categories
 *         - generatedDate
 *       properties:
 *         storeName:
 *           type: string
 *           description: Name of the store
 *         brandColor:
 *           type: string
 *           format: hex-color
 *           description: Store's brand color for styling
 *         categories:
 *           type: array
 *           description: Array of product categories
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               products:
 *                 type: array
 *                 description: Products in this category
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Product name
 *                     brand:
 *                       type: string
 *                       description: Product brand (optional)
 *                     mrp:
 *                       type: number
 *                       description: Maximum Retail Price
 *                     sellingPrice:
 *                       type: number
 *                       description: Selling price
 *         generatedDate:
 *           type: string
 *           format: date
 *           description: Date when the price list was generated
 */
export interface PriceListData {
  storeName: string;
  brandColor: string;
  categories: Array<{
    name: string;
    products: Array<{
      name: string;
      brand?: string;
      mrp: number;
      sellingPrice: number;
    }>;
  }>;
  generatedDate: string;
}

export const generatePriceListPDF = async (data: PriceListData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header with brand color
      doc.rect(0, 0, doc.page.width, 80)
         .fill(data.brandColor);

      // Store name in white
      doc.fillColor('white')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(data.storeName, 50, 25);

      // Reset color for rest of document
      doc.fillColor('black');

      // Title
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('PRICE LIST', 50, 120);

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Generated on: ${data.generatedDate}`, 50, 150);

      let yPos = 190;

      data.categories.forEach(category => {
        // Category header
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(category.name.toUpperCase(), 50, yPos);

        yPos += 30;

        // Table header
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Product Name', 50, yPos)
           .text('Brand', 250, yPos)
           .text('MRP', 350, yPos)
           .text('Selling Price', 450, yPos);

        // Draw line under header
        doc.moveTo(50, yPos + 20)
           .lineTo(550, yPos + 20)
           .stroke();

        yPos += 30;

        // Products
        doc.font('Helvetica');
        category.products.forEach(product => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          doc.text(product.name, 50, yPos, { width: 190 })
             .text(product.brand || '-', 250, yPos)
             .text(`₹${product.mrp.toFixed(2)}`, 350, yPos)
             .text(`₹${product.sellingPrice.toFixed(2)}`, 450, yPos);

          yPos += 20;
        });

        yPos += 20;
      });

      doc.end();

      logger.info('Price list PDF generated successfully:', {
        storeName: data.storeName,
        categoriesCount: data.categories.length
      });

    } catch (error) {
      logger.error('Failed to generate price list PDF:', {
        storeName: data.storeName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
};