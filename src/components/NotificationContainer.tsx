import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Escuchamos un evento personalizado para mostrar notificaciones sin necesidad de pasar el context por todos lados si no es posible
// aunque usaremos el context principalmente.
const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      const newNotif = e.detail;
      setNotifications(prev => [...prev, newNotif]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, 5000);
    };

    window.addEventListener('add-notification', handleAdd);
    return () => window.removeEventListener('add-notification', handleAdd);
  }, []);

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error':   return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success': return 'border-emerald-500 bg-emerald-50/90 text-emerald-900';
      case 'error':   return 'border-rose-500 bg-rose-50/90 text-rose-900';
      case 'warning': return 'border-amber-500 bg-amber-50/90 text-amber-900';
      default:        return 'border-blue-500 bg-blue-50/90 text-blue-900';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-[420px]">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md ${getStyles(n.type)}`}
          >
            <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
            <div className="flex-1 text-sm font-medium leading-snug">{n.message}</div>
            <button 
              onClick={() => remove(n.id)}
              className="mt-0.5 text-current opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
