import React, { useEffect, useState } from 'react';
import { Plus, UserCircle, Mail, Phone, MapPin, Loader2, Search, Trash2, AlertCircle, AlertTriangle, X, CheckSquare, Target, DollarSign, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { CircularProgress } from '../components/CircularProgress';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const Clients: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<'general' | 'contacts'>('general');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    position: ''
  });

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

  const [clientForm, setClientForm] = useState({
    id: null as number | null,
    name: '',
    legal_name: '',
    tax_id: '',
    address: ''
  });

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients?participating=true');
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (clientId: number) => {
    try {
      const response = await api.get(`/clients/${clientId}/contacts`);
      setContacts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateNew = () => {
    setClientForm({ id: null, name: '', legal_name: '', tax_id: '', address: '' });
    setSelectedClient(null);
    setContacts([]);
    setView('detail');
    setActiveTab('general');
  };

  const handleEditClient = (client: any) => {
    setClientForm({
      id: client.id,
      name: client.name,
      legal_name: client.legal_name || '',
      tax_id: client.tax_id || '',
      address: client.address || ''
    });
    setSelectedClient(client);
    fetchContacts(client.id);
    setView('detail');
    setActiveTab('general');
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (clientForm.id) {
        await api.put('/clients', clientForm);
      } else {
        const res = await api.post('/clients', clientForm);
        setClientForm({ ...clientForm, id: res.data.id });
      }
      fetchClients();
      // Stay in detail view to allow adding contacts
      notifySuccess(t('clients.success_save'));
    } catch (error) {
      console.error('Error saving client:', error);
      notifyError(t('clients.error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('clients.delete_title'),
      message: t('clients.delete_confirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/clients/${id}`);
          fetchClients();
          setView('list');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          notifySuccess(t('clients.deleted_success', 'Cliente eliminado correctamente'));
        } catch (error: any) {
          console.error('Error deleting client:', error);
          notifyError(error.response?.data?.message || 'No se puede eliminar el cliente.');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.id) return;
    setSubmitting(true);
    try {
      if (editingContact) {
        await api.put(`/clients/contacts/${editingContact.id}`, newContact);
      } else {
        await api.post(`/clients/${clientForm.id}/contacts`, newContact);
      }
      fetchContacts(clientForm.id);
      setContactModalOpen(false);
      setEditingContact(null);
      setNewContact({ name: '', email: '', phone: '', position: '' });
      notifySuccess(editingContact ? t('clients.contact_updated', 'Contacto actualizado') : t('clients.contact_created', 'Contacto añadido'));
    } catch (error: any) {
      console.error('Error saving contact:', error);
      notifyError(error.response?.data?.message || t('clients.error_contact_save', 'Error al guardar contacto'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('clients.delete_contact'),
      message: t('clients.delete_contact_confirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/clients/contacts/${id}`);
          if (clientForm.id) fetchContacts(clientForm.id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          notifySuccess(t('clients.contact_deleted', 'Contacto eliminado'));
        } catch (error: any) {
          console.error('Error deleting contact:', error);
          notifyError(error.response?.data?.message || t('clients.error_contact_delete'));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-6">

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

      {view === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('clients.title')}</h1>
              <p className="text-gray-500">{t('clients.subtitle')}</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> {t('clients.new_client')}
            </button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder={t('clients.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div 
                key={client.id} 
                onClick={() => handleEditClient(client)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-primary/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <UserCircle className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">{t('clients.id')}: {client.tax_id || 'N/A'}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('clients.delete_client')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate max-w-[200px]" title={client.name}>
                  {client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4 truncate max-w-[200px]" title={client.legal_name}>
                  {client.legal_name?.length > 15 ? client.legal_name.substring(0, 15) + '...' : (client.legal_name || t('clients.no_legal_name'))}
                </p>
                
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {client.address || t('clients.no_address')}
                  </div>
                </div>

                <div className={`mt-6 pt-6 border-t border-gray-50 grid ${hasPermission('costs') ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  <div className="flex items-center gap-3">
                    <CircularProgress 
                      value={client.total_actual_hours || 0} 
                      max={client.total_budget_hours || 1} 
                      size={42}
                      strokeWidth={4}
                      colorClass={((client.total_actual_hours || 0) / (client.total_budget_hours || 1)) > 1 ? 'text-red-500' : ((client.total_actual_hours || 0) / (client.total_budget_hours || 1)) > 0.8 ? 'text-amber-500' : 'text-blue-500'}
                    />
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                        <Target className="w-3 h-3 text-blue-500" />
                        <p className="text-[10px] text-gray-400 uppercase font-bold text-right">{t('clients.hours')}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 text-right">{client.total_actual_hours || 0} / {client.total_budget_hours || 0}h</p>
                    </div>
                  </div>

                  {hasPermission('costs') && (
                    <div className="flex items-center gap-3">
                      <CircularProgress 
                        value={client.total_actual_revenue || 0} 
                        max={client.total_budget_money || 1} 
                        size={42}
                        strokeWidth={4}
                        colorClass={((client.total_actual_revenue || 0) / (client.total_budget_money || 1)) > 1 ? 'text-red-500' : ((client.total_actual_revenue || 0) / (client.total_budget_money || 1)) > 0.8 ? 'text-amber-500' : 'text-green-500'}
                      />
                      <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          <p className="text-[10px] text-gray-400 uppercase font-bold text-right">{t('clients.budget')}</p>
                        </div>
                        <p className="text-xs font-bold text-gray-900 text-right">{formatCurrency(client.total_actual_revenue || 0)} / {formatCurrency(client.total_budget_money || 0)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{clientForm.id ? t('clients.edit_client') : t('clients.new_client')}</h2>
                <p className="text-sm text-gray-500">{clientForm.name || 'Nuevo Registro'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {clientForm.id && (
                <button 
                  onClick={() => handleDeleteClient(clientForm.id!)}
                  className="px-4 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors"
                >
                  {t('common.delete')}
                </button>
              )}
              <button 
                onClick={handleSaveClient}
                disabled={submitting}
                className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.save')}
              </button>
            </div>
          </div>

          <div className="flex border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('general')}
              className={`px-8 py-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'general' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {t('clients.general')}
            </button>
            <button 
              onClick={() => setActiveTab('contacts')}
              disabled={!clientForm.id}
              className={`px-8 py-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'contacts' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'} disabled:opacity-30`}
            >
              {t('clients.contacts')}
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'general' ? (
              <form onSubmit={handleSaveClient} className="max-w-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.commercial_name')}</label>
                    <input 
                      required
                      type="text"
                      maxLength={200}
                      value={clientForm.name}
                      onChange={(e) => setClientForm({...clientForm, name: e.target.value.substring(0, 200)})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.legal_name')}</label>
                    <input 
                      type="text"
                      maxLength={200}
                      value={clientForm.legal_name}
                      onChange={(e) => setClientForm({...clientForm, legal_name: e.target.value.substring(0, 200)})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.tax_id')}</label>
                    <input 
                      type="text"
                      value={clientForm.tax_id}
                      onChange={(e) => setClientForm({...clientForm, tax_id: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.address')}</label>
                    <textarea 
                      rows={3}
                      value={clientForm.address}
                      onChange={(e) => setClientForm({...clientForm, address: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('clients.contacts')}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingContact(null);
                      setNewContact({ name: '', email: '', phone: '', position: '' });
                      setContactModalOpen(true);
                    }}
                    className="px-4 py-2 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {t('clients.add_contact')}
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-bold">{t('clients.contact_name')}</th>
                        <th className="px-6 py-3 font-bold">{t('clients.contact_position')}</th>
                        <th className="px-6 py-3 font-bold">{t('clients.contact_email')}</th>
                        <th className="px-6 py-3 font-bold">{t('clients.contact_phone')}</th>
                        <th className="px-6 py-3 font-bold text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contacts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                            {t('clients.no_contacts')}
                          </td>
                        </tr>
                      ) : (
                        contacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[150px]" title={contact.name}>
                              {contact.name.length > 15 ? contact.name.substring(0, 15) + '...' : contact.name}
                            </td>
                            <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]" title={contact.position}>
                              {contact.position?.length > 15 ? contact.position.substring(0, 15) + '...' : (contact.position || '-')}
                            </td>
                            <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]" title={contact.email}>
                              {contact.email?.length > 15 ? contact.email.substring(0, 15) + '...' : (contact.email || '-')}
                            </td>
                            <td className="px-6 py-4 text-gray-500">{contact.phone || '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingContact(contact);
                                    setNewContact({
                                      name: contact.name,
                                      email: contact.email || '',
                                      phone: contact.phone || '',
                                      position: contact.position || ''
                                    });
                                    setContactModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                >
                                  <Search className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingContact ? t('clients.edit_contact') : t('clients.add_contact')}</h3>
              <button onClick={() => setContactModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveContact} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.contact_name')}</label>
                <input 
                  required
                  type="text"
                  maxLength={200}
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value.substring(0, 200)})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.contact_position')}</label>
                <input 
                  type="text"
                  maxLength={200}
                  value={newContact.position}
                  onChange={(e) => setNewContact({...newContact, position: e.target.value.substring(0, 200)})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.contact_email')}</label>
                <input 
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('clients.contact_phone')}</label>
                <input 
                  type="text"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
