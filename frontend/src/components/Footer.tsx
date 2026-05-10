import Link from 'next/link';
import { MapPin, Phone, Mail, Instagram, Twitter, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1C1E', color: '#A1A1A1' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ background: 'linear-gradient(135deg, #E8621A, #BE3A2A)' }}>
                V
              </div>
              <span className="text-xl font-black text-white">
                Vibe<span style={{ color: '#E8621A' }}>Chops</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Your premium Nigerian food delivery platform. Bringing the best of Lagos kitchens to your doorstep in minutes.
            </p>
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ border: '1px solid #333' }}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              {['All Restaurants', 'Popular Dishes', 'New Arrivals', 'Special Offers', 'Top Rated'].map(item => (
                <li key={item}>
                  <Link href="/restaurants" className="hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {['About Us', 'Careers', 'Blog', 'Press', 'Partner With Us'].map(item => (
                <li key={item}>
                  <a href="#" className="hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Get In Touch</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: '#E8621A' }} />
                <span>Plot 14, Allen Avenue, Ikeja, Lagos, Nigeria</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={16} style={{ color: '#E8621A' }} />
                <span>+234 812 345 6789</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={16} style={{ color: '#E8621A' }} />
                <span>hello@vibechops.ng</span>
              </div>
            </div>
            {/* App download badges */}
            <div className="flex gap-2 mt-4">
              <div className="px-3 py-2 rounded-xl text-xs font-medium text-white"
                style={{ backgroundColor: '#2C2C2E', border: '1px solid #333' }}>
                <div className="text-[10px] opacity-60">Download on the</div>
                <div className="font-semibold">App Store</div>
              </div>
              <div className="px-3 py-2 rounded-xl text-xs font-medium text-white"
                style={{ backgroundColor: '#2C2C2E', border: '1px solid #333' }}>
                <div className="text-[10px] opacity-60">Get it on</div>
                <div className="font-semibold">Google Play</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <span>© 2026 VibeChops Technologies Ltd. All rights reserved.</span>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
              <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
