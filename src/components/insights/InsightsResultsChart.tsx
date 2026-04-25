import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { RunResult, ChartType } from '../../types/insights';

interface Props {
  result: RunResult;
  chartType: ChartType;
  dimensions: string[];
  metrics: string[];
  catalog: { key: string; label_es: string; label_en: string }[];
  lang: string;
}

const COLORS = [
  'var(--primary)',
  'var(--accent)',
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
];

const STATUS_COLORS: Record<string, string> = {
  'APPROVED':  'var(--color-approved)',
  'REJECTED':  'var(--color-rejected)',
  'IN REVIEW': 'var(--color-submitted)',
  'SUBMITTED': 'var(--color-submitted)',
  'DRAFT':     'var(--color-draft)',
  'NEW':       'var(--color-draft)',
  // Versiones en minúscula por las dudas
  'approved':  'var(--color-approved)',
  'rejected':  'var(--color-rejected)',
  'in review': 'var(--color-submitted)',
  'submitted': 'var(--color-submitted)',
  'draft':     'var(--color-draft)',
  'new':       'var(--color-draft)',
};

const toAlias = (key: string) => key.replace('.', '_');

export const InsightsResultsChart: React.FC<Props> = ({
  result, chartType, dimensions, metrics, catalog, lang
}) => {
  if (!result.data.length || chartType === 'table') return null;

  const getLabel = (key: string) => {
    const f = catalog.find(c => c.key === key);
    return f ? (lang.startsWith('en') ? (f as any).label_en : f.label_es) : key;
  };

  const xKey   = dimensions[0] ? toAlias(dimensions[0]) : Object.keys(result.data[0])[0];
  const metKeys = metrics.map(toAlias);

  if (chartType === 'pie' && metKeys.length > 0) {
    const pieKey = metKeys[0];
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={result.data}
            dataKey={pieKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {result.data.map((entry, i) => {
              const val = entry[xKey];
              const fill = STATUS_COLORS[val] || COLORS[i % COLORS.length];
              return <Cell key={i} fill={fill} />;
            })}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const commonProps = {
    data: result.data,
    margin: { top: 8, right: 16, left: 8, bottom: 8 },
  };

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
      <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
    </>
  );

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart {...commonProps}>
          {axes}
          {metKeys.map((mk, i) => {
            const isStatus = mk.toLowerCase().includes('status');
            const fill = isStatus ? 'var(--primary)' : COLORS[i % COLORS.length];
            return <Bar key={mk} dataKey={mk} name={getLabel(metrics[i])} fill={fill} radius={[4, 4, 0, 0]} barSize={36} />;
          })}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart {...commonProps}>
          {axes}
          {metKeys.map((mk, i) => (
            <Line key={mk} type="monotone" dataKey={mk} name={getLabel(metrics[i])} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart {...commonProps}>
          <defs>
            {metKeys.map((mk, i) => (
              <linearGradient key={mk} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {metKeys.map((mk, i) => (
            <Area key={mk} type="monotone" dataKey={mk} name={getLabel(metrics[i])}
              stroke={COLORS[i % COLORS.length]} fill={`url(#grad-${i})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return null;
};
