'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Star } from 'lucide-react';
import Image from 'next/image';

interface AIRecommendationsProps {
  limit?: number;
}

export function AIRecommendations({ limit = 6 }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/v2/recommendations?limit=${limit}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#E8621A] animate-spin" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#E8621A]" />
        <h2 className="text-xl font-black text-[#1C1C1E]">Recommended for You</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((item) => (
          <Link key={item.id} href={item.type === 'restaurant' ? `/restaurants/${item.id}` : `/restaurant/${item.id}`}>
            <Card className="overflow-hidden hover:shadow-[0_4px_20px_rgba(232,98,26,0.15)] transition-all hover:-translate-y-1">
              <div className="relative h-40">
                <Image
                  src={item.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                {item.matchScore && (
                  <Badge className="absolute top-3 left-3 bg-[#E8621A] text-white">
                    {Math.round(item.matchScore * 100)}% Match
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm text-[#1C1C1E]">{item.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-[#E8621A] text-[#E8621A]" />
                  <span className="text-xs text-[#E8621A] font-bold">{item.rating || 4.5}</span>
                  <span className="text-xs text-[#A0A0A0]">• {item.cuisine || 'Various'}</span>
                </div>
                {item.reason && (
                  <p className="text-xs text-[#636366] mt-2 line-clamp-2">{item.reason}</p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
