"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { 
  Loader2, ShoppingCart, Star, Heart, ArrowLeft, 
  ShieldCheck, Truck, RefreshCw, CreditCard, Check, AlertTriangle, Box 
} from 'lucide-react';

// --- 1. V4.0 Interface ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  // New Rich Fields
  galleryImages: string[];
  features: string[];
  specifications: Record<string, string>; // JSON object
  stock: number;
  category: string;
  sme: {
    businessName: string;
  };
}

const formatNaira = (amount: number) => 
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount / 100);

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- New State for Gallery ---
  const [activeImage, setActiveImage] = useState('');

  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const id = params.id as string;

  // 2. Fetch Product
  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const response = await api.get<Product>(`/products/${id}`);
        setProduct(response.data);
        // Set initial active image
        setActiveImage(response.data.imageUrl);
      } catch (err) {
        setError('Product not found.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchProduct();
  }, [id]);

  // 3. Loading / Error States
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <button 
              onClick={() => router.push('/')}
              className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Combine main image + gallery for the carousel
  const allImages = [product.imageUrl, ...(product.galleryImages || [])].filter(Boolean);
  
  // Stock Logic
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  // 4. The V4.0 Vibrant UI
  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-6">
          <button onClick={() => router.push('/')} className="hover:text-indigo-600">Home</button>
          <span className="mx-2">/</span>
          <span className="font-medium text-gray-700">{product.category}</span>
          <span className="mx-2">/</span>
          <span className="truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            
            {/* --- LEFT: INTERACTIVE GALLERY --- */}
            <div className="p-6 bg-gray-50 flex flex-col">
              {/* Main Stage */}
              <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-sm mb-4 group">
                <img 
                  src={activeImage || 'https://placehold.co/600x600/e2e8f0/94a3b8?text=No+Image'} 
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                />
                <button className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur rounded-full shadow-sm hover:text-red-500 hover:bg-white transition-all z-10">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === img ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt={`View ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* --- RIGHT: RICH DETAILS --- */}
            <div className="p-8 md:p-12 flex flex-col h-full relative">
              
              {/* Seller & Stock Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                    Official Store
                  </span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <ShieldCheck className="w-4 h-4 text-green-500 mr-1" />
                    {product.sme.businessName}
                  </span>
                </div>
                
                {/* Dynamic Stock Badge */}
                {isOutOfStock ? (
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                     Out of Stock
                   </span>
                ) : isLowStock ? (
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                     Only {product.stock} Left!
                   </span>
                ) : (
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                     In Stock
                   </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center space-x-1 mb-6">
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <span className="text-sm text-gray-500 ml-2">(128 verified reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {formatNaira(product.price)}
                  </span>
                  <span className="text-xl text-gray-400 line-through font-medium">
                    {formatNaira(product.price * 1.2)}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1 font-medium">
                  Best Price Guaranteed
                </p>
              </div>

              {/* --- KEY FEATURES (New V4 Section) --- */}
              {product.features && product.features.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Key Highlights</h3>
                  <ul className="space-y-2">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trust Signals */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-xs text-gray-500">
                <div className="flex items-center">
                  <Truck className="w-4 h-4 mr-2 text-indigo-500" />
                  Fast Delivery
                </div>
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 text-indigo-500" />
                  7-Day Return Policy
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto pt-6 border-t border-gray-100">
                <button 
                  disabled={isOutOfStock}
                  onClick={() => addToCart({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    smeId: product.sme.businessName,
                    quantity: 1
                  })}
                  className={`flex items-center justify-center py-4 px-6 rounded-xl border-2 font-bold transition-all ${
                    isOutOfStock 
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </button>
                <button 
                  disabled={isOutOfStock}
                  className={`flex items-center justify-center py-4 px-6 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-white cursor-not-allowed shadow-none'
                      : 'bg-gray-900 text-white hover:bg-indigo-600 hover:shadow-indigo-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
                </button>
              </div>

            </div>
          </div>

          {/* --- BOTTOM SECTION: DESCRIPTION & SPECS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-gray-100">
            
            {/* Description Column */}
            <div className="lg:col-span-2 p-8 md:p-12 border-r border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Product Description</h3>
              <div className="prose prose-indigo text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* Specifications Column (V4 Data) */}
            <div className="p-8 md:p-12 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Box className="w-5 h-5 mr-2 text-indigo-600" />
                Specifications
              </h3>
              
              {product.specifications && Object.keys(product.specifications).length > 0 ? (
                <div className="space-y-0 rounded-lg border border-gray-200 overflow-hidden">
                  {Object.entries(product.specifications).map(([key, value], index) => (
                    <div key={key} className={`flex justify-between p-3 text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <span className="font-medium text-gray-600">{key}</span>
                      <span className="text-gray-900 font-semibold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No technical specifications listed.</p>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}