import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

interface SystemConfig {
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  sidebar_bg: string;
  sidebar_text: string;
  currency: string;
  color_approved: string;
  color_rejected: string;
  color_submitted: string;
  color_draft: string;
  sound_enabled: boolean | number;
}

interface Permission {
  role_id: number;
  role?: string;
  feature: string;
  can_access: number;
}

interface ThemeContextType {
  config: SystemConfig;
  permissions: Permission[];
  refreshConfig: () => Promise<void>;
  hasPermission: (feature: string) => boolean;
  isReady: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  user: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfig>({
    company_name: 'TimeTracker',
    logo_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#1f2937',
    accent_color: '#3b82f6',
    sidebar_bg: '#ffffff',
    sidebar_text: '#1f2937',
    currency: 'USD',
    color_approved: '#3b82f6',
    color_rejected: '#ef4444',
    color_submitted: '#eab308',
    color_draft: '#9ca3af',
    sound_enabled: true
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('sound_enabled') !== 'false';
  });
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
    // Actualizamos también el objeto config para que se guarde al salvar settings
    setConfig(prev => ({ ...prev, sound_enabled: enabled }));
  };

  const refreshConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      let tenantIdParam = '';
      
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.is_super_admin === true || user.is_super_admin === 1 || user.is_super_admin === "1") {
          tenantIdParam = '?tenant_id=0';
        }
      }

      // Actualizar estado del usuario localmente
      const updatedUserStr = localStorage.getItem('user');
      if (updatedUserStr) {
        setUser(JSON.parse(updatedUserStr));
      }

      const requests: Promise<any>[] = [api.get('/config' + tenantIdParam)];
      
      // Only fetch permissions if we have a token
      if (token) {
        requests.push(api.get('/permissions'));
      }

      const results = await Promise.all(requests);
      
      if (results[0]?.data) {
        console.log('System Config Loaded:', results[0].data);
        const newConfig = { ...results[0].data };
        // Normalizar sound_enabled de la DB (0/1) a booleano
        if (Object.prototype.hasOwnProperty.call(newConfig, 'sound_enabled')) {
          const isEnabled = Boolean(Number(newConfig.sound_enabled));
          setSoundEnabledState(isEnabled);
          localStorage.setItem('sound_enabled', isEnabled ? 'true' : 'false');
        }
        setConfig(prev => ({ ...prev, ...newConfig }));
      }
      
      if (token && results[1]?.data) {
        setPermissions(Array.isArray(results[1].data) ? results[1].data : []);
      }
    } catch (error: any) {
      // Don't log 401 errors as they are expected when not logged in
      if (error.response?.status !== 401) {
        console.error('Error fetching config or permissions:', error);
      }
    } finally {
      setIsReady(true);
    }
  };

  const hasPermission = (feature: string) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    try {
      const user = JSON.parse(userStr);
      
      // role_id 1 is admin - always grant access
      if (Number(user.role_id) === 1 || user.role === 'admin') return true;
      
      // Ensure we have a valid role_id to check against permissions
      const roleId = Number(user.role_id);
      if (isNaN(roleId)) return false;
      
      const perm = permissions.find(p => Number(p.role_id) === roleId && p.feature === feature);
      return perm ? Number(perm.can_access) === 1 : false;
    } catch (e) {
      console.error('Error parsing user for permissions:', e);
      return false;
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  useEffect(() => {
    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--primary', config.primary_color);
    document.documentElement.style.setProperty('--secondary', config.secondary_color);
    document.documentElement.style.setProperty('--accent', config.accent_color);
    document.documentElement.style.setProperty('--sidebar-bg', config.sidebar_bg);
    document.documentElement.style.setProperty('--sidebar-text', config.sidebar_text);
    document.documentElement.style.setProperty('--color-approved', config.color_approved);
    document.documentElement.style.setProperty('--color-rejected', config.color_rejected);
    document.documentElement.style.setProperty('--color-submitted', config.color_submitted);
    document.documentElement.style.setProperty('--color-draft', config.color_draft);
  }, [config]);

  return (
    <ThemeContext.Provider value={{ 
      config, 
      permissions, 
      refreshConfig, 
      hasPermission, 
      isReady,
      soundEnabled,
      setSoundEnabled,
      user
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
