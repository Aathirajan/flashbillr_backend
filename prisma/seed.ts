import { PrismaClient, OrderStatus, UserRole, SubscriptionStatus, ContentType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // --- 1. Delete all data from relevant tables (order matters due to FKs) ---
  console.log('Cleaning existing data...');
  await prisma.orderItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.pOSReceipt.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.category.deleteMany?.({}); // If exists
  await prisma.store.deleteMany({});
  await prisma.user.deleteMany({});

  // --- 2. Create superadmin ---
  const superAdminEmail = 'saathirajan99@gmail.com';
  const superAdminPassword = 'password';
  const hashedSuperAdminPassword = await hash(superAdminPassword, 12);

  console.log('Creating superadmin...');
  const superadmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: hashedSuperAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
  });
  await prisma.user.update({
    where: { id: superadmin.id },
    data: { createdById: superadmin.id },
  });

  // --- 3. Create storeadmin and store ---
  const storeAdminEmail = 'work.aathirajan@gmail.com';
  const storeAdminPassword = 'password';
  const hashedStoreAdminPassword = await hash(storeAdminPassword, 12);

  console.log('Creating store...');
  const store = await prisma.store.create({
    data: {
      name: 'Demo Store',
      slug: 'demo-store',
      brandColor: '#3B82F6',
      email: 'store@example.com',
      createdById: superadmin.id,
    },
  });

  console.log('Creating store admin...');
  const storeadmin = await prisma.user.create({
    data: {
      email: storeAdminEmail,
      password: hashedStoreAdminPassword,
      firstName: 'Store',
      lastName: 'Admin',
      role: UserRole.STOREADMIN,
      isActive: true,
      createdById: superadmin.id,
      storeId: store.id,
    },
  });
  await prisma.user.update({
    where: { id: storeadmin.id },
    data: { createdById: storeadmin.id },
  });

  // --- 4. Create category ---
  console.log('Creating category...');
  const category = await prisma.category.create({
    data: {
      name: 'General',
      storeId: store.id,
    },
  });

  // --- 5. Create product ---
  console.log('Creating product...');
  const product = await prisma.product.create({
    data: {
      name: 'Demo Product',
      description: 'A demo product for testing.',
      brand: 'DemoBrand',
      sku: 'SKU-DEMO-1',
      mrp: 100,
      sellingPrice: 90,
      storeId: store.id,
      categoryId: category.id,
      contentType: ContentType.BOX,
      isActive: true,
    },
  });

  // --- 6. Create product image ---
  console.log('Creating product image...');
  await prisma.productImage.create({
    data: {
      url: 'https://via.placeholder.com/300x300.png?text=Demo+Product',
      productId: product.id,
    },
  });

  // --- 7. Create inventory ---
  await prisma.inventory.create({
    data: {
      productId: product.id,
      storeId: store.id,
      currentStock: 100,
      minStockLevel: 10,
      maxStockLevel: 1000,
    },
  });

  // --- 8. Create customer ---
  console.log('Creating customer...');
  const customer = await prisma.customer.create({
    data: {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'customer1@mail.com',
      phone: '9000000001',
      storeId: store.id,
    },
  });

  // --- 9. Create order ---
  console.log('Creating order...');
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-DEMO-1',
      storeId: store.id,
      customerId: customer.id,
      status: OrderStatus.PAID,
      subtotal: 90,
      gstAmount: 16.2,
      totalAmount: 106.2,
      paymentMethod: 'CASH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // --- 10. Create order item ---
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPrice: 90,
      gstAmount: 16.2,
      totalAmount: 106.2,
    },
  });

  // --- 11. Create invoice ---
  console.log('Creating invoice...');
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-DEMO-1',
      orderId: order.id,
      storeId: store.id,
      customerId: customer.id,
      subtotal: 90,
      gstAmount: 16.2,
      totalAmount: 106.2,
      isPos: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // --- 12. Create POSReceipt ---
  console.log('Creating POSReceipt...');
  await prisma.pOSReceipt.create({
    data: {
      receiptNumber: 'POSR-DEMO-1',
      storeId: store.id,
      customerName: 'Test Customer',
      customerPhone: '9000000001',
      items: [{ sku: product.sku, name: product.name, qty: 1, price: 90 }],
      subtotal: 90,
      gstAmount: 16.2,
      totalAmount: 106.2,
      paymentMethod: 'CASH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // --- 13. Create subscription ---
  console.log('Creating subscription...');
  await prisma.subscription.create({
    data: {
      storeId: store.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      amount: 999,
      notes: 'Demo subscription for Demo Store',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });