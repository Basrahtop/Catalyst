import { Router } from 'express';
import { 
  createProduct, 
  getAllProducts, 
  getMyProducts,
  createReview,
  getProductById,
  deleteProduct,
  updateProduct // <-- 1. ADD THIS IMPORT
} from '../controllers/product.controller';

import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
// POST /api/products (Create a product)
router.post('/', authMiddleware, createProduct);

// GET /api/products (Get all products)
router.get('/', getAllProducts);

// ⭐ IMPORTANT: Put specific routes BEFORE generic :id routes
// GET /api/products/my-products (Get current user's products)
router.get('/my-products', authMiddleware, getMyProducts);

// GET /api/products/:id (Get a single product by ID)
router.get('/:id', getProductById);

// POST /api/products/:productId/reviews
router.post('/:productId/reviews', authMiddleware, createReview);

// DELETE /api/products/:id (Delete a product)
router.delete('/:id', authMiddleware, deleteProduct);

// PATCH /api/products/:id (Update a product)
router.patch('/:id', authMiddleware, updateProduct);

export default router;