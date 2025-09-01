import { Card } from "@/components/ui/card";

interface PieChartData {
  name: string;
  value: number;
  color: string;
  count: number;
}

const PieChart = ({ data, title, selectedSessions, onSessionSelect }: {
  data: PieChartData[],
  title: string,
  selectedSessions: string[],
  onSessionSelect: (session: string) => void
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <Card variant="cyber" className="p-6">
      <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">{title}</h3>
      <div className="flex items-center justify-center mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const x1 = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;

            const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
            currentAngle += angle;

            return (
              <path
                key={index}
                d={path}
                fill={item.color}
                className={`cursor-pointer transition-opacity ${selectedSessions.includes(item.name) ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                onClick={() => onSessionSelect(item.name)}
                stroke={selectedSessions.includes(item.name) ? '#1f2937' : 'white'}
                strokeWidth={selectedSessions.includes(item.name) ? 3 : 1}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedSessions.includes(item.name) ? 'bg-purple-100' : 'hover:bg-cyber-gray-50'
              }`}
            onClick={() => onSessionSelect(item.name)}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{Math.round((item.value / total) * 100)}%</div>
              <div className="text-xs text-cyber-gray-500">{item.count} sessions</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PieChart;