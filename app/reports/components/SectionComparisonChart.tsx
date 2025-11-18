import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

interface SectionData {
  section: string;
  avgAttendance: number;
  totalSessions: number;
  totalStudents: number;
}

interface SectionComparisonChartProps {
  data: SectionData[];
}

export default function SectionComparisonChart({ data }: SectionComparisonChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.avgAttendance - a.avgAttendance);
  }, [data]);

  if (sortedData.length === 0) return null;

  const maxAttendance = Math.max(...sortedData.map(s => s.avgAttendance));
  const avgOfAll = sortedData.reduce((sum, s) => sum + s.avgAttendance, 0) / sortedData.length;

  return (
    <Card variant="cyber" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyber-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyber-yellow" />
          Section Performance Comparison
        </h3>
        <span className="text-xs text-cyber-gray-500">{sortedData.length} sections</span>
      </div>

      <div className="space-y-3 mb-4">
        {sortedData.map((section, index) => {
          const barWidth = (section.avgAttendance / 100) * 100;
          const isAboveAvg = section.avgAttendance >= avgOfAll;
          const rankColor = index === 0 ? 'text-yellow-600' : index === sortedData.length - 1 ? 'text-red-600' : 'text-cyber-gray-600';

          return (
            <div key={section.section} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs font-bold ${rankColor} min-w-[24px]`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-cyber-gray-900">
                    {section.section}
                  </span>
                  {isAboveAvg ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-cyber-gray-600">
                    {section.totalSessions} sessions
                  </span>
                  <span className={`text-sm font-bold min-w-[60px] text-right ${
                    section.avgAttendance >= 75 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {section.avgAttendance.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-3 bg-cyber-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    section.avgAttendance >= 75
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : section.avgAttendance >= 50
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

      <div className="p-3 bg-gradient-to-r from-cyber-yellow/10 to-cyber-yellow-dark/10 rounded-lg border border-cyber-yellow/20">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-cyber-gray-700">Overall Average</span>
          <span className="font-bold text-cyber-gray-900">{avgOfAll.toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
}
