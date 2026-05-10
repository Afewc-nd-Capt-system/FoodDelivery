'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { MenuItem } from '../data/mockData';

export interface CartItem extends MenuItem {
  quantity: number;
  selectedOptions?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, options?: Record<string, string>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  promoCode: string;
  applyPromoCode: (code: string) => boolean;
  discount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const addItem = useCallback((item: MenuItem, options?: Record<string, string>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedOptions: options }];
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

  const applyPromoCode = useCallback((code: string): boolean => {
    const upper = code.toUpperCase().trim();
    if (upper === 'VIBES20') { setPromoCode(upper); setDiscount(0.2); return true; }
    if (upper === 'FIRSTORDER') { setPromoCode(upper); setDiscount(0.15); return true; }
    if (upper === 'NAIJA10') { setPromoCode(upper); setDiscount(0.1); return true; }
    setPromoCode(''); setDiscount(0); return false;
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, subtotal, promoCode, applyPromoCode, discount,
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
