/**
 * Multi-Source Exchange Rate Service
 * 
 * Fetches real-time exchange rates from multiple sources with automatic fallback:
 * 1. CoinGecko API (crypto prices - free, no key needed)
 * 2. ExchangeRate-API.com (fiat rates - free tier)
 * 3. CoinMarketCap (requires API key - optional)
 * 4. Manual override from .env
 * 
 * For USDM (Cardano stablecoin): Assumes 1:1 peg with USD
 */

import { Currency } from '@prisma/client';

interface ExchangeRate {
  currency: Currency;
  rateToNGN: number; // How many kobo = 1 unit
  timestamp: Date;
  source: string; // Which API provided the data
}

interface PriceSource {
  name: string;
  priority: number;
}

class MultiSourceExchangeRateService {
  private cache: Map<Currency, ExchangeRate> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // API endpoints
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private readonly EXCHANGERATE_API = 'https://api.exchangerate-api.com/v4/latest';

  /**
   * Get current exchange rate for currency to NGN
   */
  async getRate(currency: Currency): Promise<number> {
    if (currency === Currency.NGN) return 1;

    const cached = this.cache.get(currency);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION_MS) {
      console.log(`[ExchangeRate] Using cached ${currency} rate from ${cached.source}: ₦${cached.rateToNGN / 100}`);
      return cached.rateToNGN;
    }

    // Try to fetch fresh rate
    const rate = await this.fetchFromMultipleSources(currency);
    
