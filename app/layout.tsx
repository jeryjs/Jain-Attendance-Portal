import type { Metadata } from 'next';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FET Attendance - Jain University Attendance Portal",
  description: "Secure attendance management system for Jain University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} cyber-gradient-bg min-h-screen`}>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <RouteGuard />
                <div className="flex min-h-screen flex-col lg:flex-row">
                <Navigation />
                <main className="flex-1 overflow-auto h-screen">
                  {children}
                </main>
              </div>
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
