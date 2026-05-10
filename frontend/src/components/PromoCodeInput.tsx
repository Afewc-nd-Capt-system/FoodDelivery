'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Tag } from 'lucide-react';

interface PromoCodeInputProps {
  onApply: (code: string, discount: number) => void;
  onRemove: () => void;
  appliedCode?: string;
  discount?: number;
  restaurantId?: string;
  orderAmount?: number;
}

export function PromoCodeInput({ onApply, onRemove, appliedCode, discount, restaurantId, orderAmount }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/promo-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim(), restaurantId, orderAmount }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setSuccess(true);
        onApply(code.toUpperCase(), data.discount);
        setCode('');
      } else {
        setError(data.message || 'Invalid promo code');
      }
    } catch (error) {
      setError('Failed to validate promo code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {appliedCode ? (
        <div className="flex items-center justify-between p-4 bg-[#F0FDF4] border border-[#16A34A] rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#16A34A]" />
            <div>
              <p className="font-bold text-[#1C1C1E]">{appliedCode}</p>
              <p className="text-sm text-[#16A34A]">{discount}% discount applied</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <X className="w-4 h-4 text-[#D32F2F]" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
            <Input
              placeholder="Enter promo code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="pl-10 border-[#E8E8E8] rounded-xl"
              onKeyPress={(e) => e.key === 'Enter' && handleApply()}
            />
          </div>
          <Button
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
          >
            {loading ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#D32F2F] flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-[#16A34A] flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Promo code applied successfully!
        </p>
      )}
    </div>
  );
}
