'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Program, SECTION_MAPPINGS } from '@/lib/types';
import programsData from '@/public/programs.json';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function AttendancePage() {
  const { user, loading, isTeacher, isAdmin, recentSections } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [programs] = useState<Program[]>(programsData.sort((a, b) => a.name.localeCompare(b.name)));
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter programs and sections based on search
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs;

    return programs.map(program => ({
      ...program,
      sections: program.sections.filter(section =>
        section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (SECTION_MAPPINGS[section] || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(program => program.sections.length > 0);
  }, [programs, searchQuery]);

  // Get all sections for quick access
  const allSections = useMemo(() =>
    programs.flatMap(program => program.sections), [programs]
  );

  // Filter sections for search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return allSections;
    return allSections.filter(section =>
      section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (SECTION_MAPPINGS[section] || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allSections, searchQuery]);

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

  const totalSections = programs.reduce((acc, program) => acc + program.sections.length, 0);
  const hasSearchResults = searchQuery.trim() && (filteredPrograms.length > 0 || filteredSections.length > 0);

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto p-2 md:p-6">
        {isDesktop
          ? (<>
            {/* Hero Header - Hidden on Mobile */}
            < div className="hidden md:block text-center mb-8 md:mb-12">
              <div className="flex items-center justify-center mb-4 md:mb-6">
                <div className="relative">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25">
                    <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
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
                <Button variant="ghost" onClick={() => router.push('/reports')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </div>
          </>)
          : (<>
            {/* Compact Header */}
            < div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-cyber-gray-900" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-cyber-gray-900">Attendance</h1>
                    <p className="text-xs md:text-sm text-cyber-gray-600">
                      {totalSections} sections • {programs.length} programs
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/reports')}
                    className="hidden md:flex"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Reports
                  </Button>
                </div>
              </div>
            </div>
          </>)
        }

        {/* Recent Sections */}
        {recentSections.length > 0 && (
          <div className="mb-6 md:mb-12">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyber-yellow" />
                <h2 className="text-sm md:text-base font-semibold text-cyber-gray-900">Recent</h2>
                <span className="text-xs text-cyber-gray-500">({recentSections.length})</span>
              </div>
            </div>

            <div className={`grid ${getGridLayout(recentSections.length)} gap-2 md:gap-4`}>
              {recentSections.map((section, index) => (
                <Card
                  key={section}
                  variant="default"
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
                      <span className="font-semibold text-xs md:text-sm">{section}</span>
                      <span className="hidden md:block text-[10px] text-cyber-gray-600 truncate">{SECTION_MAPPINGS[section] || ''}</span>
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

        {/* All Programs Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-yellow" />
            <h2 className="text-sm md:text-base font-semibold text-cyber-gray-900">All Programs</h2>
            <span className="text-xs text-cyber-gray-500">({programs.length})</span>
          </div>
          <Button
            variant={showSearch?"gradient":"ghost"}
            size="icon"
            className="p-2 rounded-full hover:bg-cyber-gray-100 transition"
            aria-label="Search"
            onClick={() => setShowSearch((prev) => !prev)}
          >
            <Search className="w-5 h-5 text-cyber-gray-500" />
          </Button>
        </div>

        {/* Animated Search Bar */}
        <div className={`overflow-hidden transition-all duration-300 ${showSearch ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray-400 w-4 h-4 pointer-events-none" />
            <Input
              id="search-input"
              type="text"
              placeholder="Search sections or programs..."
              autoComplete='off'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border-cyber-gray-200 focus:border-cyber-yellow focus:ring-cyber-yellow"
              autoFocus={showSearch}
            />
            {searchQuery && (
              <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchQuery('')}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-cyber-gray-100"
          aria-label="Clear"
              >
          ×
              </Button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {hasSearchResults && (
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-cyber-yellow" />
              <h2 className="text-sm md:text-base font-semibold text-cyber-gray-900">
                Search Results
              </h2>
              <span className="text-xs text-cyber-gray-500">
                ({filteredSections.length} sections)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {filteredSections.map((section) => (
                <Card
                  key={section}
                  className="p-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-cyber-gray-200 hover:border-cyber-yellow group"
                  onClick={() => handleSectionClick(section)}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center group-hover:shadow-lg transition-shadow">
                      <Users className="w-4 h-4 text-cyber-gray-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs md:text-sm text-cyber-gray-900 truncate">{section}</div>
                      <div className="text-xs text-cyber-gray-600 whitespace-normal line-clamp-2 truncate">{SECTION_MAPPINGS[section] || ''}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Programs */}
        {!hasSearchResults && (
          <div className="space-y-3 md:space-y-4">
            {filteredPrograms.map((program) => (
              <Card
                key={program.id}
                className="overflow-hidden border-cyber-gray-200 hover:border-cyber-yellow/50 transition-colors"
              >
                {/* Program Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-cyber-gray-50/50 transition-all duration-200"
                  onClick={() => program.sections.length === 1
                    ? handleSectionClick(program.sections[0])
                    : setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-cyber-gray-900" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-cyber-gray-900">{program.name}</h3>
                        <p className="text-xs text-cyber-gray-600">
                          {program.sections.length} section{program.sections.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick Actions */}
                      {program.sections.length === 1
                        ? (
                          <Button
                            size="sm"
                            // onClick={(e) => handleSectionClick(program.sections[0])}
                            className="px-2"
                          >
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )
                        : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${expandedProgram === program.id ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-4 h-4 text-cyber-gray-500" />
                          </div>
                        )
                      }
                    </div>
                  </div>
                </div>

                {/* Expanded Sections */}
                {expandedProgram === program.id && program.sections.length > 1 && (
                  <div className="border-t border-cyber-gray-100 bg-cyber-gray-50/30">
                    <div className="p-4">
                      <div className={`grid gap-2 md:gap-3 grid-cols-3 md:grid-cols-4 lg:grid-cols-5`}>
                        {program.sections.map((section) => (
                          <div
                            key={section}
                            className="group relative"
                            onMouseEnter={() => setHoveredSection(section)}
                            onMouseLeave={() => setHoveredSection(null)}
                          >
                            <Card
                              className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md border-cyber-gray-200 hover:border-cyber-yellow group-hover:scale-105 flex flex-col items-center text-center gap-2`}
                              onClick={() => handleSectionClick(section)}
                            >
                              <div className={`flex items-center place-self-center justify-center w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg group-hover:shadow-lg transition-shadow`}>
                                <Users className={`${'w-4 h-4'} text-cyber-gray-900`} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-cyber-gray-900 text-sm truncate`}>
                                  {section}
                                </div>
                              </div>
                            </Card>

                            {/* Hover Effect */}
                            {hoveredSection === section && (
                              <div className="absolute inset-0 bg-cyber-yellow/5 rounded-lg animate-in fade-in duration-200 pointer-events-none" />
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
        )}

        {/* Empty State */}
        {!hasSearchResults && filteredPrograms.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-cyber-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-cyber-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-cyber-gray-900 mb-2">No results found</h3>
            <p className="text-cyber-gray-600 mb-4">
              Try searching for a different section or program name
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div >
  );
}