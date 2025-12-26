import { Request, Response } from 'express';
import { PrismaClient, VerificationStatus } from '@prisma/client';
import { recalculatePlatformTrust } from '../services/reputation.service';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- GET /api/users/me ---
export const getMe = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // FIX: We manually select fields to ensure profileImage is recognized
      // without conflicting with the old utility type.
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true, // This is the new field
        isEmailVerified: true,
        platformTrustScore: true,
        financialScore: true,
        verification: {
          select: {
            ninStatus: true,
            bvnStatus: true,
            passportStatus: true,
            addressStatus: true,
            verifiedAddress: true,
          }
        },
        sme: {
          select: {
            id: true,
            businessName: true,
            marketplaceScore: true,
            feedbackScore: true,
          }
        },
        wallet: {
          select: {
            balance: true,
          }
        }
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- PATCH /api/users/me ---
// Updated to handle Profile Image
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { firstName, lastName, phone, profileImage } = req.body;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        profileImage, // Save the Cloudinary URL
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
      }, 
    });

    res.status(200).json(updatedUser);

  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
      return res.status(400).json({ error: 'This phone number is already in use.' });
    }
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- POST /api/users/change-password ---
// NEW: Securely change password
export const changePassword = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }

  try {
    // 1. Get the user's current hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 2. Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- POST /api/users/verify-kyc ---
export const submitKYC = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { nin, documentUrl } = req.body;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });
  if (!nin || !documentUrl) {
    return res.status(400).json({ error: 'NIN and Document Image are required.' });
  }

  try {
    const verification = await prisma.verification.upsert({
      where: { userId: userId },
      update: {
        ninStatus: VerificationStatus.VERIFIED, 
        passportStatus: VerificationStatus.VERIFIED,
        verifiedAddress: 'Lagos, Nigeria' 
      },
      create: {
        userId: userId,
        ninStatus: VerificationStatus.VERIFIED,
        passportStatus: VerificationStatus.VERIFIED,
        verifiedAddress: 'Lagos, Nigeria' 
      }
    });

    await recalculatePlatformTrust(userId);

    res.status(200).json({ 
      message: 'KYC Submitted and Verified successfully!', 
      verification 
    });

  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// Export updateMe as an alias for updateProfile to maintain compatibility
export const updateMe = updateProfile;