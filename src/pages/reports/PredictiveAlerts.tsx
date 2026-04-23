import React from 'react';
import PredictiveInsights from '../../components/PredictiveInsights';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PredictiveAlertsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('reports.predictive_title', 'Alertas Predictivas de IA')}</h1>
          <p className="text-gray-500">{t('reports.predictive_subtitle', 'Análisis proyectivo y sugerencias de gestión inteligente')}</p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-100">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{t('reports.gemini_active', 'Motor Gemini Activo')}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <PredictiveInsights />
      </div>
    </div>
  );
};

export default PredictiveAlertsPage;
