'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/auth/favorites`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId: string) => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      await fetch(`${API_URL}/auth/favorites/${restaurantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setFavorites(favorites.filter(f => f.id !== restaurantId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-2">Favorites 💛</h1>
      <p className="text-[#636366] mb-8">Your saved restaurants</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#E8621A] animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((rest) => (
              <Link key={rest.id} href={`/restaurants/${rest.id}`}>
                <Card className="overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all hover:-translate-y-1">
                  <div className="relative h-48">
                    <Image src={rest.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'} alt={rest.name} fill className="object-cover" />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFavorite(rest.id);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-all"
                    >
                      <Heart className="w-4 h-4 fill-[#E8621A] text-[#E8621A]" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-[#1C1C1E]">{rest.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-[#E8621A] font-bold">★ {rest.rating || 4.5}</span>
                      <span className="text-xs text-[#A0A0A0]">• {rest.cuisine || 'Various'}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {favorites.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="font-black text-xl mb-2">No favorites yet</h3>
              <p className="text-[#636366] mb-6">Browse restaurants to save your favorites</p>
              <Link href="/restaurants">
                <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  Browse Restaurants
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
