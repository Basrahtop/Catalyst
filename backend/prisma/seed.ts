import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// --- Define our system wallet emails ---
const PLATFORM_USER_EMAIL = 'platform-admin@catalyst.com';
const PLATFORM_REVENUE_EMAIL = 'platform-revenue@catalyst.com';
const PLATFORM_RISK_EMAIL = 'platform-risk@catalyst.com';

async function main() {
  console.log('Start seeding ...');

  // --- 1. Create Platform Admin User (if not exists) ---
  let platformUser = await prisma.user.findUnique({
    where: { email: PLATFORM_USER_EMAIL },
  });
  if (!platformUser) {
    await prisma.user.create({
      data: {
        email: PLATFORM_USER_EMAIL,
        password: crypto.randomBytes(32).toString('hex'),
        roles: ['ADMIN'],
        firstName: 'Catalyst',
        lastName: 'Admin',
        isEmailVerified: true,
        wallet: { create: { balance: 0 } },
      },
    });
    console.log('Created platform admin user with wallet.');
  }

  // --- 2. Create Platform Revenue Wallet User (if not exists) ---
  let revenueUser = await prisma.user.findUnique({
    where: { email: PLATFORM_REVENUE_EMAIL },
  });
  if (!revenueUser) {
    await prisma.user.create({
      data: {
        email: PLATFORM_REVENUE_EMAIL,
        password: crypto.randomBytes(32).toString('hex'),
        roles: ['ADMIN'],
        firstName: 'Platform',
        lastName: 'Revenue',
        isEmailVerified: true,
        wallet: { create: { balance: 0 } },
      },
    });
    console.log('Created platform REVENUE user with wallet.');
  }

  // --- 3. Create Platform Risk Wallet User (if not exists) ---
  let riskUser = await prisma.user.findUnique({
    where: { email: PLATFORM_RISK_EMAIL },
  });
  if (!riskUser) {
    await prisma.user.create({
      data: {
        email: PLATFORM_RISK_EMAIL,
        password: crypto.randomBytes(32).toString('hex'),
        roles: ['ADMIN'],
        firstName: 'Platform',
        lastName: 'Risk',
        isEmailVerified: true,
        wallet: { create: { balance: 0 } },
      },
    });
    console.log('Created platform RISK user with wallet.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });