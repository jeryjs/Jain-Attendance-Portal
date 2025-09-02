'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        router.replace('/students/admin');
      } else {
        // For now, redirect to reports since we don't have a regular students view
        router.replace('/reports');
      }
    }
  }, [user, loading, isAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
      </div>
    </div>
  );
}