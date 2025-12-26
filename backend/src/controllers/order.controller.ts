// src/controllers/order.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { recalculateSMEPerformance } from '../services/reputation.service';


const prisma = new PrismaClient();

// --- Define the expected shape of the cart items from the request ---
interface CartItem {
  productId: string;
  quantity: number;
}

// --- 1. POST /api/orders ---
// Creates a new order for the logged-in CUSTOMER
export const createOrder = async (req: Request, res: Response) => {
  const customerId = req.userId;
  if (!customerId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { cart } = req.body as { cart: CartItem[] };
  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  try {
    const newOrder = await prisma.$transaction(async (tx) => {
      
      const productIds = cart.map(item => item.productId);
      const productsFromDb = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (productsFromDb.length !== productIds.length) {
        throw new Error('One or more products not found.');
      }
      
      const smeId = productsFromDb[0].smeId;
      let total = 0;
      const orderItemsData: any[] = [];

      for (const cartItem of cart) {
        const product = productsFromDb.find(p => p.id === cartItem.productId);
        
        if (!product) {
          throw new Error(`Product ${cartItem.productId} not found during processing.`);
        }
        
        if (product.smeId !== smeId) {
          throw new Error('Cart must contain products from only one SME.');
        }

        const itemPrice = product.price;
        const quantity = cartItem.quantity;
        
        total += itemPrice * quantity;

        orderItemsData.push({
          productId: product.id,
          quantity: quantity,
          price: itemPrice,
        });
      }

      const order = await tx.order.create({
        data: {
          total: total,
          status: 'PENDING',
          customerId: customerId,
          smeId: smeId,
        },
      });

      await tx.orderItem.createMany({
        data: orderItemsData.map(item => ({
          ...item,
          orderId: order.id,
        })),
      });

      return order;
    });

    res.status(201).json(newOrder);

  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: 'Something went wrong while creating the order.' });
  }
}; // <-- This function is now properly closed

// --- 2. PATCH /api/orders/:id/status ---
// Allows an SME to update the status of an order
// This is now separate and at the "top level"
export const updateOrderStatus = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { id: orderId } = req.params;
  const { status } = req.body;

  if (!status || !['SHIPPED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing status. Must be SHIPPED, COMPLETED, or CANCELLED.' });
  }

  try {
    const sme = await prisma.sME.findUnique({
      where: { userId: userId },
    });
    if (!sme) {
      return res.status(403).json({ error: 'No SME profile found for this user.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.smeId !== sme.id) {
      return res.status(403).json({ error: 'You are not authorized to update this order.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status,
      },
    });

    if (status === 'COMPLETED' || status === 'CANCELLED') {
  await recalculateSMEPerformance(sme.id);
}
    // --- (End of hook) ---

    res.status(200).json(updatedOrder);

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}; 


// --- GET /api/orders/my-sme ---
// Gets all orders for the *logged-in SME*
export const getMySmeOrders = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    
    const sme = await prisma.sME.findUnique({
      where: { userId: userId },
    });
    if (!sme) {
      return res.status(403).json({ error: 'No SME profile found for this user.' });
    }

   
    const orders = await prisma.order.findMany({
      where: {
        smeId: sme.id,
      },
      
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', 
      },
    });

    res.status(200).json(orders);

  } catch (error) {
    console.error("Error fetching SME orders:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};