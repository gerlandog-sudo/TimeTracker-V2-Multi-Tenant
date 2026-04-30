import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X, AlertOctagon } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'suspended';
}

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      const newNotif = e.detail;
      setNotifications(prev => [...prev, newNotif]);
      
      const duration = newNotif.type === 'suspended' ? 15000 : 5000;
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, duration);
    };

    window.addEventListener('add-notification', handleAdd);
    return () => window.removeEventListener('add-notification', handleAdd);
  }, []);

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getConfig = (type: string) => {
    switch (type) {
      case 'success': 
        return { 
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, 
          colors: 'border-emerald-500/30 bg-emerald-50/70 text-emerald-900',
          bar: 'bg-emerald-500'
        };
      case 'error':   
        return { 
          icon: <XCircle className="w-5 h-5 text-rose-500" />, 
          colors: 'border-rose-500/30 bg-rose-50/70 text-rose-900',
          bar: 'bg-rose-500'
        };
      case 'warning': 
        return { 
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, 
          colors: 'border-amber-500/30 bg-amber-50/70 text-amber-900',
          bar: 'bg-amber-500'
        };
      case 'suspended': 
      case 'info':
      default:
        return { 
          icon: <AlertOctagon className="w-5 h-5 text-violet-600" />, 
          colors: 'border-violet-500/30 bg-violet-50/70 text-violet-900',
          bar: 'bg-violet-600'
        };
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-[420px]">
      <AnimatePresence>
        {notifications.map((n) => {
          const config = getConfig(n.type);
          const duration = n.type === 'suspended' ? 15 : 5;

          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 100, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl border shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] backdrop-blur-xl ${config.colors}`}
            >
              <div className="mt-0.5 shrink-0">{config.icon}</div>
              <div className="flex-1 text-[13px] font-semibold leading-relaxed tracking-tight">{n.message}</div>
              <button 
                onClick={() => remove(n.id)}
                className="mt-0.5 text-current opacity-30 hover:opacity-100 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Barra de progreso animada */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-[3px] opacity-60 ${config.bar}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
