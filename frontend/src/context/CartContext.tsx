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
  addToCart: (item: CartItem & { restaurantId: string; restaurantName: string }, token: string | null) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number, token: string | null) => Promise<void>;
  clearCart: (token: string | null) => Promise<void>;
  refreshCart: (token: string | null) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], restaurantId: null, restaurantName: null });

  const refreshCart = async (token: string | null) => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE + '/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Failed to refresh cart', error);
    }
  };

  const addToCart = async (item: CartItem & { restaurantId: string; restaurantName: string }, token: string | null) => {
    if (!token) throw new Error('Please login to add items');
    const res = await fetch(API_BASE + '/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add item');
    setCart(data);
  };

  const updateQuantity = async (itemId: string, quantity: number, token: string | null) => {
    if (!token) return;
    const res = await fetch(API_BASE + '/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update cart');
    setCart(data);
  };

  const clearCart = async (token: string | null) => {
    if (!token) return;
    const res = await fetch(API_BASE + '/cart/clear', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
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
