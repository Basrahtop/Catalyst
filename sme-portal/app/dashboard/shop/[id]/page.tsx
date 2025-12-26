"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import EditProductForm from '@/components/EditProductForm';
// --- END OF FIX ---
import { Loader2, AlertCircle, ArrowLeft, Star, ShoppingCart, Edit, CreditCard } from 'lucide-react';

// (Helper function is unchanged)
const formatNaira = (amountInKobo: number) => {
  if (isNaN(amountInKobo)) {
    return "Invalid Price";
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

export default function ProductDetailPage() {
  const [product, setProduct] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth(); // Get the logged-in user
  
  const id = params.id as string;

  const fetchProduct = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await api.get<any>(`/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      setError('Could not load this product.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleProductUpdate = () => {
    fetchProduct(); // Re-fetch the product
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-3 text-red-600">{error}</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-xl text-gray-500">Product not found.</p>
      </div>
    );
  }
  
  // --- This is our "Smart" logic ---
  // We check if the logged-in user's SME ID matches the product's SME ID
  const isOwner = user?.sme?.id === product.smeId;

  return (
    <div className="max-w-6xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Shop
      </button>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          
          {/* --- Column 1: Image (Unchanged) --- */}
          <div className="p-4 sm:p-6">
            <img 
              src={product.imageUrl || 'https://placehold.co/600x800/e2e8f0/94a3b8?text=No+Image'}
              alt={product.name}
              className="w-full h-auto md:h-[500px] object-cover rounded-2xl shadow-lg"
            />
            <div className="mt-4 flex space-x-3 overflow-x-auto pb-2">
              <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-indigo-500 flex-shrink-0 cursor-pointer"></div>
              <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-transparent hover:border-indigo-500 transition-all flex-shrink-0 cursor-pointer"></div>
              <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-transparent hover:border-indigo-500 transition-all flex-shrink-0 cursor-pointer"></div>
            </div>
          </div>

          {/* --- Column 2: Product Details (Unchanged) --- */}
          <div className="p-6 md:p-8 flex flex-col justify-center">
            <span className="text-sm font-medium text-indigo-600">
              Sold by: {product.sme.businessName}
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mt-2">{product.name}</h1>
            
            <p className="text-4xl font-bold text-indigo-600 mt-4">
              {formatNaira(product.price)}
            </p>
            
            <div className="flex items-center mt-4">
              <div className="flex text-yellow-400">
                <Star className="w-5 h-5" /> <Star className="w-5 h-5" /> <Star className="w-5 h-5" /> <Star className="w-5 h-5" /> <Star className="w-5 h-5 text-gray-300" />
              </div>
              <span className="ml-2 text-sm text-gray-500">(12 Reviews)</span>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              <p className="mt-2 text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>
            
            {/* --- 2. THIS IS THE "SMART BUTTON" FIX --- */}
            <div className="mt-8">
              {isOwner ? (
                // --- A) If OWNER, show "Edit Product" ---
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full flex items-center justify-center py-3 px-6 rounded-lg
                             bg-transparent border-2 border-indigo-600
                             text-indigo-600 font-semibold
                             hover:bg-indigo-50
                             transition-all duration-300"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Your Product
                </button>
              ) : (
                // --- B) If CUSTOMER, show "Buy Now" and "Add to Cart" ---
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
                  <button 
                    className="flex-1 flex items-center justify-center py-3 px-6 rounded-lg
                               bg-gradient-to-r from-indigo-600 to-blue-600 
                               text-white font-semibold
                               hover:from-indigo-700 hover:to-blue-700
                               transition-all duration-300 ease-in-out
                               hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Buy Now
                  </button>
                  <button 
                    className="flex-1 flex items-center justify-center py-3 px-6 rounded-lg
                               bg-transparent border-2 border-indigo-600
                               text-indigo-600 font-semibold
                               hover:bg-indigo-50
                               transition-all duration-300"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </button>
                </div>
              )}
            </div>
            {/* --- END OF FIX --- */}

          </div>
        </div>
      </div>

      {/* --- The "Edit Product" Modal (Only appears if 'isOwner' is true) --- */}
      {isOwner && (
        <Modal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          title="Edit Product"
        >
          <EditProductForm 
            product={product} 
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleProductUpdate}
          />
        </Modal>
      )}
    </div>
  );
}