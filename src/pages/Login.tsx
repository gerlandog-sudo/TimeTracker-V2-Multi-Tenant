import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, X, Mail, Key, Check } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  
  const navigate = useNavigate();
  const { config, refreshConfig } = useTheme();

  const [tenantInfo, setTenantInfo] = useState<{ id: number, name: string } | null>(null);
  const [searchingTenant, setSearchingTenant] = useState(false);

  const handleEmailBlur = async () => {
    if (!email || !email.includes('@')) return;
    setSearchingTenant(true);
    try {
      const response = await api.post('/auth/find-tenant', { email });
      setTenantInfo(response.data);
    } catch (err) {
      setTenantInfo(null);
    } finally {
      setSearchingTenant(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Aplicar idioma
      if (response.data.user.language) {
        i18n.changeLanguage(response.data.user.language);
      }
      
      await refreshConfig();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setResetStep('verify');
    } catch (err: any) {
      setResetError(err.response?.data?.message || t('common.error_process'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await api.post('/auth/reset-password', { 
        email: resetEmail, 
        otp: resetOtp, 
        password: newPassword 
      });
      setResetSuccess(true);
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess(false);
        setResetStep('request');
        setResetEmail('');
        setResetOtp('');
        setNewPassword('');
      }, 3000);
    } catch (err: any) {
      setResetError(err.response?.data?.message || t('reset.error_otp'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded bg-primary flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-primary/20">
            T
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            TimeTracker
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('login.subtitle')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="admin@example.com"
              />
              <AnimatePresence>
                {searchingTenant && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando empresa...
                  </motion.p>
                )}
                {tenantInfo && !searchingTenant && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-tight">
                      {tenantInfo.name}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono bg-white px-1.5 rounded border border-indigo-50">
                      ID: {tenantInfo.id}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t('login.forgot_password')}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                {t('login.button')}
              </>
            )}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Default: admin@example.com / admin123
          </p>
        </div>
      </div>

      {/* Manual Password Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100"
            >
              <button
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Key className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t('reset.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">{t('reset.subtitle')}</p>
                </div>

                {resetSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-4">
                      <Check className="w-8 h-8" />
                    </div>
                    <p className="text-green-600 font-medium">{t('reset.success')}</p>
                  </motion.div>
                ) : (
                  <form onSubmit={resetStep === 'request' ? handleRequestOtp : handleResetPassword} className="space-y-6">
                    {resetError && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100 italic">
                        {resetError}
                      </div>
                    )}

                    {resetStep === 'request' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t('reset.email_label')}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="email"
                              required
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={resetLoading}
                          className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('reset.send_otp')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t('reset.otp_label')}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={resetOtp}
                            onChange={(e) => setResetOtp(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-center text-2xl font-black tracking-[0.5em] placeholder:tracking-normal"
                            placeholder="000000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t('reset.new_password')}
                          </label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-mono"
                            placeholder="••••••••"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={resetLoading}
                          className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('reset.confirm_button')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep('request')}
                          className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
                        >
                          {t('reset.back_to_login')}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
