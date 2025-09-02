export interface StudentStats {
  totalStudents: number;
  uniqueSections: number;
  sectionsBreakdown: Record<string, number>;
  recentAdditions: number; // Students added in last 30 days
  dataQualityScore: number; // Percentage of students with complete data
}