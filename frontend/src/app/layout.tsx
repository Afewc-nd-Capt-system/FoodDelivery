import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { LocationProvider } from '@/context/LocationContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from 'next-themes';
import { FetchTimeoutProvider } from '@/components/FetchTimeoutProvider';

const siteUrl = (() => {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    'http://localhost:3000';
  return configured.includes('://') ? configured : `https://${configured}`;
})();

const buildCommit =
  process.env.NEXT_PUBLIC_BUILD_COMMIT
  || process.env.VERCEL_GIT_COMMIT_SHA
  || 'dev';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'VibeChops - Order food you love, delivered fast',
  description: 'Discover, Explore and Eat what you love. Order from restaurants and local vendors.',
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    url: './',
    siteName: 'VibeChops',
    title: 'VibeChops - Order food you love, delivered fast',
    description: 'Discover, Explore and Eat what you love. Order from restaurants and local vendors.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeChops - Order food you love, delivered fast',
    description: 'Discover, Explore and Eat what you love. Order from restaurants and local vendors.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="build-commit" content={buildCommit} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`bg-[#FFF8F0]`}>
        <FetchTimeoutProvider>
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
        </FetchTimeoutProvider>
      </body>
    </html>
  );
}
