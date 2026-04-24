import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Briefcase, 
  AlertTriangle, 
  Info, 
  History, 
  ChevronRight,
  X,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  CheckSquare,
  TrendingUp,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/api';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pagination } from '../../components/Pagination';

interface AuditLog {
  id: number;
  time_entry_id: number;
  from_status: string | null;
  to_status: string;
  user_id: number;
  actor_name: string;
  comment: string | null;
  created_at: string;
  owner_id: number;
  owner_name: string;
  project_name: string;
  task_name: string;
  entry_hours: number;
  entry_date: string;
  entry_description: string;
  entry_created_at: string;
  rejection_count: number;
}

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    project_id: '',
    owner_id: '',
    only_rejections: false,
    post_approval: false,
    anomaly_threshold: 2
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { 
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      const response = await api.get('/reports/audit', { params });
      
      if (response.data?.data) {
        setLogs(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      } else {
        setLogs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [pRes, uRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users')
      ]);
      setProjects(Array.isArray(pRes.data?.data) ? pRes.data.data : (Array.isArray(pRes.data) ? pRes.data : []));
      setUsers(Array.isArray(uRes.data?.data) ? uRes.data.data : (Array.isArray(uRes.data) ? uRes.data : []));
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setProjects([]);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.limit]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const openDetail = async (log: AuditLog) => {
    setSelectedLog(log);
    setLoadingTimeline(true);
    try {
      const response = await api.get(`/time-entries/${log.time_entry_id}/logs`);
      setTimeline(response.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'submitted': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const getStatusName = (status: string | null) => {
    switch (status) {
      case 'approved': return t('tracker.approved');
      case 'rejected': return t('tracker.rejected');
      case 'submitted': return t('tracker.send_approval');
      case 'draft': return t('tracker.draft');
      case 'new': return t('reports.state_new');
      default: return status?.toUpperCase() || '-';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      case 'submitted': return <Clock className="w-3 h-3" />;
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'new': return <TrendingUp className="w-3 h-3" />;
      default: return null;
    }
  };

  // Alert Logic
  const getAlerts = (log: AuditLog) => {
    const alerts = [];
    
    // Ping-Pong Alert: At least 2 rejections for this entry
    if ((log.rejection_count || 0) >= 2) {
      alerts.push({
        type: 'ping-pong',
        title: t('reports.ping_pong'),
        description: t('reports.ping_pong_desc').replace('{{count}}', log.rejection_count.toString()),
        icon: <TrendingUp className="w-3.5 h-3.5 text-amber-600" />,
        color: 'bg-amber-50 text-amber-700 border-amber-100'
      });
    }

    // Post-Approval Change
    if (log.from_status === 'approved') {
      alerts.push({
        type: 'conflict',
        title: t('reports.conflict'),
        description: t('reports.conflict_desc'),
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
        color: 'bg-red-50 text-red-700 border-red-100'
      });
    }

    // Time Anomaly: created_at vs entry_date
    const logDate = parseISO(log.created_at);
    const entryDate = parseISO(log.entry_date);
    const diff = Math.abs(differenceInDays(logDate, entryDate));
    if (diff > filters.anomaly_threshold) {
      alerts.push({
        type: 'time',
        title: t('reports.time_anomaly'),
        description: t('reports.time_anomaly_desc').replace('{{diff}}', diff.toString()),
        icon: <Clock className="w-3.5 h-3.5 text-purple-500" />,
        color: 'bg-purple-50 text-purple-700 border-purple-100'
      });
    }

    return alerts;
  };

  const truncateDescription = (text: string | null) => {
    if (!text) return "";
    if (text.length > 200) {
      return text.substring(0, 50) + "...";
    }
    return text;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
          <Filter className="w-3.5 h-3.5" />
          {t('reports.filters_title')}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('reports.date_range')}</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="date" 
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input 
                type="date" 
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('projects.title')}</label>
            <select 
              name="project_id"
              value={filters.project_id}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 pointer-events-auto"
            >
              <option value="">{t('reports.all_projects')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('reports.header_user')}</label>
            <select 
              name="owner_id"
              value={filters.owner_id}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('reports.all_users')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t('reports.anomaly_threshold')}</label>
            <input 
              type="number" 
              name="anomaly_threshold"
              value={filters.anomaly_threshold}
              onChange={handleFilterChange}
              className="w-10 bg-transparent border-none text-xs font-bold text-indigo-600 focus:outline-none focus:ring-0 p-0"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                name="only_rejections"
                checked={filters.only_rejections}
                onChange={handleFilterChange}
                className="peer sr-only"
              />
              <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-red-500 transition-colors shadow-inner"></div>
              <div className="absolute left-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 shadow transition-transform"></div>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{t('reports.only_rejections')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                name="post_approval"
                checked={filters.post_approval}
                onChange={handleFilterChange}
                className="peer sr-only"
              />
              <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors shadow-inner"></div>
              <div className="absolute left-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 shadow transition-transform"></div>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{t('reports.post_approval')}</span>
          </label>

          <button 
            onClick={fetchLogs}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-xs font-semibold"
          >
            <Search className="w-3.5 h-3.5" />
            {t('reports.update_report')}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('reports.timestamp')}</th>
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('reports.header_user')}</th>
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('reports.action_transition')}</th>
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('reports.performed_by')}</th>
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">{t('reports.header_alerts')}</th>
                <th className="px-3 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    {t('reports.no_records')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const alerts = getAlerts(log);
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      onClick={() => openDetail(log)}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900 leading-tight">
                          {format(parseISO(log.created_at), 'dd MMM, yyyy', { locale: es })}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono leading-tight">
                          {format(parseISO(log.created_at), 'HH:mm:ss.SSS')}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[9px] font-bold">
                            {(log.owner_name || 'U').charAt(0)}
                          </div>
                          <div className="text-xs text-gray-700 font-medium">{log.owner_name || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap flex-nowrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap shrink-0 ${getStatusColor(log.from_status || 'new')}`}>
                            {getStatusIcon(log.from_status || 'new')}
                            {getStatusName(log.from_status || 'new')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap shrink-0 ${getStatusColor(log.to_status)}`}>
                            {getStatusIcon(log.to_status)}
                            {getStatusName(log.to_status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${log.actor_name === 'Sistema' ? 'bg-gray-50 text-gray-400 border border-gray-200' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {log.actor_name === 'Sistema' ? <Settings className="w-2.5 h-2.5" /> : (log.actor_name || 'U').charAt(0)}
                          </div>
                          <div className="text-xs text-gray-600">{log.actor_name || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="grid grid-cols-3 gap-1.5 w-[140px] mx-auto">
                          {/* Col 1: Anomalia */}
                          <div className="flex items-center justify-center h-6">
                            {alerts.find(a => a.type === 'time') && (
                              <div 
                                className={`w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border text-[8px] font-bold ${alerts.find(a => a.type === 'time')?.color}`}
                                title={alerts.find(a => a.type === 'time')?.description}
                              >
                                {alerts.find(a => a.type === 'time')?.icon}
                                <span>A</span>
                              </div>
                            )}
                          </div>
                          {/* Col 2: Conflicto */}
                          <div className="flex items-center justify-center h-6">
                            {alerts.find(a => a.type === 'conflict') && (
                              <div 
                                className={`w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border text-[8px] font-bold ${alerts.find(a => a.type === 'conflict')?.color}`}
                                title={alerts.find(a => a.type === 'conflict')?.description}
                              >
                                {alerts.find(a => a.type === 'conflict')?.icon}
                                <span>C</span>
                              </div>
                            )}
                          </div>
                          {/* Col 3: Ping Pong */}
                          <div className="flex items-center justify-center h-6">
                            {alerts.find(a => a.type === 'ping-pong') && (
                              <div 
                                className={`w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border text-[8px] font-bold ${alerts.find(a => a.type === 'ping-pong')?.color}`}
                                title={alerts.find(a => a.type === 'ping-pong')?.description}
                              >
                                {alerts.find(a => a.type === 'ping-pong')?.icon}
                                <span>PP</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button className="p-1.5 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-lg transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
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

      {/* Forensic Detail Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-8">
                {/* Drawer Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 font-bold">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{t('reports.movement_detail')}</h2>
                      <p className="text-xs text-gray-500 font-mono">Entry ID: #{selectedLog.time_entry_id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Anomalies / Alerts in Detail */}
                {getAlerts(selectedLog).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                       {t('reports.alerts_detected')}
                    </h3>
                    <div className="space-y-2">
                      {getAlerts(selectedLog).map((alert, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex items-start gap-3 ${alert.color}`}>
                          <div className="mt-0.5">{alert.icon}</div>
                          <div>
                            <div className="text-sm font-bold">{alert.title}</div>
                            <div className="text-xs opacity-80">{alert.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context Card */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('reports.original_context')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusColor(selectedLog.to_status)}`}>
                      {getStatusName(selectedLog.to_status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Briefcase className="w-3.5 h-3.5" /> {t('reports.project')}
                      </div>
                      <div className="text-sm font-bold text-gray-700 leading-snug">{selectedLog.project_name}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <History className="w-3.5 h-3.5" /> {t('reports.re_work')}
                      </div>
                      <div className="text-sm font-bold text-gray-700 leading-snug">{selectedLog.rejection_count} {t('reports.rejections')}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5" /> {t('reports.description')}
                    </div>
                    <div className="text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-200/50 italic leading-relaxed">
                      "{truncateDescription(selectedLog.entry_description)}"
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-gray-200/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {(selectedLog.owner_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">{selectedLog.owner_name || '-'}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{t('reports.header_user')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-indigo-600">{selectedLog.entry_hours}h</div>
                      <div className="text-[10px] text-gray-400 font-medium">{format(parseISO(selectedLog.entry_date), 'dd/MM/yyyy')}</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    {t('reports.timeline')}
                  </h3>
                  
                  <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    {loadingTimeline ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => (
                          <div key={i} className="animate-pulse flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0"></div>
                            <div className="h-20 bg-gray-50 rounded-xl w-full"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {timeline.map((event, idx) => (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[23px] top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm z-10 ${
                              event.to_status === 'approved' ? 'bg-blue-500' : 
                              event.to_status === 'rejected' ? 'bg-red-500' : 
                              event.to_status === 'submitted' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getStatusColor(event.to_status)}`}>
                                    {getStatusName(event.to_status)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {format(parseISO(event.created_at), 'dd MMM, HH:mm', { locale: es })}
                                  </span>
                                </div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                   {event.user_name}
                                </div>
                              </div>
                              {event.comment && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 italic leading-snug">
                                  "{event.comment}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Initial Creation Event (Inferred) */}
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm z-10 bg-indigo-500" />
                          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 border-dashed">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t('reports.creation', 'CREACIÓN')}</span>
                              <span className="text-[10px] text-indigo-400/80 font-medium">
                                {format(parseISO(selectedLog.entry_created_at), 'dd MMM, HH:mm', { locale: es })}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-600/70 leading-relaxed">
                              {t('reports.initial_draft', 'Entrada registrada inicialmente como borrador.')}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogPage;
