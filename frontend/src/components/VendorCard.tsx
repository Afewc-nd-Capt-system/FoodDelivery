'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin } from 'lucide-react';
import { Vendor } from '@/data/mockData';

interface VendorCardProps {
  vendor: Vendor;
}

export default function VendorCard({ vendor }: VendorCardProps) {
  return (
    <Link href={`/vendors/${vendor.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative h-48">
          <Image
            src={vendor.image}
            alt={vendor.name}
            fill
            className="object-cover"
          />
          {vendor.promoted && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
              Featured
            </div>
          )}
          {vendor.discount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              {vendor.discount}
            </div>
          )}
          {!vendor.isOpen && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-white px-3 py-1 rounded text-sm font-semibold">Closed</span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-gray-900">{vendor.name}</h3>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{vendor.rating}</span>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-2">{vendor.cuisine}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{vendor.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{vendor.distance}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{vendor.priceRange}</span>
            <span className="text-green-600 font-medium">
              {vendor.deliveryFee === 0 ? 'Free delivery' : `₦${vendor.deliveryFee} delivery`}
            </span>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-1">
            {vendor.categories.slice(0, 3).map(category => (
              <span
                key={category}
                className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
              >
                {category}
              </span>
            ))}
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium">Cooking days:</span> {vendor.cookingDays.join(', ')}
          </div>
        </div>
      </div>
    </Link>
  );
}
