import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Clock, Briefcase, Users, Filter, Calendar, Search, DollarSign } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../lib/formatters';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { config, hasPermission } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManagement = hasPermission('approvals') || Number(user.role_id) === 1;

  // Filters
  const [filters, setFilters] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    client_id: '',
    project_id: ''
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.project_id) params.append('project_id', filters.project_id);

      const response = await api.get(`/dashboard?${params.toString()}`);
      const d = response.data;
      // Ensure nested arrays exist
      if (d) {
        if (!Array.isArray(d.hoursByProject)) d.hoursByProject = [];
        if (!Array.isArray(d.profitability)) d.profitability = [];
        if (!Array.isArray(d.hoursByTask)) d.hoursByTask = [];

        // Add spacer and visual alignment for better legibility
        d.profitability = d.profitability
          .sort((a: any, b: any) => (Number(b.revenue) + Number(b.cost)) - (Number(a.revenue) + Number(a.cost)))
          .slice(0, 4)
          .map((p: any) => {
          const revenue = Number(p.revenue) || 0;
          const cost = Number(p.cost) || 0;
          const gap = revenue * 0.02; // 2% gap
          return {
            ...p,
            revenue: revenue,
            cost: cost,
            profit: revenue - cost,
            gap_spacer: gap,
            revenue_visual: revenue + gap
          };
        });

        if (d.userStats) {
          if (!Array.isArray(d.userStats.hoursByProject)) d.userStats.hoursByProject = [];
          if (!Array.isArray(d.userStats.hoursByTask)) d.userStats.hoursByTask = [];
        }
      }
      setData(d);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const isStaff = !isManagement;
      const query = isStaff ? '?participating=true' : '';
      
      const [clientsRes, projectsRes] = await Promise.all([
        api.get(`/clients${query}`),
        api.get(`/projects${query}`)
      ]);
      setClients(Array.isArray(clientsRes.data?.data) ? clientsRes.data.data : (Array.isArray(clientsRes.data) ? clientsRes.data : []));
      setProjects(Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : []));
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [filters]);

  if (loading && !data) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
    </div>
    <div className="h-96 bg-gray-200 rounded-2xl"></div>
  </div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-gray-500">{t('dashboard.subtitle')}</p>
        </div>
        {config.logo_url && (
          <div className="h-12 flex items-center">
            <img src={config.logo_url} alt={config.company_name} className="h-full w-auto object-contain" referrerPolicy="no-referrer" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {t('dashboard.from')}
          </label>
          <input 
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {t('dashboard.to')}
          </label>
          <input 
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> {t('clients.title')}
          </label>
          <select 
            value={filters.client_id}
            onChange={(e) => setFilters({ ...filters, client_id: e.target.value, project_id: '' })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('dashboard.all_clients')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {t('tracker.project')}
          </label>
          <select 
            value={filters.project_id}
            onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('dashboard.all_projects')}</option>
            {projects
              .filter(p => !filters.client_id || p.client_id.toString() === filters.client_id)
              .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <button 
          onClick={() => setFilters({
            from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
            client_id: '',
            project_id: ''
          })}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          {t('dashboard.clear')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-gray-500">{t('dashboard.total_clients')}</p>
            <p className="text-2xl font-bold text-gray-900">{data?.stats?.totalClients || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-gray-500">{t('dashboard.active_projects')}</p>
            <p className="text-2xl font-bold text-gray-900">{data?.stats?.activeProjects || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-gray-500">{t('dashboard.total_hours')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {data?.stats?.totalHours || 0}h
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-gray-500">
              {Number(user.role_id) === 1 
                ? t('dashboard.profitability_admin') 
                : Number(user.role_id) === 2 
                  ? t('dashboard.revenue_clevel') 
                  : t('dashboard.revenue_staff')}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data?.stats?.totalEarnings || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Specific Charts (Staff/Commercial only) */}
        {!isManagement && data?.userStats && (
          <>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.my_hours_by_project')}</h3>
              <div className="h-80 w-full">
                {(data?.userStats?.hoursByProject?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={data.userStats.hoursByProject}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t('dashboard.no_data')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.my_hours_by_task')}</h3>
              <div className="h-80 w-full">
                {(data?.hoursByTask?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={data.hoursByTask}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="approved" name={t('dashboard.approved')} fill="var(--color-approved)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="submitted" name={t('dashboard.submitted')} fill="var(--color-submitted)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="draft" name={t('dashboard.draft')} fill="var(--color-draft)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected" name={t('dashboard.rejected')} fill="var(--color-rejected)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t('dashboard.no_data')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* General Charts (Admins/C-Level only) */}
        {isManagement && (
          <>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.status_hours')}</h3>
              <div className="h-80 w-full">
                {data?.hoursByStatus ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={[
                      { name: t('dashboard.approved'), hours: data.hoursByStatus.approved, color: 'var(--color-approved)' },
                      { name: t('dashboard.submitted'), hours: data.hoursByStatus.submitted, color: 'var(--color-submitted)' },
                      { name: t('dashboard.draft'), hours: data.hoursByStatus.draft, color: 'var(--color-draft)' },
                      { name: t('dashboard.rejected'), hours: data.hoursByStatus.rejected, color: 'var(--color-rejected)' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={60}>
                        {[
                          { name: t('dashboard.approved'), color: 'var(--color-approved)' },
                          { name: t('dashboard.submitted'), color: 'var(--color-submitted)' },
                          { name: t('dashboard.draft'), color: 'var(--color-draft)' },
                          { name: t('dashboard.rejected'), color: 'var(--color-rejected)' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t('dashboard.no_data')}</p>
                  </div>
                )}
              </div>
            </div>

            {hasPermission('costs') && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.profitability')}</h3>
                <div className="h-80 w-full">
                  {(data?.profitability?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart 
                        data={data.profitability.slice(0, 4)} 
                        layout="vertical"
                        margin={{ left: 20, right: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(val) => `$${val}`} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: '#374151', fontWeight: 500 }} width={120} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          formatter={(value: any, name: string, props: any) => {
                            if (name === t('dashboard.total_revenue')) {
                              const actualRevenue = props.payload.revenue;
                              const cost = props.payload.cost;
                              const margin = actualRevenue > 0 ? ((actualRevenue - cost) / actualRevenue) * 100 : 0;
                              return [formatCurrency(actualRevenue), `${name} (${t('dashboard.margin')}: ${margin.toFixed(1)}%)`];
                            }
                            if (name === t('dashboard.margin')) {
                              return [formatCurrency(value), name];
                            }
                            return [formatCurrency(value), name];
                          }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="revenue_visual" name={t('dashboard.total_revenue')} fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                        <Bar dataKey="cost" name={t('dashboard.total_cost')} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={12} />
                        <Bar dataKey="gap_spacer" stackId="a" fill="transparent" barSize={12} />
                        <Bar dataKey="profit" name={t('dashboard.margin')} stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">{t('dashboard.no_data')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
