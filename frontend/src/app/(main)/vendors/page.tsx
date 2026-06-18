'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import VendorCard from '@/components/VendorCard';

export default function VendorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true)
      try {
        const savedLocation = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('userLocation') || '{}')
          : {}

        let url = 'https://vibechops.onrender.com/api/v2/vendors?limit=50'

        if (savedLocation?.city) {
          url += `&city=${encodeURIComponent(savedLocation.city)}`
        }

        const res = await fetch(url)
        const data = await res.json()
        setVendors(data.vendors || [])
      } catch (err) {
        console.error('Failed to fetch vendors:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchVendors()
  }, [])

  const categories = Array.from(new Set(vendors.flatMap((v: any) => v.categories || [])));

  const filteredVendors = vendors.filter((vendor: any) => {
    const matchesSearch = !search ||
      (vendor.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (vendor.cuisine || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || (vendor.categories || []).includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const openVendors = filteredVendors.filter((v: any) => v.isOpen);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vendors</h1>
        <p className="text-gray-600">Discover home-cooked meals from talented local vendors</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vendors or cuisines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category: string) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white animate-pulse">
              <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
      {/* Open Vendors Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Open Now</h2>
          <span className="text-sm text-gray-500">{openVendors.length} vendors available</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {openVendors.map((vendor: any) => (
            <VendorCard key={vendor._id} vendor={vendor} onClick={() => router.push(`/vendors/${vendor._id}`)} />
          ))}
        </div>
      </div>

      {/* All Vendors Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">All Vendors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVendors.map((vendor: any) => (
            <VendorCard key={vendor._id} vendor={vendor} onClick={() => router.push(`/vendors/${vendor._id}`)} />
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
