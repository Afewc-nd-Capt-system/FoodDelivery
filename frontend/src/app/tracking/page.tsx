'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star, CheckCircle, Package, Truck, ChevronLeft, Phone, MessageSquare, MapPin, ShieldCheck, Lock } from 'lucide-react';

const steps = [
  { id: 'confirmed', label: 'Order Confirmed', desc: 'Your order has been received', icon: CheckCircle },
  { id: 'preparing', label: 'Preparing', desc: 'Restaurant is preparing your food', icon: Package },
  { id: 'on_the_way', label: 'On the Way', desc: 'Driver is on the way to you', icon: Truck },
  { id: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!', icon: CheckCircle },
];

export default function OrderTrackingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [eta, setEta] = useState(12);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [riderPos, setRiderPos] = useState({ x: 50, y: 150 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const riderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Delivery confirmation state
  const [riderConfirmedArrival, setRiderConfirmedArrival] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
        setEta(prev => Math.max(0, prev - 2));
      }, 4500);
    }

    riderIntervalRef.current = setInterval(() => {
      setRiderPos(prev => ({
        x: Math.min(250, prev.x + 1.2),
        y: Math.max(50, prev.y - 1.1),
      }));
    }, 180);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (riderIntervalRef.current) clearInterval(riderIntervalRef.current);
    };
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === steps.length - 1 && eta <= 0) {
      const timer = setTimeout(() => setShowRating(true), 600);
      return () => clearTimeout(timer);
    }
  }, [currentStep, eta]);

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  const handleConfirmDelivery = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter the 6-digit verification code');
      return;
    }

    setConfirmingDelivery(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/delivery/orders/ORD-8021/confirm-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ verificationCode }),
      });

      if (response.ok) {
        setCustomerConfirmed(true);
        setShowVerificationInput(false);
      } else {
        const data = await response.json();
        alert(data.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
      alert('Failed to confirm delivery. Please try again.');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  // Simulate rider confirming arrival when on the way
  useEffect(() => {
    if (currentStep === 2 && !riderConfirmedArrival) {
      setTimeout(() => {
        setRiderConfirmedArrival(true);
        setShowVerificationInput(true);
      }, 5000);
    }
  }, [currentStep, riderConfirmedArrival]);

  return (
    <div>
      {/* HEADER */}
      <section className="bg-gradient-to-r from-[#1C1C1E] via-[#2C1810] to-[#1C1C1E] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/80 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-white font-black text-xl">Order #ORD-8021</h1>
              <p className="text-white/60 text-sm">Spice Garden</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <Badge className="bg-[rgba(34,197,94,0.15)] text-[#16A34A] border-[rgba(34,197,94,0.3)]">
                Live
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ETA CARD */}
        <div className="bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] rounded-3xl p-7 shadow-[0_12px_40px_rgba(232,98,26,0.35)] relative overflow-hidden mb-8">
          <div className="absolute -right-10 -top-10 text-[140px] opacity-[0.08]">🛵</div>
          <div className="relative z-10">
            {currentStep < 3 ? (
              <>
                <p className="text-white/80 text-sm mb-1">Estimated Delivery</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-black text-5xl">{eta}</span>
                  <span className="text-white/80">minutes away</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-white/80 text-sm mb-1">Delivered!</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-black text-5xl">🎉</span>
                  <span className="text-white">Enjoy your meal!</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <Progress value={progressValue} className="h-2 bg-white/20" />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Order placed</span>
              <span>Delivered</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* STATUS STEPS */}
            <Card className="p-6">
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index < currentStep;
                  const isActive = index === currentStep;
                  const isPending = index > currentStep;

                  return (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-[#16A34A]' : isActive ? 'bg-gradient-to-r from-[#E8621A] to-[#C4501A]' : 'bg-[#F0EAE0]'
                        }`}>
                          <Icon className={`w-5 h-5 ${isCompleted || isActive ? 'text-white' : 'text-[#A0A0A0]'}`} />
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-0.5 h-12 ${isCompleted ? 'bg-[#E8621A]' : 'bg-[#F0EAE0]'}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`font-bold text-sm ${isPending ? 'text-[#A0A0A0]' : 'text-[#1C1C1E]'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-[#636366]">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* MAP PLACEHOLDER */}
            <Card className="relative h-48 overflow-hidden">
              <div className="absolute inset-0 bg-[#E8E8E8]">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(to right, #E8E8E8 1px, transparent 1px), linear-gradient(to bottom, #E8E8E8 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                <div className="absolute bottom-4 left-4 text-2xl">📍</div>
                <div className="absolute top-4 right-4 text-2xl">📍</div>
                <div
                  className="absolute text-2xl transition-all duration-150"
                  style={{ left: `${riderPos.x}px`, top: `${riderPos.y}px` }}
                >
                  🛵
                </div>
              </div>
              <button className="absolute bottom-4 right-4 bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white px-4 py-2 rounded-xl text-sm font-medium">
                Open in Maps
              </button>
            </Card>

            {/* DRIVER CARD */}
            <Card className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">John Driver</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#E8621A] text-[#E8621A]" />
                    <span className="text-xs text-[#636366]">4.8 • 230 deliveries</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="border border-[#E8E8E8] bg-transparent hover:bg-[#FFF1E8] text-[#636366]">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button className="border border-[#E8E8E8] bg-transparent hover:bg-[#FFF1E8] text-[#636366]">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {riderConfirmedArrival && !customerConfirmed && (
                <div className="mt-4 p-4 bg-[#FFF1E8] rounded-xl border border-[#E8621A]/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#E8621A]" />
                    <p className="font-bold text-sm text-[#1C1C1E]">Delivery Confirmation Required</p>
                  </div>
                  <p className="text-xs text-[#636366] mb-3">
                    The rider has arrived at your location. Please enter the 6-digit verification code to confirm delivery.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="flex-1 text-center tracking-widest"
                    />
                    <Button
                      onClick={handleConfirmDelivery}
                      disabled={confirmingDelivery || verificationCode.length !== 6}
                      className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
                    >
                      {confirmingDelivery ? 'Confirming...' : 'Confirm'}
                    </Button>
                  </div>
                </div>
              )}

              {customerConfirmed && (
                <div className="mt-4 p-4 bg-[#F0FDF4] rounded-xl border border-[#16A34A]/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                    <p className="font-bold text-sm text-[#16A34A]">Delivery Confirmed</p>
                  </div>
                </div>
              )}
            </Card>

            {/* ORDER SUMMARY */}
            <Card className="p-5">
              <h3 className="font-black mb-4">Order Summary</h3>
              <div className="space-y-3">
                {[
                  { name: 'Butter Chicken', qty: 2, price: 7000 },
                  { name: 'Garlic Naan', qty: 3, price: 2400 },
                ].map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-semibold">₦{item.price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-[#F0EAE0] flex justify-between font-black text-[#E8621A]">
                  <span>Total</span>
                  <span>₦9,400</span>
                </div>
              </div>
            </Card>
          </div>

          {/* SIDEBAR - Order Info */}
          <div>
            <Card className="p-5 sticky top-24">
              <h3 className="font-black mb-4">Delivery Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 text-[#E8621A] shrink-0" />
                  <span className="text-[#636366]">123 Main Street, Victoria Island, Lagos</span>
                </div>
                <div className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="text-[#16A34A]">Contactless delivery</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* RATING MODAL */}
      {showRating && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-black mb-2">Rate Your Order 🎉</h2>
            <p className="text-[#636366] mb-6">How was your food from Spice Garden?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`w-10 h-10 ${star <= rating ? 'fill-[#E8621A] text-[#E8621A]' : 'text-[#E8E8E8]'}`} />
                </button>
              ))}
            </div>
            <Button
              onClick={() => setShowRating(false)}
              className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
            >
              Submit Rating
            </Button>
            <button
              onClick={() => setShowRating(false)}
              className="mt-3 text-sm text-[#A0A0A0] hover:text-[#636366]"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
