import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMonth, formatShortDay } from '../../utils/formatDate.js';

const STATUS_COLORS = {
  New: '#2563EB',
  Contacted: '#F59E0B',
  Qualified: '#16A34A',
  Lost: '#DC2626',
};

const SOURCE_COLORS = ['#2563EB', '#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#64748B'];

const axisStyle = { fontSize: 11, fill: 'rgb(var(--muted))' };

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid rgb(var(--line))',
  background: 'rgb(var(--card))',
  color: 'rgb(var(--ink))',
  fontSize: 12,
};

export function StatusPieChart({ data = [] }) {
  const chartData = data.filter((entry) => entry.value > 0);
  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-muted">No lead data for this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
          isAnimationActive={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748B'} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          formatter={(value) => <span style={{ fontSize: 12, color: 'rgb(var(--muted))' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SourceBarChart({ data = [] }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) {
    return <p className="py-12 text-center text-sm text-muted">No lead data for this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} interval={0} angle={-12} textAnchor="end" height={48} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--line) / 0.4)' }} />
        <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyTrendChart({ data = [] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No lead data for this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisStyle}
          tickFormatter={formatShortDay}
          minTickGap={24}
          height={36}
        />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(value) => formatShortDay(value)}
          formatter={(value) => [value, 'Leads created']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#dailyFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickFormatter={formatMonth} height={36} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(value) => formatMonth(value)}
          formatter={(value) => [value, 'Leads created']}
        />
        <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionLineChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickFormatter={formatMonth} height={32} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#16A34A"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
