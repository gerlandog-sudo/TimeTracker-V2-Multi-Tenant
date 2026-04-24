import React, { useEffect, useState } from 'react';
import { Check, X, Clock, User, MessageSquare, Loader2, Filter, Calendar, RotateCcw, Send, History, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from '../components/Pagination';
import { useNotification } from '../context/NotificationContext';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [showLogs, setShowLogs] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'prompt';
    action: (inputValue?: string) => void;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    action: () => {}
  });
  const [promptValue, setPromptValue] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        from: dateFrom,
        to: dateTo
      });
      const response = await api.get(`/time-entries?${queryParams.toString()}`);
      
      const responseData = response.data;
      if (responseData && responseData.data) {
        setEntries(responseData.data);
        setPagination(prev => ({
          ...prev,
          total: responseData.total,
          totalPages: responseData.totalPages
        }));
      } else {
        setEntries(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [pagination.page, pagination.limit, statusFilter, dateFrom, dateTo]);

  const handleAction = async (id: number, status: 'approved' | 'rejected' | 'draft') => {
    if (status === 'draft') {
      setModalConfig({
        isOpen: true,
        title: t('approvals.revert_draft'),
        message: t('approvals.confirm_revert'),
        type: 'confirm',
        confirmText: t('approvals.revert_draft').split(' ')[0],
        isDestructive: true,
        action: () => executeAction(id, status)
      });
      return;
    }

    if (status === 'rejected') {
      setPromptValue('');
      setModalConfig({
        isOpen: true,
        title: t('approvals.reject'),
        message: t('approvals.reject_reason'),
        type: 'prompt',
        placeholder: t('approvals.reason_placeholder'),
        confirmText: t('approvals.reject'),
        isDestructive: true,
        action: (reason) => {
          if (reason) executeAction(id, status, reason);
        }
      });
      return;
    }

    executeAction(id, status);
  };

  const executeAction = async (id: number, status: 'approved' | 'rejected' | 'draft', rejection_reason: string | null = null) => {
    setProcessing(id);
    try {
      await api.patch(`/time-entries/${id}/status`, { status, rejection_reason });
      fetchEntries();
      notifySuccess(status === 'approved' ? t('approvals.approved_success', 'Aprobado') : (status === 'rejected' ? t('approvals.rejected_success', 'Rechazado') : t('approvals.reverted_success', 'Revertido')));
    } catch (error: any) {
      console.error('Error updating status:', error);
      notifyError(error.response?.data?.message || t('approvals.error_update'));
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) return;
    
    setModalConfig({
      isOpen: true,
      title: status === 'approved' ? t('approvals.bulk_approve') : t('approvals.bulk_reject'),
      message: `${t('approvals.confirm_bulk')} ${status === 'approved' ? 'APROBAR' : 'RECHAZAR'} ${selectedIds.length} ${t('approvals.entries_selected')}?`,
      type: 'confirm',
      confirmText: status === 'approved' ? t('approvals.approve_all') : `${t('approvals.reject')} ${t('common.all')}`,
      isDestructive: status === 'rejected',
      action: () => executeBulkAction(status)
    });
  };

  const executeBulkAction = async (status: 'approved' | 'rejected') => {
    setBulkProcessing(true);
    try {
      await api.post('/time-entries/bulk-status', { ids: selectedIds, status });
      setSelectedIds([]);
      fetchEntries();
      notifySuccess(status === 'approved' ? t('approvals.bulk_approved_success', 'Registros aprobados') : t('approvals.bulk_rejected_success', 'Registros rechazados'));
    } catch (error: any) {
      console.error('Error in bulk action:', error);
      notifyError(error.response?.data?.message || t('approvals.error_bulk'));
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const submittableIds = entries
      .filter(e => e.status === 'submitted')
      .map(e => e.id);
    
    if (selectedIds.length === submittableIds.length && selectedIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submittableIds);
    }
  };

  const fetchLogs = async (id: number) => {
    setLoadingLogs(true);
    setShowLogs(id);
    try {
      const response = await api.get(`/time-entries/${id}/logs`);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading && entries.length === 0) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> {t('common.status')}
          </label>
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{t('approvals.all_status')}</option>
            <option value="submitted">{t('approvals.by_approve')}</option>
            <option value="approved">{t('dashboard.approved')}</option>
            <option value="rejected">{t('dashboard.rejected')}</option>
            <option value="draft">{t('approvals.drafts')}</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {t('dashboard.from')}
          </label>
          <input 
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {t('dashboard.to')}
          </label>
          <input 
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button 
          onClick={() => {
            setStatusFilter('submitted');
            setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
            setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
            setPagination({ ...pagination, page: 1 });
          }}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          {t('dashboard.clear')}
        </button>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-primary text-white p-4 rounded-2xl shadow-lg flex items-center justify-between sticky bottom-8 z-40"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {selectedIds.length}
              </div>
              <div>
                <p className="font-bold">{t('approvals.bulk_actions')}</p>
                <p className="text-xs opacity-80">{t('approvals.entries_selected')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkAction('rejected')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> {t('approvals.reject')}
              </button>
              <button 
                onClick={() => handleBulkAction('approved')}
                disabled={bulkProcessing}
                className="px-6 py-2 bg-white text-primary hover:bg-gray-100 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t('approvals.approve_all')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 pb-12">
        {entries.length > 0 && statusFilter === 'submitted' && (
          <div className="flex items-center gap-2 px-4">
            <input 
              type="checkbox"
              checked={selectedIds.length === entries.filter(e => e.status === 'submitted').length && selectedIds.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-500 font-medium">{t('approvals.select_all')}</span>
          </div>
        )}
        {entries.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
            <Check className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="italic">{t('approvals.no_entries')}</p>
          </div>
        ) : (
          <>
            {entries.map((entry) => (
              <div key={entry.id} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${selectedIds.includes(entry.id) ? 'ring-2 ring-primary border-transparent' : ''}`}>
                <div className="flex items-start gap-4 flex-1">
                  {entry.status === 'submitted' && (
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="mt-1.5 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-gray-900">{entry.user_name}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                      
                      {/* Status Badge */}
                      {entry.status === 'approved' && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 whitespace-nowrap"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-approved), transparent 85%)`, color: `var(--color-approved)`, borderColor: `color-mix(in srgb, var(--color-approved), transparent 70%)` }}
                        >
                          <CheckCircle className="w-3 h-3" /> {t('tracker.approved')}
                        </span>
                      )}
                      {entry.status === 'rejected' && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 whitespace-nowrap"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-rejected), transparent 85%)`, color: `var(--color-rejected)`, borderColor: `color-mix(in srgb, var(--color-rejected), transparent 70%)` }}
                        >
                          <AlertCircle className="w-3 h-3" /> {t('dashboard.rejected')}
                        </span>
                      )}
                      {entry.status === 'submitted' && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 whitespace-nowrap"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-submitted), transparent 85%)`, color: `var(--color-submitted)`, borderColor: `color-mix(in srgb, var(--color-submitted), transparent 70%)` }}
                        >
                          <Send className="w-3 h-3" /> {t('approvals.by_approve')}
                        </span>
                      )}
                      {entry.status === 'draft' && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 whitespace-nowrap"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-draft), transparent 85%)`, color: `var(--color-draft)`, borderColor: `color-mix(in srgb, var(--color-draft), transparent 70%)` }}
                        >
                          <Clock className="w-3 h-3" /> {t('tracker.draft') ?? 'Borrador'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {entry.project_name}
                      </span>
                      <span className="text-xs font-medium text-gray-400">/</span>
                      <span className="text-xs font-medium text-gray-500">{entry.task_name}</span>
                    </div>

                    <p className="text-sm text-gray-600 flex items-start gap-2 text-justify break-all" title={entry.description}>
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-gray-300" />
                      <span className="flex-1">
                        {entry.description?.length > 200 ? entry.description.substring(0, 200) + '...' : entry.description}
                      </span>
                    </p>
                    
                    {entry.status === 'rejected' && entry.rejection_reason && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                        <strong>{t('approvals.reason')}:</strong> {entry.rejection_reason}
                      </p>
                    )}
                    {entry.approved_by_name && (
                      <p className="text-[10px] text-gray-400">
                        {t('approvals.reviewed_by')} {entry.approved_by_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{entry.hours}h</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('tracker.hours')}</p>
                  </div>

                  <div className="flex gap-2">
                    {entry.status === 'submitted' ? (
                      <>
                        <button 
                          onClick={() => handleAction(entry.id, 'rejected')}
                          disabled={processing === entry.id}
                          className="p-2 rounded-xl transition-all disabled:opacity-50 border shadow-sm hover:scale-105 active:scale-95"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-rejected), transparent 85%)`, color: `var(--color-rejected)`, borderColor: `color-mix(in srgb, var(--color-rejected), transparent 70%)` }}
                          title={t('approvals.reject')}
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => handleAction(entry.id, 'approved')}
                          disabled={processing === entry.id}
                          className="p-2 rounded-xl transition-all disabled:opacity-50 border shadow-sm hover:scale-105 active:scale-95"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-approved), transparent 85%)`, color: `var(--color-approved)`, borderColor: `color-mix(in srgb, var(--color-approved), transparent 70%)` }}
                          title={t('approvals.approve')}
                        >
                          {processing === entry.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        </button>
                      </>
                    ) : isAdmin && entry.status === 'approved' ? (
                      <button 
                        onClick={() => handleAction(entry.id, 'draft')}
                        disabled={processing === entry.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors border border-gray-100"
                        title={t('approvals.revert_draft')}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{t('approvals.revert_draft').split(' ')[0]}</span>
                      </button>
                    ) : null}
                    <button 
                      onClick={() => fetchLogs(entry.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                      title={t('tracker.history')}
                    >
                      <History className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination({ ...pagination, page })}
                limit={pagination.limit}
                onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
                totalItems={pagination.total}
              />
            </div>
          </>
        )}
      </div>

      {/* Audit Logs Modal */}
      <AnimatePresence>
        {showLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {t('tracker.logs')}
                </h3>
                <button 
                  onClick={() => setShowLogs(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {loadingLogs ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {logs.map((log, idx) => (
                      <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 last:border-0 pb-6 last:pb-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-primary"></div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-primary">
                              {log.to_status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {format(new Date(log.created_at), "d MMM, HH:mm:ss.SSS", { locale: es })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{log.comment || t('tracker.no_comments')}</p>
                          <p className="text-[10px] text-gray-400">{t('approvals.user')}: {log.user_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg">{modalConfig.title}</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600">{modalConfig.message}</p>
                {modalConfig.type === 'prompt' && (
                  <textarea
                    autoFocus
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    rows={3}
                    placeholder={modalConfig.placeholder}
                  />
                )}
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-200 bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  {modalConfig.cancelText || t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    if (modalConfig.type === 'prompt' && !promptValue.trim()) {
                      return; // Don't proceed if prompt is empty
                    }
                    modalConfig.action(modalConfig.type === 'prompt' ? promptValue : undefined);
                    setModalConfig({ ...modalConfig, isOpen: false });
                  }}
                  disabled={modalConfig.type === 'prompt' && !promptValue.trim()}
                  className={`px-4 py-2 text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${
                    modalConfig.isDestructive 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {modalConfig.confirmText || t('common.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Approvals;
