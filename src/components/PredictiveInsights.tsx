import React, { useEffect, useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import api from '../lib/api';
import { AlertTriangle, TrendingDown, Users, Sparkles, Loader2, ArrowRight, Play, Calculator, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

interface PositionCost {
  id: number;
  position_id: number;
  position_name: string;
  seniority: string;
  hourly_cost: number;
}

interface PredictiveAlert {
  projectId: number;
  projectName: string;
  priority: 'High' | 'Medium' | 'Low';
  metrics: {
    budget_hours: number;
    consumed_hours: number;
    budget_exhausted_percent: number;
    avg_weekly_hours: number;
    weeks_to_depletion: number | string;
    seniority_mix: {
      senior_percent: number;
    };
  };
  insight?: string;
  loadingInsight?: boolean;
}

const PredictiveInsights: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [positions, setPositions] = useState<PositionCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(false);
  
  // Simulation states
  const [simulationAlert, setSimulationAlert] = useState<{alert: PredictiveAlert, index: number} | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // Helper to create a unique key for caching based on project and its metrics
  const getCacheKey = (alert: PredictiveAlert) => {
    const metricsStr = JSON.stringify(alert.metrics);
    // V4 cache key to definitely flush any 'Gerlando' responses
    return `insight_cache_v5_${i18n.language}_${alert.projectId}_${btoa(metricsStr).substring(0, 16)}`;
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initialize = async () => {
      try {
        setLoading(true);
        const [alertsRes, positionsRes] = await Promise.all([
          api.get('/predictive-alerts'),
          api.get('/position-costs')
        ]);
        
        const apiAlerts = alertsRes.data.alerts || [];
        setPositions(positionsRes.data || []);
        
        setAlerts(apiAlerts.map((a: any) => ({ ...a, loadingInsight: true })));
        setLoading(false);

        // Debouncing: Wait 800ms before starting AI calls to ensure stability
        timeoutId = setTimeout(() => {
          generateInsights(apiAlerts);
        }, 800);
    } catch (err) {
        console.error('Error fetching predictive alerts:', err);
        notifyError(t('reports.no_insights'));
        setLoading(false);
      }
    };

    initialize();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [i18n.language]);

  const handleSimulate = async () => {
    if (!simulationAlert || !selectedPosition) return;
    
    const pos = positions.find(p => p.id === selectedPosition);
    if (!pos) return;

    setSimulating(true);
    setSimulationResult(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Eres un Experto en Operaciones SaaS y Optimizacion de Rentabilidad.
Realiza una simulación rápida sobre el impacto de añadir un nuevo perfil al proyecto actual.
IMPORTANTE: Debes responder ESTRICTAMENTE en el idioma correspondiente a este código de locale: "${i18n.language}". Si es "en_US" o "en_GB", responde en Inglés. Si es "pt_BR" o "pt_PT", responde en Portugués. Si es "es_AR" o "es_ES", responde en Español.

DATOS ACTUALES DEL PROYECTO '${simulationAlert.alert.projectName}':
- Presupuesto: ${simulationAlert.alert.metrics.budget_hours}hs
- Consumido: ${simulationAlert.alert.metrics.consumed_hours}hs (${simulationAlert.alert.metrics.budget_exhausted_percent}%)
- Burn Rate Semanal: ${simulationAlert.alert.metrics.avg_weekly_hours}hs/semana
- Seniority Actual: ${simulationAlert.alert.metrics.seniority_mix.senior_percent}% Senior.

PERFIL A AÑADIR:
- Rol: ${pos.position_name}
- Seniority: ${pos.seniority}
- Costo por hora estimado: $${pos.hourly_cost}

TAREA: Genera un veredicto de simulación corto y profesional (máximo 40 palabras).
Debe incluir:
1. Impacto en el tiempo (¿Cuántos días/semanas se adelanta o atrasa?).
2. Impacto en la rentabilidad/margen.

Formato: texto plano. Usa un tono que brinde poder de negociación.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });

      setSimulationResult(response.response.text() || t('reports.sim_fail'));
      notifySuccess(t('reports.simulation_complete', 'Simulación completada con éxito'));
    } catch (err) {
      console.error('Simulation error:', err);
      notifyError(t('reports.sim_error'));
    } finally {
      setSimulating(false);
    }
  };

  const generateInsights = async (apiAlerts: PredictiveAlert[]) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    
    const ai = new GoogleGenAI({ apiKey });
    
    apiAlerts.forEach(async (alert, index) => {
      const cacheKey = getCacheKey(alert);
      const cachedInsight = sessionStorage.getItem(cacheKey);

      if (cachedInsight) {
        setAlerts(prev => {
          const newAlerts = [...prev];
          if (newAlerts[index]) {
            newAlerts[index] = { ...newAlerts[index], insight: cachedInsight, loadingInsight: false };
          }
          return newAlerts;
        });
        return;
      }

      try {
        const prompt = `Eres un Data Scientist Senior experto en SaaS de Productividad.
Basado en las métricas de este proyecto, genera un 'Insight' corto y accionable en lenguaje natural para la gestión del proyecto.
No uses formato Markdown. Sé directo e imperativo.
IMPORTANTE: El mensaje debe ser TOTALMENTE AGNOSTICO AL USUARIO. PROHIBIDO mencionar nombres de personas (como Gerlando) o usar vocativos. 
CRÍTICO: Debes responder ESTRICTAMENTE en el idioma correspondiente a este código de locale: "${i18n.language}". Si es "en_US" o "en_GB", responde en Inglés. Si es "pt_BR" o "pt_PT", responde en Portugués. Si es "es_AR" o "es_ES", responde en Español.

Metricas del Proyecto '${alert.projectName}':
- Presupuesto Total: ${alert.metrics.budget_hours}hs
- Horas Consumidas: ${alert.metrics.consumed_hours}hs (${alert.metrics.budget_exhausted_percent}%)
- Burn Rate Semanal: ${alert.metrics.avg_weekly_hours}hs/semana
- Semanas para agotar presupuesto: ${alert.metrics.weeks_to_depletion}
- Mix de Seniority: ${alert.metrics.seniority_mix.senior_percent}% de horas Senior.

Estructura deseada: 'Atención: [Detección del problema]. Sugerencia: [Acción correctiva].'`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: prompt,
        });

        const insight = response.response.text() || t('reports.insight_error');
        
        sessionStorage.setItem(cacheKey, insight);
        setApiKeyError(false);

        setAlerts(prev => {
          const newAlerts = [...prev];
          if (newAlerts[index]) {
            newAlerts[index] = { ...newAlerts[index], insight, loadingInsight: false };
          }
          return newAlerts;
        });
      } catch (err: any) {
        console.error(`Error generating insight for alert ${index}:`, err);
        if (err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('400')) {
          setApiKeyError(true);
        }
        setAlerts(prev => {
          const newAlerts = [...prev];
          if (newAlerts[index]) {
            newAlerts[index] = { ...newAlerts[index], insight: t('reports.insight_error'), loadingInsight: false };
          }
          return newAlerts;
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white/50 rounded-2xl border border-gray-100 h-48">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mr-3" />
        <p className="text-gray-500 font-medium">{t('reports.loading_insights', 'Calculando predicciones e insights de IA...')}</p>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-gray-800">{t('reports.predictive_title', 'Alertas Predictivas de IA')}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {alerts.map((alert, idx) => (
            <motion.div
              key={`${alert.projectId}-${idx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-5 rounded-2xl border-l-4 shadow-sm relative overflow-hidden bg-white ${
                alert.priority === 'High' ? 'border-red-500' : 
                alert.priority === 'Medium' ? 'border-amber-500' : 'border-blue-500'
              }`}
            >
              {/* Decorative accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 rounded-full ${
                alert.priority === 'High' ? 'bg-red-500' : 
                alert.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 group flex items-center gap-1.5 capitalize">
                    {alert.projectName.toLowerCase()}
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      ['high', 'alta', 'critical'].includes(alert.priority.toLowerCase()) ? 'bg-red-100 text-red-700' : 
                      ['medium', 'media'].includes(alert.priority.toLowerCase()) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {t('kanban.priority_label')} {
                        ['high', 'alta', 'critical'].includes(alert.priority.toLowerCase()) ? t('reports.priority_critical') : 
                        ['medium', 'media'].includes(alert.priority.toLowerCase()) ? t('reports.priority_medium') : 
                        t('reports.priority_low')
                      }
                    </span>
                  </div>
                </div>
                {alert.priority === 'High' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-amber-500" />}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-2.5 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight mb-0.5">Burn Rate</p>
                  <p className="text-sm font-bold text-gray-800">{alert.metrics.budget_exhausted_percent}% <span className="text-[10px] font-normal text-gray-400">budget</span></p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight mb-0.5">{t('reports.end_of_budget', 'Fin de Budget')}</p>
                  <p className="text-sm font-bold text-gray-800">
                    {alert.metrics.weeks_to_depletion === 'Indefinido' ? t('reports.undefined', 'Indefinido') : t('reports.in_weeks', 'En {{weeks}} sem.').replace('{{weeks}}', String(alert.metrics.weeks_to_depletion))}
                  </p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{t('reports.senior_participation', 'Participación Senior')}</p>
                    <p className="text-xs font-bold text-gray-800">{alert.metrics.seniority_mix.senior_percent}%</p>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${alert.metrics.seniority_mix.senior_percent > 40 ? 'bg-red-400' : 'bg-indigo-400'}`} 
                      style={{ width: `${alert.metrics.seniority_mix.senior_percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                alert.loadingInsight ? 'bg-gray-50 border-gray-100 animate-pulse' : 
                alert.priority === 'High' ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'
              }`}>
                {alert.loadingInsight ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    <p className="text-xs text-gray-400 italic">{t('reports.writing_rec', 'Redactando recomendación...')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className={`text-xs leading-relaxed ${alert.priority === 'High' ? 'text-red-700' : 'text-indigo-900'} font-medium`}>
                      {alert.insight?.startsWith('Atención:') ? (
                        <>
                          <span className="font-extrabold uppercase tracking-tight">{t('reports.attention', 'Atención:')}</span>
                          {alert.insight.substring(9)}
                        </>
                      ) : alert.insight}
                    </p>
                    <button 
                      onClick={() => {
                        setSimulationAlert({ alert, index: idx });
                        setSelectedPosition(null);
                        setSimulationResult(null);
                      }}
                      className="flex items-center gap-1.5 text-xs text-white transition-all bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md active:scale-95 border-none"
                    >
                      <Calculator className="w-4 h-4" />
                      {t('reports.simulate_change')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Simulation Modal */}
      <AnimatePresence>
        {simulationAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-xl text-accent">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t('reports.sim_title')}</h3>
                </div>
                <button onClick={() => setSimulationAlert(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{t('reports.selected_project')}</p>
                  <p className="font-bold text-gray-900 capitalize">{simulationAlert.alert.projectName.toLowerCase()}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">{t('reports.profile_to_add')}</label>
                  <select 
                    value={selectedPosition || ''} 
                    onChange={(e) => setSelectedPosition(Number(e.target.value))}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  >
                    <option value="">{t('reports.select_position')}</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.position_name} - {pos.seniority} (${pos.hourly_cost}/h)</option>
                    ))}
                  </select>
                </div>

                {simulationResult && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl"
                  >
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> {t('reports.sim_result')}
                    </p>
                    <p className="text-sm font-medium text-emerald-900 leading-relaxed italic">
                      "{simulationResult}"
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => setSimulationAlert(null)}
                  className="flex-1 px-6 py-3 font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase text-xs tracking-widest"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleSimulate}
                  disabled={!selectedPosition || simulating}
                  className="flex-1 px-6 py-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/20 uppercase text-xs tracking-widest"
                >
                  {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {simulating ? t('reports.processing', 'Procesando...') : t('reports.start_sim', 'Iniciar Simulación')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PredictiveInsights;
