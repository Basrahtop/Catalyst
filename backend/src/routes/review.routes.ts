// src/routes/review.routes.ts
import { Router } from 'express';
// 1. Import our new functions (from the *product* controller, that's ok)
import { 
  updateReview, 
  deleteReview 
} from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware'; // Import our "security guard"

const router = Router();

// --- Define Review Routes ---

// PATCH /api/reviews/:id (Edit a review)
// This route is "protected".
router.patch('/:id', authMiddleware, updateReview);

// DELETE /api/reviews/:id (Delete a review)
// This route is "protected".
router.delete('/:id', authMiddleware, deleteReview);

export default router;