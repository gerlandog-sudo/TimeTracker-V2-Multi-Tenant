import React, { createContext, useContext, useCallback } from 'react';
import NotificationContainer from '../components/NotificationContainer';
import { useTheme } from './ThemeContext';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Sonido de "pop/ping" profesional
const POP_SOUND = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { soundEnabled } = useTheme();

    const playSound = useCallback(() => {
        if (!soundEnabled) return;
        const audio = new Audio(POP_SOUND);
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Audio play blocked or error:', e));
    }, [soundEnabled]);

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        
        // Usamos setTimeout 0 para asegurar que el despacho del evento ocurra después del ciclo actual de React
        setTimeout(() => {
            const event = new CustomEvent('add-notification', {
                detail: { id, message, type }
            });
            window.dispatchEvent(event);
            
            // Sonar
            playSound();
        }, 0);
    }, [playSound]);

    const success = useCallback((msg: string) => notify(msg, 'success'), [notify]);
    const error   = useCallback((msg: string) => notify(msg, 'error'),   [notify]);

    return (
        <NotificationContext.Provider value={{ notify, success, error }}>
            {children}
            <NotificationContainer />
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
