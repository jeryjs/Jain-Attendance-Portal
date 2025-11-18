import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface WeeklyDataPoint {
  weekLabel: string;
  weekStart: Date;
  avgAttendance: number;
  totalSessions: number;
}

interface WeeklyTrendChartProps {
  data: WeeklyDataPoint[];
}

export default function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (data.length === 0) return null;

  return (
    <Card variant="cyber" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyber-gray-900">Weekly Attendance Trend</h3>
        <span className="text-xs text-cyber-gray-500">{data.length} weeks</span>
      </div>
      
      <div className="space-y-3">
        {data.map((week, index) => {
          const prevWeek = data[index - 1];
          const trend = prevWeek ? week.avgAttendance - prevWeek.avgAttendance : 0;
          const barWidth = week.avgAttendance;
          const weekEnd = addDays(week.weekStart, 6);
          const dateRangeLabel = `${format(week.weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`;

          return (
            <div key={week.weekLabel} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-cyber-gray-700 min-w-[140px]">{dateRangeLabel}</span>
                <div className="flex items-center gap-4">
                  <span className="text-cyber-gray-600 text-xs">
                    {week.totalSessions} session{week.totalSessions !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1 min-w-[80px] justify-end">
                    <span className="font-semibold text-cyber-gray-900">
                      {week.avgAttendance.toFixed(1)}%
                    </span>
                    {trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : trend < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : index > 0 ? (
                      <Minus className="w-4 h-4 text-cyber-gray-400" />
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="relative h-6 bg-cyber-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-all rounded-lg ${
                    week.avgAttendance >= 75
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : week.avgAttendance >= 50
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
