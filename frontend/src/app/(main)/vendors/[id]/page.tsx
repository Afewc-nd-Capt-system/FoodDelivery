'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin, ArrowLeft, Heart, Share2, Plus, Minus } from 'lucide-react';
import { vendors, vendorMenuItems } from '@/data/mockData';
import { useCart } from '@/context/CartContext';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const vendorId = params.id as string;
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const vendor = vendors.find(v => v.id === vendorId);
  const menuItems = vendorMenuItems.filter(item => item.vendorId === vendorId);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const handlePreOrder = (item: typeof vendorMenuItems[0]) => {
    const quantity = quantities[item.id] || 1;
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        restaurantId: vendorId,
        category: item.category,
        description: item.description,
      });
    }
    setQuantities(prev => ({ ...prev, [item.id]: 0 }));
  };

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

      {/* Menu Items */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Menu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                {item.popular && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Popular
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  {item.calories && <span>{item.calories}</span>}
                  {item.cookingDay && <span>• Cooks on {item.cookingDay}</span>}
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">₦{item.price.toLocaleString()}</span>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-semibold w-8 text-center">{quantities[item.id] || 1}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Pre-order Button */}
                <button
                  onClick={() => handlePreOrder(item)}
                  disabled={!vendor.isOpen}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                    vendor.isOpen
                      ? 'text-white hover:scale-105 active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  style={vendor.isOpen ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)' } : {}}
                >
                  Pre-order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
