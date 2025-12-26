import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('Creating test users...\n');

  try {
    // 1. Create Investor User
    const investorPassword = await bcrypt.hash('investor123', 10);
    const investor = await prisma.user.create({
      data: {
        email: 'investor@test.com',
        password: investorPassword,
        roles: ['CUSTOMER', 'P2P_LENDER'],
        firstName: 'Test',
        lastName: 'Investor',
        phone: '+2348012345678',
        isEmailVerified: true,
        platformTrustScore: 100,
        financialScore: 0,
        wallet: {
          create: {
            balance: 100000000 // ₦1,000,000 in kobo
          }
        }
      }
    });
    console.log('✅ Investor created:');
    console.log(`   Email: investor@test.com`);
    console.log(`   Password: investor123`);
    console.log(`   Wallet: ₦1,000,000\n`);

    // 2. Create SME User with Business
    const smePassword = await bcrypt.hash('sme123', 10);
    const smeUser = await prisma.user.create({
      data: {
        email: 'sme@test.com',
        password: smePassword,
        roles: ['CUSTOMER', 'SME'],
        firstName: 'Test',
        lastName: 'Business',
        phone: '+2348087654321',
        isEmailVerified: true,
        platformTrustScore: 150,
        financialScore: 200,
        wallet: {
          create: {
            balance: 50000000 // ₦500,000 in kobo
          }
        },
        sme: {
          create: {
            businessName: 'Test SME Business',
            marketplaceScore: 300,
            feedbackScore: 350
          }
        }
      },
      include: {
        sme: true
      }
    });
    console.log('✅ SME created:');
    console.log(`   Email: sme@test.com`);
    console.log(`   Password: sme123`);
    console.log(`   Business: Test SME Business`);
    console.log(`   Wallet: ₦500,000\n`);

    // 3. Create a Funding Request
    if (smeUser.sme) {
      const fundingRequest = await prisma.fundingRequest.create({
        data: {
          smeId: smeUser.sme.id,
          amount: 50000000, // ₦500,000
          purpose: 'Purchase inventory and expand business operations',
          profitSharePercentage: 10,
          termInMonths: 6,
          repaymentFrequency: 'MONTHLY',
          status: 'PENDING'
        }
      });
      console.log('✅ Funding Request created:');
      console.log(`   Amount: ₦500,000`);
      console.log(`   Purpose: Purchase inventory`);
      console.log(`   Term: 6 months at 10% profit share\n`);
    }

    console.log('✅ Test data created successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Investor Dashboard: http://localhost:3002');
    console.log('     Login: investor@test.com / investor123');
    console.log('   - SME Portal: http://localhost:3000');
    console.log('     Login: sme@test.com / sme123');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
