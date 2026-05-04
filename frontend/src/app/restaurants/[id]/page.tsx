'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin, Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';

interface Restaurant {
  _id: string;
  name: string;
  description: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceForTwo: number;
  priceRange: string;
  address: string;
  menu: MenuItem[];
  reviews: Review[];
  isOpen: boolean;
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
  rating: number;
}

interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToCart } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addingItem, setAddingItem] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadRestaurant(params.id as string);
    }
  }, [params.id]);

  const loadRestaurant = async (id: string) => {
    try {
      const data = await api.restaurants.getById(id);
      setRestaurant(data);
    } catch (error) {
      console.error('Failed to load restaurant', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    setAddingItem(item._id);
    try {
      await addToCart({
        itemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        restaurantId: restaurant!._id,
        restaurantName: restaurant!.name,
      }, token);
    } catch (error: any) {
      alert(error.message || 'Failed to add item');
    } finally {
      setAddingItem(null);
    }
  };

  const categories = restaurant ? ['All', ...Array.from(new Set(restaurant.menu.map(m => m.category)))] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Restaurant not found</p>
        <Link href="/restaurants" className="btn-primary mt-4 inline-block">
          Back to Restaurants
        </Link>
      </div>
    );
  }

  const filteredMenu = selectedCategory === 'All' 
    ? restaurant.menu 
    : restaurant.menu.filter(m => m.category === selectedCategory);

  return (
    <div>
      {/* Restaurant Header */}
      <section className="relative h-64 md:h-96">
        <Image
          src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200'}
          alt={restaurant.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <Link href="/restaurants" className="text-white/80 hover:text-white inline-flex items-center gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Restaurants
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{restaurant.name}</h1>
            <p className="text-white/90 mb-4">{restaurant.cuisine.join(', ')}</p>
            <div className="flex flex-wrap gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{restaurant.rating}</span>
                <span>({restaurant.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-5 h-5" />
                <span>{restaurant.deliveryTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-5 h-5" />
                <span>{restaurant.address}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        ? 'bg-primary-500 text-white'
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
            <h2 className="text-2xl font-bold mb-6">Menu</h2>
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
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{item.rating}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-lg">${item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.isAvailable || addingItem === item._id || !restaurant.isOpen}
                      className="btn-primary py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {addingItem === item._id ? (
                        'Adding...'
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add to Cart
                        </>
                      )}
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

        {/* Reviews Section */}
        {restaurant.reviews && restaurant.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Reviews</h2>
            <div className="space-y-4">
              {restaurant.reviews.map((review, idx) => (
                <div key={idx} className="card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{review.user}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
