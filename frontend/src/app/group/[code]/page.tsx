'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Share2, Plus, ShoppingCart } from 'lucide-react';

export default function GroupOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [groupOrder, setGroupOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupOrder();
  }, []);

  const loadGroupOrder = async () => {
    try {
      const result = await api.groupOrders.getByCode(params.code as string);
      setGroupOrder(result.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItems = async () => {
    alert('Add your items to the group order');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  if (!groupOrder) return <div className="min-h-screen flex items-center justify-center"><p>Group order not found</p></div>;

  const totalAmount = groupOrder.items.reduce((sum: number, item: any) => sum + item.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">Group Order</h1>
              <p className="text-gray-600">{groupOrder.restaurantName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Share code:</span>
              <span className="font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded">{groupOrder.shareCode}</span>
            </div>
          </div>
          <button onClick={handleAddItems} className="w-full py-3 bg-orange-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600">
            <Plus className="w-5 h-5" /> Add Your Items
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-semibold text-lg mb-4">Participants ({groupOrder.items.length})</h2>
          <div className="space-y-4">
            {groupOrder.items.map((item: any, idx: number) => (
              <div key={idx} className="border-b pb-4 last:border-0">
                <div className="flex justify-between">
                  <span className="font-medium">{item.userName}</span>
                  <span className="text-orange-500 font-medium">₦{item.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {item.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₦{totalAmount}</span>
          </div>
        </div>

        {user && groupOrder.host === user.id && groupOrder.status === 'active' && (
          <button className="w-full mt-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
            Close & Pay
          </button>
        )}
      </div>
    </div>
  );
}