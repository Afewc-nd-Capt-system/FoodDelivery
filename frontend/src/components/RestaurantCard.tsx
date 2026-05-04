import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, MapPin } from 'lucide-react';

interface Restaurant {
  _id: string;
  name: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceForTwo: number;
  priceRange: string;
  offers: string[];
  address: string;
}

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link href={`/restaurants/${restaurant._id}`} className="card group block hover:shadow-xl transition-all duration-300">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
          alt={restaurant.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {restaurant.offers && restaurant.offers.length > 0 && (
          <div className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-bold px-2 py-1 rounded">
            {restaurant.offers[0]}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-500 transition-colors">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-green-700">{restaurant.rating}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-3">{restaurant.cuisine.join(', ')}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{restaurant.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{restaurant.priceRange}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
