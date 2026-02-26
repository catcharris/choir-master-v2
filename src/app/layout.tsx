import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Choir Master",
  description: "Choir Tracker and Cloud Environment",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
import { Toaster } from 'react-hot-toast';
import { PortraitLockOverlay } from '@/components/PortraitLockOverlay';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.Capacitor || window.location.protocol === 'capacitor:' || navigator.userAgent.includes('Capacitor')) { document.documentElement.classList.add('is-native'); }`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-500/30`}
      >
        <PortraitLockOverlay />
        {children}
        <Toaster
          position="top-center"
          containerStyle={{ top: '50vh', transform: 'translateY(-50%)' }}
          toastOptions={{
            style: {
              background: '#1e293b', // slate-800
              color: '#f8fafc', // slate-50
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              backdropFilter: 'blur(10px)',
              padding: '16px 24px',
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 600,
            },
            success: {
              iconTheme: {
                primary: '#10b981', // emerald-500
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444', // red-500
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
