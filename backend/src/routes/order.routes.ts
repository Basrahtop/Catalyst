import { Router } from 'express';
// 1. Import our new function
import { 
  createOrder, 
  updateOrderStatus, 
  getMySmeOrders 
} from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- Define Order Routes ---

// POST /api/orders (Customer creates an order)
router.post('/', authMiddleware, createOrder);

// --- 2. ADD THIS NEW ROUTE ---
// GET /api/orders/my-sme (SME fetches their orders)
// This *must* go before the '/:id/status' route
router.get('/my-sme', authMiddleware, getMySmeOrders);

// PATCH /api/orders/:id/status (SME updates an order)
router.patch('/:id/status', authMiddleware, updateOrderStatus);

export default router;