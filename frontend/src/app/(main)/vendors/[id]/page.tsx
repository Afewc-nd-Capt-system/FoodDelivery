'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin, ArrowLeft, Heart, Share2 } from 'lucide-react';
import { vendors } from '@/data/mockData';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  
  const vendor = vendors.find(v => v.id === vendorId);
  
  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vendor not found</h1>
          <Link href="/vendors" className="text-orange-500 hover:text-orange-600">
            ← Back to vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Vendor Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="relative h-64">
          <Image
            src={vendor.coverImage}
            alt={vendor.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Vendor Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
              <Heart className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Vendor Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white">
                <Image
                  src={vendor.image}
                  alt={vendor.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl font-bold mb-1">{vendor.name}</h1>
                <p className="text-white/90">{vendor.cuisine}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="font-semibold text-lg">{vendor.rating}</span>
              <span className="text-gray-500">({vendor.reviewCount} reviews)</span>
            </div>

            {/* Delivery Info */}
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{vendor.deliveryTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{vendor.distance}</span>
              </div>
            </div>

            {/* Status */}
            <div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                vendor.isOpen 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  vendor.isOpen ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {vendor.isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">About</h3>
              <p className="text-gray-600">
                Delicious homemade {vendor.cuisine.toLowerCase()} prepared with love and care. 
                Specializing in {vendor.categories.join(', ').toLowerCase()} dishes that will 
                transport you to the heart of Nigerian cuisine.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Cooking Schedule</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.cookingDays.map(day => (
                  <span
                    key={day}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.categories.map(category => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Price Range</h3>
                <p className="text-gray-600">{vendor.priceRange}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Delivery</h3>
                <p className="text-gray-600">
                  {vendor.deliveryFee === 0 ? 'Free delivery' : `₦${vendor.deliveryFee} delivery`}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Location</h3>
              <p className="text-gray-600">{vendor.address}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Minimum Order</h3>
              <p className="text-gray-600">₦{vendor.minOrder.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <button
          disabled={!vendor.isOpen}
          className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
            vendor.isOpen
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {vendor.isOpen ? 'View Menu' : 'Currently Closed'}
        </button>
      </div>
    </div>
  );
}
