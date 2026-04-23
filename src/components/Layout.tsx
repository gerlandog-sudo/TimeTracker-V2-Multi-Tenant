import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  CheckSquare,
  DollarSign,
  UserCircle,
  Bell,
  User,
  ChevronDown,
  TrendingUp,
  Columns,
  Building2,
  Activity
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { format } from 'date-fns';
import { es, enUS, ptBR, pt } from 'date-fns/locale';

declare const APP_VERSION: string;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { config, hasPermission } = useTheme();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Mapeo de locales para date-fns
  const dateLocales: Record<string, any> = {
    es_AR: es,
    es_ES: es,
    en_US: enUS,
    en_GB: enUS,
    pt_BR: ptBR,
    pt_PT: pt
  };

  const currentLocale = dateLocales[i18n.language] || es;
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-collapse sidebar on Kanban (Tasks) page to maximize space, expand on others
  useEffect(() => {
    if (location.pathname === '/kanban') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/user-alerts');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id?: number) => {
    try {
      await api.patch('/user-alerts', { id });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isSuperAdmin = user.is_super_admin === true || user.is_super_admin === 1 || user.is_super_admin === "1";
  const navItems = isSuperAdmin ? [
    { name: t('super.menu_dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('super.menu_tenants'), path: '/super/tenants', icon: Building2 },
    { name: t('super.menu_logs'), path: '/super/logs', icon: Activity },
    { name: t('menu.config'), path: '/settings', icon: Settings },
  ] : [
    { name: t('menu.dashboard'), path: '/', icon: LayoutDashboard, feature: 'dashboard' },
    { name: t('menu.tasks'), path: '/kanban', icon: Columns, feature: 'kanban' },
    { name: t('menu.tracker'), path: '/tracker', icon: Clock, feature: 'tracker' },
    { name: t('menu.approvals'), path: '/approvals', icon: CheckSquare, feature: 'approvals' },
    { name: t('menu.projects'), path: '/projects', icon: Briefcase, feature: 'projects' },
    { name: t('menu.clients'), path: '/clients', icon: UserCircle, feature: 'clients' },
    { name: t('menu.costs'), path: '/costs', icon: DollarSign, feature: 'costs' },
    { 
      name: t('menu.reports'), 
      icon: TrendingUp, 
      subItems: [
        { name: t('reports.heatmaps'), path: '/reports/heatmap', feature: 'report_heatmaps' },
        { name: t('reports.audit'), path: '/reports/audit', feature: 'report_audit' },
        { name: t('reports.ai'), path: '/reports/predictive', feature: 'report_ai' },
        { name: t('reports.custom'), path: '/reports/custom', feature: 'report_custom' },
      ]
    },
    { name: t('menu.users'), path: '/users', icon: Users, feature: 'users' },
    { name: t('menu.config'), path: '/settings', icon: Settings, feature: 'settings' },
  ];

  const filteredNavItems = user.is_super_admin ? navItems : navItems.filter(item => {
    if (item.subItems) {
      return item.subItems.some(sub => hasPermission(sub.feature));
    }
    return hasPermission(item.feature);
  }).map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(sub => hasPermission(sub.feature))
      };
    }
    return item;
  });

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Reportes': location.pathname.startsWith('/reports')
  });

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        style={{ 
          backgroundColor: 'var(--sidebar-bg)', 
          color: 'var(--sidebar-text)',
          borderColor: 'rgba(0,0,0,0.05)' 
        }}
        className="border-r flex flex-col z-20"
      >
        <div className="p-4 h-16 flex items-center justify-between overflow-hidden">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shrink-0">
                    {(config?.company_name || 'T').charAt(0)}
                  </div>
                )}
                <span className="font-bold text-lg tracking-tight truncate" style={{ color: 'var(--sidebar-text)' }}>
                  {config?.company_name || 'TimeTracker'}
                </span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-black/5 rounded-lg transition-colors shrink-0 ml-2"
                title="Contraer menú"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="mx-auto p-2 hover:bg-black/5 rounded-lg transition-colors"
              title="Expandir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            if (item.subItems) {
              const isExpanded = expandedMenus[item.name];
              const isChildActive = item.subItems.some(sub => location.pathname === sub.path);
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isSidebarOpen) setSidebarOpen(true);
                      toggleMenu(item.name);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                      isChildActive && !isExpanded
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-black/5'
                    }`}
                    style={{ color: isChildActive && !isExpanded ? 'var(--primary)' : 'var(--sidebar-text)' }}
                  >
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 ${isChildActive && !isExpanded ? 'text-primary' : 'opacity-60 group-hover:opacity-100'}`} />
                      {isSidebarOpen && (
                        <span className="ml-3 font-medium text-sm">{item.name}</span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} opacity-60`} />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isSidebarOpen && isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-10 pr-2 py-1 space-y-1">
                          {item.subItems.map(sub => {
                            const isActive = location.pathname === sub.path;
                            return (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isActive 
                                    ? 'bg-primary/10 text-primary font-medium' 
                                    : 'hover:bg-black/5 opacity-80 hover:opacity-100'
                                }`}
                                style={{ color: isActive ? 'var(--primary)' : 'var(--sidebar-text)' }}
                              >
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-black/5'
                }`}
                style={{ color: isActive ? 'var(--primary)' : 'var(--sidebar-text)' }}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'opacity-60 group-hover:opacity-100'}`} />
                {isSidebarOpen && (
                  <span className="ml-3 font-medium text-sm">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className={`flex items-center ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>{user.name}</p>
                <p className="text-xs opacity-60 truncate uppercase">{user.role}</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Platform Version */}
          <div className="mt-auto px-6 py-4 border-t border-gray-50">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TimeTracker</span>
              <span className="text-[10px] font-bold text-gray-300">v{typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.01.001'}</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-500">
              {(() => {
                const dateFormatStr = i18n.language.startsWith('en') ? "eeee, MMMM do, yyyy" : "eeee, d 'de' MMMM 'de' yyyy";
                const formatted = format(currentTime, dateFormatStr, { locale: currentLocale });
                if (!formatted) return "";
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
              })()}
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-gray-900 font-bold">{format(currentTime, "HH:mm:ss")}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="font-bold text-gray-900">Notificaciones</h4>
                      <button 
                        onClick={() => markAsRead()}
                        className="text-xs text-primary hover:underline"
                      >
                        Marcar todas como leídas
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                          No tienes notificaciones.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                            onClick={() => markAsRead(n.id)}
                          >
                            <p className={`text-sm ${!n.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {format(new Date(n.created_at), "d MMM, HH:mm", { locale: es })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1 pl-3 pr-2 hover:bg-gray-50 rounded-full border border-gray-100 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-900 leading-none">{user.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold leading-none mt-1">{user.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-2">
                      <Link 
                        to="/profile" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        {t('menu.profile')}
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('menu.logout')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
