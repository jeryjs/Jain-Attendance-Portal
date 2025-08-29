'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Calendar, Clock, Users, Sparkles, Zap, Target, BookOpen } from 'lucide-react';
import { Program, SECTION_MAPPINGS } from '@/lib/types';
import programsData from '@/public/programs.json';

export default function AttendancePage() {
  const { user, loading, isTeacher, isAdmin, recentSections } = useAuth();
  const router = useRouter();
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [programs] = useState<Program[]>(programsData);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isTeacher)) {
      router.push('/');
    }
  }, [user, loading, isTeacher, router]);

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

  if (!user || !isTeacher) {
    return null;
  }

  const toggleProgram = (programId: string) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  const getGridLayout = (count: number) => {
    if (count <= 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-3 sm:grid-cols-3';
  };

  const getCardSize = (count: number) => {
    if (count <= 3) return 'p-4 md:p-6';
    if (count <= 6) return 'p-3 md:p-4';
    return 'p-2 md:p-3';
  };

  const handleSectionClick = (section: string) => {
    router.push(`/attendance/${encodeURIComponent(section)}`);
  };

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header - Hidden on Mobile */}
        <div className="hidden md:block text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center mb-4 md:mb-6">
            <div className="relative">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
              </div>
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 bg-cyber-yellow rounded-full flex items-center justify-center">
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-cyber-gray-900" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4">
            <span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
              Attendance
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
              Management
            </span>
          </h1>

          <p className="text-sm md:text-xl text-cyber-gray-600 mb-4 md:mb-8 max-w-2xl mx-auto px-2">
            Take control of your classroom attendance with our sleek, intelligent system
          </p>

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4 md:mb-8">
            <div className="flex items-center space-x-1 md:space-x-2 bg-cyber-gray-50 px-2 md:px-4 py-1 md:py-2 rounded-full">
              <BookOpen className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
              <div className="font-bold text-cyber-gray-900 mb-1">{programs.length}</div>
              <span className="text-xs md:text-sm text-cyber-gray-700">Programs Available</span>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2 bg-cyber-gray-50 px-2 md:px-4 py-1 md:py-2 rounded-full">
              <Target className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
              <div className="font-bold text-cyber-gray-900 mb-1">{programs.reduce((acc, program) => acc + program.sections.length, 0)}</div>
              <span className="text-xs md:text-sm text-cyber-gray-700">Active Sections</span>
            </div>
          </div>
        </div>

        {/* Recent Sections */}
        {recentSections.length > 0 && (
          <div className="mb-6 md:mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
              <h2 className="text-lg md:text-xl font-bold text-cyber-gray-900">Recent Sections</h2>
              <span className="text-xs md:text-sm text-cyber-gray-600">
                Last {recentSections.length} section{recentSections.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className={`grid ${getGridLayout(recentSections.length)} gap-2 md:gap-4`}>
              {recentSections.map((section, index) => (
                <Card
                  key={section}
                  variant="cyber"
                  className={`${getCardSize(recentSections.length)} cursor-pointer hover:scale-105 transition-all duration-300 group`}
                  onClick={() => handleSectionClick(section)}
                >
                  <div className="relative flex items-center px-2 py-1 md:px-3 md:py-2 bg-cyber-yellow/30 rounded-full shadow-lg gap-2 md:gap-3 cursor-pointer hover:scale-105 transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-5 h-5 md:w-7 md:h-7 bg-cyber-gray-50 rounded-full flex items-center justify-center shadow">
                        <Users className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-semibold text-xs md:text-sm truncate">{section}</span>
                      <span className="hidden md:block text-[10px] text-cyber-gray-600">{SECTION_MAPPINGS[section] || ''}</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-cyber-yellow rounded-full flex items-center justify-center shadow">
                      <span className="text-[10px] md:text-xs font-bold text-cyber-gray-900">{index + 1}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Programs Grid */}
        <div className="space-y-3 md:space-y-6">
          {programs.map((program, index) => (
            <Card
              key={program.id}
              variant="cyber"
              className="overflow-hidden"
            >
              <div
                className="cursor-pointer hover:bg-cyber-gray-50/50 transition-all duration-300 p-3 md:p-6"
                onClick={() => toggleProgram(program.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="relative">
                      <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center">
                        <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-cyber-gray-900" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-cyber-yellow rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-cyber-gray-900">{program.sections.length}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm md:text-xl font-bold text-cyber-gray-900 truncate">{program.name}</h3>
                      <p className="text-xs md:text-sm text-cyber-gray-600 truncate">
                        {program.sections.length} section{program.sections.length !== 1 ? 's' : ''} • {program.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden sm:flex items-center space-x-1 md:space-x-2">
                      {program.sections.slice(0, 2).map((section) => (
                        <span
                          key={section}
                          className="px-2 md:px-3 py-1 bg-cyber-yellow/10 text-cyber-yellow rounded-full text-xs font-medium"
                        >
                          {section}
                        </span>
                      ))}
                      {program.sections.length > 2 && (
                        <span className="px-2 md:px-3 py-1 bg-cyber-gray-100 text-cyber-gray-600 rounded-full text-xs">
                          +{program.sections.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-cyber-gray-100 rounded-full flex items-center justify-center transition-transform duration-300">
                      {expandedPrograms.has(program.id) ? (
                        <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
                      ) : (
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {expandedPrograms.has(program.id) && (
                <div className="border-t border-cyber-gray-200 bg-cyber-gray-50/30">
                  <div className="p-3 md:p-6">
                    <h4 className="text-sm md:text-lg font-semibold text-cyber-gray-900 mb-3 md:mb-4">Available Sections</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                      {program.sections.map((section, sectionIndex) => (
                        <div
                          key={section}
                          className="group relative"
                          onMouseEnter={() => setHoveredSection(section)}
                          onMouseLeave={() => setHoveredSection(null)}
                        >
                          <Button
                            variant="outline"
                            className="w-full h-auto p-2 md:p-4 flex flex-col items-center gap-1 md:gap-3 hover:scale-105 transition-all duration-300"
                            onClick={() => handleSectionClick(section)}
                          >
                            <div className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
                              <Users className="w-3 h-3 md:w-5 md:h-5 text-cyber-gray-900" />
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-xs md:text-sm text-cyber-gray-900">{section}</div>
                              <div className="text-xs text-cyber-gray-600">Take Attendance</div>
                            </div>
                          </Button>

                          {/* Hover Effect */}
                          {hoveredSection === section && (
                            <div className="absolute inset-0 bg-cyber-yellow/10 rounded-xl animate-in fade-in duration-200 pointer-events-none" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Admin Panel */}
        {/* {isAdmin && (
          <Card variant="neon" className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-cyber-gray-900 mb-2">Admin Control Panel</h3>
                <p className="text-cyber-gray-600">Advanced administrative tools and system management</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/reports')}
                  className="border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-cyber-gray-900"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-cyber-gray-900"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </Card>
        )} */}
      </div>
    </div>
  );
}