/**
 * Exchange Rate Service
 * 
 * Provides real-time exchange rates between currencies (NGN, ADA, USDM)
 * with caching to reduce API calls and improve performance.
 */

import { Currency } from '@prisma/client';

interface ExchangeRate {
  currency: Currency;
  rateToNGN: number; // How many kobo = 1 unit
  timestamp: Date;
}

class ExchangeRateService {
  private cache: Map<Currency, ExchangeRate> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current exchange rate for currency to NGN
   * 
   * Examples:
   * - 1 ADA = 800,000 kobo (₦8,000 per ADA)
   * - 1 USDM = 160,000 kobo (₦1,600 per USDM, assuming 1 USDM = 1 USD)
   * 
   * @param currency - Source currency (NGN, ADA, or USDM)
   * @returns Rate in kobo per 1 unit of currency
   */
  async getRate(currency: Currency): Promise<number> {
    if (currency === Currency.NGN) return 1;

    const cached = this.cache.get(currency);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION_MS) {
      return cached.rateToNGN;
    }

    // Fetch from oracle (Binance API as primary, Charli3 for future)
    const rate = await this.fetchFromOracle(currency);
    this.cache.set(currency, { currency, rateToNGN: rate, timestamp: new Date() });
    
    console.log(`[ExchangeRate] Updated rate for ${currency}: ₦${rate / 100} (${rate} kobo)`);
    return rate;
  }

  /**
   * Convert amount from one currency to NGN
   * 
   * @param amount - Amount in smallest unit (kobo/lovelace/microUSDM)
   * @param fromCurrency - Source currency
   * @returns Amount in kobo (NGN smallest unit)
   */
  async convertToNGN(amount: bigint, fromCurrency: Currency): Promise<bigint> {
    if (fromCurrency === Currency.NGN) return amount;

    const rate = await this.getRate(fromCurrency);
    
    // Example: 5 ADA (5,000,000 lovelace) → NGN
    // rate = 800,000 kobo per ADA
    // result = (5,000,000 × 800,000) / 1,000,000 = 4,000,000,000 kobo (₦40,000,000)
    return (amount * BigInt(Math.floor(rate))) / 1000000n;
  }

  /**
   * Convert amount from NGN to another currency
   * 
   * @param amountNGN - Amount in kobo
   * @param toCurrency - Target currency
   * @returns Amount in smallest unit of target currency
   */
  async convertFromNGN(amountNGN: bigint, toCurrency: Currency): Promise<bigint> {
    if (toCurrency === Currency.NGN) return amountNGN;

    const rate = await this.getRate(toCurrency);
    
    // Example: 4,000,000,000 kobo → ADA
    // rate = 800,000 kobo per ADA
    // result = (4,000,000,000 × 1,000,000) / 800,000 = 5,000,000 lovelace (5 ADA)
    return (amountNGN * 1000000n) / BigInt(Math.floor(rate));
  }

  /**
   * Fetch exchange rate from external oracle/API
   * 
   * @param currency - Currency to fetch rate for
   * @returns Rate in kobo per 1 unit
   */
  private async fetchFromOracle(currency: Currency): Promise<number> {
    // TODO: Integrate with Charli3 oracle on Cardano for production
    // For now, use Binance API as backup
    
    if (currency === Currency.ADA) {
      try {
        // Fetch ADA/NGN price from Binance (if available)
        // If not available, use ADA/USD × USD/NGN
        const adaUsd = await this.fetchBinancePrice('ADAUSDT');
        const usdNgn = await this.fetchBinancePrice('USDNGN') || 1600; // Default: ₦1,600 per USD
        
        const adaNgn = adaUsd * usdNgn;
        return Math.floor(adaNgn * 100); // Convert to kobo
      } catch (error) {
        console.error('[ExchangeRate] Error fetching ADA rate:', error);
        // Fallback: ₦8,000 per ADA (800,000 kobo)
        return 800000;
      }
    }
    
    if (currency === Currency.USDM) {
      try {
        // USDM is 1:1 with USD, fetch USD/NGN
        const usdNgn = await this.fetchBinancePrice('USDNGN') || 1600;
        return Math.floor(usdNgn * 100); // Convert to kobo
      } catch (error) {
        console.error('[ExchangeRate] Error fetching USDM rate:', error);
        // Fallback: ₦1,600 per USDM (160,000 kobo)
        return 160000;
      }
    }
    
    throw new Error(`Unsupported currency: ${currency}`);
  }

  /**
   * Fetch price from Binance API
   * 
   * @param symbol - Trading pair symbol (e.g., 'ADAUSDT', 'USDNGN')
   * @returns Price as number
   */
  private async fetchBinancePrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
      );
      
      if (!response.ok) {
        throw new Error(`Binance API returned ${response.status}`);
      }
      
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error(`[ExchangeRate] Failed to fetch ${symbol} from Binance:`, error);
      throw error;
    }
  }

  /**
   * Clear rate cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ExchangeRate] Cache cleared');
  }

  /**
   * Get all cached rates
   */
  getCachedRates(): Map<Currency, ExchangeRate> {
    return new Map(this.cache);
  }
}

export const exchangeRateService = new ExchangeRateService();
