import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { useMemo } from 'react';

interface DayData {
  date: string;
  avgAttendance: number;
  sessions: number;
}

interface AttendanceHeatmapProps {
  sessions: Array<{ date: string; presentCount: number; totalStudents: number }>;
  dateRange: { from: Date; to: Date };
}

export default function AttendanceHeatmap({ sessions, dateRange }: AttendanceHeatmapProps) {
  const heatmapData = useMemo(() => {
    const dayData = new Map<string, { totalPresent: number; totalStudents: number; count: number }>();

    sessions.forEach(s => {
      const dateKey = s.date;
      if (!dayData.has(dateKey)) {
        dayData.set(dateKey, { totalPresent: 0, totalStudents: 0, count: 0 });
      }
      const data = dayData.get(dateKey)!;
      data.totalPresent += s.presentCount;
      data.totalStudents += s.totalStudents;
      data.count++;
    });

    const result: DayData[] = Array.from(dayData.entries()).map(([date, data]) => ({
      date,
      avgAttendance: data.totalStudents > 0 ? (data.totalPresent / data.totalStudents) * 100 : 0,
      sessions: data.count
    }));

    return result;
  }, [sessions]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group by day of week
  const byDayOfWeek = useMemo(() => {
    const grouped = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
    
    heatmapData.forEach(day => {
      const dayOfWeek = getDay(new Date(day.date));
      grouped[dayOfWeek].total += day.avgAttendance;
      grouped[dayOfWeek].count += 1;
    });

    return grouped.map((data, index) => ({
      day: daysOfWeek[index],
      avgAttendance: data.count > 0 ? data.total / data.count : 0,
      sessions: data.count
    }));
  }, [heatmapData]);

  if (heatmapData.length === 0) return null;

  const maxSessions = Math.max(...byDayOfWeek.map(d => d.sessions));

  return (
    <Card variant="cyber" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyber-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyber-yellow" />
          Day-of-Week Pattern
        </h3>
        <span className="text-xs text-cyber-gray-500">{heatmapData.length} days recorded</span>
      </div>

      <div className="space-y-3">
        {byDayOfWeek.map((day) => {
          if (day.sessions === 0) return null;
          
          const intensity = day.sessions / maxSessions;
          const attendanceColor = day.avgAttendance >= 75 ? 'from-green-500 to-green-600' : 
                                   day.avgAttendance >= 50 ? 'from-yellow-500 to-yellow-600' : 
                                   'from-red-500 to-red-600';

          return (
            <div key={day.day} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-cyber-gray-900 min-w-[60px]">{day.day}</span>
                <div className="flex items-center gap-4">
                  <span className="text-cyber-gray-600 text-xs">
                    {day.sessions} session{day.sessions !== 1 ? 's' : ''}
                  </span>
                  <span className={`font-semibold min-w-[60px] text-right ${
                    day.avgAttendance >= 75 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {day.avgAttendance.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-8 bg-cyber-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${attendanceColor} transition-all`}
                  style={{ 
                    width: `${day.avgAttendance}%`,
                    opacity: 0.5 + (intensity * 0.5)
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-cyber-gray-50 rounded-lg">
        <p className="text-xs text-cyber-gray-600">
          💡 Identify which days tend to have better/worse attendance
        </p>
      </div>
    </Card>
  );
}
