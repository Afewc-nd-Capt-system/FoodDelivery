import { Footer } from '@/components/Footer';

export default function AdminLayout({
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
