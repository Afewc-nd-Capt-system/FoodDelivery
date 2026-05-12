'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronRight, Star, Clock, Zap, Shield, ArrowRight, Flame, TrendingUp, ChevronLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { restaurants, vendors } from '@/data/mockData';
import { useLocation } from '@/context/LocationContext';

const CATEGORIES = [
  { label: 'Rice', emoji: '🍚' },
  { label: 'Swallow', emoji: '🥣' },
  { label: 'Grills', emoji: '🔥' },
  { label: 'Fast Food', emoji: '🍔' },
  { label: 'Soups', emoji: '🍲' },
  { label: 'Drinks', emoji: '🥤' },
  { label: 'Snacks', emoji: '🍿' },
  { label: 'Desserts', emoji: '🍰' },
  { label: 'Seafood', emoji: '🦞' },
  { label: 'Healthy', emoji: '🥗' },
];

function SkeletonRestaurantCard() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white shrink-0 w-72 animate-pulse">
      <div className="h-44 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="flex gap-2">
          <div className="h-3 bg-gray-100 rounded-full w-16" />
          <div className="h-3 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor, onClick }: { vendor: typeof vendors[0]; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-3xl overflow-hidden bg-white cursor-pointer shrink-0 w-72 select-none"
      style={{
        boxShadow: hovered
          ? '0 24px 48px rgba(232,98,26,0.18), 0 8px 16px rgba(0,0,0,0.06)'
          : '0 4px 20px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={vendor.image}
          alt={vendor.name}
          width={288}
          height={176}
          className="w-full h-full object-cover"
          style={{
            transform: hovered ? 'scale(1.07)' : 'scale(1)',
            transition: 'transform 0.5s ease',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
        />
        {vendor.promoted && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide text-white"
            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
          >
            FEATURED
          </div>
        )}
        {vendor.discount && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-black text-white"
            style={{ background: 'linear-gradient(135deg, #BE3A2A, #8B2520)' }}
          >
            {vendor.discount}
          </div>
        )}
        {!vendor.isOpen && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="px-4 py-2 bg-white/95 rounded-2xl text-sm font-bold text-gray-700 shadow-lg">
              Closed Now
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <MapPin size={11} className="text-white/80" />
          <span className="text-xs text-white/80 font-medium">{vendor.distance}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-black text-sm leading-snug" style={{ color: '#1C1C1E' }}>
            {vendor.name}
          </h3>
          <div
            className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg ml-2"
            style={{ backgroundColor: '#FFF1E8' }}
          >
            <Star size={11} fill="#E8621A" stroke="none" />
            <span className="text-xs font-black" style={{ color: '#E8621A' }}>{vendor.rating}</span>
          </div>
        </div>
        <p className="text-xs mb-3 font-medium" style={{ color: '#A0A0A0' }}>{vendor.cuisine}</p>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#636366' }}>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span className="font-medium">{vendor.deliveryTime}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="font-medium">{vendor.priceRange}</span>
          <span className="text-gray-300">•</span>
          <span className="font-medium text-green-600">
            {vendor.deliveryFee === 0 ? 'Free' : `₦${vendor.deliveryFee}`} delivery
          </span>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {vendor.categories.slice(0, 3).map(cat => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
            >
              {cat}
            </span>
          ))}
        </div>
        <div className="mt-3 text-xs" style={{ color: '#636366' }}>
          <span className="font-medium">Cooking Days: </span>
          <span>{vendor.cookingDays.join(', ')}</span>
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant, onClick }: { restaurant: typeof restaurants[0]; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-3xl overflow-hidden bg-white shrink-0 w-72 select-none"
      style={{
        boxShadow: hovered
          ? '0 24px 48px rgba(232,98,26,0.18), 0 8px 16px rgba(0,0,0,0.06)'
          : '0 4px 20px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          width={288}
          height={176}
          className="w-full h-full object-cover"
          style={{
            transform: hovered ? 'scale(1.07)' : 'scale(1)',
            transition: 'transform 0.5s ease',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
        />
        {restaurant.promoted && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide text-white"
            style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
          >
            FEATURED
          </div>
        )}
        {restaurant.discount && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-black text-white"
            style={{ background: 'linear-gradient(135deg, #BE3A2A, #8B2520)' }}
          >
            {restaurant.discount}
          </div>
        )}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="px-4 py-2 bg-white/95 rounded-2xl text-sm font-bold text-gray-700 shadow-lg">
              Closed Now
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <MapPin size={11} className="text-white/80" />
          <span className="text-xs text-white/80 font-medium">{restaurant.distance}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-black text-sm leading-snug" style={{ color: '#1C1C1E' }}>
            {restaurant.name}
          </h3>
          <div
            className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg ml-2"
            style={{ backgroundColor: '#FFF1E8' }}
          >
            <Star size={11} fill="#E8621A" stroke="none" />
            <span className="text-xs font-black" style={{ color: '#E8621A' }}>{restaurant.rating}</span>
          </div>
        </div>
        <p className="text-xs mb-3 font-medium" style={{ color: '#A0A0A0' }}>{restaurant.cuisine}</p>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#636366' }}>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span className="font-medium">{restaurant.deliveryTime}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="font-medium">{restaurant.priceRange}</span>
          <span className="text-gray-300">•</span>
          <span className="font-medium text-green-600">
            {restaurant.deliveryFee === 0 ? 'Free' : `₦${restaurant.deliveryFee}`} delivery
          </span>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {restaurant.categories.slice(0, 3).map(cat => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
            >
              {cat}
            </span>
          ))}
        </div>
        <button
          onClick={onClick}
          className="w-full mt-3 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
        >
          View Menu
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { 
    location: userLocation, 
    isLocationEnabled, 
    isDetecting, 
    detectionError,
    detectLocation,
    setLocation 
  } = useLocation();

  // Get location display text
  const getLocationDisplay = () => {
    if (userLocation.city && userLocation.state) {
      return `${userLocation.city}, ${userLocation.state}`;
    }
    return userLocation.city || 'Select Location';
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let url = '/restaurants';
    const params = new URLSearchParams();
    
    if (search) {
      params.set('q', search);
    }
    
    if (isLocationEnabled && userLocation.lat && userLocation.lng) {
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
    } else if (isLocationEnabled && userLocation.city) {
      params.set('city', userLocation.city);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    router.push(url);
  };

  const openRestaurants = restaurants.filter(r => r.isOpen);
  const openVendors = vendors.filter(v => v.isOpen);

  return (
    <div style={{ backgroundColor: '#FFF8F0' }}>

      {/* ── HERO ─────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A0E0A 0%, #2C1810 45%, #1A1410 100%)' }}
      >
        {/* Ambient blobs */}
        <div
          className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #E8621A 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #BE3A2A 0%, transparent 70%)' }}
        />

        {/* Hero food image — right side */}
        <div className="absolute right-0 top-0 bottom-0 w-[52%] hidden lg:block pointer-events-none">
          <Image
            src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80"
            alt="Delicious Nigerian food"
            width={600}
            height={500}
            className="object-cover w-full h-full"
            style={{ opacity: 0.35 }}
            priority
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, #1A0E0A 5%, rgba(26,14,10,0.6) 40%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-xl">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-7"
              style={{
                background: 'rgba(232,98,26,0.15)',
                border: '1px solid rgba(232,98,26,0.35)',
                color: '#FF9055',
              }}
            >
              <Flame size={12} />
              #1 Food Delivery{isLocationEnabled ? ` in ${userLocation.city}` : ' in Nigeria'}
              <TrendingUp size={12} />
            </div>

            <h1 className="font-black text-white leading-[1.05] mb-5" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}>
              Order food you love,{' '}
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #FF8C42, #E8621A)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                delivered fast
              </span>
            </h1>
            <p className="text-white/60 mb-9 leading-relaxed" style={{ fontSize: '1.05rem' }}>
              From the best Nigerian restaurants to your doorstep in 30 minutes or less. Real food, real vibes.
            </p>

            {/* Location prompt if not enabled */}
            {!isLocationEnabled && (
              <div
                className="mb-6 p-4 rounded-2xl flex items-center justify-between"
                style={{ backgroundColor: 'rgba(232,98,26,0.1)', border: '1px solid rgba(232,98,26,0.3)' }}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={20} style={{ color: '#E8621A' }} />
                  <div>
                    <p className="text-sm font-semibold text-white">Enable location to see restaurants near you</p>
                    <p className="text-xs text-white/70">Get personalized recommendations and faster delivery</p>
                  </div>
                </div>
                <button
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin inline mr-1" />
                      Detecting...
                    </>
                  ) : (
                    'Enable Location'
                  )}
                </button>
              </div>
            )}

            {/* Search form */}
            <form onSubmit={handleSearch}>
              <div
                className="flex gap-2 p-2 rounded-2xl"
                style={{
                  backgroundColor: 'white',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                {/* Location */}
                <div
                  className="hidden sm:flex items-center gap-1.5 pl-3 pr-3 border-r shrink-0 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                  style={{ borderColor: '#F0EAE0' }}
                  onClick={() => router.push('/restaurants?location=true')}
                >
                  <MapPin size={15} style={{ color: isLocationEnabled ? '#16A34A' : '#E8621A' }} />
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#1C1C1E' }}>
                    {getLocationDisplay()}
                  </span>
                </div>
                {/* Input */}
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isLocationEnabled ? "Search for food, restaurants, or dishes..." : "Enable location to search nearby restaurants..."}
                  className="flex-1 text-sm outline-none py-2.5 min-w-0 placeholder:text-gray-400"
                  style={{ color: '#1C1C1E' }}
                />
                {/* Submit */}
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                >
                  <Search size={16} />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </form>

            {/* Popular tags */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="text-white/30 text-xs font-medium">Trending:</span>
              {['Jollof Rice', 'Suya', 'Egusi', 'Shawarma', 'Puff Puff'].map(term => {
                let url = `/restaurants?q=${encodeURIComponent(term)}`;
                if (isLocationEnabled && userLocation.lat && userLocation.lng) {
                  url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
                } else if (isLocationEnabled && userLocation.city) {
                  url += `&city=${encodeURIComponent(userLocation.city)}`;
                }
                return (
                  <button
                    key={term}
                    onClick={() => router.push(url)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:bg-white/20"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="relative border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.25)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {[
                { value: '200+', label: 'Restaurants' },
                { value: '28 min', label: 'Avg Delivery' },
                { value: '50K+', label: 'Happy Customers' },
                { value: '4.8★', label: 'App Rating' },
                { value: '₦0', label: 'Min Delivery Fee' },
              ].map((stat, i) => (
                <div key={stat.label} className={`text-center ${i >= 3 ? 'hidden sm:block' : ''}`}>
                  <div className="text-xl font-black" style={{ color: '#E8621A' }}>{stat.value}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROMO BANNERS ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Banner 1 */}
          <div
            className="relative overflow-hidden rounded-3xl p-7 text-white cursor-pointer group transition-transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #E8621A 0%, #C4501A 100%)' }}
            onClick={() => router.push('/restaurants')}
          >
            <div className="absolute -right-6 -bottom-6 text-[110px] opacity-15 select-none group-hover:opacity-25 transition-opacity">🍔</div>
            <div className="relative">
              <div className="text-xs font-bold opacity-75 mb-1 tracking-wide uppercase">Limited Time</div>
              <div className="text-4xl font-black mb-1">20% OFF</div>
              <div className="text-sm opacity-80 mb-5">
                Use code <span className="font-black bg-white/20 px-2 py-0.5 rounded-lg">VIBES20</span> at checkout
              </div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-sm font-black transition-transform group-hover:scale-105"
                style={{ color: '#E8621A' }}
              >
                Order Now <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Banner 2 */}
          <div
            className="relative overflow-hidden rounded-3xl p-7 text-white cursor-pointer group transition-transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #BE3A2A 0%, #8B2520 100%)' }}
            onClick={() => router.push('/restaurants')}
          >
            <div className="absolute -right-6 -bottom-6 text-[110px] opacity-15 select-none group-hover:opacity-25 transition-opacity">🍲</div>
            <div className="relative">
              <div className="text-xs font-bold opacity-75 mb-1 tracking-wide uppercase">Weekend Special</div>
              <div className="text-4xl font-black mb-1">Free Delivery</div>
              <div className="text-sm opacity-80 mb-5">On all orders above ₦3,000 this weekend</div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-sm font-black transition-transform group-hover:scale-105"
                style={{ color: '#BE3A2A' }}
              >
                Explore <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>Browse by Category</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>What are you craving today?</p>
          </div>
          <button
            onClick={() => router.push('/restaurants')}
            className="flex items-center gap-1 text-sm font-bold transition-colors hover:opacity-80"
            style={{ color: '#E8621A' }}
          >
            See all <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => {
                  setActiveCategory(isActive ? null : cat.label);
                  router.push(`/restaurants?cat=${encodeURIComponent(cat.label)}`);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: isActive ? '#E8621A' : 'white',
                  boxShadow: isActive
                    ? '0 8px 24px rgba(232,98,26,0.3)'
                    : '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                <span className="text-2xl leading-none">{cat.emoji}</span>
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: isActive ? 'white' : '#1C1C1E' }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── FEATURED CAROUSEL ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>Featured Restaurants</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>Top picks near you right now</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Arrow controls */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30"
                style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                <ChevronLeft size={18} style={{ color: '#1C1C1E' }} />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30"
                style={{ backgroundColor: '#E8621A' }}
              >
                <ChevronRight size={18} className="text-white" />
              </button>
            </div>
            <button
              onClick={() => router.push('/restaurants')}
              className="flex items-center gap-1 text-sm font-bold"
              style={{ color: '#E8621A' }}
            >
              View all <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {restaurants.map(r => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              onClick={() => router.push(`/restaurant/${r.id}`)}
            />
          ))}
        </div>
      </section>

      {/* ── FEATURED VENDORS ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>Featured Vendors</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>Top-rated home cooks and caterers near you</p>
          </div>
          <button
            onClick={() => router.push('/vendors')}
            className="flex items-center gap-1 text-sm font-bold"
            style={{ color: '#E8621A' }}
          >
            View all <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {vendors.slice(0, 4).map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              onClick={() => router.push(`/vendors/${v.id}`)}
            />
          ))}
        </div>
      </section>

      {/* ── OPEN VENDORS ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>Open Vendors</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>
              <span
                className="inline-flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                {openVendors.length} vendors ready to cook
              </span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {openVendors.map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              onClick={() => router.push(`/vendors/${v.id}`)}
            />
          ))}
        </div>
      </section>

      {/* ── OPEN NOW GRID ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>Open Now</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>
              <span
                className="inline-flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                {openRestaurants.length} restaurants ready to deliver
              </span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {openRestaurants.map(r => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              onClick={() => router.push(`/restaurant/${r.id}`)}
            />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────── */}
      <section style={{ backgroundColor: '#1C1C1E' }} className="py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white mb-3">How VibeChops Works</h2>
            <p className="text-white/40 text-sm">Order your favourite Nigerian food in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Find Your Vibe',
                desc: 'Browse 200+ restaurants and thousands of dishes. Filter by cuisine, rating, price or delivery time.',
                color: '#E8621A',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Place Your Order',
                desc: 'Customise your meal, add to cart and checkout in seconds. Pay via Paystack, card or bank transfer.',
                color: '#FF8C42',
              },
              {
                step: '03',
                icon: MapPin,
                title: 'Track & Enjoy',
                desc: 'Watch your order in real-time as it gets prepared and delivered hot to your door. Rate & review after.',
                color: '#BE3A2A',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative text-center p-8 rounded-3xl group transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: '#242424' }}
              >
                {/* Step number watermark */}
                <div
                  className="absolute top-4 right-5 text-6xl font-black opacity-[0.06] pointer-events-none select-none"
                  style={{ color: item.color }}
                >
                  {item.step}
                </div>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <h3 className="font-black text-white mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {item.desc}
                </p>

                {/* Connector arrow */}
                {i < 2 && (
                  <div
                    className="absolute top-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center hidden md:flex z-10"
                    style={{ backgroundColor: '#E8621A', transform: 'translateY(-50%)' }}
                  >
                    <ChevronRight size={13} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Shield,
              title: 'Secure Payments',
              desc: 'All transactions protected with bank-level SSL encryption via Paystack. Your money is always safe.',
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              desc: 'Average delivery time of just 28 minutes. Real-time GPS tracking so you always know where your food is.',
            },
            {
              icon: Star,
              title: 'Quality Guaranteed',
              desc: 'Every partner restaurant is vetted, rated and quality-checked. Only the best make it onto VibeChops.',
            },
          ].map(item => (
            <div
              key={item.title}
              className="flex items-start gap-4 p-6 rounded-2xl bg-white group transition-all duration-300 hover:-translate-y-1"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #FFF1E8, #FFE0CC)' }}
              >
                <item.icon size={22} style={{ color: '#E8621A' }} />
              </div>
              <div>
                <h4 className="font-black mb-1.5" style={{ color: '#1C1C1E' }}>{item.title}</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#636366' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #E8621A 0%, #BE3A2A 100%)' }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {['🍔', '🍲', '🔥', '🍚', '🥩', '🍿'].map((emoji, i) => (
              <span
                key={i}
                className="absolute text-5xl opacity-[0.12] select-none"
                style={{ left: `${i * 18}%`, bottom: '-8px', transform: 'rotate(-10deg)' }}
              >
                {emoji}
              </span>
            ))}
          </div>

          <div className="relative text-center py-16 px-6">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Ready to VibeChop? 🔥</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto text-base">
              Join 50,000+ Lagosians ordering their favourite meals daily.
              Your first order gets <strong className="text-white">15% off</strong>!
            </p>
            <button
              onClick={() => router.push('/restaurants')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ color: '#E8621A' }}
            >
              Start Ordering <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
