/**
 * Test multi-source exchange rate service
 */

import { Currency } from '@prisma/client';
import { multiSourceExchangeRateService } from '../services/exchange-rate-multi-source.service';

async function runTests() {
  console.log('🧪 Testing Multi-Source Exchange Rate Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: NGN rate (should always be 1)
    console.log('\n📌 Test 1: Get NGN rate (should be 1)');
    const ngnRate = await multiSourceExchangeRateService.getRate(Currency.NGN);
    console.log(`   Result: ${ngnRate} ${ngnRate === 1 ? '✅' : '❌'}`);

    // Test 2: Get ADA rate (should be around $0.35 × USD/NGN)
    console.log('\n📌 Test 2: Get ADA rate from CoinGecko');
    const start2 = Date.now();
    const adaRate = await multiSourceExchangeRateService.getRate(Currency.ADA);
    const time2 = Date.now() - start2;
    console.log(`   Result: ₦${adaRate / 100} (${adaRate} kobo)`);
    console.log(`   Time: ${time2}ms`);
    console.log(`   Expected: ~₦560-800 (if ADA = $0.30-0.40 and USD/NGN = ₦1900)`);
    
    // Check with source
    const adaWithSource = await multiSourceExchangeRateService.getRateWithSource(Currency.ADA);
    if (adaWithSource) {
      console.log(`   Source: ${adaWithSource.source} ✅`);
    }

    // Test 3: Get USDM rate (should be same as USD/NGN)
    console.log('\n📌 Test 3: Get USDM rate (1 USDM = 1 USD)');
    const start3 = Date.now();
    const usdmRate = await multiSourceExchangeRateService.getRate(Currency.USDM);
    const time3 = Date.now() - start3;
    console.log(`   Result: ₦${usdmRate / 100} (${usdmRate} kobo)`);
    console.log(`   Time: ${time3}ms`);
    console.log(`   Expected: ~₦1900 (official USD/NGN rate)`);
    
    const usdmWithSource = await multiSourceExchangeRateService.getRateWithSource(Currency.USDM);
    if (usdmWithSource) {
      console.log(`   Source: ${usdmWithSource.source} ✅`);
    }

    // Test 4: Convert 5 ADA to NGN
    console.log('\n📌 Test 4: Convert 5 ADA (5,000,000 lovelace) to NGN');
    const fiveADA = BigInt(5_000_000); // 5 ADA in lovelace
    const fiveADAinNGN = await multiSourceExchangeRateService.convertToNGN(fiveADA, Currency.ADA);
    const fiveADAinNaira = Number(fiveADAinNGN) / 100;
    console.log(`   Result: ₦${fiveADAinNaira.toFixed(2)} (${fiveADAinNGN} kobo)`);
    console.log(`   Calculation: 5 ADA × ₦${adaRate / 100} = ₦${(5 * adaRate / 100).toFixed(2)}`);

    // Test 5: Convert NGN back to ADA
    console.log('\n📌 Test 5: Convert NGN back to ADA');
    const backToADA = await multiSourceExchangeRateService.convertFromNGN(fiveADAinNGN, Currency.ADA);
    const backToADAFormatted = Number(backToADA) / 1_000_000;
    console.log(`   Result: ${backToADAFormatted} ADA (${backToADA} lovelace)`);
    console.log(`   Expected: 5 ADA ${Math.abs(backToADAFormatted - 5) < 0.01 ? '✅' : '❌'}`);

    // Test 6: Convert 100 USDM to NGN
    console.log('\n📌 Test 6: Convert 100 USDM (100,000,000 microUSDM) to NGN');
    const hundredUSDM = BigInt(100_000_000); // 100 USDM
    const hundredUSDMinNGN = await multiSourceExchangeRateService.convertToNGN(hundredUSDM, Currency.USDM);
    const hundredUSDMinNaira = Number(hundredUSDMinNGN) / 100;
    console.log(`   Result: ₦${hundredUSDMinNaira.toLocaleString()} (${hundredUSDMinNGN} kobo)`);
    console.log(`   Expected: ~₦190,000 (if USD/NGN = ₦1900)`);

    // Test 7: Cache performance
    console.log('\n📌 Test 7: Cache performance (should be instant)');
    const cacheStart = Date.now();
    const cachedRate = await multiSourceExchangeRateService.getRate(Currency.ADA);
    const cacheTime = Date.now() - cacheStart;
    console.log(`   Result: ${cacheTime}ms ${cacheTime < 10 ? '✅' : '❌'}`);
    console.log(`   Rate: ₦${cachedRate / 100} (same as before)`);

    // Test 8: Clear cache and refetch
    console.log('\n📌 Test 8: Clear cache and refetch');
    multiSourceExchangeRateService.clearCache();
    const refetchStart = Date.now();
    const refetchedRate = await multiSourceExchangeRateService.getRate(Currency.ADA);
    const refetchTime = Date.now() - refetchStart;
    console.log(`   Result: ${refetchTime}ms (should be >100ms for network call)`);
    console.log(`   Rate: ₦${refetchedRate / 100}`);

    // Summary: Show all cached rates
    console.log('\n📌 Summary: All Cached Rates');
    const allRates = multiSourceExchangeRateService.getCachedRates();
    allRates.forEach((rate, currency) => {
      console.log(`   ${currency}: ₦${rate.rateToNGN / 100} (source: ${rate.source})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
