import { Tooltip } from "@/components/ui/tooltip";
import { SESSION_OPTIONS } from "@/lib/types";
import { memo } from "react";
import { X } from "lucide-react";

interface PieChartData {
  name: string;
  value: number;
  color: string;
  count: number;
}

const PieChart = memo(({ data, selectedSessions, onSessionSelect }: {
  data: PieChartData[],
  selectedSessions: string[],
  onSessionSelect: (session: string) => void
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="flex flex-row items-center">
      <div className="flex items-center justify-center">
        <svg width="200" height="200" viewBox="25 25 200 200" className="relative">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const x1 = 125 + 90 * Math.cos((currentAngle - 90) * Math.PI / 180);
            const y1 = 125 + 90 * Math.sin((currentAngle - 90) * Math.PI / 180);
            const x2 = 125 + 90 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
            const y2 = 125 + 90 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;

            // Calculate text position (middle of the segment)
            const textAngle = currentAngle + angle / 2 - 90;
            const textX = 125 + 60 * Math.cos(textAngle * Math.PI / 180);
            const textY = 125 + 60 * Math.sin(textAngle * Math.PI / 180);

            const path = `M 125 125 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;
            const prevAngle = currentAngle;
            currentAngle += angle;

            return (
              <g key={index}>
                <path
                  d={path}
                  fill={item.color}
                  className={`cursor-pointer transition-all duration-200 ${selectedSessions.includes(item.name)
                    ? 'opacity-100 stroke-gray-800 stroke-2'
                    : 'opacity-80 hover:opacity-100 stroke-white stroke-1'
                    }`}
                  onClick={() => onSessionSelect(item.name)}
                  strokeWidth={selectedSessions.includes(item.name) ? 3 : 1}
                >
                  <title>{`${item.name}: ${Math.round(percentage)}% (${item.count} sessions)`}</title>
                </path>
                {percentage > 1 && (
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white font-semibold pointer-events-none select-none"
                    style={{ fontSize: '10px' }}
                  >
                    {Math.round(percentage)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Compact Legend */}
      <div className="flex-1 ml-4">
        {selectedSessions.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => onSessionSelect('')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Clear all selections"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <Tooltip sideOffset={4} content={<>{SESSION_OPTIONS.find(opt => opt.key === item.name)?.value}<br /><i className="text-xs text-gray-400">{item.value} students ({item.count} sessions)</i></>} key={index}>
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all ${selectedSessions.includes(item.name)
                  ? 'bg-purple-100 border-2 border-purple-300'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                onClick={() => onSessionSelect(item.name)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs font-medium text-gray-700">{item.name}</span>
                <span className="text-xs font-semibold text-gray-900">
                  {Math.round((item.value / total) * 100)}%
                </span>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
});

export default memo(PieChart);