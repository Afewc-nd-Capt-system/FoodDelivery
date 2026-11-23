'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X, MapPin, ChevronDown, User, Bell, Search, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';

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

  const [scrolled, setScrolled] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { totalItems, clearCart } = useCart();
  const { user, logout, loading: authLoading } = useAuth();
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
    setUserMenuOpen(false);
  }, [pathname]);

  const getInitials = (name?: string) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSignOut = () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    // Never leak a cart between accounts on a shared browser.
    clearCart();
    void logout();
    router.push('/');
  };

  // Nav links — same for all users (Zomato-style)
  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Restaurants', to: '/restaurants' },
    { label: 'Vendors', to: '/vendors' },
  ];

  const accountLinks = [
    { label: 'My Orders', icon: '📦', path: '/orders' },
    { label: 'Wallet', icon: '💰', path: '/wallet' },
    { label: 'Loyalty', icon: '⭐', path: '/loyalty' },
    { label: 'Referrals', icon: '🎁', path: '/referral' },
    { label: 'Favorites', icon: '❤️', path: '/favorites' },
    { label: 'Profile', icon: '👤', path: '/profile' },
  ];

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
            <div className="hidden lg:flex items-center gap-1">
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

              {/* Notification bell (no notification feed yet — no unread dot) */}
              <button className="hidden md:flex relative p-2 rounded-xl transition-colors hover:bg-orange-50">
                <Bell size={19} style={{ color: '#636366' }} />
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

              {/* Session-aware actions: never flash the guest nav for a signed-in user */}
              {authLoading ? (
                <div className="hidden md:flex items-center gap-2" aria-hidden="true" data-testid="navbar-auth-loading">
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F0EAE0' }} />
                  <div style={{ width: '72px', height: '12px', borderRadius: '6px', backgroundColor: '#F0EAE0' }} />
                </div>
              ) : user ? (
                <div className="hidden md:block relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    data-testid="navbar-avatar"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    className="flex items-center gap-2 rounded-xl transition-all duration-200 hover:bg-orange-50"
                    style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: 'none' }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: '800', fontSize: '13px',
                    }}>
                      {getInitials(user.name)}
                    </div>
                    <span data-testid="navbar-user-name" style={{ fontWeight: '600', color: '#1C1C1E', fontSize: '14px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name?.split(' ')[0]}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div
                        data-testid="navbar-user-menu"
                        role="menu"
                        style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '230px',
                          background: 'white', borderRadius: '16px',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #F0EAE0', zIndex: 50, overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: '16px', borderBottom: '1px solid #F0EAE0', background: '#FFF8F0' }}>
                          <p style={{ fontWeight: '800', color: '#1C1C1E', fontSize: '14px', margin: '0 0 2px' }}>{user.name}</p>
                          <p style={{ color: '#636366', fontSize: '12px', margin: 0 }}>{user.email}</p>
                        </div>
                        {accountLinks.map(item => (
                          <button key={item.path}
                            type="button"
                            role="menuitem"
                            data-testid={`navbar-menu-${item.path.replace('/', '')}`}
                            onClick={() => { router.push(item.path); setUserMenuOpen(false) }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
                              background: 'none', cursor: 'pointer', fontSize: '14px', color: '#1C1C1E',
                              borderBottom: '1px solid #F5F5F5',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >{item.icon} {item.label}</button>
                        ))}
                        <button type="button" role="menuitem" data-testid="navbar-signout" onClick={handleSignOut}
                          style={{
                            width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
                            background: 'none', cursor: 'pointer', fontSize: '14px', color: '#D32F2F', fontWeight: '600',
                          }}
                        >🚪 Sign Out</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Sign in — desktop */}
                  <Link
                    href="/login"
                    data-testid="navbar-signin"
                    className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                  >
                    <User size={15} />
                    Sign In
                  </Link>

                  {/* Sign up — desktop */}
                  <Link
                    href="/register"
                    data-testid="navbar-signup"
                    className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-xl transition-colors hover:bg-orange-50"
                style={{ color: '#1C1C1E' }}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className="lg:hidden overflow-hidden transition-all duration-300"
          style={{ maxHeight: mobileOpen ? '90vh' : '0', overflowY: mobileOpen ? 'auto' : 'hidden', borderTop: mobileOpen ? '1px solid #F0EAE0' : 'none' }}
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

            {!authLoading && user && (
              <>
                <div className="border-t my-2" style={{ borderColor: '#F0EAE0' }} />
                <div data-testid="navbar-mobile-user" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#FFF8F0' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: '800', fontSize: '13px',
                  }}>{getInitials(user.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-sm font-bold truncate" style={{ color: '#1C1C1E', margin: 0 }}>{user.name}</p>
                    <p className="text-xs truncate" style={{ color: '#636366', margin: 0 }}>{user.email}</p>
                  </div>
                </div>
                {accountLinks.map(item => (
                  <Link
                    key={item.path}
                    href={item.path}
                    data-testid={`navbar-mobile-${item.path.replace('/', '')}`}
                    className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: '#636366' }}
                  >
                    <span className="mr-2">{item.icon}</span>{item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  data-testid="navbar-mobile-signout"
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ color: '#D32F2F', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  🚪 Sign Out
                </button>
              </>
            )}

            {!authLoading && !user && (
              <>
                <div className="border-t my-2" style={{ borderColor: '#F0EAE0' }} />
                <Link
                  href="/login"
                  data-testid="navbar-mobile-signin"
                  className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: '#636366' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  data-testid="navbar-mobile-signup"
                  className="flex items-center justify-center px-3 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                >
                  Sign Up
                </Link>
              </>
            )}

            {authLoading && (
              <div className="px-3 py-3" aria-hidden="true">
                <div style={{ width: '100%', height: '36px', borderRadius: '12px', backgroundColor: '#F0EAE0' }} />
              </div>
            )}
          </div>
        </div>
      </nav>

      <EmailVerificationBanner />

      {/* Backdrop for location dropdown */}
      {locationOpen && (
        <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setLocationOpen(false)} />
      )}
    </>
  );
}
