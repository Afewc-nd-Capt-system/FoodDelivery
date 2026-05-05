'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Star, Calendar, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

interface Vendor {
  _id: string;
  businessName: string;
  ownerName: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  address: string;
  cookingDays: string[];
  description: string;
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page, selectedCuisine]);

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (selectedCuisine) params.cuisine = selectedCuisine;
      if (search) params.search = search;

      const [vendData, cuisineData] = await Promise.all([
        api.vendors.getAll(params),
        api.vendors.getCuisines(),
      ]);
      setVendors(vendData.vendors || vendData);
      setTotalPages(vendData.totalPages || 1);
      setCuisines(cuisineData);
    } catch (error) {
      console.error('Failed to load', error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCuisine, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const formatCookingDays = (days: string[]) => {
    if (!days || days.length === 0) return 'Check schedule';
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Local Vendors</h1>
        <p className="text-gray-600">Discover local home cooks and pre-order your meals</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="card p-4">
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
                    className="text-orange-600"
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
                      className="text-orange-600"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor List */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <p className="text-gray-500">{vendors.length} vendors found</p>
            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary px-4">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No vendors found.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {vendors.map(vendor => (
                  <Link key={vendor._id} href={`/vendors/${vendor._id}`}>
                    <div className="card p-4 flex gap-4 hover:shadow-lg transition-shadow">
                      <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={vendor.image || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400'}
                          alt={vendor.businessName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold">{vendor.businessName}</h3>
                            <p className="text-sm text-gray-500">by {vendor.ownerName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{vendor.rating}</span>
                            <span className="text-sm text-gray-500">({vendor.reviewCount})</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{vendor.description}</p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {vendor.cuisine?.map(c => (
                            <span key={c} className="bg-gray-100 px-2 py-1 rounded">{c}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatCookingDays(vendor.cookingDays)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{vendor.address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
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
                  <span className="text-gray-600">Page {page} of {totalPages}</span>
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

export default function VendorsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    }>
      <VendorsContent />
    </Suspense>
  );
}