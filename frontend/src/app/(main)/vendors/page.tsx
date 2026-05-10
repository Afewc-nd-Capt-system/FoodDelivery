'use client';

import { useState } from 'react';
import { Search, Filter, Star, Clock, MapPin } from 'lucide-react';
import { vendors } from '@/data/mockData';
import VendorCard from '@/components/VendorCard';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(vendors.flatMap(v => v.categories)));

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase()) ||
                         vendor.cuisine.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || vendor.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const openVendors = filteredVendors.filter(v => v.isOpen);

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
          {categories.map(category => (
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

      {/* Open Vendors Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Open Now</h2>
          <span className="text-sm text-gray-500">{openVendors.length} vendors available</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {openVendors.map(vendor => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </div>

      {/* All Vendors Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">All Vendors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVendors.map(vendor => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </div>
    </div>
  );
}
