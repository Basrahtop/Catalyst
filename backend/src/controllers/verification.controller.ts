// src/controllers/verification.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { recalculatePlatformTrust } from '../services/reputation.service';


const prisma = new PrismaClient();

// This is our *simulated* 3rd-party KYC check
const simulateKYCCheck = (value: string): Promise<'VERIFIED' | 'FAILED'> => {
  return new Promise((resolve) => {
    // Wait 2-3 seconds to feel like a real API call
    setTimeout(() => {
      // Our "test" logic: if it's not empty and has "123", it passes.
      if (value && value.includes('123')) {
        resolve('VERIFIED');
      } else {
        resolve('FAILED');
      }
    }, 2500);
  });
};

// --- POST /api/verification/submit-nin ---
export const submitNIN = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { nin } = req.body;

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!nin) {
    return res.status(400).json({ error: 'NIN is required.' });
  }

  try {
    // 1. Set status to 'PENDING' immediately
    const verification = await prisma.verification.update({
      where: { userId: userId },
      data: { ninStatus: 'PENDING' },
    });

    // 2. Send an immediate "we're working on it" response
    res.status(202).json({ 
      message: 'NIN submitted. Verification is in progress.',
      status: 'PENDING'
    });

    // 3. --- Run the "background job" ---
    // (We don't 'await' this. We let it run in the background)
    (async () => {
      const result = await simulateKYCCheck(nin);
      
      // 4. Update the DB with the final result
      await prisma.verification.update({
        where: { userId: userId },
        data: { ninStatus: result },
        
      });

if (result === 'VERIFIED') {
    await recalculatePlatformTrust(userId);
  }

      console.log(`KYC Update for ${userId}: NIN status set to ${result}`);
    })();

  } catch (error) {
    console.error("Error submitting NIN:", error);
    // Note: The user already got a 202 response, so we just log the error.
  }
};

// You can add more functions here following the same pattern:
// export const submitBVN = async (req: Request, res: Response) => { ... }
// export const submitPassport = async (req: Request, res: Response) => { ... }