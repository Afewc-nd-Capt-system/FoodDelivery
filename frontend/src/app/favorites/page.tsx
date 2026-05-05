'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import RestaurantCard from '@/components/RestaurantCard';

interface Restaurant {
  _id: string;
  name: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceForTwo: number;
  priceRange: string;
  offers: string[];
  address: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await api.auth.getFavorites();
      setFavorites(data || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId: string) => {
    try {
      await api.auth.removeFavorite(restaurantId);
      setFavorites(favorites.filter(r => r._id !== restaurantId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-8 h-8 text-red-500 fill-current" />
        <h1 className="text-3xl font-bold">Your Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No favorites yet</h2>
          <p className="text-gray-500 mb-6">
            Start exploring restaurants and add your favorites!
          </p>
          <Link
            href="/restaurants"
            className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((restaurant) => (
            <div key={restaurant._id} className="relative">
              <RestaurantCard restaurant={restaurant} />
              <button
                onClick={() => removeFavorite(restaurant._id)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-red-50"
              >
                <Heart className="w-5 h-5 text-red-500 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}