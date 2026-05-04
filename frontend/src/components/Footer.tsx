import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">FlavorDash</h3>
            <p className="text-sm">
              Your favorite food, delivered fast. Order from the best restaurants in your area.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/restaurants" className="hover:text-white transition-colors">Restaurants</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: info@flavordash.com</li>
              <li>Phone: +1 (555) 123-4567</li>
              <li>Address: 123 Main St, Metro City</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} FlavorDash. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
