import { Router, Request, Response } from 'express';
import { exchangeRateService } from '../services/exchange-rate.service';
import { Currency } from '@prisma/client';

const router = Router();

/**
 * GET /api/exchange-rates
 * Get current exchange rates for all supported currencies
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rates = {
      NGN: 1, // Base currency
      ADA: await exchangeRateService.getRate(Currency.ADA),
      USDM: await exchangeRateService.getRate(Currency.USDM),
    };

    res.json(rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

/**
 * GET /api/exchange-rates/:currency
 * Get exchange rate for a specific currency
 */
router.get('/:currency', async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;

    if (!Object.values(Currency).includes(currency as Currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    if (currency === Currency.NGN) {
      return res.json({ currency: 'NGN', rate: 1 });
    }

    const rate = await exchangeRateService.getRate(currency as Currency);
    res.json({ currency, rate });
  } catch (error) {
    console.error(`Error fetching rate for ${req.params.currency}:`, error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

/**
 * POST /api/exchange-rates/convert
 * Convert amount between currencies
 */
router.post('/convert', async (req: Request, res: Response) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (
      !Object.values(Currency).includes(fromCurrency) ||
      !Object.values(Currency).includes(toCurrency)
    ) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    let convertedAmount: bigint;

    if (fromCurrency === toCurrency) {
      convertedAmount = BigInt(amount);
    } else if (toCurrency === Currency.NGN) {
      convertedAmount = await exchangeRateService.convertToNGN(
        BigInt(amount),
        fromCurrency
      );
    } else if (fromCurrency === Currency.NGN) {
      convertedAmount = await exchangeRateService.convertFromNGN(
        BigInt(amount),
        toCurrency
      );
    } else {
      // Convert through NGN as intermediary
      const inNGN = await exchangeRateService.convertToNGN(
        BigInt(amount),
        fromCurrency
      );
      convertedAmount = await exchangeRateService.convertFromNGN(
        inNGN,
        toCurrency
      );
    }

    res.json({
      fromCurrency,
      toCurrency,
      amount: amount.toString(),
      convertedAmount: convertedAmount.toString(),
    });
  } catch (error) {
    console.error('Error converting currencies:', error);
    res.status(500).json({ error: 'Failed to convert currencies' });
  }
});

export default router;
