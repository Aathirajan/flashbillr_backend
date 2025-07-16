"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Deleting all data from database...');
    await prisma.orderItem.deleteMany({});
    console.log('OrderItems deleted.');
    await prisma.order.deleteMany({});
    console.log('Orders deleted.');
    await prisma.invoice.deleteMany({});
    console.log('Invoices deleted.');
    await prisma.pOSReceipt.deleteMany({});
    console.log('POSReceipts deleted.');
    await prisma.notification.deleteMany({});
    console.log('Notifications deleted.');
    await prisma.passwordResetToken.deleteMany({});
    console.log('PasswordResetTokens deleted.');
    await prisma.supportTicket.deleteMany({});
    console.log('SupportTickets deleted.');
    await prisma.featuredBrand.deleteMany({});
    console.log('FeaturedBrands deleted.');
    await prisma.socialMediaLink.deleteMany({});
    console.log('SocialMediaLinks deleted.');
    await prisma.spending.deleteMany({});
    console.log('Spendings deleted.');
    await prisma.subscription.deleteMany({});
    console.log('Subscriptions deleted.');
    await prisma.bankAccount.deleteMany({});
    console.log('BankAccounts deleted.');
    await prisma.product.deleteMany({});
    console.log('Products deleted.');
    await prisma.category.deleteMany({});
    console.log('Categories deleted.');
    await prisma.address.deleteMany({});
    console.log('Addresses deleted.');
    await prisma.store.deleteMany({});
    console.log('Stores deleted.');
    await prisma.user.deleteMany({});
    console.log('Users deleted.');
    console.log('Database cleanup complete.');
    const passwordHash = await bcrypt.hash('password', 10);
    console.log('Password hashed.');
    console.log('Creating Superadmin...');
    const superadmin = await prisma.user.upsert({
        where: { email: 'saathirajan99@gmail.com' },
        update: {},
        create: {
            email: 'saathirajan99@gmail.com',
            password: passwordHash,
            firstName: 'Saa',
            lastName: 'Thirajan',
            role: client_1.UserRole.SUPERADMIN,
            isActive: true,
        },
    });
    console.log('Creating Storeadmin...');
    const storeadmin = await prisma.user.upsert({
        where: { email: 'work.aathirajan@gmail.com' },
        update: {},
        create: {
            email: 'work.aathirajan@gmail.com',
            password: passwordHash,
            firstName: 'Store',
            lastName: 'Admin',
            role: client_1.UserRole.STOREADMIN,
            isActive: true,
        },
    });
    console.log('Creating 5 stores...');
    const stores = await Promise.all([
        prisma.store.upsert({
            where: { slug: 'alpha-store' },
            update: {},
            create: {
                name: 'Alpha Store',
                slug: 'alpha-store',
                email: 'alpha@store.com',
                logo: 'https://via.placeholder.com/150',
                createdById: superadmin.id,
            },
        }),
        prisma.store.upsert({
            where: { slug: 'beta-store' },
            update: {},
            create: {
                name: 'Beta Store',
                slug: 'beta-store',
                email: 'beta@store.com',
                logo: 'https://via.placeholder.com/150',
                createdById: superadmin.id,
            },
        }),
        prisma.store.upsert({
            where: { slug: 'gamma-store' },
            update: {},
            create: {
                name: 'Gamma Store',
                slug: 'gamma-store',
                email: 'gamma@store.com',
                logo: 'https://via.placeholder.com/150',
                createdById: superadmin.id,
            },
        }),
        prisma.store.upsert({
            where: { slug: 'delta-store' },
            update: {},
            create: {
                name: 'Delta Store',
                slug: 'delta-store',
                email: 'delta@store.com',
                logo: 'https://via.placeholder.com/150',
                createdById: superadmin.id,
            },
        }),
        prisma.store.upsert({
            where: { slug: 'epsilon-store' },
            update: {},
            create: {
                name: 'Epsilon Store',
                slug: 'epsilon-store',
                email: 'epsilon@store.com',
                logo: 'https://via.placeholder.com/150',
                createdById: superadmin.id,
            },
        })
    ]);
    console.log('Stores created.');
    console.log('Assigning storeadmin to first store...');
    await prisma.user.update({
        where: { id: storeadmin.id },
        data: { storeId: stores[0].id },
    });
    console.log('Storeadmin assigned to first store.');
    console.log('Creating 5 categories for first store...');
    const categories = await Promise.all([
        prisma.category.upsert({
            where: { name: 'Beverages' },
            update: {},
            create: { name: 'Beverages', storeId: stores[0].id },
        }),
        prisma.category.upsert({
            where: { name: 'Snacks' },
            update: {},
            create: { name: 'Snacks', storeId: stores[0].id },
        }),
        prisma.category.upsert({
            where: { name: 'Dairy' },
            update: {},
            create: { name: 'Dairy', storeId: stores[0].id },
        }),
        prisma.category.upsert({
            where: { name: 'Bakery' },
            update: {},
            create: { name: 'Bakery', storeId: stores[0].id },
        }),
        prisma.category.upsert({
            where: { name: 'Produce' },
            update: {},
            create: { name: 'Produce', storeId: stores[0].id },
        }),
    ]);
    console.log('Categories created.');
    console.log('Generating 50 products...');
    const demoProducts = [];
    for (let i = 0; i < 50; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        demoProducts.push(prisma.product.create({
            data: {
                name: faker_1.faker.commerce.productName() + ' ' + i,
                sku: `SKU${1000 + i}`,
                mrp: faker_1.faker.number.int({ min: 20, max: 500 }),
                sellingPrice: faker_1.faker.number.int({ min: 15, max: 480 }),
                storeId: stores[0].id,
                categoryId: cat.id,
                description: faker_1.faker.commerce.productDescription(),
                brand: faker_1.faker.company.name(),
                contentType: 'PACKET',
                isActive: true,
                createdAt: faker_1.faker.date.past({ years: 1 }),
                updatedAt: new Date(),
            },
        }));
    }
    const createdDemoProducts = await Promise.all(demoProducts);
    console.log('Generating 200 customers...');
    const demoCustomers = [];
    for (let i = 0; i < 200; i++) {
        demoCustomers.push(prisma.user.create({
            data: {
                email: `customer${i}@demo.com`,
                password: passwordHash,
                firstName: faker_1.faker.name.firstName(),
                lastName: faker_1.faker.name.lastName(),
                role: client_1.UserRole.STOREADMIN,
                isActive: true,
                addresses: {
                    create: [{
                            name: 'Home',
                            line1: faker_1.faker.address.streetAddress(),
                            city: faker_1.faker.address.city(),
                            state: faker_1.faker.address.state(),
                            zip: faker_1.faker.address.zipCode(),
                            country: faker_1.faker.address.country(),
                            phone: '9' + faker_1.faker.string.numeric(9),
                        }],
                },
            },
        }));
    }
    const createdDemoCustomers = await Promise.all(demoCustomers);
    const customerPhoneMap = {};
    for (const cust of createdDemoCustomers) {
        const address = await prisma.address.create({
            data: {
                userId: cust.id,
                name: 'Home',
                line1: faker_1.faker.address.streetAddress(),
                city: faker_1.faker.address.city(),
                state: faker_1.faker.address.state(),
                zip: faker_1.faker.address.zipCode(),
                country: faker_1.faker.address.country(),
                phone: '9' + faker_1.faker.string.numeric(9),
            }
        });
        customerPhoneMap[cust.id] = address.phone || '';
    }
    console.log('Generating inventory records...');
    const demoInventory = [];
    for (const prod of createdDemoProducts) {
        demoInventory.push(prisma.inventory.create({
            data: {
                productId: prod.id,
                storeId: stores[0].id,
                currentStock: faker_1.faker.number.int({ min: 0, max: 200 }),
                minStockLevel: faker_1.faker.number.int({ min: 5, max: 20 }),
                deletedAt: null,
            },
        }));
    }
    await Promise.all(demoInventory);
    console.log('Generating 200 orders...');
    const demoOrders = [];
    for (let i = 0; i < 200; i++) {
        const cust = createdDemoCustomers[Math.floor(Math.random() * createdDemoCustomers.length)];
        const orderDate = faker_1.faker.date.between({ from: faker_1.faker.date.past({ years: 1 }), to: new Date() });
        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD${1000 + i}`,
                storeId: stores[0].id,
                userId: cust.id,
                status: 'PAID',
                subtotal: 0,
                totalAmount: 0,
                createdAt: orderDate,
                updatedAt: orderDate,
            },
        });
        let subtotal = 0;
        let totalAmount = 0;
        const numItems = faker_1.faker.number.int({ min: 1, max: 5 });
        for (let j = 0; j < numItems; j++) {
            const prod = createdDemoProducts[Math.floor(Math.random() * createdDemoProducts.length)];
            const qty = faker_1.faker.number.int({ min: 1, max: 10 });
            const unitPrice = prod.sellingPrice;
            const itemTotal = unitPrice * qty;
            subtotal += itemTotal;
            totalAmount += itemTotal;
            await prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    productId: prod.id,
                    quantity: qty,
                    unitPrice,
                    totalAmount: itemTotal,
                },
            });
        }
        await prisma.order.update({ where: { id: order.id }, data: { subtotal, totalAmount } });
        demoOrders.push(order);
    }
    console.log('Generating 200 POS receipts...');
    for (let i = 0; i < 200; i++) {
        const cust = createdDemoCustomers[Math.floor(Math.random() * createdDemoCustomers.length)];
        const posDate = faker_1.faker.date.between({ from: faker_1.faker.date.past({ years: 1 }), to: new Date() });
        const numItems = faker_1.faker.number.int({ min: 1, max: 5 });
        let itemsArr = [];
        let subtotal = 0;
        for (let j = 0; j < numItems; j++) {
            const prod = createdDemoProducts[Math.floor(Math.random() * createdDemoProducts.length)];
            const qty = faker_1.faker.number.int({ min: 1, max: 10 });
            const price = prod.sellingPrice;
            itemsArr.push({ productId: prod.id, quantity: qty, price });
            subtotal += price * qty;
        }
        await prisma.pOSReceipt.create({
            data: {
                receiptNumber: `POS${1000 + i}`,
                storeId: stores[0].id,
                customerName: cust.firstName + ' ' + cust.lastName,
                customerPhone: customerPhoneMap[cust.id] || '9' + faker_1.faker.number.int({ min: 100000000, max: 999999999 }),
                items: itemsArr,
                subtotal,
                totalAmount: subtotal + faker_1.faker.number.int({ min: 0, max: 20 }),
                amountReceived: subtotal + faker_1.faker.number.int({ min: 0, max: 50 }),
                paymentMethod: 'CASH',
                pdfUrl: 'https://via.placeholder.com/150',
                createdAt: posDate,
                updatedAt: posDate,
            },
        });
    }
    console.log('Creating 5 products for first store...');
    const products = await Promise.all([
        prisma.product.upsert({
            where: { sku_storeId: { sku: 'MILK001', storeId: stores[0].id } },
            update: {},
            create: {
                name: 'Milk',
                sku: 'MILK001',
                mrp: 50,
                sellingPrice: 45,
                storeId: stores[0].id,
                categoryId: categories[2].id,
                description: 'Fresh milk',
                brand: 'DairyBest',
                contentType: 'PACKET',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }),
        prisma.product.upsert({
            where: { sku_storeId: { sku: 'BREAD001', storeId: stores[0].id } },
            update: {},
            create: {
                name: 'Bread',
                sku: 'BREAD001',
                mrp: 30,
                sellingPrice: 28,
                storeId: stores[0].id,
                categoryId: categories[3].id,
                description: 'Whole wheat bread',
                brand: 'BakeHouse',
                contentType: 'PACKET',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }),
        prisma.product.upsert({
            where: { sku_storeId: { sku: 'APPLE001', storeId: stores[0].id } },
            update: {},
            create: {
                name: 'Apple',
                sku: 'APPLE001',
                mrp: 120,
                sellingPrice: 110,
                storeId: stores[0].id,
                categoryId: categories[4].id,
                description: 'Fresh apples',
                brand: 'FarmFresh',
                contentType: 'PIECE',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }),
        prisma.product.upsert({
            where: { sku_storeId: { sku: 'JUICE001', storeId: stores[0].id } },
            update: {},
            create: {
                name: 'Juice',
                sku: 'JUICE001',
                mrp: 60,
                sellingPrice: 55,
                storeId: stores[0].id,
                categoryId: categories[0].id,
                description: 'Orange juice',
                brand: 'Juicy',
                contentType: 'BOX',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }),
        prisma.product.upsert({
            where: { sku_storeId: { sku: 'CHIPS001', storeId: stores[0].id } },
            update: {},
            create: {
                name: 'Chips',
                sku: 'CHIPS001',
                mrp: 20,
                sellingPrice: 18,
                storeId: stores[0].id,
                categoryId: categories[1].id,
                description: 'Potato chips',
                brand: 'Crunchy',
                contentType: 'PACKET',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }),
    ]);
    console.log('Products created.');
    console.log('Creating 5 bank accounts for first store...');
    await Promise.all([
        prisma.bankAccount.create({
            data: {
                storeId: stores[0].id,
                accountName: 'Alpha Bank',
                accountNumber: '1111111111',
                ifscCode: 'ALPHA0001',
                bankName: 'Alpha Bank',
            },
        }),
        prisma.bankAccount.create({
            data: {
                storeId: stores[0].id,
                accountName: 'Beta Bank',
                accountNumber: '2222222222',
                ifscCode: 'BETA0002',
                bankName: 'Beta Bank',
            },
        }),
        prisma.bankAccount.create({
            data: {
                storeId: stores[0].id,
                accountName: 'Gamma Bank',
                accountNumber: '3333333333',
                ifscCode: 'GAMMA0003',
                bankName: 'Gamma Bank',
            },
        }),
        prisma.bankAccount.create({
            data: {
                storeId: stores[0].id,
                accountName: 'Delta Bank',
                accountNumber: '4444444444',
                ifscCode: 'DELTA0004',
                bankName: 'Delta Bank',
            },
        }),
        prisma.bankAccount.create({
            data: {
                storeId: stores[0].id,
                accountName: 'Epsilon Bank',
                accountNumber: '5555555555',
                ifscCode: 'EPSILON0005',
                bankName: 'Epsilon Bank',
            },
        }),
    ]);
    console.log('Bank accounts created.');
    console.log('Creating 5 spendings for first store...');
    await Promise.all([
        prisma.spending.create({ data: { storeId: stores[0].id, amount: 1000, type: client_1.SpendingType.FOOD, description: 'Food supplies', date: new Date() } }),
        prisma.spending.create({ data: { storeId: stores[0].id, amount: 500, type: client_1.SpendingType.PACKAGING, description: 'Packaging materials', date: new Date() } }),
        prisma.spending.create({ data: { storeId: stores[0].id, amount: 200, type: client_1.SpendingType.INTERNET, description: 'Internet bill', date: new Date() } }),
        prisma.spending.create({ data: { storeId: stores[0].id, amount: 800, type: client_1.SpendingType.SALARY, description: 'Staff salary', date: new Date() } }),
        prisma.spending.create({ data: { storeId: stores[0].id, amount: 300, type: client_1.SpendingType.FUEL, description: 'Fuel expenses', date: new Date() } }),
    ]);
    console.log('Spendings created.');
    console.log('Creating 5 subscriptions for first store...');
    await Promise.all([
        prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), amount: 299, notes: 'Monthly subscription' } }),
        prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.EXPIRED, startDate: new Date('2023-01-01'), endDate: new Date('2023-02-01'), amount: 299, notes: 'Expired subscription' } }),
        prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.CANCELLED, startDate: new Date('2023-03-01'), endDate: new Date('2023-04-01'), amount: 299, notes: 'Cancelled subscription' } }),
        prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), amount: 499, notes: 'Bi-monthly subscription' } }),
        prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), amount: 799, notes: 'Quarterly subscription' } }),
    ]);
    console.log('Subscriptions created.');
    console.log('Creating 5 social media links for first store...');
    await Promise.all([
        prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Facebook', url: 'https://facebook.com/alphastore' } }),
        prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Instagram', url: 'https://instagram.com/alphastore' } }),
        prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Twitter', url: 'https://twitter.com/alphastore' } }),
        prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'LinkedIn', url: 'https://linkedin.com/company/alphastore' } }),
        prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'YouTube', url: 'https://youtube.com/alphastore' } }),
    ]);
    console.log('Social media links created.');
    console.log('Creating 5 addresses for storeadmin...');
    await Promise.all([
        prisma.address.create({ data: { userId: storeadmin.id, name: 'Home', line1: '123 Main St', city: 'CityA', state: 'StateA', zip: '100001', country: 'CountryA', phone: '9000000001' } }),
        prisma.address.create({ data: { userId: storeadmin.id, name: 'Office', line1: '456 Office Rd', city: 'CityB', state: 'StateB', zip: '200002', country: 'CountryB', phone: '9000000002' } }),
        prisma.address.create({ data: { userId: storeadmin.id, name: 'Warehouse', line1: '789 Warehouse Ave', city: 'CityC', state: 'StateC', zip: '300003', country: 'CountryC', phone: '9000000003' } }),
        prisma.address.create({ data: { userId: storeadmin.id, name: 'Storefront', line1: '321 Storefront Blvd', city: 'CityD', state: 'StateD', zip: '400004', country: 'CountryD', phone: '9000000004' } }),
        prisma.address.create({ data: { userId: storeadmin.id, name: 'Other', line1: '654 Other Ln', city: 'CityE', state: 'StateE', zip: '500005', country: 'CountryE', phone: '9000000005' } }),
    ]);
    console.log('Addresses created.');
    console.log('Creating 1 featured brand...');
    await prisma.featuredBrand.create({
        data: {
            storeId: stores[0].id,
            brandId: 'brand-001',
            name: 'Brand One',
            logo: 'https://via.placeholder.com/150',
        },
    });
    console.log('Featured brand created.');
    console.log('Creating 1 support ticket...');
    await prisma.supportTicket.create({
        data: {
            storeId: stores[0].id,
            title: 'Need help with POS',
            message: 'The POS is not printing receipts.',
            status: 'OPEN',
        },
    });
    console.log('Support ticket created.');
    console.log('Creating 1 order...');
    const order = await prisma.order.create({
        data: {
            orderNumber: 'ORD001',
            storeId: stores[0].id,
            userId: storeadmin.id,
            status: 'PAID',
            subtotal: 100,
            totalAmount: 110,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
    console.log('Order created.');
    console.log('Creating 1 order item...');
    await prisma.orderItem.create({
        data: {
            orderId: order.id,
            productId: products[0].id,
            quantity: 2,
            unitPrice: 50,
            totalAmount: 100,
        },
    });
    console.log('Order item created.');
    console.log('Creating 1 invoice...');
    await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV001',
            orderId: order.id,
            storeId: stores[0].id,
            subtotal: 100,
            totalAmount: 110,
            pdfUrl: 'https://via.placeholder.com/150',
            isPos: false,
        },
    });
    console.log('Invoice created.');
    console.log('Creating 1 POS receipt...');
    await prisma.pOSReceipt.create({
        data: {
            receiptNumber: 'POS001',
            storeId: stores[0].id,
            customerName: 'John Doe',
            customerPhone: '9000000009',
            items: { items: [{ name: 'Milk', qty: 2, price: 50 }] },
            subtotal: 100,
            totalAmount: 110,
            amountReceived: 120,
            paymentMethod: 'CASH',
            pdfUrl: 'https://via.placeholder.com/150',
        },
    });
    console.log('POS receipt created.');
    console.log('Creating 1 notification...');
    await prisma.notification.create({
        data: {
            type: 'ORDER',
            message: 'Order ORD001 has been paid.',
            userId: storeadmin.id,
            isRead: false,
        },
    });
    console.log('Notification created.');
    console.log('Creating 1 password reset token...');
    await prisma.passwordResetToken.create({
        data: {
            userId: storeadmin.id,
            token: 'reset-token-001',
            expiresAt: new Date(Date.now() + 3600000),
            used: false,
        },
    });
    console.log('Password reset token created.');
    console.log('Seeding complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map