'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  GraduationCap,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SidebarNavigation from './SidebarNavigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Attendance', href: '/attendance', icon: Calendar },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Navigation() {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!user || !isTeacher) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <SidebarNavigation />

      {/* Mobile Top Bar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-cyber-gray-200 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-cyber-gray-900" />
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
                FET ClassKeeper
              </h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-full"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl animate-in slide-in-from-right">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-cyber-gray-900" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
                    FET ClassKeeper
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-2">
                {navItems
                  .filter(item => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant="ghost"
                        onClick={() => router.push(item.href)}
                        className={cn(
                          "w-full justify-start p-4 rounded-xl transition-all duration-300",
                          active
                            ? "bg-cyber-yellow text-cyber-gray-900 shadow-lg"
                            : "hover:bg-cyber-gray-50 text-cyber-gray-700"
                        )}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </Button>
                    );
                  })}
              </div>

              <div className="mt-8 pt-6 border-t border-cyber-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-full flex items-center justify-center overflow-hidden">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.displayName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-cyber-gray-900" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-cyber-gray-900">{user.displayName}</p>
                    <p className="text-sm text-cyber-gray-500">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed navigation */}
      <div className="lg:h-0" />
      <div className="lg:ml-64" />
    </>
  );
}