'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit } from 'lucide-react';
import { api } from '@/lib/api';

interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
}

export default function PromoCodesAdminPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: 0,
    validUntil: '',
    usageLimit: 0,
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const data = await api.promoCodes.getAdmin();
      setPromoCodes(data);
    } catch (error) {
      console.error('Failed to load promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.promoCodes.update(editingId, formData);
      } else {
        await api.promoCodes.create(formData);
      }
      loadPromoCodes();
      resetForm();
    } catch (error) {
      console.error('Failed to save promo code:', error);
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setFormData({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount,
      maxDiscount: promo.maxDiscount || 0,
      validUntil: new Date(promo.validUntil).toISOString().split('T')[0],
      usageLimit: promo.usageLimit || 0,
    });
    setEditingId(promo._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await api.promoCodes.delete(id);
      loadPromoCodes();
    } catch (error) {
      console.error('Failed to delete promo code:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderAmount: 0,
      maxDiscount: 0,
      validUntil: '',
      usageLimit: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Promo Codes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Plus className="w-5 h-5" /> Add Promo Code
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Promo Code' : 'Create Promo Code'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAVE20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
              <input
                type="number"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit (0 = unlimited)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {promoCodes.map((promo) => (
              <tr key={promo._id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{promo.code}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">₹{promo.minOrderAmount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {promo.usageLimit ? `${promo.usageCount}/${promo.usageLimit}` : `${promo.usageCount}/∞`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(promo.validUntil).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(promo)} className="text-blue-600 hover:text-blue-800">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(promo._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {promoCodes.length === 0 && (
          <div className="text-center py-8 text-gray-500">No promo codes found</div>
        )}
      </div>
    </div>
  );
}