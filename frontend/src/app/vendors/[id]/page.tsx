'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, MapPin, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';

interface Vendor {
  _id: string;
  businessName: string;
  ownerName: string;
  description: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  address: string;
  menu: MenuItem[];
  cookingDays: string[];
  deliveryTime: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  maxOrders: number;
  ordersPlaced: number;
}

interface CookingSchedule {
  cookingDays: string[];
  nextCookingDate: string;
  nextCookingDay: string;
  orderDeadline: number;
  isOrderingOpen: boolean;
  deliveryTime: string;
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToCart } = useCart();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [schedule, setSchedule] = useState<CookingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addingItem, setAddingItem] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadVendor(params.id as string);
    }
  }, [params.id]);

  const loadVendor = async (id: string) => {
    try {
      const [vendorData, scheduleData] = await Promise.all([
        api.vendors.getById(id),
        api.vendors.getNextCookingDay(id),
      ]);
      setVendor(vendorData);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Failed to load vendor', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreOrder = async (item: MenuItem) => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    if (!schedule?.isOrderingOpen) {
      alert('Pre-orders are closed for this cooking day. You can order for the next available cooking day.');
      return;
    }

    if (item.ordersPlaced >= item.maxOrders) {
      alert('Maximum orders reached for this item');
      return;
    }

    setAddingItem(item._id);
    try {
      await addToCart({
        itemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        restaurantId: vendor!._id,
        restaurantName: vendor!.businessName,
      });
      alert('Item added to cart! This is a pre-order for ' + schedule.nextCookingDay);
    } catch (error: any) {
      alert(error.message || 'Failed to add item');
    } finally {
      setAddingItem(null);
    }
  };

  const formatCookingDays = (days: string[]) => {
    if (!days || days.length === 0) return 'Not scheduled';
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Vendor not found</p>
        <Link href="/vendors" className="btn-primary mt-4 inline-block">
          Back to Vendors
        </Link>
      </div>
    );
  }

  const categories = vendor.menu ? ['All', ...Array.from(new Set(vendor.menu.map(m => m.category)))] : [];
  const filteredMenu = selectedCategory === 'All' 
    ? vendor.menu 
    : vendor.menu.filter(m => m.category === selectedCategory);

  return (
    <div>
      {/* Vendor Header */}
      <section className="relative h-64 md:h-96">
        <Image
          src={vendor.image || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200'}
          alt={vendor.businessName}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <Link href="/vendors" className="text-white/80 hover:text-white inline-flex items-center gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Vendors
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{vendor.businessName}</h1>
            <p className="text-white/90 mb-4">by {vendor.ownerName} • {vendor.cuisine.join(', ')}</p>
            <div className="flex flex-wrap gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{vendor.rating}</span>
                <span>({vendor.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-5 h-5" />
                <span>{vendor.address}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Info */}
      {schedule && (
        <div className="bg-orange-50 border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold">Cooking Days:</span>
                  <span>{formatCookingDays(schedule.cookingDays)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span>Delivery:</span>
                  <span>{schedule.deliveryTime}</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${schedule.isOrderingOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {schedule.isOrderingOpen ? (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Orders open for {schedule.nextCookingDay}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Orders closed - Next: {schedule.nextCookingDay}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600 mb-6">{vendor.description}</p>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Categories Sidebar */}
          <div className="md:w-48 flex-shrink-0">
            <div className="card p-4">
              <h3 className="font-bold mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Menu (Pre-Order)</h2>
            <div className="space-y-6">
              {filteredMenu.map(item => (
                <div key={item._id} className="card p-4 flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.isVeg ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Veg</span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Non-Veg</span>
                          )}
                          {item.maxOrders && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {item.maxOrders - (item.ordersPlaced || 0)} / {item.maxOrders} left
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-lg">₹{item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                    <button
                      onClick={() => handlePreOrder(item)}
                      disabled={!item.isAvailable || addingItem === item._id || (item.ordersPlaced || 0) >= item.maxOrders}
                      className="btn-primary py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingItem === item._id ? 'Adding...' : 'Pre-Order'}
                    </button>
                  </div>
                  {item.image && (
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}