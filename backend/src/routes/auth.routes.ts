// src/routes/auth.routes.ts
import { Router } from 'express';
import { 
  register, 
  login,
  changePassword,
  verifyEmail,
  sendVerification,
  registerInvestor,
  loginInvestor
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware'; // Import our guard

const router = Router();

// --- Public Routes (No auth) ---
router.post('/register', register);
router.post('/register-investor', registerInvestor);
router.post('/login', login);
router.post('/login-investor', loginInvestor); // New investor-specific login
router.get('/verify-email', verifyEmail);

// --- Protected Routes (Must be logged in) ---
router.post('/change-password', authMiddleware, changePassword);
router.post('/send-verification', authMiddleware, sendVerification);

export default router;