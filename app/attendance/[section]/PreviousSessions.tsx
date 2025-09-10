'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceSession } from '@/lib/types';
import { getSessionLabel } from '@/lib/utils';
import { format, isWithinInterval, parseISO, startOfDay, subDays, subMonths } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Search,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PreviousSessionsProps {
  sectionSessions: AttendanceSession[];
  section: string;
  isAdminView: boolean;
}

const SESSIONS_PER_PAGE = 5;

type FilterPeriod = 'all' | 'week' | 'month' | 'quarter';
type SortBy = 'date' | 'attendance' | 'present';

export default function PreviousSessions({
  sectionSessions,
  section,
  isAdminView
}: PreviousSessionsProps) {
  const router = useRouter();

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showFilters, setShowFilters] = useState(false);

  // Filter sessions based on search and period
  const filteredSessions = sectionSessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDate = format(new Date(session.date), 'MMM dd, yyyy').toLowerCase().includes(query);
      const matchesTime = getSessionLabel(session.session).toLowerCase().includes(query);
      const matchesTeacher = session.teacherEmail?.toLowerCase().includes(query);

      if (!matchesDate && !matchesTime && (!isAdminView || !matchesTeacher)) {
        return false;
      }
    }

    // Period filter
    if (filterPeriod !== 'all') {
      const sessionDate = startOfDay(parseISO(session.date));
      const now = new Date();

      let interval;
      switch (filterPeriod) {
        case 'week':
          interval = { start: subDays(now, 7), end: now };
          break;
        case 'month':
          interval = { start: subMonths(now, 1), end: now };
          break;
        case 'quarter':
          interval = { start: subMonths(now, 3), end: now };
          break;
        default:
          return true;
      }

      return isWithinInterval(sessionDate, interval);
    }

    return true;
  });

  // Sort sessions
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'attendance':
        const aPercentage = a.totalStudents > 0 ? (a.presentCount || 0) / a.totalStudents : 0;
        const bPercentage = b.totalStudents > 0 ? (b.presentCount || 0) / b.totalStudents : 0;
        return bPercentage - aPercentage;
      case 'present':
        return (b.presentCount || 0) - (a.presentCount || 0);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedSessions.length / SESSIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * SESSIONS_PER_PAGE;
  const endIndex = startIndex + SESSIONS_PER_PAGE;
  const paginatedSessions = sortedSessions.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPeriod, sortBy]);

  // Load filters from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFilters = localStorage.getItem('attendance-session-filters');
        if (savedFilters) {
          const { filterPeriod: savedPeriod, sortBy: savedSort } = JSON.parse(savedFilters);
          setFilterPeriod(savedPeriod || 'all');
          setSortBy(savedSort || 'date');
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('attendance-session-filters', JSON.stringify({
          filterPeriod,
          sortBy
        }));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [filterPeriod, sortBy]);

  if (sectionSessions.length === 0) {
    return null;
  }

  return (
    <Card variant="cyber">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
            Previous Sessions ({sectionSessions.length})
          </h3>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { localStorage.removeItem('defaultToAdminView'); router.push('/reports') }}
              className="flex items-center gap-1"
            >
              <TrendingUp className="w-4 h-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-4 p-3 bg-cyber-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Period Filter */}
              <Select value={filterPeriod} onValueChange={(value: FilterPeriod) => setFilterPeriod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="attendance">Highest Attendance</SelectItem>
                  <SelectItem value="present">Most Present</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results summary */}
            <div className="text-xs text-cyber-gray-600">
              Showing {paginatedSessions.length} of {filteredSessions.length} sessions
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-3 mb-4">
          {paginatedSessions.map((session: AttendanceSession) => {
            const attendancePercentage = session.totalStudents > 0
              ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100)
              : 0;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 md:p-4 bg-cyber-gray-50 rounded-xl hover:bg-cyber-gray-100 cursor-pointer transition-colors group"
                onClick={() => router.push(`/attendance/${encodeURIComponent(section)}?date=${session.date}&time=${session.session}`)}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
                  </div>
                  <div>
                    <p className="font-semibold text-cyber-gray-900 text-sm md:text-base">
                      {format(new Date(session.date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs md:text-sm text-cyber-gray-600">
                      <span className="md:hidden">{session.session}</span>
                      <span className="hidden md:inline">
                        {getSessionLabel(session.session)}
                        {isAdminView && ` • ${session.teacherEmail}`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="text-center">
                      <p className="text-sm md:text-lg font-bold text-green-600">
                        {session.presentCount || 0}
                      </p>
                      <p className="text-xs text-cyber-gray-600">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm md:text-lg font-bold text-red-600">
                        {session.absentCount || 0}
                      </p>
                      <p className="text-xs text-cyber-gray-600">Absent</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm md:text-lg font-bold ${attendancePercentage >= 80 ? 'text-green-600' :
                        attendancePercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {attendancePercentage}%
                      </p>
                      <p className="text-xs text-cyber-gray-600">Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSessions.length === 0 && (
          <div className="text-center py-8 text-cyber-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-cyber-gray-300" />
            <p className="text-lg font-medium mb-2">No sessions found</p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search terms' : 'No sessions match the selected filters'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-cyber-gray-200">
            <p className="text-sm text-cyber-gray-600">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isCurrentPage = page === currentPage;

                  return (
                    <Button
                      key={page}
                      variant={isCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}