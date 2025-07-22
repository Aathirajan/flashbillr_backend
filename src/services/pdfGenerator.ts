
import PDFDocument from 'pdfkit';
import fs from 'fs';

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

export async function generateInvoicePDF(invoiceData: InvoiceData, outputPath: string): Promise<void> {
   return new Promise((resolve, reject) => {
      try {
         const pageWidth = 595;
         const pageHeight = 842;
         const margin = 40;
         const contentWidth = pageWidth - (margin * 2);

         const doc = new PDFDocument({
            size: 'A4',
            margin: margin
         });

         const stream = fs.createWriteStream(outputPath);
         doc.pipe(stream);

         let currentY = 50;

         // Generate Header
         function generateHeader() {
            // Main border
            doc.rect(margin, margin, contentWidth, 750).stroke();

            // Header title
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('PROFORMA INVOICE', margin + 10, currentY, {
                  width: contentWidth - 20,
                  align: 'center'
               });

            currentY += 30;

            // Credit Sale header
            doc.fontSize(10)
               .font('Helvetica')
               .text('Credit Sale', margin + 10, currentY);

            // Invoice details on the right
            const rightColumnX = margin + contentWidth - 200;
            doc.text('Invoice No.', rightColumnX, currentY);
            doc.text(invoiceData.invoiceNumber, rightColumnX + 80, currentY);

            currentY += 15;
            doc.text('Dated', rightColumnX, currentY);
            doc.text(invoiceData.date, rightColumnX + 80, currentY);

            currentY += 15;
            doc.text('Mode/Terms of Payment', rightColumnX, currentY);
            doc.text(invoiceData.modeOfPayment || '', rightColumnX + 80, currentY);

            currentY += 30;
         }

         // Generate Company Details
         function generateCompanyDetails() {
            const leftX = margin + 10;
            const rightX = margin + contentWidth / 2 + 10;

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(invoiceData.storeName, leftX, currentY);

            if (invoiceData.storeAddress) {
               currentY += 12;
               doc.fontSize(9).font('Helvetica');
               doc.text(invoiceData.storeAddress, leftX, currentY, { width: 200 });
            }

            // Right section - Delivery details
            let rightY = currentY;

            if (invoiceData.deliveryNote) {
               doc.fontSize(9).font('Helvetica');
               doc.text('Delivery Note', rightX, rightY);
               doc.text(invoiceData.deliveryNote, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.referenceNo) {
               doc.text('Reference No. & Date', rightX, rightY);
               doc.text(invoiceData.referenceNo, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.buyersOrderNo) {
               doc.text("Buyer's Order No.", rightX, rightY);
               doc.text(invoiceData.buyersOrderNo, rightX + 80, rightY);
               rightY += 12;
            }

            currentY = Math.max(currentY, rightY) + 20;

            // Horizontal line
            doc.moveTo(margin, currentY)
               .lineTo(margin + contentWidth, currentY)
               .stroke();

            currentY += 10;

            // Additional details section
            rightY = currentY;

            if (invoiceData.dispatchDocNo) {
               doc.text('Dispatch Doc No.', rightX, rightY);
               doc.text(invoiceData.dispatchDocNo, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.deliveryNoteDate) {
               doc.text('Delivery Note Date', rightX, rightY);
               doc.text(invoiceData.deliveryNoteDate, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.dispatchedThrough) {
               doc.text('Dispatched through', rightX, rightY);
               doc.text(invoiceData.dispatchedThrough, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.destination) {
               doc.text('Destination', rightX, rightY);
               doc.text(invoiceData.destination, rightX + 80, rightY);
               rightY += 12;
            }

            if (invoiceData.termsOfDelivery) {
               doc.text('Terms of Delivery', rightX, rightY);
               doc.text(invoiceData.termsOfDelivery, rightX + 80, rightY, { width: 150 });
               rightY += 24;
            }

            currentY = Math.max(currentY, rightY) + 20;

            // Another horizontal line
            doc.moveTo(margin, currentY)
               .lineTo(margin + contentWidth, currentY)
               .stroke();

            currentY += 15;
         }

         // Generate Items Table
         function generateItemsTable() {
            const rowHeight = 20;
            const colWidths = [30, 250, 70, 70, 70, 85]; // SI, Description, Quantity, Rate, Per, Amount
            let currentX = margin;

            // Table headers
            doc.fontSize(9).font('Helvetica-Bold');

            // Draw header background and borders
            doc.rect(margin, currentY, contentWidth, rowHeight).stroke();

            // Header text
            const headers = ['SI', 'Description of Goods', 'Quantity', 'Rate', 'Per', 'Amount'];
            currentX = margin;

            headers.forEach((header, index) => {
               // Vertical lines
               if (index > 0) {
                  doc.moveTo(currentX, currentY)
                     .lineTo(currentX, currentY + rowHeight)
                     .stroke();
               }

               doc.text(header, currentX + 5, currentY + 6, {
                  width: colWidths[index] - 10,
                  align: index === 0 ? 'center' : (index > 2 ? 'right' : 'left')
               });

               currentX += colWidths[index];
            });

            currentY += rowHeight;

            // Table rows
            doc.font('Helvetica').fontSize(9);

            invoiceData.items.forEach((item, index) => {
               currentX = margin;

               // Row border
               doc.rect(margin, currentY, contentWidth, rowHeight).stroke();

               const rowData = [
                  (index + 1).toString(),
                  item.name,
                  item.quantity.toString(),
                  item.rate.toFixed(2),
                  'pcs', // or any unit
                  item.amount.toFixed(2)
               ];

               rowData.forEach((data, colIndex) => {
                  // Vertical lines
                  if (colIndex > 0) {
                     doc.moveTo(currentX, currentY)
                        .lineTo(currentX, currentY + rowHeight)
                        .stroke();
                  }

                  doc.text(data, currentX + 5, currentY + 6, {
                     width: colWidths[colIndex] - 10,
                     align: colIndex === 0 ? 'center' : (colIndex > 2 ? 'right' : 'left')
                  });

                  currentX += colWidths[colIndex];
               });

               currentY += rowHeight;
            });

            // Empty rows to fill space (like in Tally)
            const emptyRows = 8 - invoiceData.items.length;
            for (let i = 0; i < Math.max(0, emptyRows); i++) {
               doc.rect(margin, currentY, contentWidth, rowHeight).stroke();

               // Draw vertical lines
               currentX = margin;
               colWidths.forEach((width, index) => {
                  if (index > 0) {
                     doc.moveTo(currentX, currentY)
                        .lineTo(currentX, currentY + rowHeight)
                        .stroke();
                  }
                  currentX += width;
               });

               currentY += rowHeight;
            }

            // Total row
            doc.rect(margin, currentY, contentWidth, rowHeight).stroke();

            currentX = margin;
            doc.fontSize(10).font('Helvetica-Bold');

            // Empty cells until quantity
            currentX += colWidths[0] + colWidths[1];
            doc.moveTo(currentX, currentY)
               .lineTo(currentX, currentY + rowHeight)
               .stroke();

            // Total quantity
            const totalQuantity = invoiceData.items.reduce((sum, item) => sum + item.quantity, 0);
            doc.text(totalQuantity.toString(), currentX + 5, currentY + 6, {
               width: colWidths[2] - 10,
               align: 'right'
            });
            currentX += colWidths[2];

            // Empty rate and per columns
            doc.moveTo(currentX, currentY)
               .lineTo(currentX, currentY + rowHeight)
               .stroke();
            currentX += colWidths[3];

            doc.moveTo(currentX, currentY)
               .lineTo(currentX, currentY + rowHeight)
               .stroke();
            currentX += colWidths[4];

            // Total amount
            doc.moveTo(currentX, currentY)
               .lineTo(currentX, currentY + rowHeight)
               .stroke();

            doc.text(`₹ ${invoiceData.total.toFixed(2)}`, currentX + 5, currentY + 6, {
               width: colWidths[5] - 10,
               align: 'right'
            });

            currentY += rowHeight + 10;
         }

         // Generate Footer
         function generateFooter() {
            // Amount in words
            doc.fontSize(9).font('Helvetica');
            doc.text('Amount Chargeable (in words)', margin + 10, currentY);
            currentY += 12;
            doc.text(`Rupees ${invoiceData.totalInWords} Only`, margin + 10, currentY);

            // Bank details section (right side)
            if (invoiceData.bankDetails) {
               const rightX = margin + contentWidth - 250;
               let bankY = currentY - 24;

               doc.fontSize(9).font('Helvetica-Bold');
               doc.text("Company's Bank Details", rightX, bankY);

               doc.fontSize(8).font('Helvetica');
               bankY += 12;
               doc.text('Bank Name', rightX, bankY);
               doc.text(invoiceData.bankDetails.bankName, rightX + 80, bankY);

               bankY += 10;
               doc.text('A/c No.', rightX, bankY);
               doc.text(invoiceData.bankDetails.accountNo, rightX + 80, bankY);

               bankY += 10;
               doc.text('Branch & IFS Code', rightX, bankY);
               doc.text(`${invoiceData.bankDetails.branch} & ${invoiceData.bankDetails.ifscCode}`, rightX + 80, bankY);
            }

            currentY += 40;

            // Declaration
            if (invoiceData.declaration) {
               doc.fontSize(8).font('Helvetica-Bold');
               doc.text('Declaration', margin + 10, currentY);
               currentY += 12;

               doc.fontSize(8).font('Helvetica');
               doc.text(invoiceData.declaration, margin + 10, currentY, {
                  width: contentWidth / 2 - 20
               });
            }

            // Authorized signatory (right side)
            const signatoryX = margin + contentWidth - 200;
            doc.fontSize(8).font('Helvetica');
            doc.text('Authorised Signatory', signatoryX, currentY + 40);

            // Computer generated invoice text
            currentY = pageHeight - 80;
            doc.fontSize(8).font('Helvetica');
            doc.text('This is a Computer Generated Invoice', margin + 10, currentY, {
               width: contentWidth - 20,
               align: 'center'
            });
         }

         // Generate all sections
         generateHeader();
         generateCompanyDetails();
         generateItemsTable();
         generateFooter();

         doc.end();

         stream.on('finish', () => {
            resolve();
         });

         stream.on('error', (error) => {
            reject(error);
         });

      } catch (error) {
         reject(error);
      }
   });
}
