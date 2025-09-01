import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { SESSION_OPTIONS } from "@/lib/types";
import { getProgramName } from "@/lib/utils";
import { memo } from "react";
import { SectionData, SectionSession, SessionStat } from "./types";
import { parseSessionTime } from "./utils";

const SectionChart = memo(({ data, title, sessionStats, onSectionSelect }: {
  data: SectionData[],
  title: string,
  sessionStats: SessionStat[],
  onSectionSelect: (section: string) => void
}) => {
  // Calculate session dependencies and widths - SectionChart specific logic
  const getSessionLayout = (sectionSessions: SectionSession[], allSessions: SessionStat[]): { session: string; width: number; color: string; attendance: number; present: number; total: number; occurred: boolean; isCovered: boolean }[] => {
    const sessionTimes = allSessions.map(s => parseSessionTime(s.name));

    const layout: { session: string; width: number; color: string; attendance: number; present: number; total: number; occurred: boolean; isCovered: boolean }[] = [];
    const processed = new Set<string>();

    sessionTimes.forEach(sessionTime => {
      if (processed.has(sessionTime.session)) return;

      // Find sessions this one covers (if it's a 2-hour session)
      const coveredSessions = sessionTimes.filter(other =>
        other.session !== sessionTime.session &&
        sessionTime.start <= other.start &&
        sessionTime.end >= other.end
      );

      const sessionData = sectionSessions.find(s => s.session === sessionTime.session);
      const sessionStat = allSessions.find(s => s.name === sessionTime.session);

      // Determine if this session occurred
      const occurred = sessionData ? sessionData.count > 0 : false;

      // For 2-hour sessions that occurred, hide the covered 1-hour sessions
      if (coveredSessions.length > 0 && occurred) {
        // This is a 2-hour session that occurred - hide the covered sessions
        coveredSessions.forEach(covered => processed.add(covered.session));
      }

      // For 2-hour sessions that didn't occur, don't show them at all
      if (coveredSessions.length > 0 && !occurred) {
        processed.add(sessionTime.session);
        return;
      }

      // For 1-hour sessions that are covered by occurred 2-hour sessions, don't show them
      const covering2HrSession = sessionTimes.find(other =>
        other.session !== sessionTime.session &&
        other.start <= sessionTime.start &&
        other.end >= sessionTime.end &&
        (other.end - other.start) > (sessionTime.end - sessionTime.start)
      );

      const coveringSessionOccurred = covering2HrSession ?
        (sectionSessions.find(s => s.session === covering2HrSession.session)?.count || 0) > 0 : false;

      if (coveringSessionOccurred) {
        processed.add(sessionTime.session);
        return;
      }

      // Determine width
      let width = 1;
      const isCovered = !!covering2HrSession;

      if (coveredSessions.length > 0) {
        // This is a 2-hour session covering others
        width = 2;
      }

      if (sessionStat) {
        layout.push({
          session: sessionTime.session,
          width,
          color: sessionStat.color,
          attendance: sessionData ? sessionData.attendance : 0,
          present: sessionData ? sessionData.present : 0,
          total: sessionData ? sessionData.total : 0,
          occurred,
          isCovered
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
        {sessionStats.map((session, idx) => {
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
          const layout = getSessionLayout(item.sessions, sessionStats);
          const totalWidth = layout.reduce((sum, l) => sum + l.width, 0);

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-3">
                <Tooltip content={<span>View <strong>{getProgramName(item.name) || item.name}</strong></span>} side="right">
                  <div className="min-w-0 flex-shrink-0 w-20" onClick={() => onSectionSelect(item.name)} style={{ cursor: 'pointer' }}>
                    <span className="text-sm font-medium text-cyber-gray-700">
                      {item.name.replace('CSE P', 'P').replace('GEN AI', 'GenAI').replace('CYBER SECURITY', 'CS')} <span className="text-cyber-gray-400 font-normal">({Math.max(...item.sessions.map((s: SectionSession) => s.total), 0)})</span>
                    </span>
                  </div>
                </Tooltip>
                <div className="flex-1 min-w-0">
                  <div className="relative w-full h-6 rounded-full overflow-hidden">
                    <div className="flex h-full">
                      {layout.map((sessionLayout, idx) => {
                        const sessionLabel = SESSION_OPTIONS.find(opt => opt.key === sessionLayout.session)?.value || sessionLayout.session;
                        const sessionWidth = (sessionLayout.width / totalWidth) * 100;
                        const fillPercentage = sessionLayout.attendance;

                        return (
                          <Tooltip delay={100} sideOffset={8} content={
                            <div>
                              {sessionLabel}
                              <br />
                              <em className="text-gray-500 text-sm">
                                {sessionLayout.occurred
                                  ? `${sessionLayout.present}/${sessionLayout.total} students (${sessionLayout.attendance}%)`
                                  : 'No session'
                                }
                              </em>
                            </div>
                          }>
                            <div key={idx} className="relative flex bg-[#faebc5] rounded-full" style={{ width: `${sessionWidth}%` }}>
                              {sessionLayout.occurred ? (
                                <>
                                  <div
                                    className={`h-full flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity`}
                                    style={{
                                      width: `${fillPercentage}%`,
                                      backgroundColor: sessionLayout.color,
                                      opacity: sessionLayout.isCovered ? 0.7 : 1
                                    }}
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
                                </>
                              ) : (
                                <div
                                  className={`h-full w-full relative overflow-hidden ${sessionLayout.isCovered ? 'border-2 border-dashed border-gray-400' : ''}`}
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRight: idx < layout.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                    opacity: sessionLayout.isCovered ? 0.7 : 1
                                  }}
                                >
                                  {/* Cross-shading pattern */}
                                  <div
                                    className="absolute inset-0 opacity-60"
                                    style={{
                                      backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent 2px,
                                        rgba(0,0,0,0.1) 2px,
                                        rgba(0,0,0,0.1) 4px
                                      )`
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-500">—</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Tooltip>
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
});

export default memo(SectionChart);