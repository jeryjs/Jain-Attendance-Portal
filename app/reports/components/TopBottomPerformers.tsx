import { Card } from '@/components/ui/card';
import { Award, AlertCircle, User } from 'lucide-react';
import Link from 'next/link';

interface StudentPerformance {
  student: { id: string; name: string; usn: string; section: string };
  attendanceRate: number;
  presentCount: number;
  totalSessions: number;
}

interface TopBottomPerformersProps {
  topPerformers: StudentPerformance[];
  bottomPerformers: StudentPerformance[];
}

export default function TopBottomPerformers({ topPerformers, bottomPerformers }: TopBottomPerformersProps) {
  if (topPerformers.length === 0 && bottomPerformers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card variant="cyber" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-cyber-gray-900">Top Performers</h3>
            <span className="text-xs text-cyber-gray-500 ml-auto">Best {topPerformers.length}</span>
          </div>

          <div className="space-y-2">
            {topPerformers.map((perf, index) => (
              <Link
                key={perf.student.usn}
                href={`/students/${perf.student.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 border border-transparent hover:border-green-200 transition-all group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-bold text-lg text-yellow-600 min-w-[28px]">
                    #{index + 1}
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cyber-gray-900 truncate group-hover:text-green-700">
                      {perf.student.name}
                    </p>
                    <p className="text-xs text-cyber-gray-600">
                      {perf.student.section} • {perf.presentCount}/{perf.totalSessions}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    {perf.attendanceRate.toFixed(1)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Bottom Performers */}
      {bottomPerformers.length > 0 && (
        <Card variant="cyber" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-cyber-gray-900">Need Immediate Attention</h3>
            <span className="text-xs text-cyber-gray-500 ml-auto">Critical {bottomPerformers.length}</span>
          </div>

          <div className="space-y-2">
            {bottomPerformers.map((perf, index) => (
              <Link
                key={perf.student.usn}
                href={`/students/${perf.student.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-all group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cyber-gray-900 truncate group-hover:text-red-700">
                      {perf.student.name}
                    </p>
                    <p className="text-xs text-cyber-gray-600">
                      {perf.student.section} • {perf.presentCount}/{perf.totalSessions}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    perf.attendanceRate < 50 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {perf.attendanceRate.toFixed(1)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
