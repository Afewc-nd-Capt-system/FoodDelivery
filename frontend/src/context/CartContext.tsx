'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { MenuItem } from '../data/mockData';

export interface CartItem extends MenuItem {
  quantity: number;
  selectedOptions?: Record<string, string>;
}

const CART_STORAGE_KEY = 'vibechops_cart_v1';

function readStoredCart(): { items: CartItem[] } {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items.filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(Number(item.price)))
        .map((item: any) => ({ ...item, price: Number(item.price), quantity: Math.max(1, Number(item.quantity) || 1) }))
      : [];
    return { items };
  } catch {
    return { items: [] };
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, options?: Record<string, string>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore once after mount so a hard refresh or a full navigation to /cart
  // keeps the customer's items (the smoke used to lose them on a reload).
  useEffect(() => {
    const stored = readStoredCart();
    setItems(stored.items);
    setHydrated(true);
  }, []);

  // Persist after hydration only, so the initial empty state never wipes a
  // stored cart before it has been read.
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      if (items.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
      }
    } catch {
      // Storage can be unavailable (private mode/quota); the cart still works
      // for the current tab.
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: MenuItem, options?: Record<string, string>) => {
    setItems(prev => {
      if (prev.length > 0 && prev[0].restaurantId !== item.restaurantId) {
        const confirmed = window.confirm(
          `Your cart has items from ${prev[0].restaurantName || 'another restaurant'}. ` +
          `Adding this item will clear your current cart. Continue?`
        );
        if (!confirmed) return prev;
        return [{ ...item, quantity: 1, selectedOptions: options, restaurantName: item.restaurantName }];
      }
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedOptions: options, restaurantName: item.restaurantName }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
