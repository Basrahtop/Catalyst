"use client";
import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api'; // Go up 3 levels
import { Loader2, AlertCircle, Package, Truck, CheckCircle } from 'lucide-react';

// --- (Interfaces are unchanged) ---
interface OrderItemProduct {
  name: string;
  imageUrl: string | null;
}
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: OrderItemProduct;
}
interface Customer {
  firstName: string | null;
  lastName: string | null;
  email: string;
}
interface Order {
  id: string;
  status: 'PENDING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  total: number;
  createdAt: string;
  items: OrderItem[];
  customer: Customer;
}

const formatNaira = (amountInKobo: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // --- 1. NEW: State to track *which* card is updating ---
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // --- 2. UPDATED: We make fetchSmeOrders a 'useCallback' ---
  const fetchSmeOrders = useCallback(async () => {
    // We only set the *main* page loader on the first load
    // Subsequent fetches will be silent
    if (isLoading) {
      try {
        const response = await api.get<Order[]>('/orders/my-sme');
        setOrders(response.data);
      } catch (err) {
        setError('Could not load your orders.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // This is a "silent" refresh
      try {
        const response = await api.get<Order[]>('/orders/my-sme');
        setOrders(response.data);
      } catch (err) {
        // Don't set a page-level error, just log it
        console.error("Failed to refresh orders:", err);
      }
    }
  }, [isLoading]); // We depend on 'isLoading' to know if it's the first load

  // 3. Fetch orders on initial page load
  useEffect(() => {
    fetchSmeOrders();
  }, [fetchSmeOrders]);

  // --- 4. NEW: The function that calls our API ---
  const handleUpdateStatus = async (orderId: string, newStatus: 'SHIPPED' | 'COMPLETED') => {
    setUpdatingOrderId(orderId); // Show spinner *only* on this card

    try {
      // Call our real backend API
      // This API call *already* triggers the reputation engine on the backend.
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      
      // Success! Re-fetch the orders to make the card "move"
      // We set isLoading to false so it does a "silent" refresh
      setIsLoading(false); 
      await fetchSmeOrders();

    } catch (err) {
      console.error("Failed to update order status:", err);
      // We could add a per-card error state here later
    } finally {
      setUpdatingOrderId(null); // Hide spinner
    }
  };

  // --- 5. UPDATED: OrderCard is now a "smart" component ---
  const OrderCard = ({ order }: { order: Order }) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    
    // Check if *this specific card* is the one being updated
    const isUpdating = updatingOrderId === order.id;

    const getActionButton = () => {
      if (order.status === 'PENDING') {
        return (
          <button 
            onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
            disabled={isUpdating}
            className="w-full mt-4 py-2 px-4 rounded-lg
                       bg-gradient-to-r from-indigo-600 to-blue-600 
                       text-white font-semibold text-sm
                       hover:from-indigo-700 hover:to-blue-700
                       transition-all duration-300 ease-in-out
                       hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUpdating ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Mark as Shipped'}
          </button>
        );
      }
      if (order.status === 'SHIPPED') {
        return (
          <button 
            onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
            disabled={isUpdating}
            className="w-full mt-4 py-2 px-4 rounded-lg
                       bg-gradient-to-r from-green-500 to-emerald-600 
                       text-white font-semibold text-sm
                       hover:from-green-600 hover:to-emerald-700
                       transition-all duration-300 ease-in-out
                       hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUpdating ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Mark as Completed'}
          </button>
        );
      }
      return null; // No button for "Completed"
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
        {/* Customer & Date */}
        <div className="pb-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {order.customer.firstName || order.customer.email}
          </h3>
          <p className="text-xs text-gray-500">{orderDate}</p>
        </div>
        
        {/* Product List */}
        <div className="my-3 space-y-2 flex-grow">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center space-x-2">
              <img 
                src={item.product.imageUrl || 'https://placehold.co/100x100/e2e8f0/94a3b8?text=?'} 
                alt={item.product.name}
                className="w-10 h-10 rounded-md object-cover bg-gray-100"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total & Action */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-lg font-bold text-indigo-600">
              {formatNaira(order.total)}
            </span>
          </div>
          {getActionButton()}
        </div>
      </div>
    );
  };
  
  // --- (Main Page Render is unchanged) ---
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Manage Orders
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-3 text-red-600">{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* --- Column 1: New --- */}
          <div className="bg-gray-100 rounded-2xl p-4">
            <div className="flex items-center mb-4">
              <Package className="w-6 h-6 text-yellow-600" />
              <h2 className="ml-2 text-xl font-semibold text-gray-900">
                New ({orders.filter(o => o.status === 'PENDING').length})
              </h2>
            </div>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'PENDING').length > 0 ? (
                orders.filter(o => o.status === 'PENDING').map(order => 
                  <OrderCard key={order.id} order={order} />
                )
              ) : (
                <p className="text-sm text-gray-500 text-center p-4">No new orders.</p>
              )}
            </div>
          </div>

          {/* --- Column 2: Shipped --- */}
          <div className="bg-gray-100 rounded-2xl p-4">
            <div className="flex items-center mb-4">
              <Truck className="w-6 h-6 text-blue-600" />
              <h2 className="ml-2 text-xl font-semibold text-gray-900">
                Shipped ({orders.filter(o => o.status === 'SHIPPED').length})
              </h2>
            </div>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'SHIPPED').length > 0 ? (
                orders.filter(o => o.status === 'SHIPPED').map(order => 
                  <OrderCard key={order.id} order={order} />
                )
              ) : (
                <p className="text-sm text-gray-500 text-center p-4">No shipped orders.</p>
              )}
            </div>
          </div>

          {/* --- Column 3: Completed --- */}
          <div className="bg-gray-100 rounded-2xl p-4">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="ml-2 text-xl font-semibold text-gray-900">
                Completed ({orders.filter(o => o.status === 'COMPLETED').length})
              </h2>
            </div>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'COMPLETED').length > 0 ? (
                orders.filter(o => o.status === 'COMPLETED').map(order => 
                  <OrderCard key={order.id} order={order} />
                )
              ) : (
                <p className="text-sm text-gray-500 text-center p-4">No completed orders.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}