'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Clock, MapPin, ShoppingCart, Plus, Minus, X,
  ChevronLeft, ThumbsUp, Phone, Heart, Share2
} from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

interface MenuItemOption {
  label: string;
  price: number;
}

interface MenuCustomization {
  name: string;
  options: MenuItemOption[];
}

interface MenuItem {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  popular?: boolean;
  calories?: string;
  customizations?: MenuCustomization[];
}

interface Review {
  id: string;
  restaurantId: string;
  userName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

interface ApiMenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  popular?: boolean;
  calories?: string;
  customizationOptions?: {
    name: string;
    options: { name: string; price: number }[];
  }[];
}

function apiMenuToMock(api: ApiMenuItem, restaurantId: string, restaurantName?: string): MenuItem {
  return {
    id: api._id,
    restaurantId,
    restaurantName,
    name: api.name,
    description: api.description || '',
    price: api.price,
    image: api.image || '',
    category: api.category || '',
    popular: api.popular || false,
    calories: api.calories || undefined,
    customizations: (api.customizationOptions || []).map(c => ({
      name: c.name,
      options: c.options.map(o => ({ label: o.name, price: o.price })),
    })),
  };
}

/* ─── Zomato-style Item Detail Modal ─────────────────── */
function ItemDetailModal({
  item, restaurantName, onClose, onAddToCart, onOrderNow,
}: {
  item: MenuItem;
  restaurantName: string;
  onClose: () => void;
  onAddToCart: (item: MenuItem, options: Record<string, string>, qty: number, instructions: string) => void;
  onOrderNow: (item: MenuItem, options: Record<string, string>, qty: number, instructions: string) => void;
}) {
  const [customizations, setCustomizations] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const extraCost = Object.values(customizations).reduce((sum, label) => {
    const opt = item.customizations?.flatMap(c => c.options).find(o => o.label === label);
    return sum + (opt?.price || 0);
  }, 0);

  const totalPrice = (item.price + extraCost) * qty;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 101, background: 'white',
        borderRadius: '24px 24px 0 0',
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ position: 'relative', height: '240px' }}>
            <img
              src={item.image}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)',
            }} />
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none',
                color: 'white', fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
            <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
              <h2 style={{ color: 'white', fontWeight: '900', fontSize: '22px', margin: '0 0 4px' }}>
                {item.name}
              </h2>
              {item.popular && (
                <span style={{
                  background: '#E8621A', color: 'white',
                  padding: '2px 10px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: '700',
                }}>🔥 Popular</span>
              )}
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <p style={{ color: '#636366', lineHeight: 1.6, marginBottom: '12px', fontSize: '14px' }}>
              {item.description}
            </p>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '13px', color: '#A0A0A0' }}>
              {item.calories && <span>🔥 {item.calories}</span>}
              <span style={{ color: '#E8621A', fontWeight: '900', fontSize: '22px' }}>
                ₦{totalPrice.toLocaleString()}
              </span>
            </div>

            {item.customizations?.map((group: any) => (
              <div key={group.name} style={{
                marginBottom: '20px', padding: '16px',
                background: '#FAFAFA', borderRadius: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontWeight: '800', color: '#1C1C1E', margin: 0 }}>{group.name}</h4>
                  <span style={{
                    background: '#FFF1E8', color: '#E8621A',
                    padding: '2px 8px', borderRadius: '8px',
                    fontSize: '11px', fontWeight: '700',
                  }}>Required</span>
                </div>
                {group.options.map((opt: any) => (
                  <label key={opt.label} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid #F0EAE0',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: `2px solid ${customizations[group.name] === opt.label ? '#E8621A' : '#E8E8E8'}`,
                        background: customizations[group.name] === opt.label ? '#E8621A' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {customizations[group.name] === opt.label && (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <span style={{ color: '#1C1C1E', fontSize: '14px' }}>{opt.label}</span>
                    </div>
                    {opt.price > 0 && (
                      <span style={{ color: '#E8621A', fontWeight: '700', fontSize: '13px' }}>
                        +₦{opt.price.toLocaleString()}
                      </span>
                    )}
                    <input type="radio" name={group.name}
                      value={opt.label} style={{ display: 'none' }}
                      checked={customizations[group.name] === opt.label}
                      onChange={() => setCustomizations(prev => ({ ...prev, [group.name]: opt.label }))}
                    />
                  </label>
                ))}
              </div>
            ))}

            <div style={{ marginBottom: '80px' }}>
              <label style={{ fontWeight: '700', color: '#1C1C1E', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Special Instructions (Optional)
              </label>
              <textarea
                placeholder="Any allergies, preferences or special requests..."
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #E8E8E8', borderRadius: '12px',
                  fontSize: '14px', outline: 'none', resize: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #F0EAE0',
          background: 'white',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F5F5F5', borderRadius: '12px', padding: '8px 16px' }}>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: 'none', background: qty > 1 ? '#E8621A' : '#E8E8E8',
                color: qty > 1 ? 'white' : '#A0A0A0',
                fontWeight: '900', fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
            <span style={{ fontWeight: '900', fontSize: '18px', color: '#1C1C1E', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(10, q + 1))}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: 'none', background: '#E8621A',
                color: 'white', fontWeight: '900', fontSize: '18px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
          </div>
          <button
            onClick={() => { onAddToCart(item, customizations, qty, specialInstructions); onClose(); }}
            style={{
              flex: 1, padding: '14px',
              border: '2px solid #E8621A', borderRadius: '14px',
              background: 'white', color: '#E8621A',
              fontWeight: '800', fontSize: '15px', cursor: 'pointer',
            }}>
            Add to Cart
          </button>
          <button
            onClick={() => { onOrderNow(item, customizations, qty, specialInstructions); }}
            style={{
              flex: 1, padding: '14px', border: 'none',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #E8621A, #C4501A)',
              color: 'white', fontWeight: '800', fontSize: '15px',
              cursor: 'pointer',
            }}>
            Order Now →
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, items, updateQuantity, totalItems, subtotal } = useCart();

  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [restaurantReviews, setRestaurantReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    (async () => {
      try {
        const res = await fetch(`${API}/restaurants/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        // Enrich API data with display-friendly fields
        const enriched = {
          ...data,
          _id: data._id,
          coverImage: data.image || data.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
          address: typeof data.address === 'string' ? data.address : (data.address?.formattedAddress || `${data.address?.street || ''}, ${data.address?.area || ''}, ${data.address?.city || ''}`),
          distance: data.distance || '~2.5 km',
          cuisine: Array.isArray(data.cuisine) ? data.cuisine.join(', ') : (data.cuisine || 'Nigerian'),
          deliveryFee: data.deliveryFee || 0,
          minOrder: data.minOrder || 0,
        };
        setRestaurant(enriched);
        setMenu(items);

        const revs: Review[] = (data.reviews || []).map((r: any, i: number) => ({
          id: r._id || `rev-${i}`,
          restaurantId: data._id,
          userName: r.user || 'Anonymous',
          avatar: (r.user || 'A').charAt(0).toUpperCase(),
          rating: r.rating || 5,
          comment: r.comment || '',
          date: r.date ? new Date(r.date).toLocaleDateString() : 'Recently',
          helpful: 0,
        }));
        setRestaurantReviews(revs);
      } catch (err) {
        console.error('Failed to fetch restaurant:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const filtered = activeCategory === 'All' ? menu : menu.filter(m => m.category === activeCategory);

  const getItemQty = (itemId: string) => items.find(i => i.id === itemId)?.quantity || 0;

  const handleAddToCart = (
    item: MenuItem,
    options: Record<string, string> = {},
    qty = 1,
    instructions = '',
  ) => {
    const enriched = { ...item, restaurantName: restaurant.name };
    for (let i = 0; i < qty; i++) addItem(enriched, options);
    setModalOpen(false);
    showToast('Added to cart!');
  };

  const handleOrderNow = (
    item: MenuItem,
    options: Record<string, string> = {},
    qty = 1,
    instructions = '',
  ) => {
    const enriched = { ...item, restaurantName: restaurant.name };
    for (let i = 0; i < qty; i++) addItem(enriched, options);
    setModalOpen(false);
    router.push('/cart');
  };

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold" style={{ color: '#636366' }}>Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <p className="text-lg font-black mb-2" style={{ color: '#1C1C1E' }}>Restaurant not found</p>
          <p className="text-sm" style={{ color: '#636366' }}>The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const deliveryTotal = restaurant.deliveryFee || 0;
  const total = subtotal + deliveryTotal;

  return (
    <div style={{ backgroundColor: '#FFF8F0' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#16A34A', color: 'white',
          padding: '12px 24px', borderRadius: '14px', fontWeight: '700',
          fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Cover image */}
      <div className="relative h-64 sm:h-80 lg:h-[420px] overflow-hidden">
        <Image
          src={restaurant.coverImage}
          alt={restaurant.name}
          fill
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)' }}
        />

        {/* Action bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSaved(s => !s)}
              className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
              style={{ backgroundColor: saved ? 'rgba(232,98,26,0.9)' : 'rgba(0,0,0,0.35)' }}
            >
              <Heart size={17} fill={saved ? 'white' : 'none'} className="text-white" />
            </button>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-white/20"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            >
              <Share2 size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{restaurant.name}</h1>
            <p className="text-white/70 text-sm mb-4">{restaurant.cuisine} • {restaurant.address}</p>
            <div className="flex flex-wrap gap-2.5">
              {[
                {
                  icon: Star,
                  text: `${restaurant.rating} (${restaurant.reviewCount} reviews)`,
                  bg: 'rgba(232,98,26,0.25)',
                },
                { icon: Clock, text: restaurant.deliveryTime, bg: 'rgba(0,0,0,0.3)' },
                { icon: MapPin, text: restaurant.distance, bg: 'rgba(0,0,0,0.3)' },
              ].map(badge => (
                <div
                  key={badge.text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-sm font-medium backdrop-blur-sm"
                  style={{ backgroundColor: badge.bg }}
                >
                  <badge.icon size={13} />
                  {badge.text}
                </div>
              ))}
              {restaurant.isOpen ? (
                <div
                  className="px-3 py-1.5 rounded-xl text-sm font-bold backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(34,197,94,0.3)', color: '#86efac' }}
                >
                  ● Open Now
                </div>
              ) : (
                <div
                  className="px-3 py-1.5 rounded-xl text-sm font-bold backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
                >
                  ● Closed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="flex gap-8">
          {/* ── MENU ── */}
          <div className="flex-1 min-w-0">
            {/* Category tabs — sticky */}
            <div
              className="sticky top-[64px] z-10 -mx-4 px-4 py-3 mb-6"
              style={{ backgroundColor: '#FFF8F0' }}
            >
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                    style={
                      activeCategory === cat
                        ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', boxShadow: '0 4px 12px rgba(232,98,26,0.3)' }
                        : { backgroundColor: 'white', color: '#636366', border: '1.5px solid #E8E8E8' }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular label */}
            {activeCategory === 'All' && (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ backgroundColor: '#F0EAE0' }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#E8621A' }}>
                  🔥 Popular
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#F0EAE0' }} />
              </div>
            )}

            {/* Menu grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(item => {
                const qty = getItemQty(item.id);
                return (
                  <div
                    key={item.id}
                    className="group flex gap-4 bg-white rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {item.popular && (
                        <div
                          className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-black text-white"
                          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                        >
                          🔥
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm mb-1" style={{ color: '#1C1C1E' }}>{item.name}</h4>
                      <p
                        className="text-xs leading-relaxed mb-2 line-clamp-2"
                        style={{ color: '#636366' }}
                      >
                        {item.description}
                      </p>
                      {item.calories && (
                        <span className="text-[11px] font-medium" style={{ color: '#A0A0A0' }}>
                          {item.calories}
                        </span>
                      )}
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-black text-base" style={{ color: '#E8621A' }}>
                          ₦{item.price.toLocaleString()}
                        </span>
                        {qty > 0 && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}>
                            {qty} in cart
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── REVIEWS ── */}
            <div className="mt-12">
              <div className="flex items-center gap-3 mb-7">
                <div className="flex-1 h-px" style={{ backgroundColor: '#F0EAE0' }} />
                <h3 className="font-black text-xl" style={{ color: '#1C1C1E' }}>
                  Reviews <span className="text-base font-normal ml-1" style={{ color: '#A0A0A0' }}>({restaurantReviews.length})</span>
                </h3>
                <div className="flex-1 h-px" style={{ backgroundColor: '#F0EAE0' }} />
              </div>

              {/* Rating summary */}
              <div
                className="bg-white rounded-3xl p-6 mb-6 flex items-center gap-8"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
              >
                <div className="text-center shrink-0">
                  <div className="text-5xl font-black mb-1" style={{ color: '#1C1C1E' }}>{restaurant.rating}</div>
                  <div className="flex gap-0.5 justify-center mb-1">
                    {[1,2,3,4,5].map(i => (
                      <Star
                        key={i}
                        size={16}
                        fill={i <= Math.round(restaurant.rating) ? '#E8621A' : '#E8E8E8'}
                        stroke="none"
                      />
                    ))}
                  </div>
                  <div className="text-xs" style={{ color: '#A0A0A0' }}>{restaurant.reviewCount} reviews</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(star => {
                    const count = restaurantReviews.filter(r => r.rating === star).length;
                    const pct = restaurantReviews.length ? (count / restaurantReviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs w-2" style={{ color: '#A0A0A0' }}>{star}</span>
                        <Star size={10} fill="#E8621A" stroke="none" />
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#F0EAE0' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #E8621A, #BE3A2A)' }}
                          />
                        </div>
                        <span className="text-xs w-3 text-right" style={{ color: '#A0A0A0' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {restaurantReviews.map(review => (
                  <div
                    key={review.id}
                    className="bg-white rounded-2xl p-5"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
                        style={{ background: 'linear-gradient(135deg, #E8621A, #BE3A2A)' }}
                      >
                        {review.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{review.userName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={11} fill={i <= review.rating ? '#E8621A' : '#E8E8E8'} stroke="none" />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: '#A0A0A0' }}>{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: '#636366' }}>{review.comment}</p>
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-orange-500"
                      style={{ color: '#A0A0A0' }}
                    >
                      <ThumbsUp size={12} /> Helpful ({review.helpful})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CART SIDEBAR ── */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-[80px]">
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
              >
                {/* Cart header */}
                <div
                  className="p-5 border-b flex items-center gap-2"
                  style={{ borderColor: '#F0EAE0' }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                  >
                    <ShoppingCart size={15} className="text-white" />
                  </div>
                  <h3 className="font-black" style={{ color: '#1C1C1E' }}>Your Order</h3>
                  {totalItems > 0 && (
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                    >
                      {totalItems}
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="font-bold text-sm mb-1" style={{ color: '#1C1C1E' }}>Your cart is empty</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>Add items to get started</p>
                  </div>
                ) : (
                  <>
                    {/* Items */}
                    <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: '#1C1C1E' }}>{item.name}</p>
                            <p className="text-xs font-black" style={{ color: '#E8621A' }}>
                              ₦{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs border"
                              style={{ borderColor: '#E8E8E8', color: '#636366' }}
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-black w-4 text-center" style={{ color: '#1C1C1E' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs"
                              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="px-4 pb-4 space-y-2 border-t pt-4" style={{ borderColor: '#F0EAE0' }}>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#A0A0A0' }}>Subtotal</span>
                        <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#A0A0A0' }}>Delivery</span>
                        <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{deliveryTotal}</span>
                      </div>
                      <div
                        className="flex justify-between font-black pt-2 border-t"
                        style={{ borderColor: '#F0EAE0' }}
                      >
                        <span style={{ color: '#1C1C1E' }}>Total</span>
                        <span style={{ color: '#E8621A' }}>₦{total.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => router.push('/cart')}
                        className="w-full py-3.5 rounded-2xl text-white font-black text-sm mt-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)', boxShadow: '0 6px 20px rgba(232,98,26,0.35)' }}
                      >
                        Checkout →
                      </button>
                    </div>
                  </>
                )}

                {/* Contact row */}
                <div
                  className="px-4 pb-4 flex items-center gap-3 pt-3 border-t"
                  style={{ borderColor: '#F0EAE0' }}
                >
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors hover:bg-orange-50"
                    style={{ borderColor: '#E8E8E8', color: '#636366' }}
                  >
                    <Phone size={13} /> Call Restaurant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cart sticky button */}
      {totalItems > 0 && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => router.push('/cart')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white shadow-2xl transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)', boxShadow: '0 8px 32px rgba(232,98,26,0.4)' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black"
              >
                {totalItems}
              </span>
              <span className="font-bold">View Cart</span>
            </div>
            <span className="font-black">₦{subtotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Item detail modal */}
      {modalOpen && selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          restaurantName={restaurant.name}
          onClose={() => setModalOpen(false)}
          onAddToCart={handleAddToCart}
          onOrderNow={handleOrderNow}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
