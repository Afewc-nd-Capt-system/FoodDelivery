import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { LocationProvider } from '@/context/LocationContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from 'next-themes';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['italic', 'normal'],
  variable: '--font-plus-jakarta',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VibeChops - Order food you love, delivered fast',
  description: 'Discover, Explore and Eat what you love. Order from restaurants and local vendors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.className} bg-[#FFF8F0]`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <CartProvider>
              <LocationProvider>
                <SocketProvider>
                  {children}
                </SocketProvider>
              </LocationProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
