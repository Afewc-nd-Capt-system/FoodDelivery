'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/apiClient';

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function VendorRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      country: 'Nigeria',
      formattedAddress: '',
    },
    cuisine: '',
    cookingDays: [] as string[],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cookingDaysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const geocodeAddress = async (street: string, city: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(street + ', ' + city + ', Nigeria')}` +
        `&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      cookingDays: prev.cookingDays.includes(day)
        ? prev.cookingDays.filter(d => d !== day)
        : [...prev.cookingDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.address.street || !formData.address.city || !formData.address.state) {
      setError('Street address, city, and state are required');
      return;
    }

    if (formData.cookingDays.length === 0) {
      setError('Please select at least one cooking day');
      return;
    }

    setLoading(true);

    try {
      // Geocode the address to get coordinates
      const coords = await geocodeAddress(formData.address.street, formData.address.city);
      
      if (!coords) {
        setError('Could not find coordinates for the address. Please check the address and try again.');
        setLoading(false);
        return;
      }

      // Create formatted address
      const formattedAddress = `${formData.address.street}, ${formData.address.area}, ${formData.address.city}, ${formData.address.state}, Nigeria`;
      const data = await apiPost('/vendors/register', {
        ...formData,
        address: {
          ...formData.address,
          formattedAddress
        },
        location: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat]
        },
        verificationStatus: 'pending_verification',
      });

      // JWT is stored in cookies by the backend
      router.push('/vendor/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: '#FFF8F0' }}>
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1E' }}>Vendor Registration</h1>
            <p className="text-sm" style={{ color: '#636366' }}>Create your vendor account to start selling</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="Your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Owner Name
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="vendor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                  placeholder="e.g., 14 Shehu Laminu Way"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                  Area/District
                </label>
                <input
                  type="text"
                  name="address.area"
                  value={formData.address.area}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                  placeholder="e.g., Gwange, Bulumkutu"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                  City
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                  placeholder="e.g., Maiduguri"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                  State
                </label>
                <select
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                >
                  <option value="">Select a state</option>
                  {nigerianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Cuisine Type
              </label>
              <input
                type="text"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="e.g., Nigerian, Continental, Pastries"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Cooking Days
              </label>
              <div className="flex flex-wrap gap-2">
                {cookingDaysOptions.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      formData.cookingDays.includes(day)
                        ? 'text-white'
                        : 'border-2'
                    }`}
                    style={
                      formData.cookingDays.includes(day)
                        ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)' }
                        : { borderColor: '#E8E8E8', color: '#636366' }
                    }
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || formData.cookingDays.length === 0}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#636366' }}>
              Already have an account?{' '}
              <Link href="/vendor/login" className="font-bold" style={{ color: '#E8621A' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
