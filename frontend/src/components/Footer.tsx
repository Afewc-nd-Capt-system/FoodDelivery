import Link from 'next/link';
import { MapPin, Phone, Mail, Instagram, Twitter, Facebook } from 'lucide-react';

const contactEmail = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || '').trim();
const contactPhone = (process.env.NEXT_PUBLIC_CONTACT_PHONE || '').trim();

const socialLinks = [
  { label: 'Instagram', href: (process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || '').trim(), icon: Instagram },
  {
    label: 'X',
    href: (process.env.NEXT_PUBLIC_SOCIAL_X || process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '').trim(),
    icon: Twitter,
  },
  { label: 'Facebook', href: (process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || '').trim(), icon: Facebook },
].filter((link) => link.href);

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
              Your premium African food delivery platform. Bringing the best of African kitchens to your doorstep in minutes.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ border: '1px solid #333' }}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/restaurants" className="hover:text-white transition-colors">All Restaurants</Link></li>
              <li><Link href="/vendors" className="hover:text-white transition-colors">Home Cooks</Link></li>
              <li><Link href="/vibepass" className="hover:text-white transition-colors">VibePass</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Partner with Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Get In Touch</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: '#E8621A' }} />
                <div>
                  <p>Head Office: Maiduguri</p>
                  <p>Branch Office: Bauchi State</p>
                </div>
              </div>
              {contactPhone && (
                <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Phone size={16} style={{ color: '#E8621A' }} />
                  <span>{contactPhone}</span>
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Mail size={16} style={{ color: '#E8621A' }} />
                  <span>{contactEmail}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <span>© 2026 VibeChops. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
