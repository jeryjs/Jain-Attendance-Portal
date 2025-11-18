import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useMemo } from 'react';

interface SessionTypeData {
  session: string;
  count: number;
  avgAttendance: number;
}

interface SessionTypeChartProps {
  sessions: Array<{ session: string; presentCount: number; totalStudents: number }>;
}

export default function SessionTypeChart({ sessions }: SessionTypeChartProps) {
  const sessionData = useMemo(() => {
    const grouped = sessions.reduce((acc, s) => {
      if (!acc[s.session]) {
        acc[s.session] = { count: 0, totalPresent: 0, totalStudents: 0 };
      }
      acc[s.session].count++;
      acc[s.session].totalPresent += s.presentCount;
      acc[s.session].totalStudents += s.totalStudents;
      return acc;
    }, {} as Record<string, { count: number; totalPresent: number; totalStudents: number }>);

    return Object.entries(grouped)
      .map(([session, data]) => ({
        session,
        count: data.count,
        avgAttendance: data.totalStudents > 0 ? (data.totalPresent / data.totalStudents) * 100 : 0
      }))
      .sort((a, b) => {
        // Sort by time of day
        const timeA = parseInt(a.session.split(':')[0]);
        const timeB = parseInt(b.session.split(':')[0]);
        return timeA - timeB;
      });
  }, [sessions]);

  if (sessionData.length === 0) return null;

  const maxCount = Math.max(...sessionData.map(s => s.count));

  return (
    <Card variant="cyber" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyber-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyber-yellow" />
          Session Time Performance
        </h3>
        <span className="text-xs text-cyber-gray-500">{sessionData.length} time slots</span>
      </div>

      <div className="space-y-4">
        {sessionData.map((data) => {
          const barWidth = (data.count / maxCount) * 100;
          const attendanceColor = data.avgAttendance >= 75 ? 'text-green-600' : data.avgAttendance >= 50 ? 'text-yellow-600' : 'text-red-600';

          return (
            <div key={data.session} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-cyber-gray-900 min-w-[100px]">
                    {data.session}
                  </span>
                  <span className="text-sm text-cyber-gray-600">
                    {data.count} session{data.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={`text-sm font-semibold ${attendanceColor}`}>
                  {data.avgAttendance.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 bg-cyber-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-cyber-gray-50 rounded-lg">
        <p className="text-xs text-cyber-gray-600">
          💡 Track which time slots have better attendance to optimize scheduling
        </p>
      </div>
    </Card>
  );
}
