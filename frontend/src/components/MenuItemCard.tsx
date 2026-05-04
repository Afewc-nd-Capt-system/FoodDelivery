'use client';

import Image from 'next/image';
import { Star, Plus, Minus, Leaf } from 'lucide-react';
import { useCart } from '@/context/CartContext';

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

interface MenuItemCardProps {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
}

export default function MenuItemCard({ item, restaurantId, restaurantName }: MenuItemCardProps) {
  const { items, addItem, updateItem } = useCart();
  const cartItem = items.find((i) => i.itemId === item._id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {item.isVeg ? (
            <Leaf className="w-4 h-4 text-green-600" />
          ) : (
            <span className="text-red-600 text-xs font-bold">N</span>
          )}
          <h3 className="font-semibold text-gray-900">{item.name}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900">${item.price.toFixed(2)}</span>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="w-4 h-4 text-accent-500 fill-current" />
            <span>{item.rating}</span>
          </div>
        </div>
      </div>

      <div className="relative w-28 h-28 flex-shrink-0">
        {item.image && (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover rounded-lg"
          />
        )}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          {quantity === 0 ? (
            <button
              onClick={() => addItem({ itemId: item._id, name: item.name, price: item.price, quantity: 1, restaurantId, restaurantName })}
              className="bg-white text-green-600 font-semibold px-6 py-1.5 rounded-md shadow-md hover:bg-green-50 transition-colors border border-green-600"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-green-600 text-white rounded-md shadow-md">
              <button
                onClick={() => updateItem(item._id, quantity - 1)}
                className="px-2 py-1.5 hover:bg-green-700 transition-colors rounded-l-md"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold w-6 text-center">{quantity}</span>
              <button
                onClick={() => addItem({ itemId: item._id, name: item.name, price: item.price, quantity: 1, restaurantId, restaurantName })}
                className="px-2 py-1.5 hover:bg-green-700 transition-colors rounded-r-md"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
