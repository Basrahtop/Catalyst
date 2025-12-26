"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Define the shape of a Cart Item
// We only need enough info to show the line item
export interface CartItem {
  productId: string;
  name: string;
  price: number; // in Kobo
  imageUrl: string;
  smeId: string; // We need this to group orders by Seller later!
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // 2. Load Cart from LocalStorage on start
  useEffect(() => {
    const savedCart = localStorage.getItem('catalyst_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // 3. Save Cart to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('catalyst_cart', JSON.stringify(cart));
  }, [cart]);

  // 4. Add to Cart Logic
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        // If exists, just increase quantity
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // If new, add it
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          smeId: product.smeId, // Critical for splitting orders later
          quantity: 1,
        },
      ];
    });
  };

  // 5. Remove from Cart Logic
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // 6. Clear Cart Logic
  const clearCart = () => {
    setCart([]);
  };

  // 7. Calculated Values
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// 8. The Hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};