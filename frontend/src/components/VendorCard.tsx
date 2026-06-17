'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Clock, MapPin } from 'lucide-react';

interface VendorCardProps {
  vendor: any;
  onClick?: () => void;
}

export default function VendorCard({ vendor, onClick }: VendorCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-xl overflow-hidden"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="relative h-48">
        {vendor.image ? (
          <Image
            src={vendor.image}
            alt={vendor.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg, #E8621A, #BE3A2A)' }}>🥘</div>
        )}
        {vendor.promoted && (
          <div
            className="absolute top-2 left-2 text-white px-2.5 py-1 rounded-lg text-[11px] font-black"
            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
          >
            Featured
          </div>
        )}
        {vendor.discount && (
          <div
            className="absolute top-2 right-2 bg-red-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-black"
            style={{ background: 'linear-gradient(135deg, #BE3A2A, #8B2520)' }}
          >
            {vendor.discount}
          </div>
        )}
        {vendor.isOpen === false && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="px-4 py-2 bg-white/95 rounded-xl text-sm font-bold text-gray-700">
              Closed Now
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <MapPin size={11} className="text-white/80" />
          <span className="text-xs text-white/80 font-medium">{vendor.distance || ''}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-sm" style={{ color: '#1C1C1E' }}>{vendor.name}</h3>
          {vendor.rating && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg"
            style={{ backgroundColor: '#FFF1E8' }}
          >
            <Star size={11} fill="#E8621A" stroke="none" />
            <span className="text-xs font-black" style={{ color: '#E8621A' }}>{vendor.rating}</span>
          </div>
          )}
        </div>

        <p className="text-xs mb-2 font-medium" style={{ color: '#A0A0A0' }}>{vendor.cuisine || vendor.categories?.[0] || ''}</p>

        <div className="flex items-center gap-4 text-xs mb-3" style={{ color: '#636366' }}>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span className="font-medium">{vendor.deliveryTime || ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={11} />
            <span className="font-medium">{vendor.distance || ''}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-medium" style={{ color: '#636366' }}>{vendor.priceRange || ''}</span>
          <span className="font-semibold text-green-600">
            {vendor.deliveryFee === 0 ? 'Free delivery' : `₦${vendor.deliveryFee || 0} delivery`}
          </span>
        </div>

        {vendor.categories && vendor.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {vendor.categories.slice(0, 3).map((category: string) => (
            <span
              key={category}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
            >
              {category}
            </span>
          ))}
        </div>
        )}

        {vendor.cookingDays && vendor.cookingDays.length > 0 && (
        <div className="mb-3 text-xs" style={{ color: '#636366' }}>
          <span className="font-medium">Cooking days:</span> {vendor.cookingDays.join(', ')}
        </div>
        )}

        {onClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
        >
          Pre-order
        </button>
        )}
      </div>
    </div>
  );
}
