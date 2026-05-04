'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-500">FlavorDash</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/restaurants" className="text-gray-600 hover:text-primary-500 transition-colors">
              Restaurants
            </Link>
            <Link href="/cart" className="relative text-gray-600 hover:text-primary-500 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cart.items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Link>
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="text-sm text-gray-600 hover:text-primary-500">
                Hi, {user.name.split(' ')[0]}
              </Link>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-600">
                Logout
              </button>
            </div>
          ) : (
              <div className="flex items-center gap-4">
                <Link href="/auth/login" className="text-gray-600 hover:text-primary-500">
                  Login
                </Link>
                <Link href="/auth/register" className="btn-primary py-2 px-4 text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link href="/restaurants" className="text-gray-600" onClick={() => setMenuOpen(false)}>
                Restaurants
              </Link>
              <Link href="/cart" className="text-gray-600" onClick={() => setMenuOpen(false)}>
                Cart ({cart.items.reduce((sum, item) => sum + item.quantity, 0)})
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="text-gray-600" onClick={() => setMenuOpen(false)}>
                    Hi, {user.name.split(' ')[0]}
                  </Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="text-red-500 text-left">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
