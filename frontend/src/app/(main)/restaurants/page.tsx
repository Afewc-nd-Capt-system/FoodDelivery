'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Star, Clock, X, ChevronDown, MapPin } from 'lucide-react';
import Image from 'next/image';

function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white animate-pulse">
      <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="flex gap-2 mt-1">
          <div className="h-3 bg-gray-100 rounded-full w-16" />
          <div className="h-3 bg-gray-100 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

const CUISINE_TYPES = ['All', 'Traditional Nigerian', 'Fast Food', 'Nigerian Grills', 'Premium Nigerian', 'Afro-Fusion'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'delivery_time', label: 'Fastest Delivery' },
  { value: 'price_low', label: 'Price: Low to High' },
];
const QUICK_FILTERS = ['All', 'Rice', 'Swallow', 'Grills', 'Fast Food', 'Soups', 'Premium', 'Budget'];

function RestaurantCard({ restaurant, onClick }: { restaurant: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-3xl overflow-hidden bg-white"
      style={{ cursor: 'pointer',
        boxShadow: hovered
          ? '0 24px 48px rgba(232,98,26,0.14), 0 6px 16px rgba(0,0,0,0.06)'
          : '0 4px 16px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-5px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className="relative h-48 overflow-hidden">
        {restaurant.image ? (
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            width={384}
            height={192}
            className="w-full h-full object-cover"
            style={{
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 0.5s ease',
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg, #E8621A, #BE3A2A)' }}>🍽️</div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
        />
        {restaurant.promoted && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black text-white"
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
        {restaurant.isOpen === false && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="px-4 py-2 bg-white/95 rounded-2xl text-sm font-bold text-gray-700">
              Closed Now
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <MapPin size={11} className="text-white/70" />
          <span className="text-xs text-white/80 font-medium">{restaurant.distance || ''}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-black text-sm" style={{ color: '#1C1C1E' }}>{restaurant.name}</h3>
          <div
            className="flex items-center gap-1 shrink-0 ml-2 px-1.5 py-0.5 rounded-lg"
            style={{ backgroundColor: '#FFF1E8' }}
          >
            <Star size={11} fill="#E8621A" stroke="none" />
            <span className="text-xs font-black" style={{ color: '#E8621A' }}>{restaurant.rating}</span>
            {restaurant.reviewCount != null && <span className="text-[10px]" style={{ color: '#A0A0A0' }}>({restaurant.reviewCount})</span>}
          </div>
        </div>
        <p className="text-xs mb-3 font-medium" style={{ color: '#A0A0A0' }}>{restaurant.cuisine || restaurant.categories?.[0] || ''}</p>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#636366' }}>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span className="font-medium">{restaurant.deliveryTime || ''}</span>
          </div>
          {restaurant.priceRange && <><span className="text-gray-300">•</span>
          <span className="font-medium">{restaurant.priceRange}</span></>}
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-green-600">
            {restaurant.deliveryFee === 0 ? 'Free delivery' : `₦${restaurant.deliveryFee || 0}`}
          </span>
        </div>
        {restaurant.categories && restaurant.categories.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {restaurant.categories.slice(0, 3).map((cat: string) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
            >
              {cat}
            </span>
          ))}
        </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full mt-3 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
        >
          View Menu
        </button>
      </div>
    </div>
  );
}

function RestaurantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [search, setSearch] = useState(initialQ);
  const [sortBy, setSortBy] = useState('relevance');
  const [minRating, setMinRating] = useState(0);
  const [maxDelivery, setMaxDelivery] = useState(60);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState('All');
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true)
      try {
        const savedLocation = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('userLocation') || '{}')
          : {}

        let url = 'https://vibechops.onrender.com/api/v2/restaurants?limit=50'

        if (savedLocation?.city) {
          url += `&city=${encodeURIComponent(savedLocation.city)}`
        }

        const res = await fetch(url)
        const data = await res.json()
        setRestaurants(data.restaurants || [])
      } catch (err) {
        console.error('Failed to fetch restaurants:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRestaurants()
  }, [])

  const filtered = useMemo(() => {
    let result = restaurants.filter(r => {
      if (
        search &&
        !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.cuisine?.toLowerCase().includes(search.toLowerCase()) &&
        !(r.categories || []).some((c: string) => c.toLowerCase().includes(search.toLowerCase()))
      ) return false;
      if (r.rating < minRating) return false;
      if (selectedCuisine !== 'All' && r.cuisine !== selectedCuisine) return false;
      if (priceRange.length > 0 && !priceRange.includes(r.priceRange)) return false;
      return true;
    });

    if (sortBy === 'rating') result = [...result].sort((a: any, b: any) => b.rating - a.rating);
    if (sortBy === 'price_low') result = [...result].sort((a: any, b: any) => (a.priceRange?.length || 0) - (b.priceRange?.length || 0));
    return result;
  }, [search, minRating, selectedCuisine, priceRange, sortBy, restaurants]);

  const activeFilterCount = [minRating > 0, selectedCuisine !== 'All', priceRange.length > 0].filter(Boolean).length;

  const clearFilters = () => {
    setMinRating(0);
    setSelectedCuisine('All');
    setPriceRange([]);
    setMaxDelivery(60);
    setQuickFilter('All');
  };

  const togglePrice = (p: string) =>
    setPriceRange(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black text-white mb-2">
            {initialQ ? (
              <>Results for "<span style={{ color: '#E8621A' }}>{initialQ}</span>"</>
            ) : (
              'All Restaurants'
            )}
          </h1>
          <p className="text-white/40 text-sm mb-6">
            {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} found near you
          </p>

          {/* Search row */}
          <div className="flex gap-3">
            <div
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.1)' }}
            >
              <Search size={17} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search restaurants, dishes, cuisines..."
                className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/70 transition-colors">
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all"
              style={{
                backgroundColor: showFilters || activeFilterCount > 0 ? '#E8621A' : 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                color: 'white',
              }}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="flex gap-7">
          {/* ── SIDEBAR ── */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block shrink-0 w-72`}>
            <div
              className="bg-white rounded-3xl p-6 sticky top-24"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg" style={{ color: '#1C1C1E' }}>Filters</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm font-bold px-3 py-1 rounded-xl"
                    style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Rating */}
              <div className="mb-7">
                <h4 className="font-bold text-sm mb-3" style={{ color: '#1C1C1E' }}>Minimum Rating</h4>
                <div className="flex gap-2 flex-wrap">
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                      style={
                        minRating === r
                          ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white' }
                          : { backgroundColor: '#F5F5F5', color: '#636366' }
                      }
                    >
                      {r > 0 && <Star size={11} fill="currentColor" stroke="none" />}
                      {r === 0 ? 'Any' : `${r}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="mb-7">
                <h4 className="font-bold text-sm mb-3" style={{ color: '#1C1C1E' }}>Price Range</h4>
                <div className="flex gap-2 flex-wrap">
                  {['₦', '₦₦', '₦₦₦', '₦₦₦₦'].map(p => (
                    <button
                      key={p}
                      onClick={() => togglePrice(p)}
                      className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                      style={
                        priceRange.includes(p)
                          ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white' }
                          : { backgroundColor: '#F5F5F5', color: '#636366' }
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuisine */}
              <div className="mb-7">
                <h4 className="font-bold text-sm mb-3" style={{ color: '#1C1C1E' }}>Cuisine</h4>
                <div className="space-y-1">
                  {CUISINE_TYPES.map(cuisine => (
                    <button
                      key={cuisine}
                      onClick={() => setSelectedCuisine(cuisine)}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between"
                      style={
                        selectedCuisine === cuisine
                          ? { backgroundColor: '#FFF1E8', color: '#E8621A', fontWeight: '700' }
                          : { color: '#636366' }
                      }
                    >
                      {cuisine}
                      {selectedCuisine === cuisine && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8621A' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max delivery time */}
              <div>
                <h4 className="font-bold text-sm mb-3 flex items-center justify-between" style={{ color: '#1C1C1E' }}>
                  Max Delivery Time
                  <span className="font-black" style={{ color: '#E8621A' }}>{maxDelivery} min</span>
                </h4>
                <input
                  type="range"
                  min={15}
                  max={60}
                  value={maxDelivery}
                  onChange={e => setMaxDelivery(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: '#E8621A' }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: '#A0A0A0' }}>
                  <span>15 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Sort + count bar */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm" style={{ color: '#636366' }}>
                <span className="font-black" style={{ color: '#1C1C1E' }}>{filtered.length}</span> restaurants
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm hidden sm:inline" style={{ color: '#A0A0A0' }}>Sort by:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-semibold bg-white outline-none cursor-pointer"
                    style={{ color: '#1C1C1E', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #E8E8E8' }}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#636366' }}
                  />
                </div>
              </div>
            </div>

            {/* Quick filter chips */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 mb-6"
              style={{ scrollbarWidth: 'none' }}
            >
              {QUICK_FILTERS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setQuickFilter(cat)}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                  style={
                    quickFilter === cat
                      ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white' }
                      : { backgroundColor: 'white', color: '#636366', border: '1.5px solid #E8E8E8' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-7xl mb-5">🍽️</div>
                <h3 className="text-xl font-black mb-2" style={{ color: '#1C1C1E' }}>No restaurants found</h3>
                <p className="text-sm mb-6" style={{ color: '#636366' }}>
                  Try adjusting your filters or searching for something else
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((restaurant: any) => (
                  <RestaurantCard
                    key={restaurant._id}
                    restaurant={restaurant}
                    onClick={() => router.push(`/restaurant/${restaurant._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <RestaurantsPageContent />
    </Suspense>
  );
}
