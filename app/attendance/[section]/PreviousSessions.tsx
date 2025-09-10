'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { FirebaseService } from '@/lib/firebase-service';
import { AttendanceSession, SESSION_OPTIONS } from '@/lib/types';
import { getSessionLabel } from '@/lib/utils';
import { format, subDays, subMonths } from 'date-fns';
import {
  BarChart3,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RotateCcw,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface PreviousSessionsProps {
  section: string;
  isAdminView: boolean;
  userId?: string;
}

interface FilterCondition {
  field: 'date' | 'attendance' | 'session';
  operator: 'eq' | 'gte' | 'lte';
  value: string | number;
}

interface SessionsData {
  sessions: AttendanceSession[];
  hasMore: boolean;
  lastDoc: any;
  total: number;
}

const SESSIONS_PER_PAGE = 10;

export default function PreviousSessions({
  section,
  isAdminView,
  userId
}: PreviousSessionsProps) {
  const router = useRouter();

  // State
  const [sessionsData, setSessionsData] = useState<SessionsData>({
    sessions: [],
    hasMore: false,
    lastDoc: null,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);
  const [tempFilters, setTempFilters] = useState<FilterCondition[]>([]);

  // Load initial sessions
  const loadSessions = useCallback(async (reset = false, filters: FilterCondition[] = []) => {
    try {
      if (reset) {
        setLoading(true);
        setSessionsData({ sessions: [], hasMore: false, lastDoc: null, total: 0 });
      } else {
        setLoadingMore(true);
      }

      const result = await FirebaseService.getAttendanceSessionsPaginated({
        section,
        teacherId: isAdminView ? undefined : userId,
        filters,
        limit: SESSIONS_PER_PAGE,
        startAfter: reset ? null : sessionsData.lastDoc
      });

      setSessionsData(prev => ({
        sessions: reset ? result.sessions : [...prev.sessions, ...result.sessions],
        hasMore: result.hasMore,
        lastDoc: result.lastDoc,
        total: result.total
      }));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [section, isAdminView, userId, sessionsData.lastDoc]);

  // Initial load
  useEffect(() => {
    loadSessions(true, appliedFilters);
  }, [section, isAdminView, userId]); // Remove loadSessions from deps to avoid infinite loop

  const handleApplyFilters = () => {
    setAppliedFilters([...tempFilters]);
    setShowFilterDialog(false);
    loadSessions(true, tempFilters);
  };

  const handleClearFilters = () => {
    setAppliedFilters([]);
    setTempFilters([]);
    loadSessions(true, []);
  };

  const addFilterCondition = () => {
    setTempFilters([...tempFilters, { field: 'date', operator: 'gte', value: '' }]);
  };

  const removeFilterCondition = (index: number) => {
    setTempFilters(tempFilters.filter((_, i) => i !== index));
  };

  const updateFilterCondition = (index: number, updates: Partial<FilterCondition>) => {
    const updated = [...tempFilters];
    updated[index] = { ...updated[index], ...updates };
    setTempFilters(updated);
  };

  // Initialize temp filters when dialog opens
  useEffect(() => {
    if (showFilterDialog) {
      setTempFilters([...appliedFilters]);
    }
  }, [showFilterDialog, appliedFilters]);

  return (
    <>
      <Card variant="cyber">
        <div className="p-4 md:p-6">{loading && sessionsData.sessions.length === 0 ? (
          /* Initial Loading State */
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-cyber-gray-400" />
            <p className="text-cyber-gray-600">Loading sessions...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 flex items-center gap-2 mb-1">
                  <CalendarIcon className="w-5 h-5 text-cyber-yellow" />
                  Previous Sessions
                </h3>
                <p className="text-sm text-cyber-gray-600">
                  {appliedFilters.length > 0
                  ? `Showing ${sessionsData.sessions.length} / ${sessionsData.total} sessions`
                  : `${sessionsData.total} total sessions found`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                  {appliedFilters.length > 0 && (
                    <span className="bg-cyber-yellow text-cyber-gray-900 text-xs px-1.5 py-0.5 rounded-full font-medium">
                      {appliedFilters.length}
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/reports')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </div>
            </div>

            {/* Applied Filters */}
            {appliedFilters.length > 0 && (
              <div className="mb-4 p-3 bg-cyber-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cyber-gray-700">Active Filters:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-xs text-cyber-gray-600 hover:text-cyber-gray-900"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.map((filter, index) => (
                    <div key={index} className="bg-white border border-cyber-gray-200 rounded px-2 py-1 text-xs">
                      {filter.field} {filter.operator} {filter.value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions List */}
            {sessionsData.sessions.length > 0 ? (
              <div className="space-y-3">
                {sessionsData.sessions.map((session) => {
                  const attendancePercentage = session.totalStudents > 0
                    ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100)
                    : 0;

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-3 md:p-4 bg-cyber-gray-50 hover:bg-cyber-gray-100 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-cyber-yellow/20"
                      onClick={() => router.push(`/attendance/${encodeURIComponent(section)}?date=${session.date}&time=${session.session}`)}
                    >
                      {/* Left side - Date & Time */}
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
                              {isAdminView && (
                                <Tooltip
                                  className="ml-1 underline decoration-dotted cursor-help"
                                  content={session.teacherEmail ?? 'Unknown'}
                                  side='right'
                                >
                                  <span> • {session.teacherEmail.split('@')[0]}</span>
                                </Tooltip>
                              )}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right side - Stats */}
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
            ) : (
              /* Empty State - No Sessions Found */
              <div className="text-center py-12 text-cyber-gray-500">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-cyber-gray-300" />
                <p className="text-lg font-medium mb-2 text-cyber-gray-900">
                  {appliedFilters.length > 0 ? 'No sessions match your filters' : 'No sessions found'}
                </p>
                <p className="text-sm text-cyber-gray-600 mb-4">
                  {appliedFilters.length > 0
                    ? 'Try adjusting your filter criteria or clear all filters to see all sessions'
                    : 'Attendance sessions will appear here once created'
                  }
                </p>
                {appliedFilters.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="mt-2"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {/* Load More */}
            {sessionsData.hasMore && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => loadSessions(false, appliedFilters)}
                  disabled={loadingMore}
                  className="w-full sm:w-auto"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load {Math.min(SESSIONS_PER_PAGE, sessionsData.total - sessionsData.sessions.length)} More
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </Card>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Sessions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filter Conditions */}
            <div className="space-y-3">
              {tempFilters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-cyber-gray-50 rounded-lg">
                  <Select
                    value={filter.field}
                    onValueChange={(value: 'date' | 'attendance' | 'session') =>
                      updateFilterCondition(index, { field: value })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="attendance">Rate</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value: 'eq' | 'gte' | 'lte') =>
                      updateFilterCondition(index, { operator: value })
                    }
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">=</SelectItem>
                      <SelectItem value="gte">≥</SelectItem>
                      <SelectItem value="lte">≤</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex-1">
                    {filter.field === 'date' ? (
                      <input
                        type="date"
                        value={filter.value as string}
                        onChange={(e) => updateFilterCondition(index, { value: e.target.value })}
                        className="w-full px-3 py-2 border border-cyber-gray-200 rounded-md text-sm"
                      />
                    ) : filter.field === 'attendance' ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filter.value}
                        onChange={(e) => updateFilterCondition(index, { value: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-cyber-gray-200 rounded-md text-sm"
                        placeholder="0-100%"
                      />
                    ) : (
                      <Select
                        value={filter.value as string}
                        onValueChange={(value) => updateFilterCondition(index, { value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_OPTIONS.map(option => (
                            <SelectItem key={option.key} value={option.key}>
                              {getSessionLabel(option.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilterCondition(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Filter Button */}
            <Button
              variant="outline"
              onClick={addFilterCondition}
              className="w-full"
            >
              Add Filter Condition
            </Button>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setTempFilters([])}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-cyber-yellow hover:bg-cyber-yellow-dark text-cyber-gray-900"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}