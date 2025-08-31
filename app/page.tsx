'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Users, BarChart3, Shield, GraduationCap, Sparkles, Zap, Target } from 'lucide-react';

export default function Home() {
  const { user, loading, signIn, isTeacher, isAdmin, isStudent } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (isStudent) {
        // Students stay on this page to see the playful message
      } else if (isTeacher || isAdmin) {
        // Teachers and admins go to attendance page
        router.push('/attendance');
      }
    }
  }, [user, loading, isTeacher, isAdmin, isStudent, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-yellow/20 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-gray-50 via-white to-cyber-yellow/10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyber-yellow/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyber-yellow/5 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyber-yellow/5 to-transparent rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 animate-bounce animation-delay-500">
          <Sparkles className="w-6 h-6 text-cyber-yellow/60" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce animation-delay-1000">
          <Zap className="w-5 h-5 text-cyber-yellow/40" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce animation-delay-1500">
          <Target className="w-4 h-4 text-cyber-yellow/50" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-2">
          <div className="max-w-6xl mx-auto text-center">
            {/* Hero Section */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center justify-center mb-4 md:mb-8">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                    <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-cyber-gray-900" />
                  </div>
                  <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                    <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-cyber-gray-900" />
                  </div>
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold mb-3 md:mb-6">
                <span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
                  FET - Jain University
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent animate-pulse">
                  Attendance Portal
                </span>
              </h1>

              <p className="text-sm md:text-xl lg:text-2xl text-cyber-gray-600 mb-4 md:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
                Experience the future of attendance management with our sleek, secure, and intelligent system designed exclusively for FET.
              </p>

              <div className="flex flex-col gap-2 md:gap-4 justify-center items-center">
                <Button
                  onClick={signIn}
                  size="lg"
                  glow
                  className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 w-full max-w-xs md:w-auto"
                >
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Sign in with University Email
                </Button>
                <p className="text-xs md:text-sm text-cyber-gray-500">
                  Only @jainuniversity.ac.in emails allowed
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16">
              <Card variant="cyber" className="text-center p-4 md:p-6 group">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-cyber-gray-900">Ultra Secure</h3>
                {/* <p className="text-xs md:text-sm text-cyber-gray-600">Bank-level security with domain-restricted authentication and encrypted data transmission.</p> */}
              </Card>

              <Card variant="cyber" className="text-center p-4 md:p-6 group">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-cyber-gray-900">Lightning Fast</h3>
                {/* <p className="text-xs md:text-sm text-cyber-gray-600">Optimized for speed with instant attendance marking and real-time synchronization.</p> */}
              </Card>

              <Card variant="cyber" className="text-center p-4 md:p-6 group">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-cyber-gray-900">Smart Analytics</h3>
                {/* <p className="text-xs md:text-sm text-cyber-gray-600">Comprehensive reports and insights to track attendance patterns and performance.</p> */}
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-gray-50 via-white to-cyber-yellow/10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyber-yellow/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyber-yellow/5 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 animate-bounce animation-delay-500">
          <Sparkles className="w-8 h-8 text-cyber-yellow/60" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce animation-delay-1000">
          <Users className="w-6 h-6 text-cyber-yellow/40" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce animation-delay-1500">
          <GraduationCap className="w-5 h-5 text-cyber-yellow/50" />
        </div>

        <Card variant="cyber" className="w-full max-w-sm md:max-w-md relative z-10 p-4 md:p-6">
          <div className="text-center">
            <div className="relative mb-4 md:mb-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-cyber-yellow/25 animate-bounce">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-cyber-gray-900" />
              </div>
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-cyber-yellow rounded-full flex items-center justify-center animate-spin">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-cyber-gray-900" />
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-cyber-gray-900 to-cyber-gray-700 bg-clip-text text-transparent">
              Hey there! 👋
            </h2>

            <p className="text-sm md:text-lg mb-4 md:mb-6 text-cyber-gray-700 leading-relaxed">
              Welcome to FET, Jain University's attendance portal! This sleek system is designed exclusively for our amazing faculty members.
            </p>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex items-center justify-center space-x-2 text-cyber-gray-600">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
                <span className="text-xs md:text-sm">Ultra-secure authentication</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-cyber-gray-600">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
                <span className="text-xs md:text-sm">Lightning-fast performance</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-cyber-gray-600">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
                <span className="text-xs md:text-sm">Smart analytics & insights</span>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = 'https://jainuniversity.ac.in'}
              variant="outline"
              className="w-full text-sm md:text-base"
            >
              Visit University Website
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // This should not be reached for teachers/admins due to the useEffect redirect
  return null;
}
