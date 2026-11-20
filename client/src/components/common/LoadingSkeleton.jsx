export default function LoadingSkeleton({ rows = 5, variant = 'table' }) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="card animate-pulse p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-7 w-12" />
              </div>
              <div className="skeleton h-9 w-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-4">
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-3 w-1/4" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="flex h-[260px] animate-pulse items-end gap-2 p-4">
        {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75].map((height, index) => (
          <div key={index} className="skeleton flex-1" style={{ height: `${height}%` }} />
        ))}
      </div>
    );
  }

  if (variant === 'kanban') {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, column) => (
          <div key={column} className="card space-y-3 p-4">
            <div className="skeleton h-4 w-24" />
            {Array.from({ length: 3 }).map((__, card) => (
              <div key={card} className="skeleton h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-4 px-4 py-4">
          <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
          <div className="skeleton h-3 w-32" />
          <div className="skeleton hidden h-3 w-40 md:block" />
          <div className="skeleton hidden h-3 w-24 lg:block" />
          <div className="skeleton ml-auto h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