    return rate;
  }

  /**
   * Fetch rate from multiple sources with automatic fallback
   */
  private async fetchFromMultipleSources(currency: Currency): Promise<number> {
    const sources = this.getPrioritizedSources(currency);

    for (const source of sources) {
      try {
        console.log(`[ExchangeRate] Trying ${source.name} for ${currency}...`);
        const rate = await this.fetchFromSource(source.name, currency);
        
        if (rate > 0) {
          // Cache successful fetch
          this.cache.set(currency, {
            currency,
            rateToNGN: rate,
            timestamp: new Date(),
            source: source.name,
          });
          
          console.log(`[ExchangeRate] ✅ ${currency} = ₦${(rate / 100).toFixed(2)} from ${source.name}`);
          return rate;
        }
      } catch (error: any) {
        console.log(`[ExchangeRate] ❌ ${source.name} failed: ${error.message}`);
        continue; // Try next source
      }
    }

    // All sources failed - check for manual override in .env
    const manualRate = this.getManualRate(currency);
    if (manualRate) {
      console.log(`[ExchangeRate] ⚠️  Using manual rate from .env for ${currency}: ₦${manualRate / 100}`);
      this.cache.set(currency, {
        currency,
        rateToNGN: manualRate,
        timestamp: new Date(),
        source: 'manual-override',
      });
      return manualRate;
    }

    throw new Error(`Failed to fetch ${currency} rate from all sources. Please check internet connection or configure manual rates in .env`);
  }

  /**
   * Get prioritized list of data sources for currency
   */
  private getPrioritizedSources(currency: Currency): PriceSource[] {
    if (currency === Currency.ADA) {
      return [
        { name: 'coingecko', priority: 1 },
        { name: 'coinmarketcap', priority: 2 },
        // { name: 'charli3', priority: 3 }, // TODO: Implement Cardano on-chain oracle
      ];
    } else if (currency === Currency.USDM) {
      // USDM is 1:1 with USD, just need USD/NGN
      return [
        { name: 'exchangerate-api', priority: 1 },
        { name: 'fixer', priority: 2 },
        // { name: 'charli3', priority: 3 }, // TODO: Implement
      ];
    }
    return [];
  }

  /**
   * Fetch from specific source
   */
  private async fetchFromSource(source: string, currency: Currency): Promise<number> {
    switch (source) {
      case 'coingecko':
        return await this.fetchFromCoinGecko(currency);
      
      case 'coinmarketcap':
        return await this.fetchFromCoinMarketCap(currency);
      
      case 'exchangerate-api':
        return await this.fetchUsdNgnFromExchangeRateApi();
      
      case 'fixer':
        return await this.fetchUsdNgnFromFixer();
      
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  /**
   * Fetch ADA price from CoinGecko (free, no API key needed)
   */
  private async fetchFromCoinGecko(currency: Currency): Promise<number> {
    if (currency !== Currency.ADA) {
      throw new Error('CoinGecko only supports ADA in this service');
    }

    // Get ADA price in USD
    const response = await fetch(
      `${this.COINGECKO_API}/simple/price?ids=cardano&vs_currencies=usd`,
      { signal: AbortSignal.timeout(10000) } // 10 second timeout
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const adaUsd = data.cardano?.usd;

    if (!adaUsd || typeof adaUsd !== 'number') {
      throw new Error('ADA price not found in CoinGecko response');
    }

    console.log(`[ExchangeRate] CoinGecko: 1 ADA = $${adaUsd.toFixed(4)} USD`);

    // Get USD/NGN rate
    const usdNgn = await this.fetchUsdNgnRate();

    // Calculate ADA/NGN
    const adaNgn = adaUsd * usdNgn;
    return Math.floor(adaNgn * 100); // Convert to kobo
  }

  /**
   * Fetch ADA price from CoinMarketCap (requires API key)
   */
  private async fetchFromCoinMarketCap(currency: Currency): Promise<number> {
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    if (!apiKey) {
      throw new Error('COINMARKETCAP_API_KEY not configured in .env');
    }

    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ADA',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCap API returned ${response.status}`);
    }

    const data = await response.json();
    const adaUsd = data.data?.ADA?.quote?.USD?.price;

    if (!adaUsd) {
      throw new Error('ADA price not found in CoinMarketCap response');
    }

    console.log(`[ExchangeRate] CoinMarketCap: 1 ADA = $${adaUsd.toFixed(4)} USD`);

    const usdNgn = await this.fetchUsdNgnRate();
    const adaNgn = adaUsd * usdNgn;
    return Math.floor(adaNgn * 100);
  }

  /**
   * Fetch USD/NGN rate from ExchangeRate-API (free tier, 1500 requests/month)
   */
  private async fetchUsdNgnFromExchangeRateApi(): Promise<number> {
    const response = await fetch(
      `${this.EXCHANGERATE_API}/USD`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`ExchangeRate-API returned ${response.status}`);
    }

    const data = await response.json();
    const usdNgn = data.rates?.NGN;

    if (!usdNgn || typeof usdNgn !== 'number') {
      throw new Error('NGN rate not found in ExchangeRate-API response');
    }

    console.log(`[ExchangeRate] ExchangeRate-API: 1 USD = ₦${usdNgn.toFixed(2)} NGN`);
    return Math.floor(usdNgn * 100); // Convert to kobo
  }

  /**
   * Fetch USD/NGN rate from Fixer.io (requires API key)
   */
  private async fetchUsdNgnFromFixer(): Promise<number> {
    const apiKey = process.env.FIXER_API_KEY;
    if (!apiKey) {
      throw new Error('FIXER_API_KEY not configured in .env');
    }

    const response = await fetch(
      `http://data.fixer.io/api/latest?access_key=${apiKey}&base=USD&symbols=NGN`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`Fixer API returned ${response.status}`);
    }

    const data = await response.json();
    const usdNgn = data.rates?.NGN;

    if (!usdNgn) {
      throw new Error('NGN rate not found in Fixer response');
    }

    console.log(`[ExchangeRate] Fixer: 1 USD = ₦${usdNgn.toFixed(2)} NGN`);
    return Math.floor(usdNgn * 100);
  }

  /**
   * Get USD/NGN rate (helper for ADA conversion)
   */
  private async fetchUsdNgnRate(): Promise<number> {
    try {
      const response = await fetch(
        `${this.EXCHANGERATE_API}/USD`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) throw new Error('API failed');
      
      const data = await response.json();
      const rate = data.rates?.NGN;
      
      if (!rate || typeof rate !== 'number') {
        throw new Error('NGN rate not found');
      }
      
      console.log(`[ExchangeRate] 1 USD = ₦${rate.toFixed(2)} NGN`);
      return rate;
    } catch (error: any) {
      console.log(`[ExchangeRate] USD/NGN fetch failed: ${error.message}, using manual override`);
      const manualRate = parseFloat(process.env.USD_NGN_RATE || '1900');
      console.log(`[ExchangeRate] Manual USD/NGN rate: ₦${manualRate}`);
      return manualRate;
    }
  }

  /**
   * Get manual rate override from .env
   */
  private getManualRate(currency: Currency): number | null {
    if (currency === Currency.ADA) {
      const rate = process.env.ADA_NGN_RATE;
      if (rate) {
        const rateNum = parseFloat(rate);
        console.log(`[ExchangeRate] Manual ADA_NGN_RATE from .env: ₦${rateNum}`);
        return rateNum * 100; // Convert to kobo
      }
    } else if (currency === Currency.USDM) {
      const rate = process.env.USD_NGN_RATE;
      if (rate) {
        const rateNum = parseFloat(rate);
        console.log(`[ExchangeRate] Manual USD_NGN_RATE from .env: ₦${rateNum} (for USDM)`);
        return rateNum * 100; // Convert to kobo
      }
    }
    return null;
  }

  /**
   * Convert amount from one currency to NGN
   * 
   * Example: 5 ADA (5,000,000 lovelace) → NGN
   * If 1 ADA = ₦665 (66,500 kobo)
   * Result = (5,000,000 × 66,500) / 1,000,000 = 332,500 kobo (₦3,325)
   */
  async convertToNGN(amount: bigint, fromCurrency: Currency): Promise<bigint> {
    if (fromCurrency === Currency.NGN) return amount;

    const rate = await this.getRate(fromCurrency);
    return (amount * BigInt(Math.floor(rate))) / BigInt(1000000);
  }

  /**
   * Convert amount from NGN to another currency
   * 
   * Example: 332,500 kobo (₦3,325) → ADA
   * If 1 ADA = ₦665 (66,500 kobo)
   * Result = (332,500 × 1,000,000) / 66,500 = 5,000,000 lovelace (5 ADA)
   */
  async convertFromNGN(amountNGN: bigint, toCurrency: Currency): Promise<bigint> {
    if (toCurrency === Currency.NGN) return amountNGN;

    const rate = await this.getRate(toCurrency);
    return (amountNGN * BigInt(1000000)) / BigInt(Math.floor(rate));
  }

  /**
   * Clear rate cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ExchangeRate] Cache cleared');
  }

  /**
   * Get all cached rates with source information
   */
  getCachedRates(): Map<Currency, ExchangeRate> {
    return new Map(this.cache);
  }

  /**
   * Get rate with source information (which API provided it)
   */
  async getRateWithSource(currency: Currency): Promise<ExchangeRate | null> {
    await this.getRate(currency); // Ensure fresh rate
    return this.cache.get(currency) || null;
  }
}

export const exchangeRateService = new MultiSourceExchangeRateService();
