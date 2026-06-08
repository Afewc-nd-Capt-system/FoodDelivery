'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X, MapPin, ChevronDown, User, Bell, Search, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const majorCities = [
  'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 
  'Benin City', 'Maiduguri', 'Zaria', 'Aba', 'Jos', 'Ilorin',
  'Oyo', 'Enugu', 'Abeokuta', 'Onitsha', 'Uyo', 'Warri', 'Osogbo', 'Ikeja'
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const { totalItems } = useCart();
  const { user } = useAuth();
  const { 
    location: userLocation, 
    isDetecting, 
    detectionError, 
    isLocationEnabled, 
    detectLocation, 
    setLocation 
  } = useLocation();
  const router = useRouter();
  const pathname = usePathname();

  // Get display text for location
  const getLocationDisplay = () => {
    if (userLocation.city && userLocation.state) {
      return `${userLocation.city}, ${userLocation.state}`;
    }
    return userLocation.city || 'Select Location';
  };

  // Handle location selection
  const handleLocationSelect = async (city: string, state?: string) => {
    if (state) {
      setLocation({ city, state, country: 'Nigeria' });
    } else {
      // Try to find state for city or use city as both
      const foundState = nigerianStates.find(s => s.toLowerCase() === city.toLowerCase());
      setLocation({ 
        city, 
        state: foundState || city, 
        country: 'Nigeria' 
      });
    }
    setLocationOpen(false);
  };

  // Handle geolocation
  const handleDetectLocation = async () => {
    try {
      await detectLocation();
      setLocationOpen(false);
    } catch (error) {
      // Error is handled in context
    }
  };

  // Filter cities based on search
  const filteredCities = citySearch
    ? majorCities.filter(city => 
        city.toLowerCase().includes(citySearch.toLowerCase())
      )
    : majorCities;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setMobileOpen(false);
    setLocationOpen(false);
  }, [pathname]);

  // Role-based navigation links
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: 'Home', to: '/' },
        { label: 'Restaurants', to: '/restaurants' },
        { label: 'Vendors', to: '/vendors' },
      ];
    }

    switch (user.role) {
      case 'customer':
        return [
          { label: 'Home', to: '/' },
          { label: 'Restaurants', to: '/restaurants' },
          { label: 'Vendors', to: '/vendors' },
          { label: 'Orders', to: '/orders' },
          { label: 'Trust Profile', to: '/trust-profile' },
        ];
      case 'restaurant':
        return [
          { label: 'Dashboard', to: '/restaurant-dashboard' },
          { label: 'POD Config', to: '/pod-config' },
        ];
      case 'vendor':
        return [
          { label: 'Forecast', to: '/forecast' },
          { label: 'POD Config', to: '/pod-settings' },
        ];
      case 'delivery_company':
        return [
          { label: 'Dashboard', to: '/delivery-company-dashboard' },
          { label: 'Riders', to: '/riders' },
        ];
      case 'delivery_rider':
        return [
          { label: 'Dashboard', to: '/rider-dashboard' },
          { label: 'History', to: '/history' },
          { label: 'Verification', to: '/verification' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', to: '/admin' },
          { label: 'Users', to: '/admin/users' },
          { label: 'Restaurants', to: '/admin/restaurants' },
          { label: 'Companies', to: '/admin/companies' },
        ];
      default:
        return [
          { label: 'Home', to: '/' },
          { label: 'Restaurants', to: '/restaurants' },
          { label: 'Vendors', to: '/vendors' },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'white',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.08)' : '0 1px 0 #F0EAE0',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #E8621A 0%, #BE3A2A 100%)' }}
              >
                V
              </div>
              <span className="text-xl font-black tracking-tight" style={{ color: '#1C1C1E' }}>
                Vibe<span style={{ color: '#E8621A' }}>Chops</span>
              </span>
            </Link>

            {/* Location selector — desktop */}
            <div className="hidden md:flex relative">
              <button
                onClick={() => setLocationOpen(!locationOpen)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors hover:bg-orange-50"
                style={{ color: '#1C1C1E' }}
              >
                <MapPin size={15} style={{ color: isLocationEnabled ? '#16A34A' : '#E8621A' }} />
                <span className="max-w-[140px] truncate">{getLocationDisplay()}</span>
                {isDetecting ? (
                  <Loader2 size={13} className="animate-spin" style={{ color: '#E8621A' }} />
                ) : (
                  <ChevronDown
                    size={13}
                    style={{
                      color: '#A0A0A0',
                      transform: locationOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                )}
              </button>

              {locationOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl py-2 z-50 max-h-96 overflow-y-auto"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #F0EAE0' }}
                >
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#A0A0A0' }}>
                      Deliver to
                    </p>
                  </div>

                  {/* Detect location button */}
                  <button
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 disabled:opacity-50"
                    style={{ color: isDetecting ? '#A0A0A0' : '#E8621A' }}
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Detecting location...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={13} />
                        <span>Use current location</span>
                      </>
                    )}
                  </button>

                  {detectionError && (
                    <div className="px-4 py-2 text-xs text-red-600 border-b" style={{ borderColor: '#F0EAE0' }}>
                      {detectionError}
                    </div>
                  )}

                  {/* City search */}
                  <div className="px-4 py-2 border-b" style={{ borderColor: '#F0EAE0' }}>
                    <input
                      type="text"
                      placeholder="Search city..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                      style={{ borderColor: '#E8E8E8' }}
                    />
                  </div>

                  {/* Cities list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCities.map(city => (
                      <button
                        key={city}
                        onClick={() => handleLocationSelect(city)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-orange-50"
                        style={{ 
                          color: userLocation.city === city ? '#E8621A' : '#1C1C1E', 
                          fontWeight: userLocation.city === city ? '600' : '400' 
                        }}
                      >
                        <MapPin size={13} style={{ color: userLocation.city === city ? '#E8621A' : '#A0A0A0' }} />
                        {city}
                        {userLocation.city === city && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#E8621A' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Nav links — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  href={link.to}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={
                    pathname === link.to
                      ? { backgroundColor: '#E8621A', color: 'white' }
                      : { color: '#636366' }
                  }
                  onMouseEnter={e => { if (pathname !== link.to) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF1E8'; }}
                  onMouseLeave={e => { if (pathname !== link.to) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Partners dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPartnersOpen(!partnersOpen)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1"
                  style={{ color: '#636366' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF1E8'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  Partners
                  <ChevronDown size={14} />
                </button>
                
                {partnersOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg z-50 py-2"
                    style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #F0EAE0' }}
                  >
                    <Link
                      href="/restaurant-login"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-orange-50"
                      style={{ color: '#1C1C1E' }}
                      onClick={() => setPartnersOpen(false)}
                    >
                      🍽️ Restaurant Partner
                    </Link>
                    <Link
                      href="/vendor-login"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-orange-50"
                      style={{ color: '#1C1C1E' }}
                      onClick={() => setPartnersOpen(false)}
                    >
                      👨‍🍳 Become a Vendor
                    </Link>
                    <Link
                      href="/rider-login"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-orange-50"
                      style={{ color: '#1C1C1E' }}
                      onClick={() => setPartnersOpen(false)}
                    >
                      🚴 Rider Login
                    </Link>
                    <Link
                      href="/delivery-company-login"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-orange-50"
                      style={{ color: '#1C1C1E' }}
                      onClick={() => setPartnersOpen(false)}
                    >
                      🚚 Delivery Company
                    </Link>
                    <Link
                      href="/admin/login"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-orange-50"
                      style={{ color: '#1C1C1E' }}
                      onClick={() => setPartnersOpen(false)}
                    >
                      🔐 Admin
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Search shortcut — desktop */}
              <button
                onClick={() => router.push('/restaurants')}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-gray-100"
                style={{ color: '#A0A0A0' }}
              >
                <Search size={16} />
              </button>

              {/* Notification bell */}
              <button className="hidden md:flex relative p-2 rounded-xl transition-colors hover:bg-orange-50">
                <Bell size={19} style={{ color: '#636366' }} />
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#E8621A', border: '1.5px solid white' }}
                />
              </button>

              {/* Cart button */}
              <button
                onClick={() => router.push('/cart')}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
              >
                <ShoppingCart size={17} />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full text-xs font-black flex items-center justify-center"
                    style={{ backgroundColor: '#1C1C1E', color: 'white', border: '2px solid white' }}
                  >
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Sign in — desktop */}
              <button
                onClick={() => router.push('/login')}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
              >
                <User size={15} />
                Sign In
              </button>

              {/* Sign up — desktop */}
              <button
                onClick={() => router.push('/register')}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
              >
                Sign Up
              </button>

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl transition-colors hover:bg-orange-50"
                style={{ color: '#1C1C1E' }}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{ maxHeight: mobileOpen ? '500px' : '0', borderTop: mobileOpen ? '1px solid #F0EAE0' : 'none' }}
        >
          <div className="bg-white px-4 py-4 space-y-1">
            {/* Mobile location chip */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{ backgroundColor: '#FFF1E8' }}
            >
              <MapPin size={15} style={{ color: isLocationEnabled ? '#16A34A' : '#E8621A' }} />
              <span className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{getLocationDisplay()}</span>
              {isDetecting ? (
                <Loader2 size={12} className="animate-spin ml-auto" style={{ color: '#E8621A' }} />
              ) : (
                <button
                  onClick={() => setLocationOpen(!locationOpen)}
                  className="ml-auto text-xs font-semibold"
                  style={{ color: '#E8621A' }}
                >
                  Change
                </button>
              )}
            </div>

            {locationOpen && (
              <div className="mb-3 rounded-xl overflow-hidden border" style={{ borderColor: '#F0EAE0' }}>
                {/* Detect location button */}
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 disabled:opacity-50 border-b"
                  style={{ borderColor: '#F0EAE0', color: isDetecting ? '#A0A0A0' : '#E8621A' }}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Detecting location...</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={13} />
                      <span>Use current location</span>
                    </>
                  )}
                </button>

                {detectionError && (
                  <div className="px-4 py-2 text-xs text-red-600 border-b" style={{ borderColor: '#F0EAE0' }}>
                    {detectionError}
                  </div>
                )}

                {/* City search */}
                <div className="px-4 py-2 border-b" style={{ borderColor: '#F0EAE0' }}>
                  <input
                    type="text"
                    placeholder="Search city..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: '#E8E8E8' }}
                  />
                </div>

                {/* Cities list */}
                {filteredCities.map(city => (
                  <button
                    key={city}
                    onClick={() => handleLocationSelect(city)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 border-b last:border-0"
                    style={{ 
                      color: userLocation.city === city ? '#E8621A' : '#636366', 
                      borderColor: '#F0EAE0', 
                      fontWeight: userLocation.city === city ? '600' : '400' 
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            {navLinks.map(link => (
              <Link
                key={link.to}
                href={link.to}
                className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={pathname === link.to ? { backgroundColor: '#E8621A', color: 'white' } : { color: '#636366' }}
              >
                {link.label}
              </Link>
            ))}

            {!user && (
              <>
                <div className="border-t my-2" style={{ borderColor: '#F0EAE0' }} />
                <Link
                  href="/login"
                  className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: '#636366' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center px-3 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Backdrop for location dropdown */}
      {locationOpen && (
        <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setLocationOpen(false)} />
      )}
    </>
  );
}
