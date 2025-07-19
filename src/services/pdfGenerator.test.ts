import { generateInvoicePDF } from './pdfGenerator';
import fs from 'fs';


describe('generateInvoicePDF', () => {
  it('should generate a PDF buffer from valid invoice data', async () => {
    // Mock InvoiceData
    const mockInvoiceData = {
      brandColor: '#123456',
      storeName: 'Test Store',
      storeAddress: '123 Test Lane\nTest City, 12345',
      storePhone: '123-456-7890',
      storeEmail: 'test@store.com',
      storeGST: '12ABCDE3456F7Z8',
      panNo: 'ABCDE1234F',
      invoiceNumber: 'INV-001',
      date: '2025-07-17',
      deliveryNote: 'Note123',
      modeOfPayment: 'Cash',
      suppliersRef: 'SUP-REF',
      otherReference: 'Other-REF',
      buyersOrderNo: 'BUY-123',
      dispatchDocumentNo: 'DOC-456',
      deliveryNoteDate: '2025-07-17',
      dispatchedThrough: 'Courier',
      destination: 'Test Destination',
      termsOfDelivery: 'Immediate',
      items: [
        {
          particulars: 'Test Product',
          hsn: '1234',
          quantity: 2,
          rate: 100,
          per: 'pcs',
          amount: 200,
          discount: 0,
          taxableValue: 200,
          cgstRate: 9,
          cgstAmount: 18,
          sgstRate: 9,
          sgstAmount: 18,
          igstRate: 0,
          igstAmount: 0,
          total: 236
        }
      ],
      total: 236,
      totalInWords: 'Two Hundred Thirty Six Only'
    }
    // Ensure all required fields for InvoiceData are present in mockInvoiceData. If you add fields to InvoiceData, add them here too.
    const buffer = await generateInvoicePDF(mockInvoiceData as any);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    // Save the PDF for manual inspection
    fs.writeFileSync('test-invoice.pdf', buffer);

    // Optionally, save the PDF for manual inspection
    // fs.writeFileSync('test-invoice.pdf', buffer);
  });

  it('should generate a PDF with at least 25 products and buyer details', async () => {
    // Create 25+ products
    const items = Array.from({ length: 25 }, (_, i) => ({
      name: `Product ${i + 1}`,
      quantity: (i % 5) + 1,
      rate: 100 + i * 10,
      amount: ((i % 5) + 1) * (100 + i * 10)
    }));

    // Buyer details
    const mockInvoiceData = {
      invoiceNumber: 'INV-0025',
      date: '2025-07-17',
      storeName: 'Mega Store',
      storeAddress: '456 Main Street\nMetro City, 54321',
      storePhone: '987-654-3210',
      storeEmail: 'contact@megastore.com',
      storeGST: '22ABCDE6789F1Z2',
      brandColor: '#0055AA',
      customerName: 'John Doe',
      customerAddress: '789 Buyer Road\nBuyer Town, 67890',
      customerGST: '33ABCDE1234F2Z3',
      deliveryNote: 'Deliver before noon',
      modeOfPayment: 'Credit Card',
      buyersOrderNo: 'ORDER-2025',
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      totalInWords: 'Twenty Five Thousand Only', // Example, can be dynamically generated
      bankDetails: {
        bankName: 'Bank of Test',
        accountNo: '1234567890',
        ifscCode: 'TEST0001234',
        branch: 'Main Branch'
      },
      declaration: 'Goods once sold will not be taken back.'
    };

    const buffer = await generateInvoicePDF(mockInvoiceData as any);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    // Save the PDF for manual inspection
    fs.writeFileSync('test-invoice-25-products.pdf', buffer);
  });
});
