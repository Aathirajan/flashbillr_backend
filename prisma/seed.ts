import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'saathirajan99@gmail.com';
  const password = 'password';
  const hashedPassword = await hash(password, 12);

  // Check if superadmin already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Superadmin already exists.');
    return;
  }

  // Step 1: Create user with a temporary createdById (will update after creation)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
    },
  });

  // Step 2: Update createdById to point to own id
  await prisma.user.update({
    where: { id: user.id },
    data: { createdById: user.id },
  });

  console.log('Superadmin created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
