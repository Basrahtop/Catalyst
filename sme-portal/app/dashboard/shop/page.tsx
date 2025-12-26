"use client";
import React, { useState, useEffect, useCallback } from 'react';
// --- FIX: Use the '@/' alias ---
import api from '@/lib/api';
import Modal from '@/components/Modal';
import AddProductForm from '@/components/AddProductForm';
// --- END FIX ---
import { Loader2, AlertCircle, Plus, Search, Package, Trash2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number; 
  imageUrl: string;
  description: string;
}

const formatNaira = (amountInKobo: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

export default function MyShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce logic
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const fetchMyProducts = useCallback(async (search: string = '') => {
    setIsLoading(true);
    try {
      const url = search
        ? `/products/my-products?search=${encodeURIComponent(search)}`
        : '/products/my-products';
      const response = await api.get<Product[]>(url);
      setProducts(response.data);
    } catch (err) {
      setError('Could not load your products.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProducts(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchMyProducts]);
  
  const handleProductAdded = () => {
    fetchMyProducts(debouncedSearchTerm); 
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return; 
    setIsDeleting(true);
    setDeleteError('');

    try {
      await api.delete(`/products/${productToDelete.id}`);
      setIsDeleting(false);
      setProductToDelete(null); // Close the modal
      fetchMyProducts(debouncedSearchTerm); // Refresh the list
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      setDeleteError('Failed to delete product. Please try again.');
    }
  };

  const renderProductList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center h-64">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-3 text-red-600">{error}</span>
        </div>
      );
    }
    if (products.length === 0) {
      if (debouncedSearchTerm) {
        return (
          <div className="flex flex-col justify-center items-center h-64 text-center p-6 bg-white rounded-2xl shadow-lg">
            <Search className="w-16 h-16 text-gray-400" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">No products found</h3>
          </div>
        );
      }
      return (
        <div className="flex flex-col justify-center items-center h-64 text-center p-6 bg-white rounded-2xl shadow-lg">
          <Package className="w-16 h-16 text-indigo-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">Your shop is empty</h3>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div 
            key={product.id}
            className="relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all 
                       duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
          >
            <button
              onClick={() => {
                setDeleteError('');
                setProductToDelete(product);
              }}
              className="absolute top-3 right-3 p-1.5 bg-red-100 text-red-600 rounded-full
                         hover:bg-red-200 hover:scale-110 transition-all z-10"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <img 
              src={product.imageUrl || 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image'}
              alt={product.name}
              className="h-64 w-full object-cover"
            />
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
              <p className="text-xl font-bold text-indigo-600 mt-1">{formatNaira(product.price)}</p>
              <p className="mt-2 text-sm text-gray-600 flex-grow line-clamp-2">
                {product.description}
              </p>
              <Link 
                href={`/dashboard/shop/${product.id}`}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                View Details &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Shop</h1>
          <p className="mt-1 text-gray-600">Manage your product inventory.</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center py-2 px-5 rounded-lg
                       bg-gradient-to-r from-indigo-600 to-blue-600 
                       text-white font-semibold
                       hover:from-indigo-700 hover:to-blue-700
                       transition-all duration-300 ease-in-out
                       hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5 mr-2 -ml-1" />
            Add Product
          </button>
        </div>
      </div>

      {/* The Product List */}
      {renderProductList()}
      
      {/* "Add Product" Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Product"
      >
        <AddProductForm 
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleProductAdded}
        />
      </Modal>
      
      {/* "Delete Confirmation" Modal */}
      <Modal 
        isOpen={!!productToDelete} 
        onClose={() => setProductToDelete(null)}
        title="Delete Product"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">
            Are you sure?
          </h3>
          <div className="mt-2 text-sm text-gray-500">
            <p>You are about to delete the product:</p>
            <p className="font-bold text-gray-700">{productToDelete?.name}</p>
            <p className="mt-1">This action cannot be undone.</p>
          </div>

          {deleteError && (
            <p className="mt-3 text-sm text-red-600 font-medium">{deleteError}</p>
          )}
          
          <div className="mt-6 flex justify-center space-x-4">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setProductToDelete(null)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700
                         hover:bg-gray-50 transition-all duration-200
                         disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteProduct}
              className="w-32 flex justify-center py-2 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                         bg-gradient-to-r from-red-600 to-rose-600 
                         hover:from-red-700 hover:to-rose-700
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                         transition-all duration-300
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Yes, Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}