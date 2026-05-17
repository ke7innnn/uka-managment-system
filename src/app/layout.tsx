import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SupabaseSyncProvider from "@/components/SupabaseSyncProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UKA",
  description: "Internal portal for UKA",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SupabaseSyncProvider>
          {children}
        </SupabaseSyncProvider>
      </body>
    </html>
  );
}
