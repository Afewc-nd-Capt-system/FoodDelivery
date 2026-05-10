import { Footer } from '@/components/Footer';

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
