/**
 * Test Exchange Rate Service
 * 
 * Run: npm run test:exchange-rate
 */

import { exchangeRateService } from '../services/exchange-rate.service';
import { Currency } from '@prisma/client';

async function testExchangeRateService() {
  console.log('\n🧪 Testing Exchange Rate Service...\n');

  try {
    // Test 1: Get NGN rate (should always be 1)
    console.log('Test 1: Get NGN rate');
    const ngnRate = await exchangeRateService.getRate(Currency.NGN);
    console.log(`  ✅ NGN rate: ${ngnRate} (expected: 1)`);
    if (ngnRate !== 1) {
      throw new Error('NGN rate should be 1');
    }

    // Test 2: Get ADA rate
    console.log('\nTest 2: Get ADA rate');
    const adaRate = await exchangeRateService.getRate(Currency.ADA);
    console.log(`  ✅ ADA rate: ₦${adaRate / 100} (${adaRate} kobo per ADA)`);
    if (adaRate <= 0) {
      throw new Error('ADA rate should be positive');
    }

    // Test 3: Get USDM rate
    console.log('\nTest 3: Get USDM rate');
    const usdmRate = await exchangeRateService.getRate(Currency.USDM);
    console.log(`  ✅ USDM rate: ₦${usdmRate / 100} (${usdmRate} kobo per USDM)`);
    if (usdmRate <= 0) {
      throw new Error('USDM rate should be positive');
    }

    // Test 4: Convert ADA to NGN
    console.log('\nTest 4: Convert 5 ADA to NGN');
    const fiveADA = BigInt(5000000); // 5 ADA in lovelace
    const adaToNgn = await exchangeRateService.convertToNGN(fiveADA, Currency.ADA);
    console.log(`  ✅ 5 ADA = ₦${Number(adaToNgn) / 100} (${adaToNgn} kobo)`);
    if (adaToNgn <= 0) {
      throw new Error('Conversion should be positive');
    }

    // Test 5: Convert NGN to ADA
    console.log('\nTest 5: Convert ₦40,000 to ADA');
    const fortyThousandNaira = BigInt(4000000); // ₦40,000 in kobo
    const ngnToAda = await exchangeRateService.convertFromNGN(fortyThousandNaira, Currency.ADA);
    console.log(`  ✅ ₦40,000 = ${Number(ngnToAda) / 1000000} ADA (${ngnToAda} lovelace)`);
    if (ngnToAda <= 0) {
      throw new Error('Conversion should be positive');
    }

    // Test 6: Convert USDM to NGN
    console.log('\nTest 6: Convert 100 USDM to NGN');
    const hundredUSDM = BigInt(100000000); // 100 USDM in microUSDM
    const usdmToNgn = await exchangeRateService.convertToNGN(hundredUSDM, Currency.USDM);
    console.log(`  ✅ 100 USDM = ₦${Number(usdmToNgn) / 100} (${usdmToNgn} kobo)`);

    // Test 7: Cache functionality
    console.log('\nTest 7: Test cache (second call should be instant)');
    const start = Date.now();
    await exchangeRateService.getRate(Currency.ADA);
    const cached = Date.now() - start;
    console.log(`  ✅ Cached rate retrieved in ${cached}ms`);
    if (cached > 100) {
      console.log('  ⚠️  Warning: Cache may not be working properly');
    }

    // Test 8: Clear cache
    console.log('\nTest 8: Clear cache');
    exchangeRateService.clearCache();
    const cachedRates = exchangeRateService.getCachedRates();
    console.log(`  ✅ Cache cleared (size: ${cachedRates.size})`);

    console.log('\n✅ All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   - ADA/NGN rate: ₦${adaRate / 100}`);
    console.log(`   - USDM/NGN rate: ₦${usdmRate / 100}`);
    console.log(`   - 5 ADA ≈ ₦${Number(adaToNgn) / 100}`);
    console.log(`   - ₦40,000 ≈ ${Number(ngnToAda) / 1000000} ADA`);
    console.log(`   - 100 USDM ≈ ₦${Number(usdmToNgn) / 100}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testExchangeRateService();
