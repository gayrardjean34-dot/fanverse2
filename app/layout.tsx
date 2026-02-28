import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'Fanverse — AI Workflows for Creators',
  description: 'Unleash your creativity with powerful AI workflows. Generate images, videos, and more with cutting-edge models.',
  icons: {
    icon: '/images/logo-header.png',
    apple: '/images/logo-header.png',
  },
  openGraph: {
    title: 'Fanverse — AI Workflows for Creators',
    description: 'Generate stunning images and videos for your AI influencer using cutting-edge models.',
    images: ['/images/logo-full.jpeg'],
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.className}>
      <body className="min-h-[100dvh] bg-[#191919] text-[#FEFEFE]">
        <SWRConfig
          value={{
            fallback: {
              '/api/user': getUser(),
              '/api/team': getTeamForUser(),
            },
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
