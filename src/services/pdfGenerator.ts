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
   brandColor?: string;
   customerName: string;
   customerPhone?: string;
   customerAddress?: string;
   customerGST?: string;
   deliveryNote?: string;
   modeOfPayment?: string;
   buyersOrderNo?: string;
   buyersOrderDate?: string;
   referenceNo?: string;
   otherReferences?: string;
   dispatchDocNo?: string;
   deliveryNoteDate?: string;
   dispatchedThrough?: string;
   destination?: string;
   termsOfDelivery?: string;
   items: Array<{
      name: string;
      quantity: number;
      rate: number;
      amount: number;
   }>;
   total: number;
   totalInWords: string;
   bankDetails?: {
      bankName: string;
      accountNo: string;
      ifscCode: string;
      branch: string;
   };
   declaration?: string;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
   return new Promise((resolve, reject) => {
      try {
         const doc = new PDFDocument({
            margin: 25,
            size: 'A4'
         });
         const buffers: Buffer[] = [];

         doc.on('data', buffers.push.bind(buffers));
         doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
         });

         const pageWidth = doc.page.width;
         const pageHeight = doc.page.height;
         const margin = 25;
         const usableWidth = pageWidth - 2 * margin;
         const usableHeight = pageHeight - 2 * margin;

         // Helper functions
         const drawLine = (x1: number, y1: number, x2: number, y2: number, width: number = 0.5) => {
            doc.lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
         };

         const drawRect = (x: number, y: number, width: number, height: number) => {
            doc.rect(x, y, width, height).stroke();
         };

         const addNewPage = () => {
            doc.addPage();
            drawWatermark();
            return margin;
         };

         const checkPageBreak = (currentY: number, requiredSpace: number) => {
            if (currentY + requiredSpace > pageHeight - margin - 100) {
               return addNewPage();
            }
            return currentY;
         };

         // Optional: Draw faint diagonal watermark
         const drawWatermark = () => {
            doc.save();
            doc.fontSize(70)
               .fillColor('#eeeeee')
               .opacity(0.15)
               .rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] })
               .text('INVOICE', pageWidth / 2 - 200, pageHeight / 2 - 50, {
                  align: 'center',
                  width: 400
               })
               .opacity(1);
            doc.restore();
         };

         // Optional: Draw logo placeholder at top left
         const drawLogo = () => {
            // To use: doc.image('path/to/logo.png', margin, margin, { width: 80 });
            doc.save();
            doc.rect(margin, margin, 80, 50).stroke('#cccccc');
            doc.fontSize(12).fillColor('#cccccc').text('LOGO', margin + 15, margin + 18);
            doc.restore();
         };

         // Draw the product table with pagination and tally-style header
         const drawProductTable = (items: any[], startY: number) => {
            const tableHeaders = ['Sl', 'Description of Goods', 'Quantity', 'Rate', 'Per', 'Amount'];
            const columnWidths = [40, 300, 75, 85, 50, 95];
            const headerHeight = 35;
            const rowHeight = 40;

            let currentY = startY;
            let isFirstPage = true;
            const footerSpace = 400; // Space needed for footer
            const availableSpace = usableHeight - 300; // Space after header
            const itemsPerPage = Math.floor((availableSpace - headerHeight - footerSpace) / rowHeight);

            const drawTableHeader = (y: number) => {
               let tableX = margin;
               // Background fill for header
               doc.save();
               doc.rect(margin, y, usableWidth, headerHeight).fillAndStroke('#f5f5f5', '#000000');
               doc.restore();
               // Draw header cells and text
               tableHeaders.forEach((header, index) => {
                  drawRect(tableX, y, columnWidths[index], headerHeight);
                  doc.fontSize(11)
                     .font('Helvetica-Bold')
                     .fillColor('#222222')
                     .text(header, tableX + 5, y + 12, {
                        width: columnWidths[index] - 10,
                        align: 'center'
                     });
                  tableX += columnWidths[index];
               });
               return y + headerHeight;
            };

            const drawItemRow = (item: any, idx: number, y: number) => {
               let tableX = margin;
               columnWidths.forEach((width, colIdx) => {
                  if (colIdx === 0) drawLine(tableX, y, tableX, y + rowHeight, 0.5);
                  drawLine(tableX + width, y, tableX + width, y + rowHeight, 0.5);
                  if (idx === 0) drawLine(tableX, y, tableX + width, y, 0.5);
                  tableX += width;
               });
               const textY = y + 15;
               doc.fontSize(10).font('Helvetica').fillColor('#000000');
               doc.text((idx + 1).toString(), margin + 5, textY, { width: columnWidths[0] - 10, align: 'center' });
               doc.text(item.name, margin + columnWidths[0] + 5, textY, { width: columnWidths[1] - 10, align: 'left' });
               doc.text(`${item.quantity}`, margin + columnWidths[0] + columnWidths[1] + 5, textY, { width: columnWidths[2] - 10, align: 'center' });
               doc.text(item.rate.toFixed(2), margin + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, textY, { width: columnWidths[3] - 10, align: 'right' });
               doc.text('pcs', margin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, textY, { width: columnWidths[4] - 10, align: 'center' });
               doc.text(item.amount.toFixed(2), margin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + 5, textY, { width: columnWidths[5] - 10, align: 'right' });
               return y + rowHeight;
            };

            let i = 0;
            while (i < items.length) {
               if (!isFirstPage && i % itemsPerPage === 0) {
                  drawLine(margin, currentY, margin + usableWidth, currentY, 0.5);
                  currentY = addNewPage();
                  drawLogo();
                  currentY += 10;
                  currentY = drawTableHeader(currentY);
               }
               if (i === 0) {
                  currentY = drawTableHeader(currentY);
               }
               currentY = drawItemRow(items[i], i, currentY);
               if (i === 0) isFirstPage = false;
               i++;
            }
            drawLine(margin, currentY, margin + usableWidth, currentY, 0.5);
            return { nextY: currentY, columnWidths };
         };

         const drawHeader = (currentY: number) => {
            // Title with better spacing
            doc.fontSize(18)
               .font('Helvetica-Bold')
               .text('PROFORMA INVOICE', margin, currentY, {
                  align: 'center',
                  width: usableWidth
               });

            currentY += 40;

            // Store name and top-right details section
            const topSectionHeight = 130;
            const leftColumnWidth = usableWidth * 0.50;
            const rightColumnWidth = usableWidth * 0.50;

            // Main border for top section
            drawRect(margin, currentY, usableWidth, topSectionHeight);

            const contentStartY = currentY;
            currentY += 15;

            // Company details (left side) with better spacing
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text(data.storeName, margin + 12, currentY);

            let leftY = currentY + 25;

            if (data.storeAddress) {
               doc.fontSize(11)
                  .font('Helvetica')
                  .text(data.storeAddress, margin + 12, leftY, {
                     width: leftColumnWidth - 24,
                     lineGap: 2
                  });
               leftY += 40;
            }

            if (data.storeGST) {
               doc.fontSize(11)
                  .font('Helvetica')
                  .text(`GSTIN: ${data.storeGST}`, margin + 12, leftY);
               leftY += 18;
            }

            if (data.storePhone) {
               doc.fontSize(11)
                  .font('Helvetica')
                  .text(`Phone: ${data.storePhone}`, margin + 12, leftY);
            }

            // Vertical divider line
            drawLine(margin + leftColumnWidth, contentStartY, margin + leftColumnWidth, contentStartY + topSectionHeight, 1);

            // Invoice details table (right side) - Enhanced spacing
            const rightStartX = margin + leftColumnWidth;
            const rightStartY = contentStartY;

            const invoiceFields = [
               ['Invoice No.', data.invoiceNumber],
               ['Dated', data.date],
               ['Delivery Note', data.deliveryNote || ''],
               ['Mode/Terms of Payment', data.modeOfPayment || ''],
               ['Reference No. & Date', data.referenceNo || ''],
               ['Other References', data.otherReferences || ''],
               ['Buyer\'s Order No.', data.buyersOrderNo || ''],
               ['Dated', data.buyersOrderDate || ''],
               ['Dispatch Doc No.', data.dispatchDocNo || ''],
               ['Delivery Note Date', data.deliveryNoteDate || ''],
               ['Dispatched through', data.dispatchedThrough || ''],
               ['Destination', data.destination || ''],
               ['Terms of Delivery', data.termsOfDelivery || '']
            ];

            const fieldHeight = 10;
            const labelWidth = rightColumnWidth * 0.65;
            const valueWidth = rightColumnWidth * 0.35;

            let fieldY = rightStartY;
            invoiceFields.forEach(([label, value]) => {
               // Draw field cells
               drawRect(rightStartX, fieldY, labelWidth, fieldHeight);
               drawRect(rightStartX + labelWidth, fieldY, valueWidth, fieldHeight);

               // Add text with better spacing and alignment
               doc.fontSize(9)
                  .font('Helvetica')
                  .text(label, rightStartX + 5, fieldY + 3, {
                     width: labelWidth - 10,
                     align: 'left'
                  });

               doc.fontSize(9)
                  .font('Helvetica-Bold')
                  .text(value, rightStartX + labelWidth + 5, fieldY + 3, {
                     width: valueWidth - 10,
                     align: 'left'
                  });

               fieldY += fieldHeight;
            });

            return contentStartY + topSectionHeight;
         };

         const drawCustomerSection = (currentY: number) => {
            // Customer details section with better spacing
            const customerSectionHeight = 90;
            drawRect(margin, currentY, usableWidth, customerSectionHeight);

            currentY += 15;

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Buyer (Bill to)', margin + 12, currentY);

            currentY += 25;

            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text(data.customerName, margin + 12, currentY);

            currentY += 22;

            if (data.customerAddress) {
               doc.fontSize(11)
                  .font('Helvetica')
                  .text(data.customerAddress, margin + 12, currentY, {
                     width: usableWidth * 0.6,
                     lineGap: 2
                  });
               currentY += 20;
            }

            if (data.customerGST) {
               doc.fontSize(11)
                  .font('Helvetica')
                  .text(`GSTIN: ${data.customerGST}`, margin + 12, currentY);
            }

            return currentY + customerSectionHeight - 55;
         };

         const drawTotalRow = (currentY: number, columnWidths: number[]) => {
            const totalRowHeight = 40;
            let tableX = margin;

            // Draw total row with complete border
            drawRect(tableX, currentY, usableWidth, totalRowHeight);

            // Total text and amount with better alignment
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Total', margin + 10, currentY + 15, {
                  width: usableWidth - columnWidths[5] - 30,
                  align: 'right'
               });

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(data.total.toFixed(2), margin + usableWidth - columnWidths[5] + 5, currentY + 15, {
                  width: columnWidths[5] - 10,
                  align: 'right'
               });

            return currentY + totalRowHeight;
         };

         const drawFooter = (currentY: number) => {
            // Amount in words section
            currentY += 15;

            const amountWordsHeight = 55;
            drawRect(margin, currentY, usableWidth, amountWordsHeight);

            currentY += 15;

            doc.fontSize(11)
               .font('Helvetica')
               .text('Amount Chargeable (in words)', margin + 12, currentY);

            doc.fontSize(10)
               .font('Helvetica')
               .text('E. & O.E', margin + usableWidth - 80, currentY);

            currentY += 25;

            doc.fontSize(13)
               .font('Helvetica-Bold')
               .text(`INR ${data.totalInWords} Only`, margin + 12, currentY);

            currentY += amountWordsHeight - 40;

            // Footer section
            currentY += 15;
            const footerHeight = 140;
            drawRect(margin, currentY, usableWidth, footerHeight);

            currentY += 15;

            // Bank details and signature section
            const footerLeftWidth = usableWidth * 0.55;
            const signatureX = margin + footerLeftWidth + 20;

            if (data.bankDetails) {
               doc.fontSize(11)
                  .font('Helvetica-Bold')
                  .text('Company\'s Bank Details', margin + 12, currentY);

               currentY += 22;

               doc.fontSize(10)
                  .font('Helvetica')
                  .text(`Bank Name: ${data.bankDetails.bankName}`, margin + 12, currentY);

               currentY += 18;

               doc.fontSize(10)
                  .font('Helvetica')
                  .text(`A/c No.: ${data.bankDetails.accountNo}`, margin + 12, currentY);

               currentY += 18;

               doc.fontSize(10)
                  .font('Helvetica')
                  .text(`Branch & IFS Code: ${data.bankDetails.branch} & ${data.bankDetails.ifscCode}`, margin + 12, currentY);
            }

            // Signature section (right side)
            const signatureStartY = currentY - 65;

            doc.fontSize(11)
               .font('Helvetica')
               .text(`for ${data.storeName}`, signatureX, signatureStartY);

            doc.fontSize(11)
               .font('Helvetica')
               .text('Authorised Signatory', signatureX, signatureStartY + 85, {
                  align: 'center',
                  width: usableWidth * 0.35
               });

            // Declaration
            if (data.declaration) {
               const declarationY = currentY + 20;
               doc.fontSize(9)
                  .font('Helvetica-Bold')
                  .text('Declaration:', margin + 12, declarationY);

               doc.fontSize(9)
                  .font('Helvetica')
                  .text(data.declaration, margin + 12, declarationY + 15, {
                     width: footerLeftWidth - 24,
                     lineGap: 1
                  });
            }

            return currentY + footerHeight;
         };

         // Draw watermark (optional)
         drawWatermark();

         // Draw logo placeholder (optional)
         drawLogo();
         let currentY = margin + 60; // Leave space for logo

         // Draw header
         currentY = drawHeader(currentY);

         // Draw customer section
         currentY = drawCustomerSection(currentY);

         // Draw product table (modular, paginated)
         currentY += 15;
         const { nextY, columnWidths } = drawProductTable(data.items, currentY);
         currentY = nextY;

         // Draw total row
         currentY = drawTotalRow(currentY, columnWidths);

         // Check if we need new page for footer
         currentY = checkPageBreak(currentY, 400);

         // Draw footer
         currentY = drawFooter(currentY);

         // Bottom footer
         doc.fontSize(10)
            .font('Helvetica')
            .text('This is a Computer Generated Invoice', margin, doc.page.height - 40, {
               align: 'center',
               width: usableWidth
            });

         doc.end();

         logger.info('Enhanced Tally-style invoice PDF generated successfully');

      } catch (error) {
         logger.error('Failed to generate enhanced Tally-style invoice PDF:', error);
         reject(error);
      }
   });
};

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
