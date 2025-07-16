"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcryptjs");
var faker_1 = require("@faker-js/faker");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, superadmin, storeadmin, stores, categories, demoProducts, i, cat, createdDemoProducts, demoCustomers, i, createdDemoCustomers, customerPhoneMap, _i, createdDemoCustomers_1, cust, address, demoInventory, _a, createdDemoProducts_1, prod, demoOrders, i, cust, orderDate, order_1, subtotal, totalAmount, numItems, j, prod, qty, unitPrice, itemTotal, i, cust, posDate, numItems, itemsArr, subtotal, j, prod, qty, price, products, order;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // CLEANUP: Delete all data from all tables before seeding
                    console.log('Deleting all data from database...');
                    return [4 /*yield*/, prisma.orderItem.deleteMany({})];
                case 1:
                    _b.sent();
                    console.log('OrderItems deleted.');
                    return [4 /*yield*/, prisma.order.deleteMany({})];
                case 2:
                    _b.sent();
                    console.log('Orders deleted.');
                    return [4 /*yield*/, prisma.invoice.deleteMany({})];
                case 3:
                    _b.sent();
                    console.log('Invoices deleted.');
                    return [4 /*yield*/, prisma.pOSReceipt.deleteMany({})];
                case 4:
                    _b.sent();
                    console.log('POSReceipts deleted.');
                    return [4 /*yield*/, prisma.notification.deleteMany({})];
                case 5:
                    _b.sent();
                    console.log('Notifications deleted.');
                    return [4 /*yield*/, prisma.passwordResetToken.deleteMany({})];
                case 6:
                    _b.sent();
                    console.log('PasswordResetTokens deleted.');
                    return [4 /*yield*/, prisma.supportTicket.deleteMany({})];
                case 7:
                    _b.sent();
                    console.log('SupportTickets deleted.');
                    return [4 /*yield*/, prisma.featuredBrand.deleteMany({})];
                case 8:
                    _b.sent();
                    console.log('FeaturedBrands deleted.');
                    return [4 /*yield*/, prisma.socialMediaLink.deleteMany({})];
                case 9:
                    _b.sent();
                    console.log('SocialMediaLinks deleted.');
                    return [4 /*yield*/, prisma.spending.deleteMany({})];
                case 10:
                    _b.sent();
                    console.log('Spendings deleted.');
                    return [4 /*yield*/, prisma.subscription.deleteMany({})];
                case 11:
                    _b.sent();
                    console.log('Subscriptions deleted.');
                    return [4 /*yield*/, prisma.bankAccount.deleteMany({})];
                case 12:
                    _b.sent();
                    console.log('BankAccounts deleted.');
                    return [4 /*yield*/, prisma.product.deleteMany({})];
                case 13:
                    _b.sent();
                    console.log('Products deleted.');
                    return [4 /*yield*/, prisma.category.deleteMany({})];
                case 14:
                    _b.sent();
                    console.log('Categories deleted.');
                    return [4 /*yield*/, prisma.address.deleteMany({})];
                case 15:
                    _b.sent();
                    console.log('Addresses deleted.');
                    return [4 /*yield*/, prisma.store.deleteMany({})];
                case 16:
                    _b.sent();
                    console.log('Stores deleted.');
                    return [4 /*yield*/, prisma.user.deleteMany({})];
                case 17:
                    _b.sent();
                    console.log('Users deleted.');
                    console.log('Database cleanup complete.');
                    return [4 /*yield*/, bcrypt.hash('password', 10)];
                case 18:
                    passwordHash = _b.sent();
                    console.log('Password hashed.');
                    // Create Superadmin
                    console.log('Creating Superadmin...');
                    return [4 /*yield*/, prisma.user.upsert({
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
                        })];
                case 19:
                    superadmin = _b.sent();
                    // Create Storeadmin
                    console.log('Creating Storeadmin...');
                    return [4 /*yield*/, prisma.user.upsert({
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
                        })];
                case 20:
                    storeadmin = _b.sent();
                    // Create 5 Stores
                    console.log('Creating 5 stores...');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 21:
                    stores = _b.sent();
                    console.log('Stores created.');
                    // Assign storeadmin to first store
                    console.log('Assigning storeadmin to first store...');
                    return [4 /*yield*/, prisma.user.update({
                            where: { id: storeadmin.id },
                            data: { storeId: stores[0].id },
                        })];
                case 22:
                    _b.sent();
                    console.log('Storeadmin assigned to first store.');
                    // Create 5 Categories for first store
                    console.log('Creating 5 categories for first store...');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 23:
                    categories = _b.sent();
                    console.log('Categories created.');
                    // --- ENHANCED DEMO DATA FOR DASHBOARD INTERACTIVITY ---
                    // Generate 50 products
                    console.log('Generating 50 products...');
                    demoProducts = [];
                    for (i = 0; i < 50; i++) {
                        cat = categories[Math.floor(Math.random() * categories.length)];
                        demoProducts.push(prisma.product.create({
                            data: {
                                name: faker_1.faker.commerce.productName() + ' ' + i,
                                sku: "SKU".concat(1000 + i),
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
                    return [4 /*yield*/, Promise.all(demoProducts)];
                case 24:
                    createdDemoProducts = _b.sent();
                    // Generate 200 customers
                    console.log('Generating 200 customers...');
                    demoCustomers = [];
                    for (i = 0; i < 200; i++) {
                        demoCustomers.push(prisma.user.create({
                            data: {
                                email: "customer".concat(i, "@demo.com"),
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
                    return [4 /*yield*/, Promise.all(demoCustomers)];
                case 25:
                    createdDemoCustomers = _b.sent();
                    customerPhoneMap = {};
                    _i = 0, createdDemoCustomers_1 = createdDemoCustomers;
                    _b.label = 26;
                case 26:
                    if (!(_i < createdDemoCustomers_1.length)) return [3 /*break*/, 29];
                    cust = createdDemoCustomers_1[_i];
                    return [4 /*yield*/, prisma.address.create({
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
                        })];
                case 27:
                    address = _b.sent();
                    customerPhoneMap[cust.id] = address.phone || '';
                    _b.label = 28;
                case 28:
                    _i++;
                    return [3 /*break*/, 26];
                case 29:
                    // Generate inventory for all products
                    console.log('Generating inventory records...');
                    demoInventory = [];
                    for (_a = 0, createdDemoProducts_1 = createdDemoProducts; _a < createdDemoProducts_1.length; _a++) {
                        prod = createdDemoProducts_1[_a];
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
                    return [4 /*yield*/, Promise.all(demoInventory)];
                case 30:
                    _b.sent();
                    // Generate 200 orders (with items)
                    console.log('Generating 200 orders...');
                    demoOrders = [];
                    i = 0;
                    _b.label = 31;
                case 31:
                    if (!(i < 200)) return [3 /*break*/, 39];
                    cust = createdDemoCustomers[Math.floor(Math.random() * createdDemoCustomers.length)];
                    orderDate = faker_1.faker.date.between({ from: faker_1.faker.date.past({ years: 1 }), to: new Date() });
                    return [4 /*yield*/, prisma.order.create({
                            data: {
                                orderNumber: "ORD".concat(1000 + i),
                                storeId: stores[0].id,
                                userId: cust.id,
                                status: 'PAID',
                                subtotal: 0,
                                totalAmount: 0,
                                createdAt: orderDate,
                                updatedAt: orderDate,
                            },
                        })];
                case 32:
                    order_1 = _b.sent();
                    subtotal = 0;
                    totalAmount = 0;
                    numItems = faker_1.faker.number.int({ min: 1, max: 5 });
                    j = 0;
                    _b.label = 33;
                case 33:
                    if (!(j < numItems)) return [3 /*break*/, 36];
                    prod = createdDemoProducts[Math.floor(Math.random() * createdDemoProducts.length)];
                    qty = faker_1.faker.number.int({ min: 1, max: 10 });
                    unitPrice = prod.sellingPrice;
                    itemTotal = unitPrice * qty;
                    subtotal += itemTotal;
                    totalAmount += itemTotal;
                    return [4 /*yield*/, prisma.orderItem.create({
                            data: {
                                orderId: order_1.id,
                                productId: prod.id,
                                quantity: qty,
                                unitPrice: unitPrice,
                                totalAmount: itemTotal,
                            },
                        })];
                case 34:
                    _b.sent();
                    _b.label = 35;
                case 35:
                    j++;
                    return [3 /*break*/, 33];
                case 36: return [4 /*yield*/, prisma.order.update({ where: { id: order_1.id }, data: { subtotal: subtotal, totalAmount: totalAmount } })];
                case 37:
                    _b.sent();
                    demoOrders.push(order_1);
                    _b.label = 38;
                case 38:
                    i++;
                    return [3 /*break*/, 31];
                case 39:
                    // Generate 200 POS receipts
                    console.log('Generating 200 POS receipts...');
                    i = 0;
                    _b.label = 40;
                case 40:
                    if (!(i < 200)) return [3 /*break*/, 43];
                    cust = createdDemoCustomers[Math.floor(Math.random() * createdDemoCustomers.length)];
                    posDate = faker_1.faker.date.between({ from: faker_1.faker.date.past({ years: 1 }), to: new Date() });
                    numItems = faker_1.faker.number.int({ min: 1, max: 5 });
                    itemsArr = [];
                    subtotal = 0;
                    for (j = 0; j < numItems; j++) {
                        prod = createdDemoProducts[Math.floor(Math.random() * createdDemoProducts.length)];
                        qty = faker_1.faker.number.int({ min: 1, max: 10 });
                        price = prod.sellingPrice;
                        itemsArr.push({ productId: prod.id, quantity: qty, price: price });
                        subtotal += price * qty;
                    }
                    return [4 /*yield*/, prisma.pOSReceipt.create({
                            data: {
                                receiptNumber: "POS".concat(1000 + i),
                                storeId: stores[0].id,
                                customerName: cust.firstName + ' ' + cust.lastName,
                                customerPhone: customerPhoneMap[cust.id] || '9' + faker_1.faker.number.int({ min: 100000000, max: 999999999 }),
                                items: itemsArr,
                                subtotal: subtotal,
                                totalAmount: subtotal + faker_1.faker.number.int({ min: 0, max: 20 }),
                                amountReceived: subtotal + faker_1.faker.number.int({ min: 0, max: 50 }),
                                paymentMethod: 'CASH',
                                pdfUrl: 'https://via.placeholder.com/150',
                                createdAt: posDate,
                                updatedAt: posDate,
                            },
                        })];
                case 41:
                    _b.sent();
                    _b.label = 42;
                case 42:
                    i++;
                    return [3 /*break*/, 40];
                case 43:
                    // --- END ENHANCED DEMO DATA ---
                    // Create 5 Products for first store
                    console.log('Creating 5 products for first store...');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 44:
                    products = _b.sent();
                    console.log('Products created.');
                    // Create 5 Bank Accounts for first store
                    console.log('Creating 5 bank accounts for first store...');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 45:
                    _b.sent();
                    console.log('Bank accounts created.');
                    // Create 5 Spendings for first store
                    console.log('Creating 5 spendings for first store...');
                    return [4 /*yield*/, Promise.all([
                            prisma.spending.create({ data: { storeId: stores[0].id, amount: 1000, type: client_1.SpendingType.FOOD, description: 'Food supplies', date: new Date() } }),
                            prisma.spending.create({ data: { storeId: stores[0].id, amount: 500, type: client_1.SpendingType.PACKAGING, description: 'Packaging materials', date: new Date() } }),
                            prisma.spending.create({ data: { storeId: stores[0].id, amount: 200, type: client_1.SpendingType.INTERNET, description: 'Internet bill', date: new Date() } }),
                            prisma.spending.create({ data: { storeId: stores[0].id, amount: 800, type: client_1.SpendingType.SALARY, description: 'Staff salary', date: new Date() } }),
                            prisma.spending.create({ data: { storeId: stores[0].id, amount: 300, type: client_1.SpendingType.FUEL, description: 'Fuel expenses', date: new Date() } }),
                        ])];
                case 46:
                    _b.sent();
                    console.log('Spendings created.');
                    // Create 5 Subscriptions for first store
                    console.log('Creating 5 subscriptions for first store...');
                    return [4 /*yield*/, Promise.all([
                            prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), amount: 299, notes: 'Monthly subscription' } }),
                            prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.EXPIRED, startDate: new Date('2023-01-01'), endDate: new Date('2023-02-01'), amount: 299, notes: 'Expired subscription' } }),
                            prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.CANCELLED, startDate: new Date('2023-03-01'), endDate: new Date('2023-04-01'), amount: 299, notes: 'Cancelled subscription' } }),
                            prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), amount: 499, notes: 'Bi-monthly subscription' } }),
                            prisma.subscription.create({ data: { storeId: stores[0].id, status: client_1.SubscriptionStatus.ACTIVE, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), amount: 799, notes: 'Quarterly subscription' } }),
                        ])];
                case 47:
                    _b.sent();
                    console.log('Subscriptions created.');
                    // Create 5 Social Media Links for first store
                    console.log('Creating 5 social media links for first store...');
                    return [4 /*yield*/, Promise.all([
                            prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Facebook', url: 'https://facebook.com/alphastore' } }),
                            prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Instagram', url: 'https://instagram.com/alphastore' } }),
                            prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'Twitter', url: 'https://twitter.com/alphastore' } }),
                            prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'LinkedIn', url: 'https://linkedin.com/company/alphastore' } }),
                            prisma.socialMediaLink.create({ data: { storeId: stores[0].id, platform: 'YouTube', url: 'https://youtube.com/alphastore' } }),
                        ])];
                case 48:
                    _b.sent();
                    console.log('Social media links created.');
                    // Create 5 Addresses for storeadmin
                    console.log('Creating 5 addresses for storeadmin...');
                    return [4 /*yield*/, Promise.all([
                            prisma.address.create({ data: { userId: storeadmin.id, name: 'Home', line1: '123 Main St', city: 'CityA', state: 'StateA', zip: '100001', country: 'CountryA', phone: '9000000001' } }),
                            prisma.address.create({ data: { userId: storeadmin.id, name: 'Office', line1: '456 Office Rd', city: 'CityB', state: 'StateB', zip: '200002', country: 'CountryB', phone: '9000000002' } }),
                            prisma.address.create({ data: { userId: storeadmin.id, name: 'Warehouse', line1: '789 Warehouse Ave', city: 'CityC', state: 'StateC', zip: '300003', country: 'CountryC', phone: '9000000003' } }),
                            prisma.address.create({ data: { userId: storeadmin.id, name: 'Storefront', line1: '321 Storefront Blvd', city: 'CityD', state: 'StateD', zip: '400004', country: 'CountryD', phone: '9000000004' } }),
                            prisma.address.create({ data: { userId: storeadmin.id, name: 'Other', line1: '654 Other Ln', city: 'CityE', state: 'StateE', zip: '500005', country: 'CountryE', phone: '9000000005' } }),
                        ])];
                case 49:
                    _b.sent();
                    console.log('Addresses created.');
                    // FeaturedBrand
                    console.log('Creating 1 featured brand...');
                    return [4 /*yield*/, prisma.featuredBrand.create({
                            data: {
                                storeId: stores[0].id,
                                brandId: 'brand-001',
                                name: 'Brand One',
                                logo: 'https://via.placeholder.com/150',
                            },
                        })];
                case 50:
                    _b.sent();
                    console.log('Featured brand created.');
                    // SupportTicket
                    console.log('Creating 1 support ticket...');
                    return [4 /*yield*/, prisma.supportTicket.create({
                            data: {
                                storeId: stores[0].id,
                                title: 'Need help with POS',
                                message: 'The POS is not printing receipts.',
                                status: 'OPEN',
                            },
                        })];
                case 51:
                    _b.sent();
                    console.log('Support ticket created.');
                    // Order
                    console.log('Creating 1 order...');
                    return [4 /*yield*/, prisma.order.create({
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
                        })];
                case 52:
                    order = _b.sent();
                    console.log('Order created.');
                    // OrderItem
                    console.log('Creating 1 order item...');
                    return [4 /*yield*/, prisma.orderItem.create({
                            data: {
                                orderId: order.id,
                                productId: products[0].id,
                                quantity: 2,
                                unitPrice: 50,
                                totalAmount: 100,
                            },
                        })];
                case 53:
                    _b.sent();
                    console.log('Order item created.');
                    // Invoice
                    console.log('Creating 1 invoice...');
                    return [4 /*yield*/, prisma.invoice.create({
                            data: {
                                invoiceNumber: 'INV001',
                                orderId: order.id,
                                storeId: stores[0].id,
                                subtotal: 100,
                                totalAmount: 110,
                                pdfUrl: 'https://via.placeholder.com/150',
                                isPos: false,
                            },
                        })];
                case 54:
                    _b.sent();
                    console.log('Invoice created.');
                    // POSReceipt
                    console.log('Creating 1 POS receipt...');
                    return [4 /*yield*/, prisma.pOSReceipt.create({
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
                        })];
                case 55:
                    _b.sent();
                    console.log('POS receipt created.');
                    // Notification
                    console.log('Creating 1 notification...');
                    return [4 /*yield*/, prisma.notification.create({
                            data: {
                                type: 'ORDER',
                                message: 'Order ORD001 has been paid.',
                                userId: storeadmin.id,
                                isRead: false,
                            },
                        })];
                case 56:
                    _b.sent();
                    console.log('Notification created.');
                    // PasswordResetToken
                    console.log('Creating 1 password reset token...');
                    return [4 /*yield*/, prisma.passwordResetToken.create({
                            data: {
                                userId: storeadmin.id,
                                token: 'reset-token-001',
                                expiresAt: new Date(Date.now() + 3600000),
                                used: false,
                            },
                        })];
                case 57:
                    _b.sent();
                    console.log('Password reset token created.');
                    console.log('Seeding complete!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
