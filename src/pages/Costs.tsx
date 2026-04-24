import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, PieChart, Calendar, Users, Briefcase, Loader2, Filter } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { CircularProgress } from '../components/CircularProgress';
import { Pagination } from '../components/Pagination';
import { useNotification } from '../context/NotificationContext';

const CostsPage: React.FC = () => {
  const { t } = useTranslation();
  const { error: notifyError } = useNotification();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    client_id: '',
    project_id: '',
    project_status: ''
  });

  // Pagination State for Breakdown Table
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.project_status) params.append('project_status', filters.project_status);

      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const [dashRes, clientsRes, projectsRes] = await Promise.all([
        api.get(`/dashboard?${params.toString()}`),
        api.get('/clients'),
        api.get('/projects?status=' + (filters.project_status || 'all'))
      ]);
      
      setData(dashRes.data);
      if (dashRes.data?.pagination) {
        setPagination(prev => ({
          ...prev,
          total: dashRes.data.pagination.total,
          totalPages: dashRes.data.pagination.totalPages
        }));
      }

      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
      setProjects(Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : []));
    } catch (error) {
      console.error('Error fetching costs data:', error);
      notifyError(t('costs.error_fetch', 'Error al cargar datos de costos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, pagination.page, pagination.limit]);

  if (loading && !data) return <div className="animate-pulse space-y-8">
    <div className="h-12 bg-gray-200 rounded-xl w-48"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
    </div>
  </div>;

  const totalCost = data?.pagination?.globalCost ?? 0;
  const totalRevenue = data?.pagination?.globalRevenue ?? 0;
  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8">
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
            <Users className="w-3 h-3" /> {t('dashboard.client')}
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
            <Briefcase className="w-3 h-3" /> {t('dashboard.project')}
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

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> {t('projects.status')}
          </label>
          <select 
            value={filters.project_status}
            onChange={(e) => {
              setFilters({ ...filters, project_status: e.target.value, project_id: '' });
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('approvals.all_status')}</option>
            <option value="Activo">{t('projects.active')}</option>
            <option value="Inactivo">{t('projects.inactive')}</option>
            <option value="Finalizado">{t('projects.finished')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-4">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('costs.total_cost')}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('costs.avg_margin')}</p>
          <p className="text-2xl font-bold text-gray-900">{margin.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('costs.est_revenue')}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{t('costs.breakdown')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">{t('costs.project')}</th>
                <th className="px-6 py-3 text-right">{t('costs.revenue')}</th>
                <th className="px-6 py-3 text-right">{t('costs.cost')}</th>
                <th className="px-6 py-3 text-right">{t('costs.profit')}</th>
                <th className="px-6 py-3 text-center">{t('costs.margin_pct')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.profitability?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    {t('costs.no_data_filters')}
                  </td>
                </tr>
              ) : (
                data?.profitability?.map((p: any) => {
                  const pMargin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
                  return (
                    <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatCurrency(p.revenue)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">{formatCurrency(p.cost)}</td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${p.revenue - p.cost >= 0 ? 'text-accent' : 'text-red-500'}`}>{formatCurrency(p.revenue - p.cost)}</td>
                      <td className="px-6 py-4 flex items-center justify-center">
                        <CircularProgress 
                          value={pMargin} 
                          max={100} 
                          size={36}
                          strokeWidth={3}
                          showText={true}
                          colorClass={pMargin > 30 ? 'text-green-500' : pMargin > 10 ? 'text-amber-500' : 'text-red-500'}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setPagination({ ...pagination, page })}
          limit={pagination.limit}
          onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
          totalItems={pagination.total}
        />
      </div>
    </div>
  );
};

export default CostsPage;
