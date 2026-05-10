'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Clock, MapPin, ShoppingCart, Plus, Minus, X,
  ChevronLeft, ThumbsUp, Phone, Heart, Share2
} from 'lucide-react';
import Image from 'next/image';
import { restaurants, menuItems, reviews } from '@/data/mockData';
import { useCart } from '@/context/CartContext';
import type { MenuItem } from '@/data/mockData';

/* ─── Customization Modal ─────────────────────────────── */
function CustomizationModal({
  item, onClose, onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, options: Record<string, string>, qty: number) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  const extraCost = Object.values(selections).reduce((sum, label) => {
    const opt = item.customizations?.flatMap(c => c.options).find(o => o.label === label);
    return sum + (opt?.price || 0);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-52">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2) 40%, transparent)' }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="font-black text-lg leading-tight">{item.name}</h3>
            <p className="text-sm text-white/70 mt-0.5 line-clamp-2">{item.description}</p>
          </div>
        </div>

        <div className="p-5 max-h-80 overflow-y-auto">
          {item.customizations?.map(group => (
            <div key={group.name} className="mb-5 last:mb-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-sm" style={{ color: '#1C1C1E' }}>{group.name}</h4>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
                >
                  Pick 1
                </span>
              </div>
              <div className="space-y-2">
                {group.options.map(opt => (
                  <label
                    key={opt.label}
                    className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all"
                    style={{
                      backgroundColor: selections[group.name] === opt.label ? '#FFF1E8' : '#FAFAFA',
                      border: `2px solid ${selections[group.name] === opt.label ? '#E8621A' : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: selections[group.name] === opt.label ? '#E8621A' : '#D0D0D0' }}
                      >
                        {selections[group.name] === opt.label && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8621A' }} />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={group.name}
                        className="sr-only"
                        checked={selections[group.name] === opt.label}
                        onChange={() => setSelections(prev => ({ ...prev, [group.name]: opt.label }))}
                      />
                      <span className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{opt.label}</span>
                    </div>
                    {opt.price > 0 ? (
                      <span className="text-sm font-bold" style={{ color: '#E8621A' }}>+₦{opt.price}</span>
                    ) : (
                      <span className="text-xs" style={{ color: '#A0A0A0' }}>Included</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t" style={{ borderColor: '#F0EAE0' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold" style={{ color: '#1C1C1E' }}>Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-colors"
                style={{ borderColor: '#E8E8E8', color: '#636366' }}
              >
                <Minus size={14} />
              </button>
              <span className="font-black text-lg w-6 text-center" style={{ color: '#1C1C1E' }}>{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button
            onClick={() => onAdd(item, selections, qty)}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
          >
            <ShoppingCart size={18} />
            Add to Cart — ₦{((item.price + extraCost) * qty).toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, items, updateQuantity, totalItems, subtotal } = useCart();

  const id = params.id as string;
  const restaurant = restaurants.find(r => r.id === id) || restaurants[0];
  const menu = menuItems.filter(m => m.restaurantId === (id || '1'));
  const restaurantReviews = reviews.filter(r => r.restaurantId === (id || '1'));

  const [activeCategory, setActiveCategory] = useState('All');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [saved, setSaved] = useState(false);

  const categories = useMemo(() => ['All', ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const filtered = activeCategory === 'All' ? menu : menu.filter(m => m.category === activeCategory);

  const getItemQty = (itemId: string) => items.find(i => i.id === itemId)?.quantity || 0;

  const handleAddToCart = (item: MenuItem, options: Record<string, string> = {}, qty = 1) => {
    for (let i = 0; i < qty; i++) addItem(item, options);
    setCustomizingItem(null);
  };

  const deliveryTotal = restaurant.deliveryFee;
  const total = subtotal + deliveryTotal;

  return (
    <div style={{ backgroundColor: '#FFF8F0' }}>
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
                    className="group flex gap-4 bg-white rounded-2xl p-4 transition-all hover:shadow-md"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
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
                        {qty === 0 ? (
                          <button
                            onClick={() => item.customizations ? setCustomizingItem(item) : handleAddToCart(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-black transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                          >
                            <Plus size={13} /> Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-colors"
                              style={{ borderColor: '#E8621A', color: '#E8621A' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-black text-sm w-5 text-center" style={{ color: '#1C1C1E' }}>{qty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, qty + 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
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

      {/* Customization modal */}
      {customizingItem && (
        <CustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAdd={handleAddToCart}
        />
      )}
    </div>
  );
}
