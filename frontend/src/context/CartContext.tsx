'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { MenuItem } from '../data/mockData';

export interface CartItem extends MenuItem {
  quantity: number;
  selectedOptions?: Record<string, string>;
}

const CART_STORAGE_KEY = 'vibechops_cart_v1';

function readStoredCart(): { items: CartItem[]; promoCode: string; discount: number } {
  if (typeof window === 'undefined') return { items: [], promoCode: '', discount: 0 };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], promoCode: '', discount: 0 };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items.filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(Number(item.price)))
        .map((item: any) => ({ ...item, price: Number(item.price), quantity: Math.max(1, Number(item.quantity) || 1) }))
      : [];
    return {
      items,
      promoCode: typeof parsed?.promoCode === 'string' ? parsed.promoCode : '',
      discount: Number.isFinite(Number(parsed?.discount)) ? Number(parsed.discount) : 0,
    };
  } catch {
    return { items: [], promoCode: '', discount: 0 };
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
  promoCode: string;
  applyPromoCode: (code: string) => boolean;
  discount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Restore once after mount so a hard refresh or a full navigation to /cart
  // keeps the customer's items (the smoke used to lose them on a reload).
  useEffect(() => {
    const stored = readStoredCart();
    setItems(stored.items);
    setPromoCode(stored.promoCode);
    setDiscount(stored.discount);
    setHydrated(true);
  }, []);

  // Persist after hydration only, so the initial empty state never wipes a
  // stored cart before it has been read.
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      if (items.length === 0 && !promoCode) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, promoCode, discount }));
      }
    } catch {
      // Storage can be unavailable (private mode/quota); the cart still works
      // for the current tab.
    }
  }, [items, promoCode, discount, hydrated]);

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
