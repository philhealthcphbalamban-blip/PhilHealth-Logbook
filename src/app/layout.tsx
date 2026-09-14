import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { FluidSimulation } from '@/components/FluidSimulation';

export const metadata: Metadata = {
  title: 'PhilHealth Daily Endorsement Logbook',
  description: 'Hospital Data Entry & Logbook Management System for PhilHealth Endorsements',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <FluidSimulation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
