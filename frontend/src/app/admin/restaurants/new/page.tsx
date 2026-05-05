'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function NewRestaurant() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    cuisine: '',
    deliveryTime: '30-40 mins',
    priceForTwo: 500,
    priceRange: '$$',
    address: '',
    isOpen: true,
    payOnDeliveryEnabled: true,
    minOrderForPayOnDelivery: 0,
  });
  
  const [menuItems, setMenuItems] = useState([
    { name: '', description: '', price: 0, image: '', category: '', isVeg: true, isAvailable: true },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role !== 'admin') {
    router.push('/');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'priceForTwo' ? Number(value) : value }));
  };

  const handleMenuChange = (index: number, field: string, value: any) => {
    setMenuItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: field === 'price' ? Number(value) : value } : item
    ));
  };

  const addMenuItem = () => {
    setMenuItems(prev => [...prev, { name: '', description: '', price: 0, image: '', category: '', isVeg: true, isAvailable: true }]);
  };

  const removeMenuItem = (index: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          cuisine: formData.cuisine.split(',').map(c => c.trim()).filter(Boolean),
          menu: menuItems.filter(item => item.name),
          payOnDeliveryEnabled: formData.payOnDeliveryEnabled,
          minOrderForPayOnDelivery: formData.minOrderForPayOnDelivery,
        }),
      });

      if (res.ok) {
        router.push('/admin/restaurants');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create restaurant');
      }
    } catch (err) {
      setError('Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/restaurants" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Add New Restaurant</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Restaurant Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Restaurant name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="input-field min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cuisine (comma separated) *</label>
                <input
                  name="cuisine"
                  value={formData.cuisine}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Italian, Pizza, Pasta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address *</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Time</label>
                <input
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price For Two</label>
                <input
                  name="priceForTwo"
                  type="number"
                  value={formData.priceForTwo}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <select
                  name="priceRange"
                  value={formData.priceRange}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="$">$ (Budget)</option>
                  <option value="$$">$$ (Moderate)</option>
                  <option value="$$$">$$$ (Expensive)</option>
                  <option value="$$$$">$$$$ (Luxury)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="payOnDeliveryEnabled"
                    checked={formData.payOnDeliveryEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, payOnDeliveryEnabled: e.target.checked }))}
                    className="text-primary-500"
                  />
                  <span className="text-sm font-medium">Enable Pay on Delivery</span>
                </label>
              </div>
              {formData.payOnDeliveryEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Order Amount for Pay on Delivery ($)</label>
                  <input
                    type="number"
                    name="minOrderForPayOnDelivery"
                    value={formData.minOrderForPayOnDelivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderForPayOnDelivery: Number(e.target.value) }))}
                    className="input-field"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Menu Items</h2>
              <button type="button" onClick={addMenuItem} className="btn-secondary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="space-y-4">
              {menuItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Item Name</label>
                      <input
                        value={item.name}
                        onChange={(e) => handleMenuChange(index, 'name', e.target.value)}
                        className="input-field"
                        placeholder="Item name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Price</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleMenuChange(index, 'price', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <input
                        value={item.description}
                        onChange={(e) => handleMenuChange(index, 'description', e.target.value)}
                        className="input-field"
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <input
                        value={item.category}
                        onChange={(e) => handleMenuChange(index, 'category', e.target.value)}
                        className="input-field"
                        placeholder="e.g., Main Course"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Image URL</label>
                      <input
                        value={item.image}
                        onChange={(e) => handleMenuChange(index, 'image', e.target.value)}
                        className="input-field"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.isVeg}
                          onChange={(e) => handleMenuChange(index, 'isVeg', e.target.checked)}
                          className="text-green-600"
                        />
                        <span className="text-sm">Veg</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={(e) => handleMenuChange(index, 'isAvailable', e.target.checked)}
                          className="text-blue-600"
                        />
                        <span className="text-sm">Available</span>
                      </label>
                    </div>
                  </div>
                  {menuItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMenuItem(index)}
                      className="text-red-500 hover:text-red-700 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Restaurant'}
          </button>
        </form>
      </div>
    </div>
  );
}
