import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// --- FIX: Import the CORRECT service for Products/Reviews ---
import { recalculateSMEPerformance } from '../services/reputation.service';

const prisma = new PrismaClient();

// --- POST /api/products (Create V4 Rich Product) ---
export const createProduct = async (req: Request, res: Response) => {
  const { 
    name, 
    description, 
    price, 
    imageUrl, 
    // V4 Rich Data Fields
    galleryImages, 
    features, 
    specifications, 
    stock, 
    category 
  } = req.body;
  
  const userId = req.userId;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });
  if (!name || !price || !description) {
    return res.status(400).json({ error: 'Missing required fields: name, price, description.' });
  }

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: price * 100, // Store as kobo
        imageUrl: imageUrl || '',
        // --- V4 Fields ---
        galleryImages: galleryImages || [], 
        features: features || [],           
        specifications: specifications || {}, 
        stock: stock ? parseInt(stock) : 1, 
        category: category || 'General',
        // ----------------
        smeId: sme.id,
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: 'Error creating product.' });
  }
};

// --- GET /api/products (Public Marketplace) ---
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && typeof category === 'string' && category !== 'All') {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where: where, 
      include: {
        sme: { select: { businessName: true } },
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'Error fetching products.' });
  }
};

// --- GET /api/products/my-products (SME Dashboard) ---
export const getMyProducts = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const { search } = req.query;
    const where: any = { smeId: sme.id };

    if (search && typeof search === 'string') {
      where.OR = [ 
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const myProducts = await prisma.product.findMany({
      where: where,
      orderBy: { name: 'asc' }
    });

    res.status(200).json(myProducts);
  } catch (error) {
    console.error("Error fetching my products:", error);
    res.status(500).json({ error: 'Error fetching products.' });
  }
};

// --- GET /api/products/:id (Detail Page) ---
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        sme: {
          select: {
            businessName: true,
            user: { select: { platformTrustScore: true } }
          }
        }
      }
    });

    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: 'Error fetching product.' });
  }
};

// --- PATCH /api/products/:id (Update V4 Product) ---
export const updateProduct = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id: productId } = req.params;
  const { 
    name, description, price, imageUrl,
    galleryImages, features, specifications, stock, category
  } = req.body;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.smeId !== sme.id) return res.status(403).json({ error: 'Unauthorized.' });

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name, description, 
        price: price ? price * 100 : undefined,
        imageUrl,
        // V4 Fields
        galleryImages, features, specifications, stock, category
      },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: 'Error updating product.' });
  }
};

// --- DELETE /api/products/:id ---
export const deleteProduct = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id: productId } = req.params;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.smeId !== sme.id) return res.status(403).json({ error: 'Unauthorized.' });
    
    // Delete related data first
    await prisma.review.deleteMany({ where: { productId } });
    await prisma.orderItem.deleteMany({ where: { productId } });

    await prisma.product.delete({ where: { id: productId } });

    res.status(204).send();
  } catch (error: any) {
    if(error.code === 'P2003') { 
      return res.status(400).json({ error: 'Cannot delete product used in orders.' });
    }
    console.error("Error deleting product:", error);
    res.status(500).json({ error: 'Error deleting product.' });
  }
};

// --- POST /api/products/:productId/reviews ---
export const createReview = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });
  if (!rating) return res.status(400).json({ error: 'Rating is required.' });

  try {
    // Check purchase history
    const hasPurchased = await prisma.order.findFirst({
      where: {
        customerId: userId,
        status: 'COMPLETED',
        items: { some: { productId } },
      },
    });
    if (!hasPurchased) return res.status(403).json({ error: 'Verified purchase required.' });

    const existingReview = await prisma.review.findFirst({
      where: { userId, productId },
    });
    if (existingReview) return res.status(400).json({ error: 'Already reviewed.' });

    const newReview = await prisma.review.create({
      data: {
        rating,
        comment: comment || '',
        userId,
        productId,
      },
    });
    
    // --- Update SME Score ---
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      await recalculateSMEPerformance(product.smeId);
    }
    
    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: 'Error creating review.' });
  }
};

// --- PATCH /api/reviews/:id ---
export const updateReview = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id: reviewId } = req.params;
  const { rating, comment } = req.body;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });
  
  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    if (review.userId !== userId) return res.status(403).json({ error: 'Unauthorized.' });

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { rating, comment },
    });
    
    // Update Score
    const product = await prisma.product.findUnique({ where: { id: review.productId } });
    if (product) await recalculateSMEPerformance(product.smeId);

    res.status(200).json(updatedReview);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

// --- DELETE /api/reviews/:id ---
export const deleteReview = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id: reviewId } = req.params;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { product: true } });
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    if (review.userId !== userId) return res.status(403).json({ error: 'Unauthorized.' });

    await prisma.review.delete({ where: { id: reviewId } });

    // Update Score
    if (review.product) await recalculateSMEPerformance(review.product.smeId);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};