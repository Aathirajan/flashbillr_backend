import { PrismaClient, OrderStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // --- 1. Delete all data from relevant tables (order matters due to FKs) ---
  console.log('Cleaning existing data...');
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.store.deleteMany({});
  await prisma.user.deleteMany({});

  // --- 2. Create superadmin ---
  const superAdminEmail = 'saathirajan99@gmail.com';
  const adminEmail = 'work.aathirajan@gmail.com';
  const password = 'password';
  const hashedPassword = await hash(password, 12);

  console.log('Creating superadmin...');
  const superadmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
    },
  });
  await prisma.user.update({ 
    where: { id: superadmin.id }, 
    data: { createdById: superadmin.id } 
  });

  // --- 3. Create test store ---
  console.log('Creating demo store...');
  const store = await prisma.store.create({
    data: {
      name: 'Demo Store',
      slug: 'demo-store',
      brandColor: '#FF5733',
      email: 'store@example.com',
      createdById: superadmin.id,
    },
  });

  // --- 4. Create store admin and assign to store ---
  console.log('Creating store admin...');
  const storeadmin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Store',
      lastName: 'Admin',
      role: 'STOREADMIN',
      isActive: true,
      createdById: superadmin.id,
      storeId: store.id,
    },
  });
  await prisma.user.update({ 
    where: { id: storeadmin.id }, 
    data: { createdById: storeadmin.id } 
  });

  // --- 5. Create products ---
  console.log('Creating products...');
  const productsData = [
    {
      name: 'Product A',
      description: 'First demo product',
      category: 'General',
      brand: 'BrandX',
      sku: 'SKU-DEMO-A',
      mrp: 120,
      sellingPrice: 100,
      gstRate: 18,
      storeId: store.id,
      isActive: true,
    },
    {
      name: 'Product B',
      description: 'Second demo product',
      category: 'General',
      brand: 'BrandY',
      sku: 'SKU-DEMO-B',
      mrp: 220,
      sellingPrice: 200,
      gstRate: 18,
      storeId: store.id,
      isActive: true,
    },
    {
      name: 'Product C',
      description: 'Third demo product',
      category: 'General',
      brand: 'BrandZ',
      sku: 'SKU-DEMO-C',
      mrp: 320,
      sellingPrice: 300,
      gstRate: 18,
      storeId: store.id,
      isActive: true,
    },
  ];

  const createdProducts = [];
  for (const prodData of productsData) {
    const product = await prisma.product.create({ data: prodData });
    createdProducts.push(product);
    console.log(`Created product: ${product.name}`);
  }

  // --- 6. Create customers ---
  console.log('Creating customers...');
  const customersData = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.demo@mail.com',
      phone: '1111111111',
      storeId: store.id,
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.demo@mail.com',
      phone: '2222222222',
      storeId: store.id,
    },
  ];

  const createdCustomers = [];
  for (const custData of customersData) {
    const customer = await prisma.customer.create({ data: custData });
    createdCustomers.push(customer);
    console.log(`Created customer: ${customer.email}`);
  }

  // --- 7. Create orders ---
  console.log('Creating orders...');
  const ordersData = [
    {
      orderNumber: 'ORD-DEMO-1',
      storeId: store.id,
      customerId: createdCustomers[0].id,
      status: OrderStatus.PAID,
      subtotal: createdProducts[0].sellingPrice,
      gstAmount: createdProducts[0].sellingPrice * 0.18,
      totalAmount: createdProducts[0].sellingPrice * 1.18,
      paymentMethod: 'CASH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      orderNumber: 'ORD-DEMO-2',
      storeId: store.id,
      customerId: createdCustomers[1].id,
      status: OrderStatus.PAID,
      subtotal: createdProducts[1].sellingPrice,
      gstAmount: createdProducts[1].sellingPrice * 0.18,
      totalAmount: createdProducts[1].sellingPrice * 1.18,
      paymentMethod: 'CASH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const orderData of ordersData) {
    const order = await prisma.order.create({ data: orderData });
    console.log(`Created order: ${order.orderNumber}`);
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