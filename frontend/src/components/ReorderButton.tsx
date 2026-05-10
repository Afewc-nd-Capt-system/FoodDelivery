'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';

interface ReorderButtonProps {
  orderId: string;
  onSuccess?: () => void;
}

export function ReorderButton({ orderId, onSuccess }: ReorderButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleReorder = async () => {
    if (!confirm('Add all items from this order to your cart?')) return;

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/v2/reorder/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Failed to reorder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleReorder}
      disabled={loading}
      className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-semibold py-3 rounded-xl"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <RotateCcw className="w-4 h-4 mr-2" />
      )}
      {loading ? 'Adding to Cart...' : 'Reorder'}
    </Button>
  );
}
