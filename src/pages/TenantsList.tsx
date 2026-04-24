import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Save, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  ShieldCheck, 
  Globe, 
  Palette,
  Check,
  Loader2,
  PlayCircle,
  PauseCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useNotification } from '../context/NotificationContext';

const TenantsList: React.FC = () => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    id: null as number | null,
    name: '',
    domain: '',
    status: 'active',
    // Config Visual
    logo_url: '',
    primary_color: '#4f46e5',
    secondary_color: '#0f172a',
    accent_color: '#06b6d4',
    sidebar_bg: '#f8fafc',
    sidebar_text: '#334155',
    color_approved: '#10b981',
    color_submitted: '#f59e0b',
    color_rejected: '#ef4444',
    color_draft: '#94a3b8',
    // Admin
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });

  const fetchTenants = async () => {
    try {
      const response = await api.get('/super/tenants');
      setTenants(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenModal = (tenant: any = null) => {
    if (tenant) {
      setFormData({
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain || '',
        status: tenant.status,
        logo_url: tenant.logo_url || '',
        primary_color: tenant.primary_color || '#4f46e5',
        secondary_color: tenant.secondary_color || '#0f172a',
        accent_color: tenant.accent_color || '#06b6d4',
        sidebar_bg: tenant.sidebar_bg || '#f8fafc',
        sidebar_text: tenant.sidebar_text || '#334155',
        color_approved: tenant.color_approved || '#10b981',
        color_submitted: tenant.color_submitted || '#f59e0b',
        color_rejected: tenant.color_rejected || '#ef4444',
        color_draft: tenant.color_draft || '#94a3b8',
        admin_name: '',
        admin_email: '',
        admin_password: ''
      });
    } else {
      setFormData({ 
        id: null, name: '', domain: '', status: 'active',
        logo_url: '',
        primary_color: '#4f46e5',
        secondary_color: '#0f172a',
        accent_color: '#06b6d4',
        sidebar_bg: '#f8fafc',
        sidebar_text: '#334155',
        color_approved: '#10b981',
        color_submitted: '#f59e0b',
        color_rejected: '#ef4444',
        color_draft: '#94a3b8',
        admin_name: '',
        admin_email: '',
        admin_password: ''
      });
    }
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.name) {
        notifyError(t('super.tenants.error_name_required'));
        return;
      }
    }
    if (currentStep === 2) {
      // Validaciones paso 2 si fueran necesarias
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      notifyError('El logo es muy pesado (máx 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id && (!formData.admin_email || !formData.admin_password)) {
      notifyError(t('super.tenants.admin_required'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/super/tenants', formData);
      notifySuccess(t('super.tenants.save_success'));
      setIsModalOpen(false);
      fetchTenants();
    } catch (error: any) {
      notifyError(error.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('super.tenants.delete_warning'))) return;
    try {
      await api.delete(`/super/tenants/${id}`);
      notifySuccess(t('super.tenants.delete_success'));
      fetchTenants();
    } catch (error: any) {
      notifyError(error.response?.data?.message || t('super.tenants.delete_cannot_users'));
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const currentTenants = filteredTenants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<number | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setTenantToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;
    try {
      await api.delete(`/super/tenants/${tenantToDelete}`);
      notifySuccess(t('common.success'));
      fetchTenants();
    } catch (error: any) {
      notifyError(error.response?.data?.message || t('common.error'));
    } finally {
      setDeleteModalOpen(false);
      setTenantToDelete(null);
    }
  };

  const toggleStatus = async (e: React.MouseEvent, tenant: any) => {
    e.stopPropagation(); // Evitar que se abra el modal de edición
    const states = ['active', 'paused', 'suspended'];
    const currentIndex = states.indexOf(tenant.status);
    const nextStatus = states[(currentIndex + 1) % states.length];
    
    try {
      await api.post('/super/tenants', { id: tenant.id, status: nextStatus });
      notifySuccess(t('super.tenants.status_updated', { name: tenant.name, status: t(`super.tenants.status_${nextStatus}`) }));
      fetchTenants();
    } catch (error: any) {
      notifyError(t('common.error'));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="w-5 h-5 text-emerald-500" />;
      case 'paused': return <PauseCircle className="w-5 h-5 text-amber-500" />;
      case 'suspended': return <X className="w-5 h-5 text-rose-500" />;
      default: return <PlayCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('super.tenants_title')}</h1>
          <p className="text-gray-500 text-sm">{t('super.tenants_subtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm shadow-primary/20"
        >
          <Plus className="w-5 h-5" /> {t('super.add_tenant')}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder={t('super.search_placeholder')}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('super.tenant_name')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dominio</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('super.status')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('super.users')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('reports.projects')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentTenants.map((tenant) => (
                <tr 
                  key={tenant.id} 
                  onClick={() => handleOpenModal(tenant)}
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-inner">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building2 className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{tenant.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">ID: {tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-500 font-mono italic">
                    {tenant.domain || '---'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button 
                        onClick={(e) => toggleStatus(e, tenant)}
                        className={`p-2 rounded-xl transition-all active:scale-90 hover:shadow-md ${
                          tenant.status === 'active' ? 'bg-emerald-50' : 
                          tenant.status === 'paused' ? 'bg-amber-50' : 'bg-rose-50'
                        }`}
                        title="Click para rotar estado"
                      >
                        {getStatusIcon(tenant.status)}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                      {tenant.users_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-600">
                    {tenant.projects_count}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(tenant); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(e, tenant.id)}
                        disabled={Number(tenant.users_count) > 1}
                        className={`p-2 rounded-xl transition-all ${
                          Number(tenant.users_count) > 1 
                          ? 'text-gray-200 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={Number(tenant.users_count) > 1 ? t('super.tenants.delete_cannot_users') : t('super.tenants.delete_button')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              Mostrando {currentTenants.length} de {filteredTenants.length} empresas
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Borrado Personalizado */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{t('super.tenants.delete_confirm')}</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">{t('super.tenants.delete_warning')}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-3 px-4 border border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Registro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl my-4 border border-gray-100 flex flex-col"
            >
              {/* Stepper Header Compacto - Solo en creación */}
              {formData.id === null && (
                <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100">
                  <div className="relative flex justify-between max-w-2xl mx-auto">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
                    <motion.div 
                      className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 z-0"
                      initial={{ width: "0%" }}
                      animate={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
                    />
                    
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                          currentStep >= step ? 'bg-indigo-600 border-indigo-100 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'
                        }`}>
                          {currentStep > step ? <Check className="w-4 h-4" /> : <span className="font-bold text-xs">{step}</span>}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= step ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {step === 1 ? t('super.tenants.section_general') : step === 2 ? t('super.tenants.section_identity') : t('super.tenants.section_admin')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Content Sin Scroll */}
              <form onSubmit={handleSubmit} className="p-8">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">{t('super.tenants.section_general')}</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.tenant_name')}</label>
                            <input 
                              ref={firstInputRef}
                              required
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-medium"
                              placeholder={t('super.tenants.placeholder_name')}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.domain')}</label>
                            <input 
                              type="text"
                              value={formData.domain}
                              onChange={(e) => setFormData({...formData, domain: e.target.value})}
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-medium"
                              placeholder={t('super.tenants.placeholder_domain')}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.status')}</label>
                            <select 
                              value={formData.status}
                              onChange={(e) => setFormData({...formData, status: e.target.value})}
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-medium appearance-none"
                            >
                              <option value="active">{t('super.tenants.status_active')}</option>
                              <option value="paused">{t('super.tenants.status_paused')}</option>
                              <option value="suspended">{t('super.tenants.status_suspended')}</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                            <Plus className="w-4 h-4" />
                          </div>
                          <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">{t('super.tenants.section_branding')}</h4>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4 p-6 bg-indigo-50/20 border-2 border-dashed border-indigo-100 rounded-[2rem] text-center">
                          <div className="relative">
                            <div className="w-24 h-24 bg-white rounded-3xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                              {formData.logo_url ? (
                                <img src={formData.logo_url} alt="Preview" className="w-full h-full object-contain p-2" />
                              ) : (
                                <Building2 className="w-10 h-10 text-indigo-100" />
                              )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-all border-4 border-white">
                              <Plus className="w-4 h-4" />
                              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t('super.company_logo')}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && formData.id === null && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
                          <Palette className="w-4 h-4" />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">{t('super.tenants.section_identity')}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('super.tenants.main_colors')}</p>
                          <div className="space-y-4">
                            {[
                              { key: 'primary_color', label: 'super.tenants.color_primary' },
                              { key: 'secondary_color', label: 'super.tenants.color_secondary' },
                              { key: 'accent_color', label: 'super.tenants.color_accent' }
                            ].map((c) => (
                              <div key={c.key} className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{t(c.label)}</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={formData[c.key as keyof typeof formData] as string} 
                                    onChange={(e) => setFormData({...formData, [c.key]: e.target.value})} 
                                    className="h-9 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer" 
                                  />
                                  <input 
                                    type="text" 
                                    value={formData[c.key as keyof typeof formData] as string} 
                                    onChange={(e) => setFormData({...formData, [c.key]: e.target.value})} 
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-600" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('super.tenants.interface_colors')}</p>
                          <div className="space-y-4">
                            {[
                              { key: 'sidebar_bg', label: 'super.tenants.color_sidebar' },
                              { key: 'sidebar_text', label: 'super.tenants.color_text' }
                            ].map((c) => (
                              <div key={c.key} className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{t(c.label)}</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={formData[c.key as keyof typeof formData] as string} 
                                    onChange={(e) => setFormData({...formData, [c.key]: e.target.value})} 
                                    className="h-9 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer" 
                                  />
                                  <input 
                                    type="text" 
                                    value={formData[c.key as keyof typeof formData] as string} 
                                    onChange={(e) => setFormData({...formData, [c.key]: e.target.value})} 
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-600" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && formData.id === null && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">{t('super.tenants.section_admin')}</h4>
                      </div>

                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{t('users.name')}</label>
                            <input 
                              required={!formData.id}
                              type="text"
                              value={formData.admin_name}
                              onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder={t('users.name')}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{t('users.email')}</label>
                            <input 
                              required={!formData.id}
                              type="email"
                              value={formData.admin_email}
                              onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder={t('users.email')}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{t('users.password')}</label>
                          <input 
                            required={!formData.id}
                            type="password"
                            value={formData.admin_password}
                            onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Action Buttons Compacto */}
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button 
                  type="button"
                  onClick={currentStep === 1 ? () => setIsModalOpen(false) : prevStep}
                  className="px-6 py-2.5 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-gray-700 transition-colors flex items-center gap-2"
                >
                  {currentStep === 1 ? t('common.cancel') : (
                    <>
                      <ChevronLeft className="w-4 h-4" />
                      {t('common.previous')}
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  {(currentStep < 3 && formData.id === null) ? (
                    <button 
                      type="button"
                      onClick={nextStep}
                      className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      {t('common.next')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-10 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {t('common.save')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenantsList;
