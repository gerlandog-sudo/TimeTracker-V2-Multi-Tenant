import React, { useEffect, useState } from 'react';
import { Plus, Briefcase, Target, DollarSign, Loader2, Filter, Trash2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { CircularProgress } from '../components/CircularProgress';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'primary'
  });

  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    client_id: '',
    name: '',
    budget_hours: '',
    budget_money: '',
    status: 'Activo'
  });

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        api.get('/projects?participating=true'),
        api.get('/clients?participating=true')
      ]);
      setProjects(Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : []));
      setClients(Array.isArray(clientsRes.data?.data) ? clientsRes.data.data : (Array.isArray(clientsRes.data) ? clientsRes.data : []));
    } catch (error) {
      console.error('Error fetching projects data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProject) {
        await api.put('/projects', {
          ...editingProject,
          budget_hours: parseFloat(editingProject.budget_hours) || 0,
          budget_money: parseFloat(editingProject.budget_money) || 0
        });
      } else {
        await api.post('/projects', {
          ...newProject,
          budget_hours: parseFloat(newProject.budget_hours) || 0,
          budget_money: parseFloat(newProject.budget_money) || 0
        });
      }
      notifySuccess(editingProject ? t('projects.updated_success', 'Proyecto actualizado correctamente') : t('projects.created_success', 'Proyecto creado correctamente'));
      setNewProject({ client_id: '', name: '', budget_hours: '', budget_money: '', status: 'Activo' });
      setEditingProject(null);
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving project:', error);
      notifyError(error.response?.data?.message || t('projects.error_save', 'Error al guardar el proyecto'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject({
      ...project,
      budget_hours: project.budget_hours.toString(),
      budget_money: project.budget_money.toString()
    });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('projects.delete_title'),
      message: t('projects.delete_confirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/projects/${id}`);
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          notifySuccess(t('projects.deleted_success', 'Proyecto eliminado correctamente'));
        } catch (error: any) {
          console.error('Error deleting project:', error);
          notifyError(error.response?.data?.message || t('projects.error_delete'));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-12 bg-gray-200 rounded-xl w-48"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>)}
    </div>
  </div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activo': return 'bg-green-100 text-green-700';
      case 'Pausado': return 'bg-amber-100 text-amber-700';
      case 'Facturado': return 'bg-blue-100 text-blue-700';
      case 'Finalizado': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${confirmModal.type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="p-4 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 shadow-sm ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('projects.title')}</h1>
          <p className="text-gray-500">{t('projects.subtitle')}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t('projects.active')}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t('projects.paused')}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t('projects.billed')}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{t('projects.finished')}</span>
          </div>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> {t('projects.new_project')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => handleEdit(project)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                  {(() => {
                    const s = (project.status || '').toLowerCase();
                    if (s === 'activo') return t('projects.active');
                    if (s === 'pausado') return t('projects.paused');
                    if (s === 'facturado') return t('projects.billed');
                    if (s === 'finalizado') return t('projects.finished');
                    return project.status;
                  })()}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2 truncate max-w-[200px]" title={project.name}>
                  {project.name.length > 50 ? project.name.substring(0, 50) + '...' : project.name}
                </h3>
                <p className="text-sm text-gray-500 truncate max-w-[200px]" title={project.client_name}>
                  {project.client_name?.length > 50 ? project.client_name.substring(0, 50) + '...' : project.client_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Briefcase className="w-6 h-6" />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('projects.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`grid ${hasPermission('costs') ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-6 pt-6 border-t border-gray-50`}>
              <div className="flex items-center gap-4">
                <CircularProgress 
                  value={project.actual_hours} 
                  max={project.budget_hours} 
                  colorClass={(project.actual_hours / project.budget_hours) > 1 ? 'text-red-500' : (project.actual_hours / project.budget_hours) > 0.8 ? 'text-amber-500' : 'text-blue-500'}
                />
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-1 justify-end">
                    <Target className="w-3 h-3 text-blue-500" />
                    <p className="text-[10px] text-gray-400 uppercase font-bold text-right">{t('clients.hours')}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 text-right">{project.actual_hours} / {project.budget_hours}h</p>
                </div>
              </div>

              {hasPermission('costs') && (
                <div className="flex items-center gap-4">
                  <CircularProgress 
                    value={project.actual_revenue || 0} 
                    max={project.budget_money || 0} 
                    colorClass={((project.actual_revenue || 0) / (project.budget_money || 1)) > 1 ? 'text-red-500' : ((project.actual_revenue || 0) / (project.budget_money || 1)) > 0.8 ? 'text-amber-500' : 'text-green-500'}
                  />
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1 justify-end">
                      <DollarSign className="w-3 h-3 text-green-500" />
                      <p className="text-[10px] text-gray-400 uppercase font-bold text-right">{t('clients.budget')}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 text-right">{project.actual_revenue !== undefined ? formatCurrency(project.actual_revenue) : '---'} / {project.budget_money !== undefined ? formatCurrency(project.budget_money) : '---'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            {hasPermission('costs') && (
              <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold text-right">Costo Real</p>
                  <p className="text-sm font-bold text-red-600 text-right">
                    {project.actual_cost !== undefined ? formatCurrency(project.actual_cost) : '---'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold text-right">Margen Estimado</p>
                  <p className={`text-sm font-bold text-right ${project.actual_revenue !== undefined && project.actual_cost !== undefined ? (project.actual_revenue - project.actual_cost >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                    {project.actual_revenue !== undefined && project.actual_cost !== undefined ? formatCurrency(project.actual_revenue - project.actual_cost) : '---'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProject ? t('projects.edit_project') : t('projects.new_project')}
              </h3>
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setEditingProject(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.client')}</label>
                <select 
                  required
                  value={editingProject ? editingProject.client_id : newProject.client_id}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, client_id: e.target.value})
                    : setNewProject({...newProject, client_id: e.target.value})
                  }
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">{t('projects.select_client')}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.name')}</label>
                <input 
                  required
                  type="text"
                  maxLength={200}
                  value={editingProject ? editingProject.name : newProject.name}
                  onChange={(e) => editingProject
                    ? setEditingProject({...editingProject, name: e.target.value.substring(0, 200)})
                    : setNewProject({...newProject, name: e.target.value.substring(0, 200)})
                  }
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className={hasPermission('costs') ? "grid grid-cols-2 gap-4" : ""}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.budget_hours')}</label>
                  <input 
                    type="number"
                    value={editingProject ? editingProject.budget_hours : newProject.budget_hours}
                    onChange={(e) => editingProject 
                      ? setEditingProject({...editingProject, budget_hours: e.target.value})
                      : setNewProject({...newProject, budget_hours: e.target.value})
                    }
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-right"
                  />
                </div>
                {hasPermission('costs') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.budget_money')}</label>
                    <input 
                      type="number"
                      value={editingProject ? editingProject.budget_money : newProject.budget_money}
                      onChange={(e) => editingProject
                        ? setEditingProject({...editingProject, budget_money: e.target.value})
                        : setNewProject({...newProject, budget_money: e.target.value})
                      }
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-right"
                    />
                  </div>
                )}
              </div>

              {editingProject && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.status')}</label>
                  <select 
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({...editingProject, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="Activo">{t('projects.active')}</option>
                    <option value="Pausado">{t('projects.paused')}</option>
                    <option value="Facturado">{t('projects.billed')}</option>
                    <option value="Finalizado">{t('projects.finished')}</option>
                  </select>
                </div>
              )}
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingProject(null);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProject ? <Briefcase className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                  {editingProject ? t('common.save') : t('projects.new_project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
