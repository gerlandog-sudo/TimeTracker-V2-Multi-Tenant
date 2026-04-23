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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <motion.div 
            key={tenant.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all border-l-4 border-l-indigo-500"
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden">
                  {tenant.logo_url ? (
                    <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-7 h-7" />
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    tenant.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {tenant.status}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{tenant.name}</h3>
              <p className="text-xs text-gray-400 font-mono mb-4 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {tenant.domain || 'Sin dominio asignado'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{tenant.users_count}</span>
                  <span className="text-xs text-gray-400">{t('super.users')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{tenant.projects_count}</span>
                  <span className="text-xs text-gray-400">{t('reports.projects')}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
              <button 
                onClick={() => handleOpenModal(tenant)}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" /> Editar Configuración
              </button>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleDelete(tenant.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-lg font-bold text-gray-900">{formData.id ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-8">
                {/* Sección 1: Datos de Empresa */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Datos de la Empresa</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('super.tenant_name')}</label>
                      <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                        placeholder="Ej: Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('super.domain')}</label>
                      <input 
                        type="text"
                        value={formData.domain}
                        onChange={(e) => setFormData({...formData, domain: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                        placeholder="acme.timetracker.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('super.status')}</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                    >
                      <option value="active">Activa</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </div>
                </div>

                {/* Sección 2: Identidad Visual */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Identidad Visual</h4>
                  </div>
                  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tighter">Logo Corporativo</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('config.primary')}</label>
                      <div className="flex gap-2">
                        <input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                        <input type="text" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="flex-1 text-xs font-mono px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('config.secondary')}</label>
                      <div className="flex gap-2">
                        <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                        <input type="text" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="flex-1 text-xs font-mono px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('config.accent')}</label>
                      <div className="flex gap-2">
                        <input type="color" value={formData.accent_color} onChange={(e) => setFormData({...formData, accent_color: e.target.value})} className="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                        <input type="text" value={formData.accent_color} onChange={(e) => setFormData({...formData, accent_color: e.target.value})} className="flex-1 text-xs font-mono px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Administrador Inicial (Solo para alta) */}
                {!formData.id && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Users className="w-5 h-5 text-indigo-500" />
                      <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Administrador Inicial</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('users.name')}</label>
                        <input 
                          required={!formData.id}
                          type="text"
                          value={formData.admin_name}
                          onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('users.email')}</label>
                        <input 
                          required={!formData.id}
                          type="email"
                          value={formData.admin_email}
                          onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                          placeholder="admin@empresa.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{t('users.password')}</label>
                        <input 
                          required={!formData.id}
                          type="password"
                          value={formData.admin_password}
                          onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-8 flex gap-4 sticky bottom-0 bg-white">
                  <button 
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-200 active:scale-95"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
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
