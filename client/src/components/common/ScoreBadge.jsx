import { Flame, Snowflake, ThermometerSun } from 'lucide-react';

const bands = {
  Hot: {
    className: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
    icon: Flame,
  },
  Warm: {
    className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    icon: ThermometerSun,
  },
  Cold: {
    className: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
    icon: Snowflake,
  },
};

/** Shows the rule-based lead score and its band (not an ML prediction). */
export default function ScoreBadge({ score = 0, band = 'Cold', compact = false }) {
  const tone = bands[band] || bands.Cold;
  const Icon = tone.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.className}`}
      title={`Rule-based score: ${score}/100 (${band})`}
    >
      <Icon size={12} aria-hidden="true" />
      {compact ? score : `${score} · ${band}`}
    </span>
  );
}
