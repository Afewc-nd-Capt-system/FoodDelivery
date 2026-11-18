'use client';
import { API_BASE as API_URL, SOCKET_URL } from '@/lib/apiBase';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Star, Clock, Plus, Edit, Trash2, Percent, Save, X, ChevronUp, ChevronDown, Image as ImageIcon, MapPin } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function emptyMenuDraft() {
  return {
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    calories: '',
    isAvailable: true,
    popular: false,
    customizationOptions: [] as any[],
  };
}

function defaultOpeningHours() {
  return DAYS.map((day) => ({ day, open: '09:00', close: '21:00', closed: false }));
}

function RestaurantDashboardPageContent() {
  const { user: authUser, loading: authLoading, authorized } = useAuthGuard('restaurant')
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  const [period, setPeriod] = useState('week');
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [restaurantEarnings, setRestaurantEarnings] = useState<{ totalEarned: number; pendingEarnings: number } | null>(null);

  // Self-service restaurant state (owner-scoped /api/v2/restaurant/me).
  const [selfService, setSelfService] = useState<any>(null);
  const [selfServiceLoading, setSelfServiceLoading] = useState(true);
  const [selfServiceError, setSelfServiceError] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLimit, setMenuLimit] = useState(20);
  const [categories, setCategories] = useState<string[]>([]);
  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [menuDraft, setMenuDraft] = useState<any>(emptyMenuDraft());
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [profileDraft, setProfileDraft] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  // Uploads go through the adapter: Cloudinary when configured, otherwise the
  // endpoint asks for an image URL (which the forms already accept).
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const form = new FormData();
      form.append('image', file);
      const response = await fetch(`${API_URL}/v2/restaurant/me/images`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMenuError(data?.message || 'Image upload failed.');
        return null;
      }
      return data?.url || null;
    } catch (error: any) {
      setMenuError(error.message || 'Image upload failed.');
      return null;
    }
  };

  const toProfileDraft = (restaurant: any) => ({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    cuisine: Array.isArray(restaurant?.cuisine) ? restaurant.cuisine.join(', ') : (restaurant?.cuisine || ''),
    phone: restaurant?.phone || '',
    deliveryTime: restaurant?.deliveryTime || '',
    deliveryFee: restaurant?.deliveryFee ?? '',
    minOrderValue: restaurant?.minOrderValue ?? '',
    image: restaurant?.image || '',
    address: {
      street: restaurant?.address?.street || '',
      area: restaurant?.address?.area || '',
      city: restaurant?.address?.city || '',
      state: restaurant?.address?.state || '',
      country: restaurant?.address?.country || 'Nigeria',
    },
    openingHours: Array.isArray(restaurant?.openingHours) && restaurant.openingHours.length > 0
      ? DAYS.map((day) => {
          const saved = restaurant.openingHours.find((entry: any) => entry.day === day);
          return saved
            ? { day, open: saved.open || '09:00', close: saved.close || '21:00', closed: Boolean(saved.closed) }
            : { day, open: '09:00', close: '21:00', closed: true };
        })
      : defaultOpeningHours(),
    isOpen: Boolean(restaurant?.isOpen),
  });

  const loadSelfService = async () => {
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me`, { headers: authHeaders() });
      if (!response.ok) {
        setSelfService(null);
        setSelfServiceError(response.status === 404
          ? 'No restaurant is linked to this account yet.'
          : 'Could not load your restaurant.');
        return;
      }
      const data = await response.json();
      const restaurant = data.restaurant;
      setSelfService(restaurant);
      setSelfServiceError('');
      setMenuItems(Array.isArray(restaurant?.menu) ? restaurant.menu : []);
      setMenuLimit(Number(data.menuLimit) || 20);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setProfileDraft(toProfileDraft(restaurant));
    } catch (error) {
      console.error('Failed to load restaurant self-service:', error);
      setSelfServiceError('Could not load your restaurant.');
    } finally {
      setSelfServiceLoading(false);
    }
  };

  const openCreateMenu = () => {
    setEditingItemId(null);
    setMenuDraft(emptyMenuDraft());
    setMenuError('');
    setMenuFormOpen(true);
  };

  const openEditMenu = (item: any) => {
    setEditingItemId(String(item._id));
    setMenuDraft({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      category: item.category || '',
      image: item.image || '',
      calories: item.calories || '',
      isAvailable: item.isAvailable !== false,
      popular: Boolean(item.popular),
      customizationOptions: (item.customizationOptions || []).map((group: any) => ({
        name: group.name || '',
        type: group.type === 'multiple' ? 'multiple' : 'single',
        required: Boolean(group.required),
        min: group.min ?? 1,
        max: group.max ?? 1,
        options: (group.options || []).map((option: any) => ({
          name: option.name || '',
          price: option.price ?? 0,
        })),
      })),
    });
    setMenuError('');
    setMenuFormOpen(true);
  };

  const saveMenuItem = async () => {
    setMenuError('');
    if (!menuDraft.name.trim() || !menuDraft.category.trim() || menuDraft.price === '') {
      setMenuError('Name, category and price are required.');
      return;
    }
    setMenuSaving(true);
    try {
      const payload = {
        name: menuDraft.name,
        description: menuDraft.description,
        price: Number(menuDraft.price),
        category: menuDraft.category,
        image: menuDraft.image,
        calories: menuDraft.calories,
        isAvailable: Boolean(menuDraft.isAvailable),
        popular: Boolean(menuDraft.popular),
        customizationOptions: (menuDraft.customizationOptions || []).map((group: any) => ({
          name: group.name,
          type: group.type,
          required: Boolean(group.required),
          min: Number(group.min) || 0,
          max: Number(group.max) || 1,
          options: (group.options || []).map((option: any) => ({
            name: option.name,
            price: Number(option.price) || 0,
          })),
        })),
      };
      const response = await fetch(
        editingItemId
          ? `${API_URL}/v2/restaurant/me/menu/${editingItemId}`
          : `${API_URL}/v2/restaurant/me/menu`,
        {
          method: editingItemId ? 'PUT' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMenuError(data?.message || 'Could not save the menu item.');
        return;
      }
      setMenuFormOpen(false);
      await loadSelfService();
    } catch (error: any) {
      setMenuError(error.message || 'Could not save the menu item.');
    } finally {
      setMenuSaving(false);
    }
  };

  const deleteMenuItem = async (item: any) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me/menu/${item._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMenuError(data?.message || 'Could not delete the menu item.');
        return;
      }
      await loadSelfService();
    } catch (error: any) {
      setMenuError(error.message || 'Could not delete the menu item.');
    }
  };

  const toggleMenuField = async (item: any, field: 'isAvailable' | 'popular') => {
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me/menu/${item._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ [field]: !item[field] }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMenuError(data?.message || 'Could not update the menu item.');
        return;
      }
      await loadSelfService();
    } catch (error: any) {
      setMenuError(error.message || 'Could not update the menu item.');
    }
  };

  const moveMenuItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= menuItems.length) return;
    const next = [...menuItems];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setMenuItems(next);
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me/menu/reorder`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ order: next.map((item) => String(item._id)) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMenuError(data?.message || 'Could not reorder the menu.');
        await loadSelfService();
      }
    } catch (error: any) {
      setMenuError(error.message || 'Could not reorder the menu.');
      await loadSelfService();
    }
  };

  const updateDraftGroup = (index: number, patch: any) => {
    setMenuDraft((prev: any) => {
      const groups = [...(prev.customizationOptions || [])];
      groups[index] = { ...groups[index], ...patch };
      return { ...prev, customizationOptions: groups };
    });
  };

  const addDraftGroup = () => {
    setMenuDraft((prev: any) => ({
      ...prev,
      customizationOptions: [
        ...(prev.customizationOptions || []),
        { name: '', type: 'single', required: false, min: 1, max: 1, options: [{ name: '', price: 0 }] },
      ],
    }));
  };

  const removeDraftGroup = (index: number) => {
    setMenuDraft((prev: any) => ({
      ...prev,
      customizationOptions: (prev.customizationOptions || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const updateDraftOption = (groupIndex: number, optionIndex: number, patch: any) => {
    setMenuDraft((prev: any) => {
      const groups = [...(prev.customizationOptions || [])];
      const options = [...(groups[groupIndex].options || [])];
      options[optionIndex] = { ...options[optionIndex], ...patch };
      groups[groupIndex] = { ...groups[groupIndex], options };
      return { ...prev, customizationOptions: groups };
    });
  };

  const addDraftOption = (groupIndex: number) => {
    setMenuDraft((prev: any) => {
      const groups = [...(prev.customizationOptions || [])];
      groups[groupIndex] = {
        ...groups[groupIndex],
        options: [...(groups[groupIndex].options || []), { name: '', price: 0 }],
      };
      return { ...prev, customizationOptions: groups };
    });
  };

  const removeDraftOption = (groupIndex: number, optionIndex: number) => {
    setMenuDraft((prev: any) => {
      const groups = [...(prev.customizationOptions || [])];
      groups[groupIndex] = {
        ...groups[groupIndex],
        options: (groups[groupIndex].options || []).filter((_: any, i: number) => i !== optionIndex),
      };
      return { ...prev, customizationOptions: groups };
    });
  };

  const saveProfile = async (extra: any = {}) => {
    if (!profileDraft) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me/profile`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          name: profileDraft.name,
          description: profileDraft.description,
          cuisine: String(profileDraft.cuisine || '').split(',').map((value) => value.trim()).filter(Boolean),
          phone: profileDraft.phone,
          deliveryTime: profileDraft.deliveryTime,
          deliveryFee: Number(profileDraft.deliveryFee),
          minOrderValue: Number(profileDraft.minOrderValue),
          image: profileDraft.image,
          address: profileDraft.address,
          location: selfService?.location,
          openingHours: profileDraft.openingHours,
          ...extra,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setProfileError(data?.message || 'Could not save your profile.');
        return;
      }
      setProfileMessage('Saved.');
      await loadSelfService();
    } catch (error: any) {
      setProfileError(error.message || 'Could not save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleOpen = async () => {
    if (!profileDraft) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const response = await fetch(`${API_URL}/v2/restaurant/me/profile`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isOpen: !profileDraft.isOpen }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setProfileError(data?.message || 'Could not change the open status.');
        return;
      }
      setProfileDraft((prev: any) => ({ ...prev, isOpen: Boolean(data?.restaurant?.isOpen) }));
      setProfileMessage(data?.restaurant?.isOpen ? 'Restaurant is open.' : 'Restaurant is closed.');
      await loadSelfService();
    } catch (error: any) {
      setProfileError(error.message || 'Could not change the open status.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    loadSelfService();
  }, []);

  // Derived Overview values, all sourced from the real analytics payload
  // (GET /v2/analytics/me or /v2/analytics/dashboard). No hard-coded numbers.
  const summary = analytics?.summary || null;
  const trendData: { date: string; revenue: number; orderCount: number }[] = Array.isArray(analytics?.chartData)
    ? analytics.chartData
    : [];
  const topItemsList: { name: string; orderCount: number; revenue: number }[] = Array.isArray(analytics?.topItems)
    ? analytics.topItems
    : [];
  const peakHoursList: { hour: number; orderCount: number }[] = Array.isArray(analytics?.peakHours)
    ? analytics.peakHours
    : [];
  const topHour = peakHoursList.length > 0
    ? peakHoursList.reduce(
        (peak: any, h: any) => ((h.orderCount ?? 0) > (peak.orderCount ?? 0) ? h : peak),
        peakHoursList[0]
      )
    : null;

  const fetchPromotions = async (overrideId?: string) => {
    const id = overrideId || restaurantId;
    if (!id) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`${API_URL}/v2/restaurant-promotions?restaurantId=${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      // `/me` resolves the signed-in owner's restaurant; the ?restaurantId=
      // query is the legacy path kept working for deep links.
      const query = restaurantId ? `restaurantId=${restaurantId}&period=${period}` : `period=${period}`;
      const response = await fetch(`${API_URL}/v2/analytics/${restaurantId ? 'dashboard' : 'me'}?${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data?.data || data);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v2/earnings/restaurants/earnings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setRestaurantEarnings(data);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant earnings:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v2/orders/restaurants/orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setRestaurantOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId, period]);

  useEffect(() => {
    fetchOrders();
    fetchEarnings();
  }, []);

  // Once analytics resolves the restaurant of the signed-in owner, load its
  // promotions even when the page was opened without ?restaurantId=.
  useEffect(() => {
    const resolvedId = analytics?.restaurantId;
    if (resolvedId && !restaurantId) fetchPromotions(String(resolvedId));
  }, [analytics?.restaurantId, restaurantId]);

  // Socket.io connection for real-time orders
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !restaurantId) return;

    let socket: any = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('join_room', { role: 'restaurant', id: restaurantId });
      });

      socket.on('new_order', (order: any) => {
        setPendingOrders((prev: any[]) => [order, ...prev]);
        setNotificationCount((prev: number) => prev + 1);
      });

      socket.on('connect_error', () => {
        setSocketConnected(false);
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [restaurantId]);

  if (authLoading) return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '4px solid #F0EAE0', borderTop: '4px solid #E8621A',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: '#636366', textAlign: 'center' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!authorized || !authUser) return null

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#1C1C1E]">Restaurant Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: socketConnected ? '#F0FDF4' : '#FEF2F2', color: socketConnected ? '#16A34A' : '#D32F2F' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: socketConnected ? '#16A34A' : '#D32F2F' }} />
              {socketConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <Link href="/">
            <Button className="bg-[#FFF1E8] text-[#E8621A] hover:bg-[#FFF1E8]/80">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">
                Orders {notificationCount > 0 && (
                  <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '8px', background: '#E8621A', color: 'white', fontSize: '11px', fontWeight: '700' }}>{notificationCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {['day', 'week', 'month'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${period === p ? 'bg-[#E8621A] text-white' : 'bg-white border border-[#E8E8E8] text-[#636366]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="overview">
            {/* Stats Cards — real data from /analytics/me or /analytics/dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                {
                  label: period === 'week' ? 'Weekly Revenue' : 'Period Revenue',
                  value: summary ? `₦${Number(summary.revenue || 0).toLocaleString()}` : '—',
                  icon: DollarSign, color: '#16A34A',
                },
                {
                  label: 'Orders',
                  value: summary ? String(summary.totalOrders ?? '—') : '—',
                  icon: ShoppingCart, color: '#E8621A',
                },
                {
                  label: 'Avg Order Value',
                  value: summary ? `₦${Number(summary.avgOrderValue || 0).toLocaleString()}` : '—',
                  icon: Star, color: '#FF8C42',
                },
                {
                  label: 'Return Rate',
                  value: summary ? `${Math.round(Number(summary.returnRate || 0))}%` : '—',
                  icon: TrendingUp, color: '#2563EB',
                },
                {
                  label: 'Peak Hour',
                  value: topHour ? `${String(topHour.hour)}:00` : '—',
                  icon: Clock, color: '#BE3A2A',
                },
              ].map((stat) => (
                <Card key={stat.label} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#1C1C1E]">{stat.value}</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="p-5">
                <h3 className="font-bold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#E8621A" strokeWidth={3} dot={{ r: 5, fill: '#E8621A' }} />
                  </LineChart>
                </ResponsiveContainer>
                {trendData.length === 0 && !analyticsLoading && (
                  <p className="text-xs text-[#A0A0A0] mt-2">No completed orders in this period yet.</p>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Orders</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orderCount" fill="#E8621A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Top Items */}
            <Card className="p-5 mb-8">
              <h3 className="font-bold mb-4">Top Items</h3>
              {(!topItemsList || topItemsList.length === 0) ? (
                <p className="text-sm text-[#A0A0A0]">No sold items yet.</p>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F0EAE0]">
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Item</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Orders</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItemsList.map((item: any) => (
                    <tr key={item.name} className="border-b border-[#F0EAE0]">
                      <td className="py-3 text-sm font-medium">{item.name}</td>
                      <td className="py-3 text-sm">{item.orderCount}</td>
                      <td className="py-3 text-sm font-semibold">₦{Number(item.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </Card>

            {/* Peak Hours */}
            <Card className="p-5">
              <h3 className="font-bold mb-4">Peak Hours</h3>
              {(!peakHoursList || peakHoursList.length === 0) ? (
                <p className="text-sm text-[#A0A0A0]">No order activity yet.</p>
              ) : (
              <div className="space-y-2">
                {peakHoursList.map((hour: any) => {
                  const max = Math.max(...peakHoursList.map((h: any) => h.orderCount || h.orders || 0), 1);
                  const count = hour.orderCount ?? hour.orders ?? 0;
                  return (
                  <div key={hour.hour} className="flex items-center gap-2">
                    <span className="text-xs w-8">{hour.hour}:00</span>
                    <div className="flex-1 h-4 bg-[#F0EAE0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8621A]" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#636366] w-12 text-right">{count}</span>
                  </div>
                  );
                })}
              </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Recent Orders</h3>
              {ordersLoading ? (
                <p className="text-[#636366]">Loading orders...</p>
              ) : restaurantOrders.length === 0 ? (
                <p className="text-[#636366]">No orders yet.</p>
              ) : (
                <div className="space-y-4">
                  {restaurantOrders.map((order: any) => (
                    <div key={order._id} className="border border-[#F0EAE0] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm">#{String(order._id).slice(-8)}</p>
                          <p className="text-xs text-[#A0A0A0]">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <Badge className="bg-[#FFF1E8] text-[#E8621A]">
                          {order.status || 'pending'}
                        </Badge>
                      </div>
                      <div className="space-y-1 mb-2">
                        {(order.items || []).map((item: any, idx: number) => {
                          const optionLabel = (item.customizations || [])
                            .map((c: any) => `${c.name ? `${c.name}: ` : ''}${c.option}`)
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <div key={idx} className="text-sm">
                              <span className="font-semibold">
                                {item.quantity || 1}x {item.name || 'Item'}
                              </span>
                              {optionLabel && (
                                <span className="block text-xs text-[#A0A0A0]">{optionLabel}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-right font-black text-[#E8621A]">
                        ₦{Number(order.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card className="p-5">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="font-bold">Menu Items</h3>
                  <p className="text-xs text-[#636366]">
                    {menuItems.length} of {menuLimit} items used
                    {menuItems.length >= menuLimit ? ' — plan limit reached' : ''}
                  </p>
                </div>
                <Button
                  onClick={openCreateMenu}
                  disabled={menuItems.length >= menuLimit}
                  className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>

              {menuError && <p className="text-sm text-[#D32F2F] mb-3">{menuError}</p>}

              {selfServiceLoading ? (
                <p className="text-[#636366]">Loading menu...</p>
              ) : !selfService ? (
                <p className="text-[#636366]">{selfServiceError || 'No restaurant is linked to this account.'}</p>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-10 text-[#636366]">
                  <p className="font-semibold mb-1">No menu items yet.</p>
                  <p className="text-sm">Add your first item so customers can order.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {menuItems.map((item: any, index: number) => (
                    <div key={item._id} className="border border-[#F0EAE0] rounded-2xl p-4 flex flex-wrap items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-[#F5F5F7] flex items-center justify-center overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-[#A0A0A0]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{item.name}</p>
                          {item.popular && <Badge className="bg-[#FFF1E8] text-[#E8621A]">Popular</Badge>}
                          <Badge className={item.isAvailable === false ? 'bg-[#F5F5F5] text-[#636366]' : 'bg-[#F0FDF4] text-[#16A34A]'}>
                            {item.isAvailable === false ? 'Unavailable' : 'Available'}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#636366] mt-0.5">
                          {item.category} • ₦{Number(item.price || 0).toLocaleString()}
                          {(item.customizationOptions || []).length > 0
                            ? ` • ${(item.customizationOptions || []).length} customization group(s)`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-1">
                          <span className="text-xs text-[#636366]">Available</span>
                          <Switch
                            checked={item.isAvailable !== false}
                            onCheckedChange={() => toggleMenuField(item, 'isAvailable')}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mr-1">
                          <span className="text-xs text-[#636366]">Popular</span>
                          <Switch
                            checked={Boolean(item.popular)}
                            onCheckedChange={() => toggleMenuField(item, 'popular')}
                          />
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => moveMenuItem(index, -1)} disabled={index === 0} title="Move up">
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveMenuItem(index, 1)} disabled={index === menuItems.length - 1} title="Move down">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditMenu(item)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMenuItem(item)} title="Delete">
                          <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {menuFormOpen && (
              <Card className="p-5 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</h3>
                  <Button size="sm" variant="ghost" onClick={() => setMenuFormOpen(false)}><X className="w-4 h-4" /></Button>
                </div>

                {menuError && <p className="text-sm text-[#D32F2F] mb-3">{menuError}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Name *</Label>
                    <Input value={menuDraft.name} onChange={(e) => setMenuDraft({ ...menuDraft, name: e.target.value })} className="border-[#E8E8E8]" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Category *</Label>
                    <Input
                      list="menu-categories"
                      value={menuDraft.category}
                      onChange={(e) => setMenuDraft({ ...menuDraft, category: e.target.value })}
                      className="border-[#E8E8E8]"
                      placeholder="e.g. Rice"
                    />
                    <datalist id="menu-categories">
                      {categories.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Price (₦) *</Label>
                    <Input type="number" min="0" value={menuDraft.price} onChange={(e) => setMenuDraft({ ...menuDraft, price: e.target.value })} className="border-[#E8E8E8]" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Calories</Label>
                    <Input value={menuDraft.calories} onChange={(e) => setMenuDraft({ ...menuDraft, calories: e.target.value })} className="border-[#E8E8E8]" placeholder="e.g. 650 kcal" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold">Image URL</Label>
                    <Input value={menuDraft.image} onChange={(e) => setMenuDraft({ ...menuDraft, image: e.target.value })} className="border-[#E8E8E8]" placeholder="https://..." />
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-2 text-xs"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const url = await uploadImage(file);
                        if (url) setMenuDraft((prev: any) => ({ ...prev, image: url }));
                      }}
                    />
                    <p className="text-[11px] text-[#A0A0A0] mt-1">Upload when Cloudinary is configured, or paste an image URL.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold">Description</Label>
                    <Textarea value={menuDraft.description} onChange={(e) => setMenuDraft({ ...menuDraft, description: e.target.value })} className="border-[#E8E8E8]" rows={2} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={Boolean(menuDraft.isAvailable)} onCheckedChange={(checked) => setMenuDraft({ ...menuDraft, isAvailable: checked })} />
                    <span className="text-sm">Available for ordering</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={Boolean(menuDraft.popular)} onCheckedChange={(checked) => setMenuDraft({ ...menuDraft, popular: checked })} />
                    <span className="text-sm">Mark as popular</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-sm">Customization groups</h4>
                      <p className="text-xs text-[#636366]">Required groups are enforced when a customer orders.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addDraftGroup}><Plus className="w-4 h-4 mr-1" /> Add group</Button>
                  </div>

                  {(menuDraft.customizationOptions || []).length === 0 ? (
                    <p className="text-sm text-[#A0A0A0]">No customization groups.</p>
                  ) : (
                    <div className="space-y-4">
                      {(menuDraft.customizationOptions || []).map((group: any, groupIndex: number) => (
                        <div key={groupIndex} className="border border-[#F0EAE0] rounded-2xl p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                              <Label className="text-xs font-semibold">Group name</Label>
                              <Input value={group.name} onChange={(e) => updateDraftGroup(groupIndex, { name: e.target.value })} className="border-[#E8E8E8]" placeholder="e.g. Size" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Type</Label>
                              <Select value={group.type} onValueChange={(value) => updateDraftGroup(groupIndex, { type: value })}>
                                <SelectTrigger className="border-[#E8E8E8]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Single choice</SelectItem>
                                  <SelectItem value="multiple">Multiple choice</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {group.type === 'multiple' ? (
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs font-semibold">Min</Label>
                                  <Input type="number" min="0" value={group.min} onChange={(e) => updateDraftGroup(groupIndex, { min: e.target.value })} className="border-[#E8E8E8]" />
                                </div>
                                <div className="flex-1">
                                  <Label className="text-xs font-semibold">Max</Label>
                                  <Input type="number" min="1" value={group.max} onChange={(e) => updateDraftGroup(groupIndex, { max: e.target.value })} className="border-[#E8E8E8]" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-[#A0A0A0] pb-3">One option</div>
                            )}
                            <div className="flex items-center gap-3 pb-1">
                              <Switch checked={Boolean(group.required)} onCheckedChange={(checked) => updateDraftGroup(groupIndex, { required: checked })} />
                              <span className="text-xs">Required</span>
                              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => removeDraftGroup(groupIndex)}>
                                <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {(group.options || []).map((option: any, optionIndex: number) => (
                              <div key={optionIndex} className="flex gap-2 items-center">
                                <Input value={option.name} onChange={(e) => updateDraftOption(groupIndex, optionIndex, { name: e.target.value })} className="border-[#E8E8E8]" placeholder="Option name" />
                                <Input type="number" min="0" value={option.price} onChange={(e) => updateDraftOption(groupIndex, optionIndex, { price: e.target.value })} className="border-[#E8E8E8] w-32" placeholder="+₦" />
                                <Button size="sm" variant="ghost" onClick={() => removeDraftOption(groupIndex, optionIndex)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => addDraftOption(groupIndex)}>
                              <Plus className="w-3 h-3 mr-1" /> Add option
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button onClick={saveMenuItem} disabled={menuSaving} className="bg-[#E8621A] text-white">
                    {menuSaving ? 'Saving...' : (editingItemId ? 'Save changes' : 'Create item')}
                  </Button>
                  <Button variant="outline" onClick={() => setMenuFormOpen(false)}>Cancel</Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="promotions">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold">Promotions</h3>
                <Button onClick={() => setShowPromotionForm(!showPromotionForm)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Create Promotion
                </Button>
              </div>

              {showPromotionForm && (
                <Card className="p-4 mb-6 bg-[#F5F5F7]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Promotion Name</Label>
                      <Input placeholder="e.g., Weekend Special" className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Discount Type</Label>
                      <Select>
                        <SelectTrigger className="border-[#E8E8E8]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Discount Value</Label>
                      <Input type="number" placeholder="10" className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Valid Until</Label>
                      <Input type="date" className="border-[#E8E8E8]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button className="bg-[#E8621A] text-white">Create Promotion</Button>
                    <Button variant="outline" onClick={() => setShowPromotionForm(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {promotions.length > 0 ? promotions.map((promo) => (
                  <Card key={promo.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF1E8] flex items-center justify-center">
                        <Percent className="w-5 h-5 text-[#E8621A]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{promo.name}</h4>
                        <p className="text-xs text-[#636366]">{promo.discount}% off • Valid until {new Date(promo.validUntil).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={promo.status === 'active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                        {promo.status}
                      </Badge>
                      <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-[#D32F2F]" /></Button>
                    </div>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-[#636366]">No promotions yet</div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5">
                <h3 className="font-bold mb-4">Revenue by Item</h3>
                {topItemsList.length === 0 ? (
                  <p className="text-sm text-[#A0A0A0]">No sold items yet.</p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topItemsList.map((item: any) => ({ name: item.name, revenue: item.revenue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#E8621A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Order Quality</h3>
                {!summary ? (
                  <p className="text-sm text-[#A0A0A0]">No analytics data yet.</p>
                ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Return Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#16A34A]" style={{ width: `${Math.min(Math.round(Number(summary.returnRate || 0)), 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold">{Math.round(Number(summary.returnRate || 0))}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cancelled Orders</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#D32F2F]" style={{ width: `${Math.min(Math.round(Number(summary.cancelledRate || 0)), 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold">{Math.round(Number(summary.cancelledRate || 0))}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#A0A0A0]">
                    Star ratings are not collected yet — satisfaction scores will appear here once reviews are recorded.
                  </p>
                </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Earnings</h3>
              {!restaurantEarnings ? (
                <p className="text-sm text-[#A0A0A0]">No earnings data yet.</p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                  <p className="text-sm" style={{ color: '#636366' }}>Total Earned (after commission)</p>
                  <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>₦{Number(restaurantEarnings.totalEarned || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                  <p className="text-sm" style={{ color: '#636366' }}>Pending Settlement</p>
                  <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>₦{Number(restaurantEarnings.pendingEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
              )}
              <p className="text-xs text-[#A0A0A0] mb-4">
                Net amounts are calculated per order after the platform commission is applied.
              </p>
              <div className="text-center py-4 text-[#636366]">
                <p>No commission history yet</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold">Profile & Operations</h3>
                  <p className="text-xs text-[#636366]">Customers see these values on your restaurant page.</p>
                </div>
                {profileDraft && (
                  <div className="flex items-center gap-3">
                    <Badge className={profileDraft.isOpen ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                      {profileDraft.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                    <Button
                      onClick={toggleOpen}
                      disabled={profileSaving}
                      variant={profileDraft.isOpen ? 'outline' : 'default'}
                      className={profileDraft.isOpen ? '' : 'bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white'}
                    >
                      {profileDraft.isOpen ? 'Close restaurant' : 'Open restaurant'}
                    </Button>
                  </div>
                )}
              </div>

              {selfService?.verificationStatus !== 'approved' && (
                <div className="mb-4 p-3 rounded-xl bg-[#FFF8E1] text-[#8A6D00] text-sm">
                  Your CAC documents are pending admin approval. You can save everything now;
                  opening is unlocked once an admin approves the restaurant.
                </div>
              )}
              {profileError && <p className="text-sm text-[#D32F2F] mb-3">{profileError}</p>}
              {profileMessage && <p className="text-sm text-[#16A34A] mb-3">{profileMessage}</p>}

              {!profileDraft ? (
                <p className="text-[#636366]">{selfServiceLoading ? 'Loading profile...' : (selfServiceError || 'No restaurant is linked to this account.')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Restaurant name</Label>
                      <Input value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Phone</Label>
                      <Input value={profileDraft.phone} onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })} className="border-[#E8E8E8]" placeholder="+234..." />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Cuisine</Label>
                      <Input value={profileDraft.cuisine} onChange={(e) => setProfileDraft({ ...profileDraft, cuisine: e.target.value })} className="border-[#E8E8E8]" placeholder="Nigerian, West African" />
                      <p className="text-[11px] text-[#A0A0A0] mt-1">Separate multiple cuisines with commas.</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Delivery time</Label>
                      <Input value={profileDraft.deliveryTime} onChange={(e) => setProfileDraft({ ...profileDraft, deliveryTime: e.target.value })} className="border-[#E8E8E8]" placeholder="25-40 min" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Delivery fee (₦) *</Label>
                      <Input type="number" min="0" value={profileDraft.deliveryFee} onChange={(e) => setProfileDraft({ ...profileDraft, deliveryFee: e.target.value })} className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Minimum order (₦) *</Label>
                      <Input type="number" min="0" value={profileDraft.minOrderValue} onChange={(e) => setProfileDraft({ ...profileDraft, minOrderValue: e.target.value })} className="border-[#E8E8E8]" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold">Cover image URL</Label>
                      <Input value={profileDraft.image} onChange={(e) => setProfileDraft({ ...profileDraft, image: e.target.value })} className="border-[#E8E8E8]" placeholder="https://..." />
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-2 text-xs"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const url = await uploadImage(file);
                          if (url) setProfileDraft((prev: any) => ({ ...prev, image: url }));
                        }}
                      />
                      <p className="text-[11px] text-[#A0A0A0] mt-1">Upload when Cloudinary is configured, or paste an image URL.</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold">Description</Label>
                      <Textarea value={profileDraft.description} onChange={(e) => setProfileDraft({ ...profileDraft, description: e.target.value })} className="border-[#E8E8E8]" rows={3} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#E8621A]" /> Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Street *</Label>
                        <Input value={profileDraft.address.street} onChange={(e) => setProfileDraft({ ...profileDraft, address: { ...profileDraft.address, street: e.target.value } })} className="border-[#E8E8E8]" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Area</Label>
                        <Input value={profileDraft.address.area} onChange={(e) => setProfileDraft({ ...profileDraft, address: { ...profileDraft.address, area: e.target.value } })} className="border-[#E8E8E8]" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">City *</Label>
                        <Input value={profileDraft.address.city} onChange={(e) => setProfileDraft({ ...profileDraft, address: { ...profileDraft.address, city: e.target.value } })} className="border-[#E8E8E8]" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">State</Label>
                        <Input value={profileDraft.address.state} onChange={(e) => setProfileDraft({ ...profileDraft, address: { ...profileDraft.address, state: e.target.value } })} className="border-[#E8E8E8]" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Country</Label>
                        <Input value={profileDraft.address.country} onChange={(e) => setProfileDraft({ ...profileDraft, address: { ...profileDraft.address, country: e.target.value } })} className="border-[#E8E8E8]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-[#E8621A]" /> Opening hours</h4>
                    <div className="space-y-2">
                      {(profileDraft.openingHours || []).map((entry: any) => (
                        <div key={entry.day} className="flex flex-wrap items-center gap-3">
                          <span className="w-24 text-sm capitalize">{entry.day}</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!entry.closed}
                              onCheckedChange={(checked) => setProfileDraft({
                                ...profileDraft,
                                openingHours: profileDraft.openingHours.map((row: any) => row.day === entry.day ? { ...row, closed: !checked } : row),
                              })}
                            />
                            <span className="text-xs text-[#636366]">{entry.closed ? 'Closed' : 'Open'}</span>
                          </div>
                          <Input
                            type="time"
                            value={entry.open}
                            disabled={entry.closed}
                            onChange={(e) => setProfileDraft({
                              ...profileDraft,
                              openingHours: profileDraft.openingHours.map((row: any) => row.day === entry.day ? { ...row, open: e.target.value } : row),
                            })}
                            className="border-[#E8E8E8] w-32"
                          />
                          <span className="text-xs text-[#A0A0A0]">to</span>
                          <Input
                            type="time"
                            value={entry.close}
                            disabled={entry.closed}
                            onChange={(e) => setProfileDraft({
                              ...profileDraft,
                              openingHours: profileDraft.openingHours.map((row: any) => row.day === entry.day ? { ...row, close: e.target.value } : row),
                            })}
                            className="border-[#E8E8E8] w-32"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button onClick={() => saveProfile()} disabled={profileSaving} className="bg-[#E8621A] text-white">
                      <Save className="w-4 h-4 mr-2" /> {profileSaving ? 'Saving...' : 'Save profile'}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function RestaurantDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <RestaurantDashboardPageContent />
    </Suspense>
  );
}
