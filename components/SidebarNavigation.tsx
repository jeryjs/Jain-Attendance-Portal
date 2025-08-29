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
import { User as FirebaseUser } from 'firebase/auth';

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

export default function SidebarNavigation() {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  if (!user || !isTeacher) return null;

  return (
    <div className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-md border-r border-cyber-gray-200 shadow-lg z-40">
      <div className="flex flex-col w-full">
        {/* Logo */}
        <div className="p-6 border-b border-cyber-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-cyber-gray-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
                FET ClassKeeper
              </h1>
              <p className="text-xs text-cyber-gray-600">Attendance Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
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
                      "w-full justify-start p-3 rounded-xl transition-all duration-300 group",
                      active
                        ? "bg-cyber-yellow text-cyber-gray-900 shadow-lg"
                        : "hover:bg-cyber-gray-50 text-cyber-gray-700 hover:text-cyber-gray-900"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mr-3", active && "animate-pulse")} />
                    {item.label}
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-cyber-gray-900 rounded-full animate-pulse" />
                    )}
                  </Button>
                );
              })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-cyber-gray-200">
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-cyber-gray-50 transition-all duration-300"
            >
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
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-cyber-gray-900 truncate">
                  {user.displayName?.split(' ')[0] || 'Teacher'}
                </p>
                <p className="text-xs text-cyber-gray-500 truncate">{user.email}</p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-cyber-gray-500 transition-transform duration-200",
                isProfileMenuOpen && "rotate-180"
              )} />
            </Button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-cyber-gray-200 py-2 animate-in slide-in-from-bottom-2">
                <div className="px-4 py-3 border-b border-cyber-gray-100">
                  <p className="text-sm font-medium text-cyber-gray-900">{user.displayName}</p>
                  <p className="text-xs text-cyber-gray-500">{user.email}</p>
                  {isAdmin && (
                    <div className="flex items-center mt-1">
                      <Shield className="w-3 h-3 text-cyber-yellow mr-1" />
                      <span className="text-xs text-cyber-yellow font-medium">Admin</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}