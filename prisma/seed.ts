import { PrismaClient, OrderStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // --- 1. Delete all data from relevant tables (order matters due to FKs) ---
  console.log('Cleaning existing data...');
  await prisma.order.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.pOSReceipt.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
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
      role: 'SUPERADMIN',
      isActive: true,
    },
  });
  await prisma.user.update({
    where: { id: superadmin.id },
    data: { createdById: superadmin.id },
  });

  // --- 3. Create 5 stores, each with a store admin, product, customer, order, invoice, POSReceipt, and subscription ---
  for (let i = 1; i <= 5; i++) {
    const storeName = `Demo Store ${i}`;
    const storeSlug = `demo-store-${i}`;
    const storeEmail = `store${i}@example.com`;
    const storeBrandColor = '#FF5733';
    const storeAdminEmail = `store${i}.admin@mail.com`;
    const storeAdminPassword = 'password';
    const hashedStoreAdminPassword = await hash(storeAdminPassword, 12);

    console.log(`Creating store: ${storeName}`);
    const store = await prisma.store.create({
      data: {
        name: storeName,
        slug: storeSlug,
        brandColor: storeBrandColor,
        email: storeEmail,
        createdById: superadmin.id,
      },
    });

    console.log(`Creating store admin for ${storeName}`);
    const storeadmin = await prisma.user.create({
      data: {
        email: storeAdminEmail,
        password: hashedStoreAdminPassword,
        firstName: `Store${i}`,
        lastName: 'Admin',
        role: 'STOREADMIN',
        isActive: true,
        createdById: superadmin.id,
        storeId: store.id,
      },
    });
    await prisma.user.update({
      where: { id: storeadmin.id },
      data: { createdById: storeadmin.id },
    });

    // Create one product
    console.log(`Creating product for ${storeName}`);
    const product = await prisma.product.create({
      data: {
        name: `Product ${i}`,
        description: `Demo product for ${storeName}`,
        category: 'General',
        brand: `Brand${i}`,
        sku: `SKU-DEMO-${i}`,
        mrp: 100 + i * 10,
        sellingPrice: 90 + i * 10,
        gstRate: 18,
        storeId: store.id,
        isActive: true,
      },
    });

    // Create one customer
    console.log(`Creating customer for ${storeName}`);
    const customer = await prisma.customer.create({
      data: {
        firstName: `Customer${i}`,
        lastName: 'Demo',
        email: `customer${i}@mail.com`,
        phone: `900000000${i}`,
        storeId: store.id,
      },
    });

    // Create one order
    console.log(`Creating order for ${storeName}`);
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-DEMO-${i}`,
        storeId: store.id,
        customerId: customer.id,
        status: OrderStatus.PAID,
        subtotal: product.sellingPrice,
        gstAmount: product.sellingPrice * 0.18,
        totalAmount: product.sellingPrice * 1.18,
        paymentMethod: 'CASH',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create one invoice
    console.log(`Creating invoice for ${storeName}`);
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-DEMO-${i}`,
        orderId: order.id,
        storeId: store.id,
        customerId: customer.id,
        subtotal: product.sellingPrice,
        gstAmount: product.sellingPrice * 0.18,
        totalAmount: product.sellingPrice * 1.18,
        isPos: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create one POSReceipt
    console.log(`Creating POSReceipt for ${storeName}`);
    await prisma.pOSReceipt.create({
      data: {
        receiptNumber: `POSR-DEMO-${i}`,
        storeId: store.id,
        customerName: `Customer${i} Demo`,
        customerPhone: `900000000${i}`,
        items: [{ sku: product.sku, name: product.name, qty: 1, price: product.sellingPrice }],
        subtotal: product.sellingPrice,
        gstAmount: product.sellingPrice * 0.18,
        totalAmount: product.sellingPrice * 1.18,
        paymentMethod: 'CASH',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create one subscription
    console.log(`Creating subscription for ${storeName}`);
    await prisma.subscription.create({
      data: {
        storeId: store.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        amount: 999,
        notes: `Demo subscription for ${storeName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

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