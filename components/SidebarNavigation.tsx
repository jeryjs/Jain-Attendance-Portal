'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  Shield,
  User
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SidebarNavigation() {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className={cn(
      "hidden lg:flex flex-col bg-white/95 backdrop-blur-md border-r border-cyber-gray-200 shadow-lg transition-all duration-300 h-screen",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo and Toggle */}
        {/* Logo and Toggle */}
        <div className={cn(
          "border-b border-cyber-gray-200 flex items-center",
          isCollapsed ? "p-2 justify-center" : "p-4 justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark flex items-center justify-center overflow-hidden">
                <img src="/JGI.webp" alt="JGI Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-cyber-gray-900 font-cyber">
                  FET Attendance
                </h1>
                <p className="text-xs text-cyber-gray-600 truncate">JAIN Attendance Portal</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-cyber-gray-900" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-6 h-6 rounded-full hover:bg-cyber-gray-100"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-6 h-6 rounded-full hover:bg-cyber-gray-100 flex-shrink-0"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {NAV_ITEMS
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                const href = typeof item.href === 'function' ? item.href() : item.href;
                const active = isActive(href);
                return (
                  <Button
                    key={href}
                    variant="ghost"
                    onClick={() => router.push(href)}
                    className={cn(
                      "w-full transition-all duration-300 group",
                      isCollapsed ? "justify-center p-2" : "justify-start p-3",
                      active && "bg-cyber-yellow text-cyber-gray-900 shadow-lg"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={cn(
                      "flex-shrink-0",
                      isCollapsed ? "w-5 h-5" : "w-5 h-5 mr-3",
                      active && "animate-pulse"
                    )} />
                    {!isCollapsed && (
                      <>
                        {item.label}
                        {active && (
                          <div className="ml-auto w-2 h-2 bg-cyber-gray-900 rounded-full animate-pulse" />
                        )}
                      </>
                    )}
                  </Button>
                );
              })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-3 border-t border-cyber-gray-200">
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={cn(
                "w-full transition-all duration-300",
                isCollapsed ? "justify-center p-2" : "flex items-center space-x-3 p-3"
              )}
              title={isCollapsed ? user.displayName?.split(' ')[0] || 'Teacher' : undefined}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-cyber-gray-900" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-cyber-gray-900 truncate">
                    {user.displayName?.split(' ')[0] || 'Teacher'}
                  </p>
                  <p className="text-xs text-cyber-gray-500 truncate">{user.email}</p>
                </div>
              )}
              {!isCollapsed && (
                <ChevronDown className={cn(
                  "w-4 h-4 text-cyber-gray-500 transition-transform duration-200 flex-shrink-0",
                  isProfileMenuOpen && "rotate-180"
                )} />
              )}
            </Button>

            {isProfileMenuOpen && (
              <div className={cn(
                "absolute bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-cyber-gray-200 py-2 animate-in slide-in-from-bottom-2",
                isCollapsed ? "left-0 right-0" : "left-0 right-0"
              )}>
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