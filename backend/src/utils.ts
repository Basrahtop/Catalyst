import { Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';

// --- THIS IS OUR "MASTER BLUEPRINT" (userProfileSelect) ---
// It defines exactly what we want to show for a user profile
export const userProfileSelect: Prisma.UserSelect = {
  id: true,
  email: true,
  roles: true,
  firstName: true,
  lastName: true,
  phone: true,
  isEmailVerified: true,
  createdAt: true,
  platformTrustScore: true,
  financialScore: true,
  sme: {
    select: {
      id: true,
      businessName: true,
      marketplaceScore: true,
      feedbackScore: true,
      userId: true,
    },
  },
  wallet: {
    select: {
      id: true,
      balanceNGN: true,
      userId: true,
    },
  },
  verification: {
    select: {
      id: true,
      ninStatus: true,
      bvnStatus: true,
      passportStatus: true,
      addressStatus: true,
      verifiedAddress: true,
      userId: true,
    },
  },
};
// --- END OF MASTER BLUEPRINT ---


// --- THIS IS THE NEW GMAIL TRANSPORTER ---
// We create one "transporter" that logs in to Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use the built-in Gmail service
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER, // From your .env file
    pass: process.env.EMAIL_PASS, // The 16-digit App Password from your .env file
  },
});
// --- END OF GMAIL TRANSPORTER ---


// This function will send our verification email
export async function sendVerificationEmail(email: string, token: string) {
  
  // The link points to our running API on port 8000
  const verificationLink = `http://localhost:8000/api/auth/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: `"Catalyst App" <${process.env.EMAIL_USER}>`, // Sends from your Gmail
    to: email, // The new user's email
    subject: 'Welcome to Catalyst! Please Verify Your Email',
    html: `
      <b>Welcome to Catalyst!</b>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
    `,
  });

  console.log('Message sent successfully: %s', info.messageId);
  // This is a REAL email, so there is no "Ethereal Preview URL"
}

