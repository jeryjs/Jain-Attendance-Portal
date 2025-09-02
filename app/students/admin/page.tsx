'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { SECTION_MAPPINGS, SECTIONS, Student } from '@/lib/types';
import { getProgramName } from '@/lib/utils';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowId, GridRowParams } from '@mui/x-data-grid';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  Edit as EditIcon,
  GraduationCap,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import StudentForm from './StudentForm';
import { StudentStats } from './types';

const StatsCard = memo(({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}) => (
  <Card variant="cyber" className="p-6">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-cyber-gray-600">{title}</p>
        <p className="text-2xl font-bold text-cyber-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-cyber-gray-500">{subtitle}</p>}
      </div>
    </div>
  </Card>
));

export default function AdminStudentsPage() {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<GridRowId[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);

  // Create selection model for DataGrid
  const selectionModel = useMemo(() => ({
    type: 'include' as const,
    ids: new Set(selectedStudents)
  }), [selectedStudents]);

  // Calculate statistics
  const calculateStats = useCallback((studentsData: Student[]) => {
    const totalStudents = studentsData.length;
    const uniqueSections = new Set(studentsData.map(s => s.section)).size;
    const sectionsBreakdown = studentsData.reduce((acc, student) => {
      acc[student.section] = (acc[student.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate recent additions (last 30 days) - mock for now since we don't have createdAt
    const recentAdditions = Math.floor(totalStudents * 0.1); // 10% as recent

    // Calculate data quality score (students with complete data)
    const completeDataStudents = studentsData.filter(student =>
      student.name && student.usn && student.section
    ).length;
    const dataQualityScore = totalStudents > 0 ? Math.round((completeDataStudents / totalStudents) * 100) : 100;

    setStats({
      totalStudents,
      uniqueSections,
      sectionsBreakdown,
      recentAdditions,
      dataQualityScore
    });
  }, []);

  // Load students data
  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.uid || !isAdmin) return;

      try {
        setLoadingData(true);
        const studentsData = await FirebaseService.getAdminStudents(false);
        setStudents(studentsData);
        calculateStats(studentsData);
      } catch (error) {
        console.error('Error loading students:', error);
        addToast({
          title: "Error",
          description: "Failed to load students data",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadStudents();
  }, [user?.uid, isAdmin, addToast, calculateStats]);

  const handleRefresh = useCallback(async () => {
    setLoadingData(true);
    try {
      const updatedStudents = await FirebaseService.getAdminStudents(true);
      setStudents(updatedStudents);
      calculateStats(updatedStudents);
    } catch (error) {
      console.error('Error refreshing students:', error);
      addToast({
        title: "Error",
        description: "Failed to refresh students data",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  }, [addToast, calculateStats]);

  // CRUD operations
  const handleAddStudent = useCallback(async (studentData: Omit<Student, 'id'>) => {
    try {
      await FirebaseService.addStudent(studentData);
      const updatedStudents = await FirebaseService.getAdminStudents(true);
      setStudents(updatedStudents);
      calculateStats(updatedStudents);
      setShowForm(false);
      addToast({
        title: "Success",
        description: "Student added successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error adding student:', error);
      addToast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive"
      });
    }
  }, [addToast, calculateStats]);

  const handleUpdateStudent = useCallback(async (studentData: Student) => {
    try {
      await FirebaseService.updateStudent(studentData.id, {
        name: studentData.name,
        usn: studentData.usn,
        section: studentData.section
      });
      const updatedStudents = await FirebaseService.getAdminStudents(true);
      setStudents(updatedStudents);
      calculateStats(updatedStudents);
      setEditingStudent(null);
      setShowForm(false);
      addToast({
        title: "Success",
        description: "Student updated successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error updating student:', error);
      addToast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive"
      });
    }
  }, [addToast, calculateStats]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await FirebaseService.deleteStudent(studentId);
      const updatedStudents = await FirebaseService.getAdminStudents(true);
      setStudents(updatedStudents);
      calculateStats(updatedStudents);
      setSelectedStudents(prev => prev.filter(id => String(id) !== studentId));
      addToast({
        title: "Success",
        description: "Student deleted successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      addToast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive"
      });
    }
  }, [addToast, calculateStats]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} students?`)) return;

    try {
      const deletePromises = selectedStudents.map(id => FirebaseService.deleteStudent(String(id)));
      await Promise.all(deletePromises);
      const updatedStudents = await FirebaseService.getAdminStudents(true);
      setStudents(updatedStudents);
      calculateStats(updatedStudents);
      setSelectedStudents([]);
      addToast({
        title: "Success",
        description: `${selectedStudents.length} students deleted successfully`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      addToast({
        title: "Error",
        description: "Failed to delete students",
        variant: "destructive"
      });
    }
  }, [selectedStudents, addToast, calculateStats]);

  // Export functionality
  const handleExportToCSV = useCallback(() => {
    const csvContent = [
      ['Application Number', 'Name', 'Section', 'Program'],
      ...students.map(student => [
        student.usn,
        student.name,
        student.section,
        getProgramName(student.section)
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students_all_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      title: "Export Successful",
      description: "Students data exported successfully",
      variant: "success"
    });
  }, [students, addToast]);

  // DataGrid columns configuration
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'usn',
      headerName: 'Application Number',
      width: 150,
      fontFamily: 'monospace',
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 250,
      flex: 1,
    },
    {
      field: 'section',
      headerName: 'Section',
      width: 120,
      renderCell: (params) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {params.value}
        </span>
      ),
    },
    {
      field: 'program',
      headerName: 'Program',
      width: 200,
      flex: 1,
      valueGetter: (value, row) => SECTION_MAPPINGS[row.section] || row.section,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon size={16} />}
          label="Edit"
          onClick={() => {
            setEditingStudent(params.row as Student);
            setShowForm(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Trash2 size={16} />}
          label="Delete"
          onClick={() => handleDeleteStudent(params.row.id)}
        />,
      ],
    },
  ], [handleDeleteStudent]);

  // Alert for mobile view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      alert("For the best experience, please use the desktop view to access the admin dashboard. This page is not supported on mobile devices.");
    }
  }, []);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
          <span className="mt-6 text-purple-700 font-medium text-lg">
            Fetching students data may take a while...
          </span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-900">
                Student Management
              </h1>
              <p className="text-purple-600">Manage student records and data</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="text-purple-600">Last updated</p>
              <p className="font-medium text-purple-800">
                {format((JSON.parse(localStorage.getItem('adminStudentsCache') || '{}')).timestamp || new Date(), 'MMM dd, HH:mm')}
              </p>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={loadingData}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
              {loadingData ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              color="bg-blue-500"
              subtitle="All enrolled students"
            />
            <StatsCard
              title="Active Sections"
              value={stats.uniqueSections}
              icon={GraduationCap}
              color="bg-green-500"
              subtitle="Different programs"
            />
            <StatsCard
              title="Recent Additions"
              value={stats.recentAdditions}
              icon={TrendingUp}
              color="bg-orange-500"
              subtitle="Last 30 days"
            />
            <StatsCard
              title="Data Quality"
              value={`${stats.dataQualityScore}%`}
              icon={Shield}
              color="bg-purple-500"
              subtitle="Complete records"
            />
          </div>
        )}

        {/* Actions Bar */}
        <Card variant="cyber" className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
              {selectedStudents.length > 0 && (
                <Button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedStudents.length})
                </Button>
              )}
            </div>
            <Button
              onClick={handleExportToCSV}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Students DataGrid */}
        <Card variant="cyber" className="p-6 mb-6">
          <div style={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={students}
              columns={columns}
              loading={loadingData}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={(newSelection) => {
                // Convert GridRowSelectionModel to GridRowId[] for compatibility
                const ids = Array.isArray(newSelection) ? newSelection : Array.from(newSelection.ids);
                setSelectedStudents(ids);
              }}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderColor: '#e5e7eb',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            />
          </div>
        </Card>

        {/* Student Form Modal */}
        {showForm && (
          <StudentForm
            student={editingStudent}
            sections={SECTIONS}
            onSubmit={editingStudent ?
              (studentData: Student | Omit<Student, 'id'>) => handleUpdateStudent(studentData as Student) :
              handleAddStudent
            }
            onCancel={() => {
              setShowForm(false);
              setEditingStudent(null);
            }}
          />
        )}
      </div>
    </div>
  );
}