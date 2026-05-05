'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, Star, Clock, ChevronDown } from 'lucide-react';
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

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'rating');
  const [priceFilter, setPriceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page, selectedCuisine, sortBy, priceFilter]);

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (selectedCuisine) params.cuisine = selectedCuisine;
      if (priceFilter) params.priceRange = priceFilter;
      if (sortBy) params.sortBy = sortBy;
      if (search) params.search = search;

      const [restData, cuisineData] = await Promise.all([
        api.restaurants.getAll(params),
        api.restaurants.getCuisines(),
      ]);
      setRestaurants(restData.restaurants || restData);
      setTotalPages(restData.totalPages || 1);
      setCuisines(cuisineData);
    } catch (error) {
      console.error('Failed to load', error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCuisine, sortBy, priceFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCuisine) params.set('cuisine', selectedCuisine);
    if (sortBy) params.set('sortBy', sortBy);
    window.location.href = `/restaurants?${params.toString()}`;
  };

  const applyFilters = useCallback(() => {
    let result = [...restaurants];

    if (selectedCuisine) {
      result = result.filter(r => r.cuisine.includes(selectedCuisine));
    }

    if (priceFilter) {
      result = result.filter(r => r.priceRange === priceFilter);
    }

    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'deliveryTime') {
      result.sort((a, b) => {
        const aTime = parseInt(a.deliveryTime) || 30;
        const bTime = parseInt(b.deliveryTime) || 30;
        return aTime - bTime;
      });
    } else if (sortBy === 'priceLow') {
      result.sort((a, b) => a.priceForTwo - b.priceForTwo);
    } else if (sortBy === 'priceHigh') {
      result.sort((a, b) => b.priceForTwo - a.priceForTwo);
    }

    setFiltered(result);
  }, [restaurants, selectedCuisine, sortBy, priceFilter]);

  const cuisineIcons: Record<string, string> = useMemo(() => ({
    Indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200',
    Chinese: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200',
    Italian: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    American: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200',
    Japanese: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=200',
    Mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200',
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="card p-4 mb-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-between w-full font-semibold mb-4"
            >
              Filters <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
              <h3 className="font-bold text-lg mb-4">Filters</h3>
              
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Cuisine</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="cuisine" 
                      checked={selectedCuisine === ''} 
                      onChange={() => setSelectedCuisine('')}
                      className="text-primary-500"
                    />
                    <span>All</span>
                  </label>
                  {cuisines.map(c => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cuisine" 
                        checked={selectedCuisine === c} 
                        onChange={() => setSelectedCuisine(c)}
                        className="text-primary-500"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Price Range</h4>
                <div className="space-y-2">
                  {['$', '$$', '$$$'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="price" 
                        checked={priceFilter === p} 
                        onChange={() => setPriceFilter(p)}
                        className="text-primary-500"
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="price" 
                      checked={priceFilter === ''} 
                      onChange={() => setPriceFilter('')}
                      className="text-primary-500"
                    />
                    <span>All</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sort By</h4>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="rating">Rating (High to Low)</option>
                  <option value="deliveryTime">Delivery Time</option>
                  <option value="priceLow">Price (Low to High)</option>
                  <option value="priceHigh">Price (High to Low)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant List */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Restaurants</h1>
            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants..."
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary px-4">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          <p className="text-gray-500 mb-4">{restaurants.length} restaurants found</p>

          {restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No restaurants found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map(r => (
                  <RestaurantCard key={r._id} restaurant={r} />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-lg ${
                        page === i + 1
                          ? 'bg-primary-500 text-white'
                          : 'border hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <RestaurantsContent />
    </Suspense>
  );
}
