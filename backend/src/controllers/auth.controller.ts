import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// --- These are the *correct* imports for this file ---
import { sendVerificationEmail, userProfileSelect } from '../utils'; 
import { recalculatePlatformTrust } from '../services/reputation.service';

const prisma = new PrismaClient();

// --- 1. Register ---
export const register = async (req: Request, res: Response) => {
  const { email, password, businessName } = req.body;

  if (!email || !password || !businessName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword, // <-- Saves the password
        roles: ['SME', 'CUSTOMER'],
        isEmailVerified: false, 
        emailVerificationToken: emailVerificationToken, 
        
        sme: {
          create: {
            businessName: businessName,
          },
        },
        
        wallet: {
          create: {
            balanceNGN: 0,
          },
        },
        
        verification: {
          create: {}, 
        },
      },
      select: userProfileSelect, // Use our "golden" blueprint
    });

    sendVerificationEmail(user.email, emailVerificationToken)
      .catch(err => console.error("Error sending verification email:", err));

    // Convert balanceNGN to balance for frontend compatibility
    const userResponse = user?.wallet ? {
      ...user,
      wallet: {
        ...user.wallet,
        balance: Number(user.wallet.balanceNGN),
      }
    } : user;

    // We already selected the safe user, so no need to destructure password
    res.status(201).json({ user: userResponse });

  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'This email is already in use.' });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 2. Login ---
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    // --- THIS IS THE FIX ---
    // 1. We fetch the user *with their password* first
    const userWithPassword = await prisma.user.findUnique({
      where: { email: email }
    });
    
    // 2. We check if they exist
    if (!userWithPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. We compare the password
    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 4. Now, we fetch the "safe" user profile to send back
    const safeUser = await prisma.user.findUnique({
      where: { email: email },
      select: userProfileSelect // Use our "golden" blueprint
    });

    // 5. Create the token
    const token = jwt.sign(
      { userId: safeUser!.id }, // We know safeUser is not null
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    
    // 6. Convert balanceNGN (BigInt) to balance (number) for frontend compatibility
    const userResponse = safeUser?.wallet ? {
      ...safeUser,
      wallet: {
        ...safeUser.wallet,
        balance: Number(safeUser.wallet.balanceNGN), // Convert BigInt to number with 'balance' key
      }
    } : safeUser;
    
    // 7. Send the token and the *safe* user object
    res.status(200).json({ token, user: userResponse });
    // --- END OF FIX ---

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 3. Change Password ---
export const changePassword = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { oldPassword, newPassword } = req.body;

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new passwords are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid old password.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
      },
    });

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 4. Verify Email ---
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query; 

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid verification token.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null, 
      },
    });
    
    // --- HOOK: Recalculate trust score ---
    await recalculatePlatformTrust(user.id);

    res.status(200).send('<h1>Email Verified!</h1><p>Your email has been successfully verified. You can now close this window and log in.</p>');

  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 5. Re-send Verification Email ---
export const sendVerification = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' }); 
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'This email is already verified.' });
    }
    
    const newEmailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: newEmailVerificationToken,
      },
    });
    
    await sendVerificationEmail(user.email, newEmailVerificationToken);
    
    res.status(200).json({ message: 'Verification email sent.' });

  } catch (error: any) {
    console.error("Error resending verification:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 6. Register Investor (Individual or Institutional) ---
export const registerInvestor = async (req: Request, res: Response) => {
  const { 
    email, 
    password, 
    investorType, // 'individual' or 'institution'
    // Individual fields
    firstName,
    lastName,
    nin,
    // Institutional fields
    orgName,
    orgType,
    rcNumber,
    contactPersonName,
    // Common fields
    phone
  } = req.body;

  // Validate required fields
  if (!email || !password || !investorType) {
    return res.status(400).json({ error: 'Email, password, and investor type are required.' });
  }

  if (investorType === 'individual') {
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required for individual investors.' });
    }
  } else if (investorType === 'institution') {
    if (!orgName || !orgType || !contactPersonName) {
      return res.status(400).json({ error: 'Organization name, type, and contact person are required for institutional investors.' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid investor type. Must be "individual" or "institution".' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        roles: ['P2P_LENDER', 'CUSTOMER'], // Assign P2P_LENDER role
        isEmailVerified: false,
        emailVerificationToken: emailVerificationToken,
        
        // Store investor info in user profile
        firstName: investorType === 'individual' ? firstName : contactPersonName,
        lastName: investorType === 'individual' ? lastName : orgName,
        phone: phone || null,
        
        // Create wallet for the investor
        wallet: {
          create: {
            balanceNGN: 0,
          },
        },
        
        // Create verification record
        verification: {
          create: {},
        },
      },
      select: userProfileSelect,
    });

    // Send verification email
    sendVerificationEmail(user.email, emailVerificationToken)
      .catch(err => console.error("Error sending verification email:", err));

    // Convert balanceNGN to balance for frontend compatibility
    const userResponse = user?.wallet ? {
      ...user,
      wallet: {
        ...user.wallet,
        balance: Number(user.wallet.balanceNGN),
      }
    } : user;

    res.status(201).json({ 
      message: 'Investor registration successful. Please check your email to verify your account.',
      user: userResponse 
    });

  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'This email is already in use.' });
    }
    console.error("Investor registration error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- 7. Investor Login (Role-specific) ---
export const loginInvestor = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // 1. Fetch user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { email: email }
    });
    
    // 2. Check if user exists
    if (!userWithPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Check if user has P2P_LENDER or ADMIN role
    if (!userWithPassword.roles.includes('P2P_LENDER') && !userWithPassword.roles.includes('ADMIN')) {
      return res.status(403).json({ error: 'Access denied. This portal is for investors only.' });
    }
    
    // 5. Fetch safe user profile with wallet
    const safeUser = await prisma.user.findUnique({
      where: { email: email },
      select: {
        ...userProfileSelect,
        wallet: {
          select: {
            id: true,
            balanceNGN: true, // Use new field, not deprecated 'balance'
          }
        }
      }
    });

    // Convert BigInt to Number for JSON serialization
    const userResponse = safeUser ? {
      ...safeUser,
      wallet: safeUser.wallet ? {
        id: safeUser.wallet.id,
        balance: Number(safeUser.wallet.balanceNGN) // Keep 'balance' key for frontend compatibility
      } : undefined
    } : null;

    // 6. Create token
    const token = jwt.sign(
      { userId: safeUser!.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    
    // 7. Return token and user with wallet
    res.status(200).json({ token, user: userResponse });

  } catch (error: any) {
    console.error("Investor login error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};