import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@bananapudding.com',
      password: passwordHash,
      name: 'Rania (Owner)',
      role: 'OWNER',
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@bananapudding.com',
      password: passwordHash,
      name: 'Staff Member',
      role: 'STAFF',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: passwordHash,
      name: 'Juan Dela Cruz',
      role: 'CUSTOMER',
    },
  });

  console.log('Created users:', { owner: owner.email, staff: staff.email, customer: customer.email });

  const puddingCategory = await prisma.category.create({
    data: { name: 'Banana Pudding' },
  });

  const cookieCategory = await prisma.category.create({
    data: { name: 'Cookies' },
  });

  const products = await prisma.product.createMany({
    data: [
      { name: 'Classic Banana Pudding', price: 120, cost: 60, categoryId: puddingCategory.id },
      { name: 'Biscoff Banana Pudding', price: 150, cost: 80, categoryId: puddingCategory.id },
      { name: 'Chocolate Banana Pudding', price: 140, cost: 70, categoryId: puddingCategory.id },
      { name: 'Oreo Banana Pudding', price: 140, cost: 70, categoryId: puddingCategory.id },
      { name: 'Cookie (Add-on)', price: 40, cost: 32, categoryId: cookieCategory.id },
      { name: 'Cookie Box of 4', price: 180, cost: 128, categoryId: cookieCategory.id },
      { name: 'Cookie (Solo)', price: 50, cost: 32, categoryId: cookieCategory.id },
    ],
  });

  console.log(`Created ${products.count} products`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });