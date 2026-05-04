'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowRight, Star, Clock, Percent, MapPin } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { api } from '@/lib/api';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
);

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

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featured, setFeatured] = useState<Restaurant[]>([]);
  const [topRated, setTopRated] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [restaurants, cuisinesData] = await Promise.all([
        api.restaurants.getAll(),
        api.restaurants.getCuisines(),
      ]);
      setFeatured(restaurants.slice(0, 4));
      setTopRated([...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 4));
      setCuisines(cuisinesData);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const cuisineIcons: Record<string, string> = {
    Indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200',
    Chinese: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200',
    Italian: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    American: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200',
    Japanese: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=200',
    Mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200',
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      window.location.href = `/restaurants?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 animate-fade-in">
            Craving something <span className="text-accent-400">delicious</span>?
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-slide-up">
            Order from the best restaurants near you. Fast delivery, great food, and amazing deals.
          </p>

          <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for restaurants, cuisines, or dishes..."
                className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400"
                onKeyDown={handleSearch}
              />
              <Link
                href={`/restaurants?search=${encodeURIComponent(searchQuery)}`}
                className="btn-primary py-3 px-6 rounded-xl flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Search</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 text-white/90">
              <div className="bg-white/20 p-2 rounded-full">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-medium">30 min delivery</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <div className="bg-white/20 p-2 rounded-full">
                <Star className="w-5 h-5" />
              </div>
              <span className="font-medium">4.5+ rated restaurants</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <div className="bg-white/20 p-2 rounded-full">
                <Percent className="w-5 h-5" />
              </div>
              <span className="font-medium">Exclusive offers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          Explore by Cuisine
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {cuisines.map((cuisine) => (
            <Link
              key={cuisine}
              href={`/restaurants?cuisine=${encodeURIComponent(cuisine)}`}
              className="card group text-center p-4 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden">
                <Image
                  src={cuisineIcons[cuisine] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                  alt={cuisine}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-500 transition-colors">
                {cuisine}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Featured Restaurants
            </h2>
            <Link
              href="/restaurants"
              className="text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Top Rated Near You
          </h2>
          <Link
            href="/restaurants?sortBy=rating"
            className="text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topRated.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-accent-500 to-accent-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Hungry? Let us help!
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
            Browse hundreds of restaurants, order your favorite meals, and get them delivered fast.
          </p>
          <Link
            href="/restaurants"
            className="bg-white text-accent-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 inline-flex items-center gap-2"
          >
            Order Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
