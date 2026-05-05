'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
}

interface CartContextType {
  cart: Cart;
  addToCart: (item: CartItem & { restaurantId: string; restaurantName: string }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], restaurantId: null, restaurantName: null });

  const refreshCart = async () => {
    try {
      const res = await fetch(API_BASE + '/cart', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Failed to refresh cart', error);
    }
  };

  const addToCart = async (item: CartItem & { restaurantId: string; restaurantName: string }) => {
    const res = await fetch(API_BASE + '/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add item');
    setCart(data);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const res = await fetch(API_BASE + '/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ itemId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update cart');
    setCart(data);
  };

  const clearCart = async () => {
    const res = await fetch(API_BASE + '/cart/clear', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setCart({ items: [], restaurantId: null, restaurantName: null });
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
