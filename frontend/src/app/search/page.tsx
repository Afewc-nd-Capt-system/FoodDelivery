'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, X, Star, Clock, Leaf } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { api } from '@/lib/api';

interface SearchResult {
  _id: string;
  name: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceRange: string;
  type: 'restaurant' | 'vendor';
  dietaryOptions?: string[];
  menu?: Array<{
    name: string;
    dietaryTags?: string[];
    spicyLevel?: number;
  }>;
}

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'];
const DIETARY_OPTIONS = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');
  const [priceRange, setPriceRange] = useState(searchParams.get('priceRange') || '');
  const [rating, setRating] = useState(searchParams.get('rating') || '');
  const [dietary, setDietary] = useState(searchParams.get('dietary') || '');
  const [maxDeliveryTime, setMaxDeliveryTime] = useState(searchParams.get('maxDeliveryTime') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    search();
  }, [searchParams]);

  const search = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (query) params.q = query;
      if (cuisine) params.cuisine = cuisine;
      if (priceRange) params.priceRange = priceRange;
      if (rating) params.rating = rating;
      if (dietary) params.dietary = dietary;
      if (maxDeliveryTime) params.maxDeliveryTime = maxDeliveryTime;

      const data = await api.search.query(params);
      setResults(data.data);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams();
    search(1);
  };

  const updateParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (cuisine) params.set('cuisine', cuisine);
    if (priceRange) params.set('priceRange', priceRange);
    if (rating) params.set('rating', rating);
    if (dietary) params.set('dietary', dietary);
    if (maxDeliveryTime) params.set('maxDeliveryTime', maxDeliveryTime);
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setCuisine('');
    setPriceRange('');
    setRating('');
    setDietary('');
    setMaxDeliveryTime('');
    setQuery('');
    router.push('/search');
    search(1);
  };

  const hasFilters = cuisine || priceRange || rating || dietary || maxDeliveryTime;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Search</h1>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants, dishes, cuisines..."
                className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              Filters
              {hasFilters && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">!</span>}
            </button>
          </div>
        </form>

        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filters</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-orange-500 text-sm">
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Cuisine</label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="e.g., Indian, Chinese"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Any</option>
                  {PRICE_RANGES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Min Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Any</option>
                  <option value="4.5">4.5+</option>
                  <option value="4">4+</option>
                  <option value="3.5">3.5+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Delivery Time</label>
                <select
                  value={maxDeliveryTime}
                  onChange={(e) => setMaxDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Any</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Dietary</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDietary(dietary === opt.id ? '' : opt.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      dietary === opt.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { updateParams(); search(1); }}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Apply Filters
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No results found</p>
            <p className="text-gray-400">Try different keywords or filters</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">{pagination.total} results found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((item) => (
                item.type === 'restaurant' ? (
                  <RestaurantCard key={item._id} restaurant={item} />
                ) : (
                  <Link key={item._id} href={`/vendors/${item._id}`} className="card hover:shadow-lg">
                    <div className="relative h-40 mb-3 rounded-lg overflow-hidden">
                      <img src={item.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-500 text-sm">{item.cuisine?.join(', ')}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{item.rating}</span>
                      <Clock className="w-4 h-4 ml-2 text-gray-400" />
                      <span className="text-sm text-gray-500">{item.deliveryTime}</span>
                    </div>
                  </Link>
                )
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => search(i + 1)}
                    className={`px-4 py-2 rounded-lg ${
                      pagination.page === i + 1
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}