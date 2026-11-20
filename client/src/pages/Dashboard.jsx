import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  IndianRupee,
  PhoneCall,
  RefreshCw,
  Target,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard.jsx';
import ChartCard from '../components/dashboard/ChartCard.jsx';
import {
  DailyTrendChart,
  MonthlyTrendChart,
  SourceBarChart,
  StatusPieChart,
} from '../components/dashboard/Charts.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import PriorityBadge from '../components/common/PriorityBadge.jsx';
import useLeadStats from '../hooks/useLeadStats.js';
import { formatCurrency, formatDate } from '../utils/formatDate.js';

const PRESETS = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

export default function Dashboard() {
  const [preset, setPreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const params = useMemo(() => {
    if (preset === 'all') return {};
    if (preset === 'custom') {
      return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
    }
    const days = PRESETS.find((entry) => entry.key === preset)?.days || 30;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
  }, [preset, customFrom, customTo]);

  const { stats, loading, error, refetch } = useLeadStats(params);

  const cards = [
    {
      key: 'total',
      label: 'Total leads',
      icon: Users,
      accent: 'brand',
      to: '/leads',
      hint: 'Matching the selected date range',
    },
    { key: 'new', label: 'New', icon: UserPlus, accent: 'blue', to: '/leads?status=New', hint: 'Awaiting first contact' },
    {
      key: 'contacted',
      label: 'Contacted',
      icon: PhoneCall,
      accent: 'orange',
      to: '/leads?status=Contacted',
      hint: 'Conversation started',
    },
    {
      key: 'qualified',
      label: 'Qualified',
      icon: BadgeCheck,
      accent: 'green',
      to: '/leads?status=Qualified',
      hint: 'Ready for the pipeline',
    },
    { key: 'lost', label: 'Lost', icon: UserX, accent: 'red', to: '/leads?status=Lost', hint: 'No longer pursuing' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Overview</h2>
          <p className="mt-1 text-sm text-muted">Live pipeline health, aggregated from your MongoDB data.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-card p-1">
            {PRESETS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setPreset(entry.key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  preset === entry.key
                    ? 'bg-brand-600 text-white'
                    : 'text-muted hover:bg-slate-50 hover:text-ink dark:hover:bg-slate-800'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {preset === 'custom' ? (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="stat-from">
                From date
              </label>
              <input
                id="stat-from"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="input py-1.5 text-xs"
              />
              <span className="text-xs text-muted">to</span>
              <label className="sr-only" htmlFor="stat-to">
                To date
              </label>
              <input
                id="stat-to"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="input py-1.5 text-xs"
              />
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle size={18} className="shrink-0" />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={refetch} className="btn-secondary shrink-0 py-2">
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="cards" rows={5} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={card.icon}
              accent={card.accent}
              to={card.to}
              hint={card.hint}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Created this month"
          value={stats.createdThisMonth}
          icon={CalendarDays}
          accent="violet"
          loading={loading}
          hint="New leads this calendar month"
        />
        <StatCard
          label="Conversion rate"
          value={`${stats.conversionRate}%`}
          icon={Target}
          accent="green"
          loading={loading}
          hint="Qualified ÷ total leads"
        />
        <StatCard
          label="Pipeline value"
          value={formatCurrency(stats.totalEstimatedValue)}
          icon={IndianRupee}
          accent="brand"
          loading={loading}
          hint="Sum of estimated values"
        />
        <StatCard
          label="Hot leads"
          value={(stats.recentLeads || []).filter((lead) => lead.scoreBand === 'Hot').length}
          icon={BadgeCheck}
          accent="red"
          loading={loading}
          hint="Score 60+ among recent leads"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Leads by status" subtitle="Distribution across pipeline stages">
          {loading ? <LoadingSkeleton variant="chart" /> : <StatusPieChart data={stats.charts.byStatus} />}
        </ChartCard>

        <ChartCard title="Leads by source" subtitle="Where your leads come from">
          {loading ? <LoadingSkeleton variant="chart" /> : <SourceBarChart data={stats.charts.bySource} />}
        </ChartCard>

        <ChartCard title="Leads created over time" subtitle="Daily creation volume for the selected period">
          {loading ? <LoadingSkeleton variant="chart" /> : <DailyTrendChart data={stats.charts.dailyTrend} />}
        </ChartCard>

        <ChartCard title="Monthly acquisition" subtitle="Last 12 months of new leads">
          {loading ? <LoadingSkeleton variant="chart" /> : <MonthlyTrendChart data={stats.charts.monthlyTrend} />}
        </ChartCard>
      </div>

      <section className="card overflow-hidden" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="recent-heading" className="text-sm font-semibold text-ink">
            Recent leads
          </h3>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton variant="list" rows={4} />
        ) : stats.recentLeads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No leads yet"
            description="Add your first lead to start tracking the pipeline."
            action={
              <Link to="/leads?new=1" className="btn-primary">
                Add your first lead
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {stats.recentLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  to={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                    {lead.name
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                    <p className="truncate text-xs text-muted">
                      {lead.company} · {lead.source}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <PriorityBadge priority={lead.priority} showIcon={false} />
                    <span className="text-xs text-muted">{formatDate(lead.createdAt)}</span>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
