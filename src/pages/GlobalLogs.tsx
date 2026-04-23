import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Search, 
  Clock, 
  Building2, 
  User, 
  ArrowRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../lib/api';
import { format } from 'date-fns';
import { Pagination } from '../components/Pagination';

const GlobalLogs: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchLogs = async (page = pagination.page) => {
    setLoading(true);
    try {
      const response = await api.get(`/super/logs?page=${page}&limit=${pagination.limit}`);
      if (response.data && response.data.data) {
        setLogs(response.data.data);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages
        });
      } else {
        setLogs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(pagination.page);
  }, [pagination.page, pagination.limit]);

  const filteredLogs = logs.filter(log => 
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.comment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-500" /> {t('super.logs_title')}
          </h1>
          <p className="text-gray-500 text-sm">{t('super.logs_subtitle')}</p>
        </div>
        <button 
          onClick={() => fetchLogs(1)}
          disabled={loading}
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-600 disabled:opacity-50"
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder={t('super.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">{t('super.column_date')}</th>
                <th className="px-6 py-4">{t('super.column_entity')}</th>
                <th className="px-6 py-4 text-center">{t('super.column_change')}</th>
                <th className="px-6 py-4">{t('super.column_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    <p className="mt-2 text-sm text-gray-400">{t('super.loading_logs')}</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">
                    {t('super.no_logs')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-300" />
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                          </p>
                          <p className="text-[10px] text-gray-400">UTC-3</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                          <Building2 className="w-3 h-3" /> {log.tenant_name || 'Global'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="w-4 h-4 text-gray-400" /> {log.user_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 text-gray-500 rounded border border-gray-200">
                          {log.from_status || 'Draft'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                          log.to_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          log.to_status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {log.to_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 italic">
                        {log.comment || 'Sin comentarios.'}
                      </p>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-0 border-t border-gray-50">
          <Pagination 
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
            limit={pagination.limit}
            onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
            totalItems={pagination.total}
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalLogs;
