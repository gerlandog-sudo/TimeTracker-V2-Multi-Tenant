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
    status: 'active'
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
        status: tenant.status
      });
    } else {
      setFormData({ id: null, name: '', domain: '', status: 'active' });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                <h3 className="text-lg font-bold text-gray-900">{formData.id ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Comercial</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Ej: Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dominio / URL (Opcional)</label>
                  <input 
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="acme.timetracker.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="active">Activa</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>
                
                <div className="pt-6 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-200"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
