import React, { useEffect, useState, useRef } from 'react';
import { Plus, Clock, Calendar as CalendarIcon, Loader2, Check, X, Send, Edit2, Trash2, History } from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from '../components/Pagination';
import { useNotification } from '../context/NotificationContext';

const TimeTracker: React.FC = () => {
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const projectSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // Foco inicial al cargar para registro rápido
    if (!editingId) {
      setTimeout(() => projectSelectRef.current?.focus(), 500);
    }
  }, [editingId]);


  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [newEntry, setNewEntry] = useState({
    project_id: '',
    task_id: '',
    description: '',
    hours: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const formatDateSafely = (dateString: string) => {
    if (!dateString) return '-';
    // Extract YYYY-MM-DD safely
    const datePart = dateString.split('T')[0].split(' ')[0];
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  };

  const fetchData = async () => {
    try {
      const [entriesRes, projectsRes, metaRes] = await Promise.all([
        api.get(`/time-entries?page=${pagination.page}&limit=${pagination.limit}`),
        api.get('/projects'),
        api.get('/metadata')
      ]);
      
      const entriesData = entriesRes.data;
      if (entriesData && entriesData.data) {
        setEntries(entriesData.data);
        setPagination(prev => ({
          ...prev,
          total: entriesData.total,
          totalPages: entriesData.totalPages
        }));
      } else {
        setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
      }

      setProjects(Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : []));
      setTasks(Array.isArray(metaRes.data?.tasks) ? metaRes.data.tasks : []);
    } catch (error) {
      console.error('Error fetching tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.project_id || !newEntry.task_id || !newEntry.hours || !newEntry.description) {
      notifyError(t('tracker.incomplete'));
      return;
    }

    const hoursToSubmit = parseFloat(newEntry.hours) || 0;
    
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put('/time-entries', {
          ...newEntry,
          id: editingId,
          hours: hoursToSubmit
        });
        setEditingId(null);
      } else {
        await api.post('/time-entries', {
          ...newEntry,
          hours: hoursToSubmit
        });
      }
      notifySuccess(editingId ? t('tracker.updated_success', 'Registro actualizado') : t('tracker.created_success', 'Registro creado'));
      setNewEntry({
        project_id: '',
        task_id: '',
        description: '',
        hours: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchData();
    } catch (error: any) {
      console.error('Error submitting time entry:', error);
      notifyError(error.response?.data?.message || t('common.save_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEntry = async (id: number) => {
    try {
      await api.patch(`/time-entries/${id}/submit`);
      fetchData();
      notifySuccess(t('tracker.submitted_success', 'Enviado a aprobación'));
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      notifyError(error.response?.data?.message || t('tracker.error_submit'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/time-entries/${id}`);
      setShowDeleteConfirm(null);
      fetchData();
      notifySuccess(t('tracker.deleted_success', 'Registro eliminado'));
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      notifyError(error.response?.data?.message || t('tracker.error_delete'));
    }
  };

  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const hoursInput = document.getElementById('hours-input');
        if (hoursInput) {
          hoursInput.focus();
          hoursInput.classList.add('ring-4', 'ring-primary/40', 'bg-primary/5');
          setTimeout(() => {
            hoursInput.classList.remove('ring-4', 'ring-primary/40', 'bg-primary/5');
          }, 1500);
        }
      }, 100);
    }
  }, [editingId]);

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    
    // Extract YYYY-MM-DD safely to avoid timezone shifts
    let safeDate = format(new Date(), 'yyyy-MM-dd');
    if (entry.date) {
      const datePart = entry.date.split('T')[0].split(' ')[0];
      safeDate = datePart;
    }

    setNewEntry({
      project_id: entry.project_id ? entry.project_id.toString() : '',
      task_id: entry.task_id ? entry.task_id.toString() : '',
      description: entry.description || '',
      hours: entry.hours ? entry.hours.toString() : '',
      date: safeDate
    });
  };

  const fetchLogs = async (id: number) => {
    setLoadingLogs(true);
    setShowLogs(id);
    try {
      const response = await api.get('/time-entries/' + id + '/logs');
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-40 bg-gray-200 rounded-2xl"></div>
    <div className="h-96 bg-gray-200 rounded-2xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('tracker.title')}</h1>
        <p className="text-gray-500">{t('tracker.subtitle')}</p>
      </div>

      {/* New Entry Form */}
      {(!isAdmin || editingId) ? (
        <div ref={formRef} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{editingId ? t('tracker.edit_entry') : t('tracker.new_entry')}</h3>
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewEntry({
                    project_id: '',
                    task_id: '',
                    description: '',
                    hours: '',
                    date: format(new Date(), 'yyyy-MM-dd')
                  });
                }}
                className="text-xs text-red-500 hover:underline"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('tracker.project')}</label>
                <select 
                  ref={projectSelectRef}
                  value={newEntry.project_id}
                  onChange={(e) => setNewEntry({...newEntry, project_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {projects
                    .filter(p => p.status === 'Activo')
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('tracker.task')}</label>
                <select 
                  value={newEntry.task_id}
                  onChange={(e) => setNewEntry({...newEntry, task_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('tracker.hours')}</label>
                  <input 
                    id="hours-input"
                    type="number"
                    step="0.5"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({...newEntry, hours: e.target.value})}
                    placeholder="0.0"
                    className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all duration-300 text-right ${editingId ? 'ring-2 ring-indigo-500 animate-pulse' : ''}`}
                    required
                  />
                  {(() => {
                    const h = parseFloat(newEntry.hours) || 0;
                    const dateEntries = entries.filter(entry => {
                      const entryDate = entry.date ? entry.date.split('T')[0].split(' ')[0] : '';
                      return entryDate === newEntry.date && entry.id !== editingId;
                    });
                    const total = dateEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0) + h;
                    if (total > 8) {
                      return (
                        <p className="text-[10px] text-rose-400 mt-1 font-medium animate-pulse">
                          {t('tracker.warnings_8h')} ({total}h)
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('tracker.date')}</label>
                  <input 
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('tracker.description')}</label>
                <textarea 
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({...newEntry, description: e.target.value.substring(0, 200)})}
                  placeholder="?"
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                  required
                />
                <div className="text-right mt-1">
                  <span className="text-[10px] text-gray-400">{newEntry.description.length}/200</span>
                </div>
              </div>
              <div className="w-full md:w-48">
                <label className="hidden md:block text-xs font-semibold text-gray-500 uppercase mb-1">&nbsp;</label>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 h-[52px]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                  {editingId ? t('common.save') : t('tracker.new_entry')}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-700 text-sm flex items-center gap-3">
          <Clock className="w-5 h-5" />
          {t('tracker.admin_no_track')}
        </div>
      )}

      {/* Entries List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{t('tracker.history')}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarIcon className="w-4 h-4" />
            <span>{format(new Date(), "MMMM yyyy", { locale: es })}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">{t('tracker.date')}</th>
                <th className="px-6 py-3">{t('tracker.project')}</th>
                <th className="px-6 py-3">{t('tracker.task')}</th>
                <th className="px-6 py-3">{t('tracker.description')}</th>
                <th className="px-6 py-3 text-right">{t('tracker.hours')}</th>
                <th className="px-6 py-3 text-center">{t('common.status')}</th>
                <th className="px-6 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    {t('tracker.no_entries')}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateSafely(entry.date)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{entry.project_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {entry.task_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]" title={entry.description}>
                      {entry.description.length > 15 ? entry.description.substring(0, 15) + '...' : entry.description}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {entry.hours}h
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {entry.status === 'approved' && (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-approved), transparent 85%)`, color: `var(--color-approved)` }}
                            >
                              <Check className="w-3 h-3 mr-1" /> {t('tracker.approved')}
                            </span>
                            {entry.approved_by_name && (
                              <span className="text-[10px] text-gray-400">{t('common.by')} {entry.approved_by_name}</span>
                            )}
                          </>
                        )}
                        {entry.status === 'submitted' && (
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                            style={{ backgroundColor: `color-mix(in srgb, var(--color-submitted), transparent 85%)`, color: `var(--color-submitted)` }}
                          >
                            <Send className="w-3 h-3 mr-1" /> {t('tracker.send_approval')}
                          </span>
                        )}
                        {(entry.status === 'draft' || entry.status === 'pending' || entry.status === '') && (
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                            style={{ backgroundColor: `color-mix(in srgb, var(--color-draft), transparent 85%)`, color: `var(--color-draft)` }}
                          >
                            <Clock className="w-3 h-3 mr-1" /> {t('tracker.draft') ?? 'Borrador'}
                          </span>
                        )}
                        {entry.status === 'rejected' && (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap" 
                              title={entry.rejection_reason}
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-rejected), transparent 85%)`, color: `var(--color-rejected)` }}
                            >
                              <X className="w-3 h-3 mr-1" /> {t('dashboard.rejected')}
                            </span>
                            {entry.approved_by_name && (
                              <span className="text-[10px] text-gray-400">{t('common.by')} {entry.approved_by_name}</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(entry.status === 'draft' || entry.status === 'pending' || entry.status === 'rejected') && (
                          <button 
                            onClick={() => handleSubmitEntry(entry.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('tracker.send_approval')}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(entry.status === 'draft' || entry.status === 'pending' || entry.status === 'rejected' || isAdmin) && (
                          <>
                            <button 
                              onClick={() => handleEdit(entry)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(entry.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => fetchLogs(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={t('tracker.history')}
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                    {logs.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">{t('dashboard.no_data')}</p>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 last:border-0 pb-6 last:pb-0">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-primary"></div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase text-primary">
                                {log.to_status}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {format(new Date(log.created_at), "d MMM, HH:mm:ss", { locale: es })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">{log.comment || t('tracker.no_comments')}</p>
                            <p className="text-[10px] text-gray-400">{t('approvals.user')}: {log.user_name}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('common.delete')}?</h3>
              <p className="text-gray-500 mb-6">{t('tracker.delete_confirm')}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimeTracker;
