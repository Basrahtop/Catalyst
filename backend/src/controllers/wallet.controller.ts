import { Request, Response } from 'express';
// --- 1. Import all correct Enums from @prisma/client ---
import { 
  PrismaClient, 
  TransactionType, 
  TransactionStatus 
} from '@prisma/client';

const prisma = new PrismaClient();

// This is our "Platform" user for internal fees
const PLATFORM_REVENUE_EMAIL = 'platform-revenue@catalyst.com';

// --- GET /api/wallet/balance ---
export const getMyBalance = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId },
    });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }
    res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- GET /api/wallet/transactions ---
// --- THIS IS THE NEW FUNCTION (Step 1) ---
export const getTransactions = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    // Find all transactions where I am Sender OR Recipient
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ]
      },
      // We include details so we can show names (e.g. "Sent to Tunde")
      include: {
        sender: {
          select: { 
            firstName: true, 
            lastName: true, 
            email: true,
            sme: { select: { businessName: true } } // If it's an SME
          }
        },
        recipient: {
          select: { 
            firstName: true, 
            lastName: true, 
            email: true,
            sme: { select: { businessName: true } }
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Newest first
      }
    });

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
// --- END OF NEW FUNCTION ---


// --- POST /api/wallet/deposit ---
export const depositFunds = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { amount } = req.body;

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the user's wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 2. Find the platform's user (to be the "sender")
      const platformUser = await tx.user.findUniqueOrThrow({
        where: { email: PLATFORM_REVENUE_EMAIL }
      });

      // 3. Create a "ledger" record
      await tx.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          notes: 'User self-deposit (simulation)',
          senderId: platformUser.id, 
          recipientId: userId,      
        },
      });

      return updatedWallet;
    });

    res.status(200).json({
      message: 'Deposit successful',
      newBalance: result.balance,
    });

  } catch (error) {
    console.error('Error depositing funds:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- POST /api/wallet/transfer ---
export const transferFunds = async (req: Request, res: Response) => {
  const senderId = req.userId;
  const { recipientEmail, amount, note } = req.body;

  if (!senderId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!recipientEmail || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Recipient email and a valid amount are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find Sender
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderId },
      });
      if (!senderWallet) { throw new Error('Your wallet was not found.'); }
      if (senderWallet.balance < amount) { throw new Error('Insufficient funds.'); }
      
      // 2. Find Recipient
      const recipientUser = await tx.user.findUnique({
        where: { email: recipientEmail },
        include: { wallet: true }
      });
      if (!recipientUser || !recipientUser.wallet) {
        throw new Error('Recipient not found on the platform.');
      }
      if (recipientUser.id === senderId) {
        throw new Error('You cannot send money to yourself.');
      }

      // 3. Perform Transfer
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amount } },
      });
      
      await tx.wallet.update({
        where: { userId: recipientUser.id },
        data: { balance: { increment: amount } },
      });

      // 4. Create "Ledger" Record
      const newTransaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          notes: note || 'Wallet Transfer',
          senderId: senderId,
          recipientId: recipientUser.id,
        },
      });

      return newTransaction;
    });

    res.status(201).json({
      message: 'Transfer successful!',
      transaction: result,
    });

  } catch (error: any) {
    console.error("Error during transfer:", error);
    res.status(400).json({ error: error.message || 'Transfer failed.' });
  }
};

// --- POST /api/wallet/withdraw ---
export const withdrawFunds = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { amount, bankAccountNumber, bankName } = req.body;

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }
  if (!bankAccountNumber || !bankName) {
    return res.status(400).json({ error: 'Bank account details are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check user's wallet balance
      const userWallet = await tx.wallet.findUnique({
        where: { userId: userId },
      });
      
      if (!userWallet) {
        throw new Error('Wallet not found.');
      }
      if (userWallet.balance < amount) {
        throw new Error('Insufficient funds.');
      }

      // 2. Deduct from user's wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // 3. Find the platform user (to be the "recipient" of withdrawal)
      const platformUser = await tx.user.findUniqueOrThrow({
        where: { email: PLATFORM_REVENUE_EMAIL }
      });

      // 4. Create a "ledger" record
      await tx.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          notes: `Withdrawal to ${bankName} - ${bankAccountNumber}`,
          senderId: userId,
          recipientId: platformUser.id,
        },
      });

      return updatedWallet;
    });

    res.status(200).json({
      message: 'Withdrawal successful. Funds will be transferred to your bank account.',
      newBalance: result.balance,
    });

  } catch (error: any) {
    console.error('Error withdrawing funds:', error);
    res.status(400).json({ error: error.message || 'Withdrawal failed.' });
  }
};