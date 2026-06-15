'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin, ArrowLeft, Heart, Share2, ShoppingCart } from 'lucide-react';
import { vendors, vendorMenuItems } from '@/data/mockData';
import { useCart } from '@/context/CartContext';
import type { VendorMenuItem } from '@/data/mockData';

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return 'Next available cooking day';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatCutoffTime(item: VendorMenuItem) {
  if (!item.availableDate || !item.cutoffHours) return 'Day before';
  const cutoff = new Date(item.availableDate);
  cutoff.setHours(cutoff.getHours() - item.cutoffHours);
  return cutoff.toLocaleDateString('en-NG', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Pre-order Modal ───────────────────────────────── */
function PreOrderModal({
  item, vendorName, onClose, onAddToCart, onOrderNow,
}: {
  item: VendorMenuItem;
  vendorName: string;
  onClose: () => void;
  onAddToCart: (item: VendorMenuItem) => void;
  onOrderNow: (item: VendorMenuItem) => void;
}) {
  const [qty, setQty] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const totalPrice = item.price * qty;
  const slotsLeft = item.maxPreOrders! - (item.currentPreOrders || 0);
  const isFullyBooked = slotsLeft <= 0;

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

            {/* Availability notice */}
            <div style={{
              background: '#FFF1E8', borderRadius: '12px',
              padding: '12px 16px', marginBottom: '16px',
              display: 'flex', gap: '12px', alignItems: 'center',
            }}>
              <span style={{ fontSize: '24px' }}>📅</span>
              <div>
                <p style={{ fontWeight: '700', color: '#E8621A', margin: '0 0 2px' }}>
                  Ready on {formatDate(item.availableDate)}
                </p>
                <p style={{ color: '#636366', margin: 0, fontSize: '12px' }}>
                  Order before {formatCutoffTime(item)} to secure your slot
                </p>
              </div>
            </div>

            {item.cookingDay && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#FAFAFA', borderRadius: '12px', fontSize: '13px', color: '#636366' }}>
                Cooks on <strong>{item.cookingDay}</strong>
                {item.availableFrom && item.availableTo && (
                  <> • {item.availableFrom} - {item.availableTo}</>
                )}
              </div>
            )}

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
            onClick={() => { onAddToCart(item); onClose(); }}
            disabled={isFullyBooked}
            style={{
              flex: 1, padding: '14px',
              border: `2px solid ${isFullyBooked ? '#E8E8E8' : '#E8621A'}`, borderRadius: '14px',
              background: 'white', color: isFullyBooked ? '#A0A0A0' : '#E8621A',
              fontWeight: '800', fontSize: '15px', cursor: isFullyBooked ? 'not-allowed' : 'pointer',
            }}>
            {isFullyBooked ? 'Fully Booked' : 'Add to Cart'}
          </button>
          <button
            onClick={() => { onOrderNow(item); }}
            disabled={isFullyBooked}
            style={{
              flex: 1, padding: '14px', border: 'none',
              borderRadius: '14px',
              background: isFullyBooked ? '#E8E8E8' : 'linear-gradient(135deg, #E8621A, #C4501A)',
              color: isFullyBooked ? '#A0A0A0' : 'white', fontWeight: '800', fontSize: '15px',
              cursor: isFullyBooked ? 'not-allowed' : 'pointer',
            }}>
            {isFullyBooked ? 'Sold Out' : 'Pre-order Now →'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, items, updateQuantity } = useCart();
  const vendorId = params.id as string;

  const vendor = vendors.find(v => v.id === vendorId);
  const menu = vendorMenuItems.filter(item => item.vendorId === vendorId);

  const [selectedItem, setSelectedItem] = useState<VendorMenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const getItemQty = (itemId: string) => items.find(i => i.id === itemId)?.quantity || 0;

  const handleAddToCart = (item: VendorMenuItem) => {
    const enriched = {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      restaurantId: vendorId,
      restaurantName: vendor?.name || '',
      category: item.category,
      description: item.description,
    };
    addItem(enriched);
    setModalOpen(false);
    showToast('Added to cart!');
  };

  const handleOrderNow = (item: VendorMenuItem) => {
    const enriched = {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      restaurantId: vendorId,
      restaurantName: vendor?.name || '',
      category: item.category,
      description: item.description,
    };
    addItem(enriched);
    setModalOpen(false);
    router.push('/cart');
  };

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vendor not found</h1>
          <Link href="/vendors" className="text-orange-500 hover:text-orange-600">
            ← Back to vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#16A34A', color: 'white',
          padding: '12px 24px', borderRadius: '14px', fontWeight: '700',
          fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Vendor Header */}
        <div className="bg-white rounded-3xl overflow-hidden mb-8" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div className="relative h-64">
            <Image
              src={vendor.coverImage}
              alt={vendor.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            <div className="absolute top-4 right-4 flex gap-2">
              <button className="p-2 bg-white/80 rounded-full shadow-md hover:shadow-lg transition-shadow">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 bg-white/80 rounded-full shadow-md hover:shadow-lg transition-shadow">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white ring-2 ring-white">
                  <Image
                    src={vendor.image}
                    alt={vendor.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-white">
                  <h1 className="text-2xl font-bold mb-1">{vendor.name}</h1>
                  <p className="text-white/90">{vendor.cuisine}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-semibold text-lg">{vendor.rating}</span>
                <span className="text-gray-500">({vendor.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{vendor.deliveryTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{vendor.distance}</span>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  vendor.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${vendor.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  {vendor.isOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">About</h3>
                <p className="text-gray-600">
                  Delicious homemade {vendor.cuisine.toLowerCase()} prepared with love and care.
                  Specializing in {vendor.categories.join(', ').toLowerCase()} dishes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Cooking Schedule</h3>
                <div className="flex flex-wrap gap-2">
                  {vendor.cookingDays.map(day => (
                    <span key={day} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">{day}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Price Range</h3>
                <p className="text-gray-600">{vendor.priceRange}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Delivery</h3>
                <p className="text-gray-600">
                  {vendor.deliveryFee === 0 ? 'Free delivery' : `₦${vendor.deliveryFee} delivery`}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Location</h3>
                <p className="text-gray-600">{vendor.address}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Minimum Order</h3>
                <p className="text-gray-600">₦{vendor.minOrder.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menu.map(item => {
              const qty = getItemQty(item.id);
              const slotsLeft = item.maxPreOrders! - (item.currentPreOrders || 0);
              const isFullyBooked = slotsLeft <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 transition-all hover:shadow-md"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                      {item.popular && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-black text-white"
                          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}>
                          🔥
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: '900', fontSize: '14px', color: '#1C1C1E', margin: '0 0 2px' }}>{item.name}</h4>
                      <p style={{ fontSize: '12px', color: '#636366', margin: '0 0 6px', lineHeight: 1.4 }}>{item.description}</p>

                      {/* Availability info */}
                      <div style={{
                        background: '#FFF1E8', borderRadius: '10px',
                        padding: '6px 10px', marginTop: '4px',
                        display: 'inline-flex', gap: '10px',
                        fontSize: '11px', flexWrap: 'wrap',
                      }}>
                        <span>📅 Available: {formatDate(item.availableDate)}</span>
                        <span>⏰ Order by: {formatCutoffTime(item)}</span>
                        <span style={{
                          color: isFullyBooked ? '#D32F2F' : '#16A34A',
                          fontWeight: '700',
                        }}>
                          {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ color: '#E8621A', fontWeight: '900', fontSize: '16px' }}>
                          ₦{item.price?.toLocaleString()}
                        </span>
                        {qty > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                              style={{ borderColor: '#E8621A', color: '#E8621A' }}
                            >−</button>
                            <span className="font-black text-sm" style={{ color: '#1C1C1E' }}>{qty}</span>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setModalOpen(true);
                            }}
                            disabled={isFullyBooked}
                            style={{
                              padding: '8px 20px', borderRadius: '12px',
                              border: 'none', cursor: isFullyBooked ? 'not-allowed' : 'pointer',
                              background: isFullyBooked ? '#E8E8E8' : 'linear-gradient(135deg, #E8621A, #C4501A)',
                              color: isFullyBooked ? '#A0A0A0' : 'white',
                              fontWeight: '700', fontSize: '13px',
                            }}>
                            {isFullyBooked ? 'Fully Booked' : 'Pre-order'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pre-order modal */}
      {modalOpen && selectedItem && vendor && (
        <PreOrderModal
          item={selectedItem}
          vendorName={vendor.name}
          onClose={() => setModalOpen(false)}
          onAddToCart={handleAddToCart}
          onOrderNow={handleOrderNow}
        />
      )}
    </div>
  );
}
