import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, Palette, Image as ImageIcon, Globe, Upload, X, AlertCircle, Users, Edit2, Trash2, Plus, AlertTriangle, Volume2, VolumeX, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { Pagination } from '../components/Pagination';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { config, permissions, refreshConfig, soundEnabled, setSoundEnabled, user } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [formData, setFormData] = useState(config);
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'positions' | 'costs' | 'tasks'>('general');
  const [positions, setPositions] = useState<{id: number, name: string}[]>([]);
  const [tasks, setTasks] = useState<{id: number, name: string}[]>([]);
  const [positionCosts, setPositionCosts] = useState<{id: number, position_id: number, position_name: string, seniority: string, hourly_cost: number}[]>([]);
  
  // Pagination State
  const [posPagination, setPosPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [taskPagination, setTaskPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [costPagination, setCostPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [newPosition, setNewPosition] = useState('');
  const [newCost, setNewCost] = useState({ id: null as number | null, position_id: '', seniority: '', hourly_cost: '' });
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{id: number, name: string} | null>(null);
  const [posName, setPosName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [editingPos, setEditingPos] = useState<{id: number, name: string} | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCostsData = async () => {
    try {
      const [posRes, costsRes] = await Promise.all([
        api.get('/positions'),
        api.get(`/position-costs?page=${costPagination.page}&limit=${costPagination.limit}`)
      ]);
      setPositions(Array.isArray(posRes.data?.data) ? posRes.data.data : (Array.isArray(posRes.data) ? posRes.data : []));
      
      const costsData = costsRes.data;
      if (costsData && costsData.data) {
        setPositionCosts(costsData.data);
        setCostPagination(prev => ({
          ...prev,
          total: costsData.total,
          totalPages: costsData.totalPages
        }));
      } else {
        setPositionCosts(Array.isArray(costsRes.data) ? costsRes.data : []);
      }
    } catch (err) {
      console.error(err);
      setPositions([]);
      setPositionCosts([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'positions') fetchPositions();
    if (activeTab === 'tasks') fetchTasks();
    if (activeTab === 'costs') {
      fetchCostsData();
    }
  }, [activeTab, posPagination.page, posPagination.limit, taskPagination.page, taskPagination.limit, costPagination.page, costPagination.limit]);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks?page=${taskPagination.page}&limit=${taskPagination.limit}`);
      const taskData = res.data;
      if (taskData && taskData.data) {
        setTasks(taskData.data);
        setTaskPagination(prev => ({
          ...prev,
          total: taskData.total,
          totalPages: taskData.totalPages
        }));
      } else {
        setTasks(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error(err);
      setTasks([]);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await api.get(`/positions?page=${posPagination.page}&limit=${posPagination.limit}`);
      const posData = res.data;
      if (posData && posData.data) {
        setPositions(posData.data);
        setPosPagination(prev => ({
          ...prev,
          total: posData.total,
          totalPages: posData.totalPages
        }));
      } else {
        setPositions(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) { 
      console.error(err);
      setPositions([]);
    }
  };

  const fetchPositionCosts = async () => {
    try {
      const res = await api.get(`/position-costs?page=${costPagination.page}&limit=${costPagination.limit}`);
      const costsData = res.data;
      if (costsData && costsData.data) {
        setPositionCosts(costsData.data);
        setCostPagination(prev => ({
          ...prev,
          total: costsData.total,
          totalPages: costsData.totalPages
        }));
      } else {
        setPositionCosts(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) { 
      console.error(err);
      setPositionCosts([]);
    }
  };

  const handleAddPosition = async () => {
    if (!posName) return;
    setError(null);
    try {
      if (editingPos) {
        await api.put('/positions', { id: editingPos.id, name: posName });
      } else {
        await api.post('/positions', { name: posName });
      }
      setPosName('');
      setEditingPos(null);
      setIsPosModalOpen(false);
      fetchPositions();
      notifySuccess(editingPos ? t('config.pos_updated', 'Posición actualizada correctamente') : t('config.pos_created', 'Posición creada correctamente'));
    } catch (err: any) { 
      console.error(err);
      notifyError(err.response?.data?.message || t('config.error_process_position'));
    }
  };

  const openPosModal = (pos: {id: number, name: string} | null = null) => {
    if (pos) {
      setEditingPos(pos);
      setPosName(pos.name);
    } else {
      setEditingPos(null);
      setPosName('');
    }
    setIsPosModalOpen(true);
  };

  const handleAddTask = async () => {
    if (!taskName) return;
    setError(null);
    try {
      if (editingTask) {
        await api.put('/tasks', { id: editingTask.id, name: taskName });
      } else {
        await api.post('/tasks', { name: taskName });
      }
      setTaskName('');
      setEditingTask(null);
      setIsTaskModalOpen(false);
      fetchTasks();
      notifySuccess(editingTask ? t('config.task_updated', 'Tarea actualizada correctamente') : t('config.task_created', 'Tarea creada correctamente'));
    } catch (err: any) {
      console.error(err);
      notifyError(err.response?.data?.message || t('config.error_process_task'));
    }
  };

  const openTaskModal = (task: {id: number, name: string} | null = null) => {
    if (task) {
      setEditingTask(task);
      setTaskName(task.name);
    } else {
      setEditingTask(null);
      setTaskName('');
    }
    setIsTaskModalOpen(true);
  };

  const handleAddCost = async () => {
    if (!newCost.position_id || !newCost.seniority || !newCost.hourly_cost) return;
    try {
      if (newCost.id) {
        await api.put('/position-costs', newCost);
      } else {
        await api.post('/position-costs', newCost);
      }
      setNewCost({ id: null, position_id: '', seniority: '', hourly_cost: '' });
      setIsCostModalOpen(false);
      fetchPositionCosts();
    } catch (err) { console.error(err); }
  };

  const openCostModal = (cost: any = null) => {
    if (cost) {
      setNewCost({
        id: cost.id,
        position_id: cost.position_id.toString(),
        seniority: cost.seniority,
        hourly_cost: cost.hourly_cost.toString()
      });
    } else {
      setNewCost({ id: null, position_id: '', seniority: '', hourly_cost: '' });
    }
    setIsCostModalOpen(true);
  };

  const handleDeleteItem = (type: 'positions' | 'position-costs' | 'tasks', id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('config.delete_title'),
      message: t('config.delete_message'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/${type}/${id}`);
          if (type === 'positions') fetchPositions();
          else if (type === 'tasks') fetchTasks();
          else fetchPositionCosts();
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) { 
          console.error(err);
          const msg = err.response?.data?.message || t('config.error_delete');
          setError(msg);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => setError(null), 5000);
        }
      }
    });
  };

  const DEFAULT_COLORS = {
    primary_color: '#3b82f6',
    secondary_color: '#1f2937',
    accent_color: '#3b82f6',
    sidebar_bg: '#ffffff',
    sidebar_text: '#1f2937',
    color_approved: '#3b82f6',
    color_rejected: '#ef4444',
    color_submitted: '#eab308',
    color_draft: '#9ca3af',
  };

  useEffect(() => {
    setFormData(config);
  }, [config]);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const handleResetColors = () => {
    setFormData({
      ...formData,
      ...DEFAULT_COLORS
    });
  };

  const roleIdMap: Record<string, number> = {
    admin: 1,
    'c-level': 2,
    commercial: 3,
    staff: 4
  };

  const handlePermissionChange = (role_id: number, feature: string, can_access: number) => {
    setLocalPermissions(prev => {
      const currentPerms = Array.isArray(prev) ? prev : [];
      const exists = currentPerms.some(p => Number(p.role_id) === role_id && p.feature === feature);
      if (exists) {
        return currentPerms.map(p => Number(p.role_id) === role_id && p.feature === feature ? { ...p, can_access } : p);
      } else {
        return [...currentPerms, { role_id, feature, can_access }];
      }
    });
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    setError(null);
    try {
      const permsToSave = Array.isArray(localPermissions) ? localPermissions : [];
      // Save all permissions
      await Promise.all(permsToSave.map(p => 
        api.post('/permissions', { role_id: p.role_id, feature: p.feature, can_access: p.can_access })
      ));
      await refreshConfig();
      notifySuccess(t('config.save_success'));
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Error al guardar los permisos.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        setError('La imagen es demasiado grande. El límite es 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo_url: reader.result as string });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await api.post('/config', formData);
      await refreshConfig();
      notifySuccess(t('config.save_success'));
    } catch (err: any) {
      console.error('Error saving settings:', err);
      notifyError(err.response?.data?.message || t('config.error_save'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Global Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] max-w-md w-full bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {t('config.cancel')}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 shadow-sm ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {t('config.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabs - Solo mostrar si no es Super Admin o si hay más de una pestaña */}
      {!(user?.is_super_admin === true || user?.is_super_admin === 1 || user?.is_super_admin === "1") && (
        <div className="flex gap-2 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('config.tab_general')}
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('config.tab_permissions')}
          </button>
          <button 
            onClick={() => setActiveTab('positions')}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'positions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('config.tab_positions')}
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('config.tab_tasks')}
          </button>
          <button 
            onClick={() => setActiveTab('costs')}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'costs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('config.tab_costs')}
          </button>
        </div>
      )}

      {activeTab === 'general' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* General Section */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> General
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('config.company_name')}
                  </label>
                  <input 
                    type="text"
                    maxLength={200}
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value.substring(0, 200)})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Mi Empresa S.A."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('config.base_currency')}</label>
                  <select 
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="USD">{t('config.currency_usd')}</option>
                    <option value="ARS">{t('config.currency_ars')}</option>
                    <option value="EUR">{t('config.currency_eur')}</option>
                  </select>
                </div>
              </div>

              {/* Sound Settings Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${formData.sound_enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                    {formData.sound_enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t('config.sound_effects', 'Efectos de Sonido')}</p>
                    <p className="text-xs text-gray-500">{t('config.sound_desc', 'Reproducir un sonido sutil al recibir notificaciones.')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sound_enabled: !formData.sound_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.sound_enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.sound_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </section>

            <div className="h-[2px] bg-gray-200" />

            {/* Logo Section */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" /> {t('config.visual_identity')}
              </h2>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-4 w-full">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.company_logo')}</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> {t('config.upload_image')}
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: null })}
                        className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> {t('config.remove')}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 italic">{t('config.logo_hint')}</p>
                </div>
                <div className="w-full md:w-48 h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Preview" className="max-h-full max-w-full object-contain p-4" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{t('config.no_logo')}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="h-[2px] bg-gray-200" />

            {/* Colors Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" /> {t('config.platform_colors')}
                </h2>
                <button 
                  type="button"
                  onClick={handleResetColors}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('config.reset_colors')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.primary_color')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.secondary_color')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.accent_color')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Sidebar BG */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.sidebar_bg')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.sidebar_bg}
                      onChange={(e) => setFormData({...formData, sidebar_bg: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.sidebar_bg}
                      onChange={(e) => setFormData({...formData, sidebar_bg: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Sidebar Text */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.sidebar_text')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.sidebar_text}
                      onChange={(e) => setFormData({...formData, sidebar_text: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.sidebar_text}
                      onChange={(e) => setFormData({...formData, sidebar_text: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-[2px] bg-gray-200" />

            {/* Status Colors Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" /> {t('config.tracker_colors')}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Approved Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.color_approved')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.color_approved}
                      onChange={(e) => setFormData({...formData, color_approved: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.color_approved}
                      onChange={(e) => setFormData({...formData, color_approved: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Submitted Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.color_submitted')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.color_submitted}
                      onChange={(e) => setFormData({...formData, color_submitted: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.color_submitted}
                      onChange={(e) => setFormData({...formData, color_submitted: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Rejected Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.color_rejected')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.color_rejected}
                      onChange={(e) => setFormData({...formData, color_rejected: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.color_rejected}
                      onChange={(e) => setFormData({...formData, color_rejected: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Draft Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('config.color_draft')}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.color_draft}
                      onChange={(e) => setFormData({...formData, color_draft: e.target.value})}
                      className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData.color_draft}
                      onChange={(e) => setFormData({...formData, color_draft: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {success && (
                <span className="text-sm font-medium text-green-600 flex items-center gap-1 animate-bounce">
                  <Save className="w-4 h-4" /> {t('config.save_success')}
                </span>
              )}
              {error && (
                <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {error}
                </span>
              )}
              <p className="text-xs text-gray-400">{t('config.apply_global')}</p>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('profile.save_changes')}
            </button>
          </div>
        </form>
      ) : activeTab === 'permissions' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                  <Users className="w-6 h-6 text-primary" />
                  <h3>{t('config.role_access')}</h3>
                </div>
                <p className="text-sm text-gray-500 font-medium">{t('config.role_desc')}</p>
              </div>
              <button 
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {savingPermissions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {t('config.save_permissions')}
              </button>
            </div>
            
            <div className="overflow-x-auto -mx-8">
              <table className="w-full text-left border-collapse border-y border-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 min-w-[240px]">
                      {t('config.feature')}
                    </th>
                    {[
                      { id: 1, name: 'ADMINISTRATOR', color: 'text-red-600 bg-red-50' },
                      { id: 2, name: 'C-LEVEL', color: 'text-indigo-600 bg-indigo-50' },
                      { id: 3, name: 'PM / COMMERCIAL', color: 'text-blue-600 bg-blue-50' },
                      { id: 4, name: 'STAFF', color: 'text-emerald-600 bg-emerald-50' }
                    ].map(role => (
                      <th key={role.id} className="p-6 text-center border-b border-gray-100">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${role.color}`}>
                          {role.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { id: 'dashboard', name: t('config.permissions.dashboard'), group: 'Operaciones' },
                    { id: 'kanban', name: t('config.permissions.kanban'), group: 'Operaciones' },
                    { id: 'tracker', name: t('config.permissions.tracker'), group: 'Operaciones' },
                    { id: 'approvals', name: t('config.permissions.approvals'), group: 'Operaciones' },
                    { id: 'projects', name: t('config.permissions.projects'), group: 'Gestión' },
                    { id: 'clients', name: t('config.permissions.clients'), group: 'Gestión' },
                    { id: 'costs', name: t('config.permissions.costs'), group: 'Finanzas' },
                    { id: 'report_heatmaps', name: t('config.permissions.report_heatmaps'), group: 'Reportes' },
                    { id: 'report_audit', name: t('config.permissions.report_audit'), group: 'Reportes' },
                    { id: 'report_ai', name: t('config.permissions.report_ai'), group: 'Reportes' },
                    { id: 'report_custom', name: t('config.permissions.report_custom'), group: 'Reportes' },
                    { id: 'users', name: t('config.permissions.users'), group: 'Sistema' },
                    { id: 'settings', name: t('config.permissions.settings'), group: 'Sistema' },
                  ].map((feature, idx, array) => {
                    const isNewGroup = idx === 0 || feature.group !== array[idx - 1].group;
                    
                    return (
                      <React.Fragment key={feature.id}>
                        {isNewGroup && (
                          <tr className="bg-gray-50/30">
                            <td colSpan={5} className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                              {feature.group}
                            </td>
                          </tr>
                        )}
                        <tr className="group hover:bg-primary/[0.02] transition-colors">
                          <td className="p-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 leading-none mb-1 group-hover:text-primary transition-colors">
                                {feature.name}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tight">
                                ID: {feature.id}
                              </span>
                            </div>
                          </td>
                          {[1, 2, 3, 4].map(roleId => {
                            const perms = Array.isArray(localPermissions) ? localPermissions : [];
                            const perm = perms.find(p => Number(p.role_id) === roleId && p.feature === feature.id);
                            const isChecked = perm ? Number(perm.can_access) === 1 : false;
                            const isDisabled = roleId === 1;

                            return (
                              <td key={`${roleId}-${feature.id}`} className="p-6 text-center">
                                <div className="flex justify-center">
                                  <label className="relative flex items-center cursor-pointer group/check">
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onChange={(e) => handlePermissionChange(roleId, feature.id, e.target.checked ? 1 : 0)}
                                      className="peer sr-only"
                                    />
                                    <div className="w-6 h-6 bg-gray-100 border-2 border-gray-200 rounded-lg transition-all duration-200 peer-checked:bg-primary peer-checked:border-primary peer-disabled:opacity-40 flex items-center justify-center group-hover/check:border-primary/50">
                                      <Save className={`w-3.5 h-3.5 text-white transition-transform duration-200 scale-0 peer-checked:scale-100`} />
                                    </div>
                                    {isDisabled && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                      </div>
                                    )}
                                  </label>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-8 flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary/80 leading-relaxed font-medium">
                {t('config.admin_hint')} <br />
                <span className="opacity-70 italic font-normal">{t('config.apply_to_all')}</span>
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'positions' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">{t('config.tab_positions')}</h3>
            <button 
              onClick={() => openPosModal()}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" /> {t('config.new_position')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('config.position_name')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">{t('config.no_positions')}</td>
                  </tr>
                ) : (
                  positions.map(pos => (
                    <tr key={pos.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 w-16">#{pos.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {pos.name}
                      </td>
                      <td className="px-6 py-4 text-right w-24">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openPosModal(pos)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem('positions', pos.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
            currentPage={posPagination.page}
            totalPages={posPagination.totalPages}
            onPageChange={(page) => setPosPagination({ ...posPagination, page })}
            limit={posPagination.limit}
            onLimitChange={(limit) => setPosPagination({ ...posPagination, limit, page: 1 })}
            totalItems={posPagination.total}
          />

          {/* Modal para Cargos */}
          {isPosModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsPosModalOpen(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingPos ? t('config.edit_position') : t('config.new_position')}
                  </h3>
                  <button onClick={() => setIsPosModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('config.position_name')}</label>
                    <input 
                      type="text" 
                      maxLength={200}
                      value={posName}
                      onChange={(e) => setPosName(e.target.value.substring(0, 200))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ej: Senior Developer"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setIsPosModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={handleAddPosition}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                    >
                      {editingPos ? t('common.save') : t('config.create_position', 'Crear Cargo')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'tasks' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold">{t('config.tab_tasks')}</h3>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => openTaskModal()}
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" /> {t('config.new_task')}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('config.task_name')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">{t('config.no_tasks')}</td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 w-16">#{task.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {task.name}
                      </td>
                      <td className="px-6 py-4 text-right w-24">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openTaskModal(task)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem('tasks', task.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
            currentPage={taskPagination.page}
            totalPages={taskPagination.totalPages}
            onPageChange={(page) => setTaskPagination({ ...taskPagination, page })}
            limit={taskPagination.limit}
            onLimitChange={(limit) => setTaskPagination({ ...taskPagination, limit, page: 1 })}
            totalItems={taskPagination.total}
          />

          {/* Modal para Tareas */}
          {isTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsTaskModalOpen(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingTask ? t('config.edit_task') : t('config.new_task')}
                  </h3>
                  <button onClick={() => setIsTaskModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('config.task_name')}</label>
                    <input 
                      type="text" 
                      maxLength={200}
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value.substring(0, 200))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ej: Desarrollo Frontend"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setIsTaskModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={handleAddTask}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                    >
                      {editingTask ? t('common.save') : t('config.create_task', 'Crear Tarea')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">{t('config.tab_costs')}</h3>
            <button 
              onClick={() => openCostModal()}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" /> {t('config.new_rate')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('config.position')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('config.seniority')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('config.hourly_cost')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positionCosts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">{t('config.no_rates', 'No hay tarifas definidas')}</td>
                  </tr>
                ) : (
                  positionCosts.map(pc => (
                    <tr key={pc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700">{pc.position_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{pc.seniority}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 font-bold text-right">{formatCurrency(pc.hourly_cost)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openCostModal(pc)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem('position-costs', pc.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
            currentPage={costPagination.page}
            totalPages={costPagination.totalPages}
            onPageChange={(page) => setCostPagination({ ...costPagination, page })}
            limit={costPagination.limit}
            onLimitChange={(limit) => setCostPagination({ ...costPagination, limit, page: 1 })}
            totalItems={costPagination.total}
          />

          {/* Modal para Costos */}
          {isCostModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsCostModalOpen(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {newCost.id ? t('config.edit_rate') : t('config.new_rate')}
                  </h3>
                  <button onClick={() => setIsCostModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('config.position')}</label>
                    <select 
                      value={newCost.position_id}
                      onChange={(e) => setNewCost({...newCost, position_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">{t('reports.select_position')}</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('config.seniority')}</label>
                    <select 
                      value={newCost.seniority}
                      onChange={(e) => setNewCost({...newCost, seniority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">{t('users.select_seniority')}</option>
                      <option value="Junior">Junior</option>
                      <option value="Semi-Senior">Semi-Senior</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('config.hourly_cost')}</label>
                    <input 
                      type="number" 
                      value={newCost.hourly_cost}
                      onChange={(e) => setNewCost({...newCost, hourly_cost: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-right"
                      placeholder="Ej: 50"
                    />
                    <p className="text-[10px] text-gray-400 italic">{t('config.rate_hint', 'Este es el valor que se le cobra al cliente por hora de este perfil.')}</p>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setIsCostModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={handleAddCost}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                    >
                      {newCost.id ? t('common.save') : t('config.create_rate', 'Crear Tarifa')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;