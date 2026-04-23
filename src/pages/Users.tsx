import React, { useState, useEffect, useRef } from 'react';
import { Users as UsersIcon, UserPlus, Search, Filter, Edit2, Trash2, X, Shield, Mail, User, AlertTriangle, AlertCircle, DollarSign, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Pagination } from '../components/Pagination';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'c-level' | 'commercial' | 'staff';
  position_id?: number;
  position_name?: string;
  seniority?: string;
  hourly_cost?: number;
  weekly_capacity?: number;
  created_at: string;
}

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [users, setUsers] = useState<UserData[]>([]);
  const [positions, setPositions] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);


  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as UserData['role'],
    position_id: '',
    seniority: '',
    hourly_cost: '0',
    weekly_capacity: '40'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await api.get(`/users?page=${pagination.page}&limit=${pagination.limit}&t=${Date.now()}`);
      const positionsRes = await api.get('/positions');
      
      const usersData = usersRes.data;
      if (usersData && usersData.data) {
        setUsers(usersData.data);
        setPagination(prev => ({
          ...prev,
          total: usersData.total,
          totalPages: usersData.totalPages
        }));
      } else {
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }
      
      setPositions(Array.isArray(positionsRes.data?.data) ? positionsRes.data.data : (Array.isArray(positionsRes.data) ? positionsRes.data : []));
    } catch (error) {
      console.error('Error fetching data:', error);
      setUsers([]);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey, pagination.page, pagination.limit]);

  const handleOpenModal = (user: UserData | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        position_id: user.position_id?.toString() || '',
        seniority: user.seniority || '',
        hourly_cost: user.hourly_cost?.toString() || '0',
        weekly_capacity: user.weekly_capacity?.toString() || '40'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        position_id: '',
        seniority: '',
        hourly_cost: '0',
        weekly_capacity: '40'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleIdMap: Record<string, number> = {
      admin: 1,
      'c-level': 2,
      commercial: 3,
      staff: 4
    };
    
    const body = { 
      ...formData, 
      role_id: roleIdMap[formData.role]
    };

    try {
      if (editingUser) {
        await api.put('/users', { ...body, id: editingUser.id });
      } else {
        await api.post('/users', body);
      }
      notifySuccess(editingUser ? t('users.updated_success', 'Usuario actualizado correctamente') : t('users.created_success', 'Usuario creado correctamente'));
      setIsModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error saving user:', error);
      notifyError(error.response?.data?.message || t('users.error_save', 'Error al guardar el usuario'));
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('users.delete_title'),
      message: t('users.delete_confirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          setRefreshKey(prev => prev + 1);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          notifySuccess(t('users.deleted_success', 'Usuario eliminado correctamente'));
        } catch (error: any) {
          console.error('Error deleting user:', error);
          notifyError(error.response?.data?.message || t('users.error_delete'));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels: Record<UserData['role'], string> = {
    admin: t('users.admin'),
    'c-level': t('users.clevel'),
    commercial: t('users.commercial'),
    staff: t('users.staff')
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('users.title')}</h1>
          <p className="text-gray-500">{t('users.subtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-4 h-4" /> {t('users.new_user')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('users.search')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.name')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.role')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.position')} / {t('users.seniority')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t('common.loading')}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>{t('users.no_users')}</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(user.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-[150px]" title={user.name}>
                            {(user.name || '').length > 15 ? user.name.substring(0, 15) + '...' : (user.name || '-')}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[150px]" title={user.email}>
                            {user.email.length > 15 ? user.email.substring(0, 15) + '...' : user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'c-level' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'commercial' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{user.position_name || '-'}</div>
                      <div className="text-xs text-gray-500">{user.seniority || '-'}</div>
                      {(hasPermission('costs') || JSON.parse(localStorage.getItem('user') || '{}').role === 'admin') && user.hourly_cost !== undefined && (
                        <div className="text-[10px] font-bold text-primary mt-1">{t('users.hourly_cost')}: ${user.hourly_cost}/h</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
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
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setPagination({ ...pagination, page })}
          limit={pagination.limit}
          onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
          totalItems={pagination.total}
        />
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
              >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                <h2 className="text-base font-bold text-gray-900">
                  {editingUser ? t('users.edit_user') : t('users.new_user')}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors hover:bg-gray-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white">
                <div className="p-3 overflow-y-auto flex-1 min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    {/* Left Column */}
                    <div className="space-y-3">
                      {/* Información Personal */}
                      <div className="space-y-2">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-0.5">{t('users.basic_info')}</h3>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                            <User className="w-3 h-3" /> {t('users.name')}
                          </label>
                          <input 
                            ref={firstInputRef}
                            type="text" 
                            required
                            maxLength={200}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.substring(0, 200) })}
                            className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[13px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> {t('users.email')}
                          </label>
                          <input 
                            type="email" 
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[13px]"
                          />
                        </div>
                      </div>

                      {/* Rol y Posición */}
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">{t('users.assignment')}</h3>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> {t('users.role')}
                          </label>
                          <select 
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserData['role'] })}
                            className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[13px]"
                          >
                            <option value="admin">{t('users.admin')}</option>
                            <option value="c-level">{t('users.clevel')}</option>
                            <option value="commercial">{t('users.commercial')}</option>
                            <option value="staff">{t('users.staff')}</option>
                          </select>
                        </div>

                        {['staff', 'commercial'].includes(formData.role) && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-2 gap-3 pt-0.5"
                          >
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-600">{t('users.position')}</label>
                              <select 
                                value={formData.position_id}
                                onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[12px]"
                              >
                                <option value="">{t('users.select_position')}</option>
                                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-600">{t('users.seniority')}</label>
                              <select 
                                value={formData.seniority}
                                onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
                                className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[12px]"
                              >
                                <option value="">{t('users.select_seniority')}</option>
                                <option value="Junior">Junior</option>
                                <option value="Semi-Senior">Semi-Senior</option>
                                <option value="Senior">Senior</option>
                                <option value="Lead">Lead</option>
                                <option value="Manager">Manager</option>
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Costos y Capacidad */}
                      <div className="space-y-2.5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">
                          {hasPermission('costs') ? `${t('users.hourly_cost')} & ` : ''}{t('users.capacity')}
                        </h3>
                        <div className={`grid ${hasPermission('costs') ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                          {hasPermission('costs') && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3" /> {t('users.hourly_cost')}
                              </label>
                              <input 
                                type="number" 
                                value={formData.hourly_cost}
                                onChange={(e) => setFormData({ ...formData, hourly_cost: e.target.value })}
                                className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[12px] text-right"
                                placeholder="Ej: 20"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {t('users.capacity')}
                            </label>
                            <input 
                              type="number" 
                              value={formData.weekly_capacity}
                              onChange={(e) => setFormData({ ...formData, weekly_capacity: e.target.value })}
                              className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[12px] text-right"
                              placeholder="Ej: 40"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seguridad */}
                      <div className="space-y-2.5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">{t('users.password')}</h3>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-600">
                            {t('users.password')} {editingUser && <span className="text-[10px] font-normal text-gray-400">({t('users.password_hint')})</span>}
                          </label>
                          <input 
                            type="password" 
                            required={!editingUser}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-[13px]"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-gray-100 flex gap-2 bg-gray-50 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95 text-[13px]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-3 py-1.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 text-[13px]"
                  >
                    {editingUser ? t('common.save') : t('users.new_user')}
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

export default UsersPage;
