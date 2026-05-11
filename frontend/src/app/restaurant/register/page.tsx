'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Upload, FileText } from 'lucide-react';

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function RestaurantRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
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
    tinNumber: '',
    rcNumber: '',
  });
  const [cacCertificate, setCacCertificate] = useState<File | null>(null);
  const [governmentApproval, setGovernmentApproval] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cacCertificate) {
      setError('CAC Certificate is required');
      return;
    }

    if (!formData.address.street || !formData.address.city || !formData.address.state) {
      setError('Street address, city, and state are required');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // Geocode the address to get coordinates
      const coords = await geocodeAddress(formData.address.street, formData.address.city);
      
      if (!coords) {
        setError('Could not find coordinates for the address. Please check the address and try again.');
        setLoading(false);
        setUploading(false);
        return;
      }

      // Create formatted address
      const formattedAddress = `${formData.address.street}, ${formData.address.area}, ${formData.address.city}, ${formData.address.state}, Nigeria`;
      // Upload documents first
      const formDataUpload = new FormData();
      formDataUpload.append('cacCertificate', cacCertificate);
      if (governmentApproval) {
        formDataUpload.append('governmentApproval', governmentApproval);
      }
      formDataUpload.append('tinNumber', formData.tinNumber);
      formDataUpload.append('rcNumber', formData.rcNumber);

      const uploadResponse = await fetch('/api/v2/restaurants/upload-docs', {
        method: 'POST',
        body: formDataUpload,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || 'Document upload failed');
      }

      // Register restaurant with document URLs
      const response = await fetch('/api/v2/restaurants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          address: {
            ...formData.address,
            formattedAddress
          },
          location: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          },
          ...uploadData,
          verificationStatus: 'pending_verification',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/restaurant/login?status=pending_verification');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1E' }}>Restaurant Registration</h1>
            <p className="text-sm" style={{ color: '#636366' }}>Create your restaurant account to start selling</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="Your restaurant name"
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
                placeholder="restaurant@example.com"
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
                placeholder="e.g., Nigerian, Continental, Fast Food"
              />
            </div>

            {/* Business Verification Documents Section */}
            <div className="mt-8 p-4 rounded-2xl" style={{ backgroundColor: '#FFF1E8', border: '1px solid #E8621A' }}>
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#E8621A' }} />
                <div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: '#1C1C1E' }}>Business Verification Documents</h3>
                  <p className="text-xs" style={{ color: '#636366' }}>
                    Restaurant registration requires CAC verification. Your documents will be reviewed by our team within 24-48 hours before your account is activated.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                    CAC Certificate (Corporate Affairs Commission) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="cacCertificate"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCacCertificate(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="cacCertificate"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-all"
                      style={{ borderColor: cacCertificate ? '#16A34A' : '#E8E8E8' }}
                    >
                      <Upload className="w-5 h-5" style={{ color: cacCertificate ? '#16A34A' : '#636366' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: cacCertificate ? '#16A34A' : '#1C1C1E' }}>
                          {cacCertificate ? cacCertificate.name : 'Upload CAC Certificate'}
                        </p>
                        <p className="text-xs" style={{ color: '#636366' }}>PDF, JPEG, PNG (Max 5MB)</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                    Government-issued business approval (optional but recommended)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="governmentApproval"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setGovernmentApproval(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="governmentApproval"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-all"
                      style={{ borderColor: governmentApproval ? '#16A34A' : '#E8E8E8' }}
                    >
                      <FileText className="w-5 h-5" style={{ color: governmentApproval ? '#16A34A' : '#636366' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: governmentApproval ? '#16A34A' : '#1C1C1E' }}>
                          {governmentApproval ? governmentApproval.name : 'Upload Additional Approval Document'}
                        </p>
                        <p className="text-xs" style={{ color: '#636366' }}>PDF, JPEG, PNG (Max 5MB)</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                      Tax Identification Number (TIN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tinNumber"
                      value={formData.tinNumber}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                      style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                      placeholder="e.g., 12345678-0001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                      RC Number (CAC Registration Number) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rcNumber"
                      value={formData.rcNumber}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                      style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                      placeholder="e.g., RC123456"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#636366' }}>
              Already have an account?{' '}
              <Link href="/restaurant/login" className="font-bold" style={{ color: '#E8621A' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
