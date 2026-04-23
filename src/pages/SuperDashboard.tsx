import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Globe, 
  Users, 
  Briefcase, 
  Clock, 
  TrendingUp, 
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../lib/api';

const SuperDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/super/stats');
      setData(res.data);
    } catch (error) {
      console.error('Error fetching super stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const stats = data?.stats || {};
  const topTenants = data?.top_tenants || [];

  const cards = [
    { title: t('super.total_tenants'), value: stats.total_tenants, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: t('super.total_users'), value: stats.total_users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: t('super.total_projects'), value: stats.total_projects, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: t('super.total_hours'), value: Math.round(stats.total_hours || 0), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('super.dashboard_title')}</h1>
        <p className="text-gray-500 mt-1">{t('super.dashboard_subtitle')}</p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color} transition-transform group-hover:scale-110`}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Live
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Tenants Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> {t('super.top_tenants')}
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {topTenants.map((tenant: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">{tenant.name}</span>
                      <span className="text-sm text-gray-500 font-medium">{tenant.user_count} usuarios</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(tenant.user_count / (topTenants[0]?.user_count || 1)) * 100}%` }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {topTenants.length === 0 && (
                <p className="text-center text-gray-400 py-8 italic">No hay datos suficientes aún.</p>
              )}
            </div>
          </div>
        </div>

        {/* Platform Status */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" /> {t('super.platform_status')}
          </h3>
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">{t('super.db_status')}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase">{t('super.stable')}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-blue-900">{t('super.entries_count')}</span>
              </div>
              <span className="text-xs font-bold text-blue-600">{stats.entries_count}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">{t('super.active_kanban')}</span>
              </div>
              <span className="text-xs font-bold text-amber-600">{stats.active_kanban}</span>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400 font-medium italic">{t('super.real_time')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperDashboard;
