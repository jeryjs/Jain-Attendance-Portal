'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceSession, Student } from '@/lib/types';
import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  Clock,
  Edit,
  Grid3X3,
  List,
  Search,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AttendanceViewProps {
  existingSession: AttendanceSession | null;
  isValidSession: boolean;
  selectedDate: Date;
  selectedSession: string;
  stats: { present: number; absent: number; total: number; percentage: number };
  isViewOnly: boolean;
  setIsDialogOpen: (open: boolean) => void;
  students: Student[];
  attendance: Record<string, boolean>;
  setAttendance: (attendance: Record<string, boolean>) => void;
  isEditMode: boolean;
}

function AttendanceView({
  existingSession,
  isValidSession,
  selectedDate,
  selectedSession,
  stats,
  isViewOnly,
  setIsDialogOpen,
  students,
  attendance,
  setAttendance,
  isEditMode
}: AttendanceViewProps) {
  // Internal state for search and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [sortConfig, setSortConfig] = useState<{ field: 'name' | 'usn' | 'attendance' | null; direction: 'asc' | 'desc'; }>(
    // Load from localStorage on initialization
    () => {
      try {
        return JSON.parse(localStorage.getItem('Attendance:sort-config') || '') || { field: null, direction: 'asc' };
      } catch {
        return { field: null, direction: 'asc' };
      }
    }
  );

  // Save sort config to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('Attendance:sort-config', JSON.stringify(sortConfig));
      } catch { /* Ignore localStorage errors */ }
    }
  }, [sortConfig]);

  // Filter and sort students
  useEffect(() => {
    let filtered = students;

    // Filter by search query
    if (searchQuery.length >= 1) {
      filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.usn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort the filtered results
    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | boolean;
        let bValue: string | number | boolean;

        switch (sortConfig.field) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'usn':
            aValue = a.usn.toLowerCase();
            bValue = b.usn.toLowerCase();
            break;
          case 'attendance':
            aValue = attendance[a.usn] ? 1 : 0;
            bValue = attendance[b.usn] ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredStudents(filtered);
  }, [searchQuery, students, sortConfig, attendance]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('sort-dropdown');
      const button = event.target as Element;
      if (dropdown && !dropdown.contains(button) && !button.closest('[data-sort-button]')) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Attendance actions
  const toggleAttendance = (usn: string) => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    setAttendance({
      ...attendance,
      [usn]: !attendance[usn]
    });
  };

  const markAllPresent = () => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    const currentPresent = Object.values(attendance).filter(Boolean).length;
    const total = students.length;

    if (currentPresent > 0 && currentPresent < total) {
      const confirmed = window.confirm(
        `${currentPresent} students are currently marked present. Mark all ${total} students as present?`
      );
      if (!confirmed) return;
    }

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = true;
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    const currentAbsent = Object.values(attendance).filter(present => !present).length;
    const total = students.length;

    if (currentAbsent > 0 && currentAbsent < total) {
      const confirmed = window.confirm(
        `${currentAbsent} students are currently marked absent. Mark all ${total} students as absent?`
      );
      if (!confirmed) return;
    }

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = false;
    });
    setAttendance(newAttendance);
  };
  return (
    <>
      {/* Attendance Status */}
      {existingSession && (
        <Card
          variant="cyber"
          className="mb-4 md:mb-8 p-4 md:p-6 flex flex-col gap-4 bg-gradient-to-br from-cyber-yellow/10 to-cyber-gray-50 border-2 border-cyber-yellow/40 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600 animate-in fade-in" />
            <span className="font-bold text-cyber-gray-900 text-lg md:text-xl">
              Attendance taken
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-cyber-gray-700 mt-2">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 text-cyber-gray-400" />
              Taken by:
              <span className="font-semibold text-cyber-gray-900">
                {existingSession.teacherEmail}
              </span>
              <span className="mx-2 text-cyber-gray-400">•</span>
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-cyber-yellow" />
              Taken on:
              <span className="font-semibold text-cyber-gray-900">
                {existingSession.createdAt?.toDate().toLocaleString()}
              </span>
            </span>
            <span className="mx-2 text-cyber-gray-400">•</span>
            <span className="flex items-center gap-1">
              <Edit className="w-4 h-4 text-blue-500" />
              Last updated:
              <span className="font-semibold text-cyber-gray-900">
                {existingSession.updatedAt?.toDate().toLocaleString()}
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Session Info & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6 mb-4 md:mb-8">
        <Card
          variant="cyber"
          className="text-center p-3 md:p-6 cursor-pointer hover:scale-105 transition-all duration-300"
          onClick={() => !isViewOnly && setIsDialogOpen(true)}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
          </div>
          <div className="text-sm md:text-lg font-bold text-cyber-gray-900">{format(selectedDate, 'MMM dd')}</div>
          <div className="text-xs text-cyber-gray-600">Session Date</div>
        </Card>

        <Card
          variant="cyber"
          className="text-center p-3 md:p-6 cursor-pointer hover:scale-105 transition-all duration-300"
          onClick={() => !isViewOnly && setIsDialogOpen(true)}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
          </div>
          <div className="text-sm md:text-lg font-bold text-cyber-gray-900">{selectedSession}</div>
          <div className="text-xs text-cyber-gray-600">Session Time</div>
        </Card>

        <Card variant="cyber" className="text-center p-3 md:p-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="text-sm md:text-lg font-bold text-green-600">{stats.present}</div>
          <div className="text-xs text-cyber-gray-600">Present</div>
        </Card>

        <Card variant="cyber" className="text-center p-3 md:p-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="text-sm md:text-lg font-bold text-red-600">{stats.absent}</div>
          <div className="text-xs text-cyber-gray-600">Absent</div>
        </Card>
      </div>

      {/* Attendance Views */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <List className="w-3 h-3 md:w-4 md:h-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="bricks" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
            Brick View
          </TabsTrigger>
        </TabsList>

        <Card variant="cyber">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-6 p-3 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900">Students List</h3>
            {!isViewOnly && <div className="flex gap-2 md:gap-3 flex-col md:flex-row">
              <Button variant="outline" size="sm" onClick={markAllPresent} className="text-xs md:text-sm">
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={markAllAbsent} className="text-xs md:text-sm">
                Mark All Absent
              </Button>
            </div>}
          </div>

          {/* Search Bar */}
          <div className="mb-3 md:mb-6 px-3 md:px-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name or USN..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort Button with Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  data-sort-button
                  onClick={() => {
                    const dropdown = document.getElementById('sort-dropdown');
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="px-3"
                >
                  {sortConfig.field ? (
                    sortConfig.field === 'name' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )
                  ) : (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </Button>

                {/* Sort Dropdown */}
                <div
                  id="sort-dropdown"
                  className="absolute right-0 top-full mt-1 w-48 bg-white border border-cyber-gray-200 rounded-lg shadow-lg z-10 hidden"
                >
                  <div className="p-2">
                    <div className="text-xs font-medium text-cyber-gray-600 mb-2 px-2">Sort by</div>

                    {/* Name sorting */}
                    <button
                      onClick={() => {
                        setSortConfig({
                          field: 'name',
                          direction: sortConfig.field === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                        });
                        document.getElementById('sort-dropdown')?.classList.add('hidden');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cyber-gray-50 rounded-md flex items-center justify-between"
                    >
                      <span>Name</span>
                      {sortConfig.field === 'name' && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>

                    {/* USN sorting */}
                    <button
                      onClick={() => {
                        setSortConfig({
                          field: 'usn',
                          direction: sortConfig.field === 'usn' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                        });
                        document.getElementById('sort-dropdown')?.classList.add('hidden');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cyber-gray-50 rounded-md flex items-center justify-between"
                    >
                      <span>USN</span>
                      {sortConfig.field === 'usn' && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>

                    {/* Attendance sorting */}
                    <button
                      onClick={() => {
                        setSortConfig({
                          field: 'attendance',
                          direction: sortConfig.field === 'attendance' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                        });
                        document.getElementById('sort-dropdown')?.classList.add('hidden');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cyber-gray-50 rounded-md flex items-center justify-between"
                    >
                      <span>Attendance</span>
                      {sortConfig.field === 'attendance' && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table View */}
          <TabsContent value="table" className="space-y-3 md:space-y-6">
            {/* <Card variant="cyber"> */}
            <div className="space-y-2 md:space-y-3 md:px-6 pb-3 md:pb-6">
              {filteredStudents.map((student, index) => (
                <div
                  key={student.usn}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${attendance[student.usn]
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-red-200 bg-red-50 hover:bg-red-100'
                    }`}
                  onClick={() => toggleAttendance(student.usn)}
                >
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-cyber-gray-200 text-cyber-gray-700 font-semibold text-xs md:text-sm">
                      {index + 1}
                    </div>
                    {attendance[student.usn] ? (
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600 animate-in zoom-in duration-200" />
                    ) : (
                      <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 animate-in zoom-in duration-200" />
                    )}
                    <div>
                      <p className="font-semibold text-cyber-gray-900 text-sm md:text-base">{student.name}</p>
                      <p className="text-xs md:text-sm text-cyber-gray-600">{student.usn}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs md:text-sm font-semibold ${attendance[student.usn] ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {attendance[student.usn] ? 'Present' : 'Absent'}
                    </div>
                    {!isViewOnly && (<div className="text-xs text-cyber-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to toggle
                    </div>)}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Brick View */}
          <TabsContent value="bricks" className="space-y-3 md:space-y-6">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 md:gap-4 md:p-6">
              {filteredStudents.map((student) => (
                <div
                  key={student.usn}
                  className={`relative p-2 md:p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 group ${attendance[student.usn]
                    ? 'border-green-300 bg-green-100 hover:bg-green-200'
                    : 'border-red-300 bg-red-100 hover:bg-red-200'
                    }`}
                  onClick={() => toggleAttendance(student.usn)}
                >
                  <div className="text-center">
                    <p className="font-semibold text-cyber-gray-900 text-xs md:text-sm mb-1">{student.name}</p>
                    <p className="text-xs text-cyber-gray-600 mb-1 md:mb-2">{student.usn}</p>
                  </div>
                  <div className={`absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full animate-pulse ${attendance[student.usn] ? 'bg-green-500' : 'bg-red-500'}`}>
                    {attendance[student.usn] ? (
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    ) : (
                      <X className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Card>
      </Tabs>
    </>
  );
}

export default AttendanceView;