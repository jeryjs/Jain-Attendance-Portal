import { Card } from "@/components/ui/card";
import { SESSION_OPTIONS } from "@/lib/types";

const SectionChart = ({ data, title, sessionStats }: {
  data: Array<{ name: string; value: number; color: string; sessions: any[] }>,
  title: string,
  sessionStats: any[]
}) => {
  // Parse session time and calculate dependencies
  const parseSessionTime = (session: string) => {
    const [start, end] = session.split('-');
    return {
      start: parseFloat(start.replace('.', ':')),
      end: parseFloat(end.replace('.', ':')),
      session
    };
  };

  // Sort sessions by start time
  const sortedSessionStats = [...sessionStats].sort((a, b) => {
    const aTime = parseSessionTime(a.name);
    const bTime = parseSessionTime(b.name);
    return aTime.start - bTime.start;
  });

  // Calculate session dependencies and widths
  const getSessionLayout = (sectionSessions: any[]) => {
    const availableSessions = sectionSessions.filter(s => s.count > 0);
    const sessionTimes = availableSessions.map(s => parseSessionTime(s.session));

    // Group sessions by overlaps
    const layout: { session: string; width: number; color: string; attendance: number; present: number; total: number }[] = [];
    const processed = new Set<string>();

    sessionTimes.forEach(sessionTime => {
      if (processed.has(sessionTime.session)) return;

      // Find if there's a 2-hour session that covers this time
      const covering2HrSession = sessionTimes.find(other =>
        other.session !== sessionTime.session &&
        other.start <= sessionTime.start &&
        other.end >= sessionTime.end &&
        (other.end - other.start) > (sessionTime.end - sessionTime.start)
      );

      // Find sessions this one covers (if it's a 2-hour session)
      const coveredSessions = sessionTimes.filter(other =>
        other.session !== sessionTime.session &&
        sessionTime.start <= other.start &&
        sessionTime.end >= other.end
      );

      const sessionData = availableSessions.find(s => s.session === sessionTime.session);
      const sessionStat = sortedSessionStats.find(s => s.name === sessionTime.session);

      // Determine width and whether to show
      let width = 1;
      let shouldShow = true;

      if (coveredSessions.length > 0) {
        // This is a 2-hour session covering others
        width = 2;
        coveredSessions.forEach(covered => processed.add(covered.session));
      } else if (covering2HrSession) {
        // This session is covered by a 2-hour session
        shouldShow = false;
      }

      if (shouldShow && sessionData && sessionStat) {
        layout.push({
          session: sessionTime.session,
          width,
          color: sessionStat.color,
          attendance: sessionData.attendance,
          present: sessionData.present,
          total: sessionData.total
        });
      }

      processed.add(sessionTime.session);
    });

    return layout.sort((a, b) => {
      const aTime = parseSessionTime(a.session);
      const bTime = parseSessionTime(b.session);
      return aTime.start - bTime.start;
    });
  };

  return (
    <Card variant="cyber" className="p-6">
      <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">{title}</h3>
      <div className="my-4 flex flex-wrap gap-2">
        {sortedSessionStats.map((session: any, idx: number) => {
          const option = SESSION_OPTIONS.find(opt => opt.key === session.name);
          const label = option?.value.split(' to ')[0] + (option?.value.includes('(2hrs)') ? ' (2hr)' : '');
          return (
            <div key={idx} className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session.color }}></div>
              <span>{label}</span>
            </div>
          )
        })}
      </div>
      <div className="space-y-3">
        {data.map((item, index) => {
          const layout = getSessionLayout(item.sessions);
          const totalWidth = layout.reduce((sum, l) => sum + l.width, 0);

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-shrink-0 w-20">
                  <span className="text-sm font-medium text-cyber-gray-700">
                    {item.name} <span className="text-cyber-gray-400 font-normal">({Math.max(...item.sessions.map(s => s.total), 0)})</span>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="relative w-full h-6 bg-[#faebc5] rounded-full overflow-hidden">
                    <div className="flex h-full">
                      {layout.map((sessionLayout, idx) => {
                        const sessionWidth = (sessionLayout.width / totalWidth) * 100;
                        const fillPercentage = sessionLayout.attendance;

                        return (
                          <div key={idx} className="relative flex" style={{ width: `${sessionWidth}%` }}>
                            <div
                              className="h-full flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                width: `${fillPercentage}%`,
                                backgroundColor: sessionLayout.color
                              }}
                              title={`${sessionLayout.session}: ${sessionLayout.attendance}% (${sessionLayout.present}/${sessionLayout.total})`}
                            >
                              {fillPercentage > 15 ? `${sessionLayout.attendance}%` : ''}
                            </div>
                            <div
                              className="h-full bg-transparent"
                              style={{
                                width: `${100 - fillPercentage}%`,
                                borderRight: idx < layout.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-cyber-gray-900 w-10 text-right">{item.value}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SectionChart;