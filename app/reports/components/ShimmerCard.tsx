export default function ShimmerCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-cyber-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-cyber-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-cyber-gray-200 rounded w-16"></div>
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-cyber-gray-200 rounded w-24"></div>
              <div className="h-4 bg-cyber-gray-200 rounded w-16"></div>
            </div>
            <div className="h-6 bg-cyber-gray-200 rounded-lg w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShimmerStat() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-cyber-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyber-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-3 bg-cyber-gray-200 rounded w-20 mb-2"></div>
          <div className="h-6 bg-cyber-gray-200 rounded w-12"></div>
        </div>
      </div>
    </div>
  );
}
