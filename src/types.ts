

export interface JWTPayload {
  userId: string;
  email: string;
  role: any;
  storeId?: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  
  totalAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: InvoiceItem[];
  subtotal: number;

  total: number;
  totalInWords: string;
  paymentMethod: string;
  notes?: string;
}
