import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Building2, 
  Globe, 
  Users, 
  Briefcase, 
  Loader2, 
  Search, 
  Trash2, 
  AlertTriangle, 
  X,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useNotification } from '../context/NotificationContext';

const TenantsList: React.FC = () => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
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
    setModalOpen(true);
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id && (!formData.admin_email || !formData.admin_password)) {
      notifyError('El usuario administrador es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/super/tenants', formData);
      notifySuccess(formData.id ? 'Empresa actualizada' : 'Empresa creada correctamente');
      setModalOpen(false);
      fetchTenants();
    } catch (error: any) {
      notifyError(error.response?.data?.message || 'Error al guardar empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta empresa? Esta acción no se puede deshacer si hay datos vinculados.')) return;
    try {
      await api.delete(`/super/tenants/${id}`);
      notifySuccess('Empresa eliminada');
      fetchTenants();
    } catch (error: any) {
      notifyError(error.response?.data?.message || 'No se puede eliminar la empresa');
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

  const toggleStatus = async (e: React.MouseEvent, tenant: any) => {
    e.stopPropagation(); // Evitar que se abra el modal de edición
    const states = ['active', 'paused', 'suspended'];
    const currentIndex = states.indexOf(tenant.status);
    const nextStatus = states[(currentIndex + 1) % states.length];
    
    try {
      await api.post('/super/tenants', { id: tenant.id, status: nextStatus });
      notifySuccess(`Estado de ${tenant.name} cambiado a ${nextStatus}`);
      fetchTenants();
    } catch (error: any) {
      notifyError('Error al cambiar estado');
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
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                        title="Editar Configuración"
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id); }}
                        disabled={Number(tenant.users_count) > 1}
                        className={`p-2 rounded-xl transition-all ${
                          Number(tenant.users_count) > 1 
                          ? 'text-gray-200 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={Number(tenant.users_count) > 1 ? 'No se puede eliminar: tiene usuarios' : 'Eliminar Empresa'}
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

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[1.5rem] w-full max-w-3xl overflow-hidden shadow-2xl my-4 border border-gray-100"
            >
              {/* Header con gradiente sutil */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {formData.id ? 'Configuración' : 'Nueva Empresa'}
                    </h3>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                      {formData.id ? `ID: ${formData.id}` : 'Registro de nuevo Tenant'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* COLUMNA IZQUIERDA: EMPRESA E IDENTIDAD */}
                  <div className="space-y-6">
                    {/* Grupo 1: Datos Base */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">General</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.tenant_name')}</label>
                          <input 
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-xs font-medium"
                            placeholder="Nombre de Empresa"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.domain')}</label>
                            <input 
                              type="text"
                              value={formData.domain}
                              onChange={(e) => setFormData({...formData, domain: e.target.value})}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-xs font-medium"
                              placeholder="acme.pmaas.com"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('super.status')}</label>
                            <select 
                              value={formData.status}
                              onChange={(e) => setFormData({...formData, status: e.target.value})}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-xs font-medium appearance-none"
                            >
                              <option value="active">Activa</option>
                              <option value="paused">Pausada</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grupo 2: Marca Blanca */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Identidad</h4>
                      </div>
                      
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-[1rem] space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1.5 text-center">
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">Primario</label>
                            <input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="h-9 w-9 rounded-full cursor-pointer border-2 border-white shadow-sm block mx-auto transition-transform hover:scale-110" />
                          </div>
                          <div className="space-y-1.5 text-center">
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">Secundario</label>
                            <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="h-9 w-9 rounded-full cursor-pointer border-2 border-white shadow-sm block mx-auto transition-transform hover:scale-110" />
                          </div>
                          <div className="space-y-1.5 text-center">
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">Acento</label>
                            <input type="color" value={formData.accent_color} onChange={(e) => setFormData({...formData, accent_color: e.target.value})} className="h-9 w-9 rounded-full cursor-pointer border-2 border-white shadow-sm block mx-auto transition-transform hover:scale-110" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2.5 p-2 bg-white border border-gray-100 rounded-lg">
                            <div className="w-5 h-5 rounded shadow-inner" style={{backgroundColor: formData.sidebar_bg}}></div>
                            <div className="flex-1">
                              <label className="block text-[8px] font-bold text-gray-400 uppercase">Sidebar</label>
                              <input type="text" value={formData.sidebar_bg} onChange={(e) => setFormData({...formData, sidebar_bg: e.target.value})} className="w-full text-[9px] font-mono outline-none border-none p-0" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 bg-white border border-gray-100 rounded-lg">
                            <div className="w-5 h-5 rounded shadow-inner" style={{backgroundColor: formData.sidebar_text}}></div>
                            <div className="flex-1">
                              <label className="block text-[8px] font-bold text-gray-400 uppercase">Texto</label>
                              <input type="text" value={formData.sidebar_text} onChange={(e) => setFormData({...formData, sidebar_text: e.target.value})} className="w-full text-[9px] font-mono outline-none border-none p-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: LOGO Y ADMIN */}
                  <div className="space-y-6">
                    
                    {/* Grupo 3: Logo */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Branding</h4>
                      </div>
                      <div className="flex flex-col items-center gap-3 p-6 bg-indigo-50/20 border border-dashed border-indigo-100 rounded-[1.5rem] text-center">
                        <div className="relative">
                          <div className="w-20 h-20 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                            {formData.logo_url ? (
                              <img src={formData.logo_url} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-8 h-8 text-indigo-100" />
                            )}
                          </div>
                          <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-all">
                            <Plus className="w-3.5 h-3.5" />
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        </div>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Logo de Empresa</p>
                      </div>
                    </div>

                    {/* Grupo 4: Administrador Initial */}
                    {!formData.id && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Admin</h4>
                        </div>
                        <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-[1.5rem] space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('users.name')}</label>
                            <input 
                              required={!formData.id}
                              type="text"
                              value={formData.admin_name}
                              onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-emerald-100 rounded-xl outline-none text-xs font-medium"
                              placeholder="Nombre"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('users.email')}</label>
                              <input 
                                required={!formData.id}
                                type="email"
                                value={formData.admin_email}
                                onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                                className="w-full px-4 py-2 bg-white border border-emerald-100 rounded-xl outline-none text-xs font-medium"
                                placeholder="email"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{t('users.password')}</label>
                              <input 
                                required={!formData.id}
                                type="password"
                                value={formData.admin_password}
                                onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                                className="w-full px-4 py-2 bg-white border border-emerald-100 rounded-xl outline-none text-xs font-medium"
                                placeholder="••••"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer del Modal */}
                <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                  <button 
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-200 active:scale-95"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    {formData.id ? t('common.save') : t('super.add_tenant')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenantsList;
