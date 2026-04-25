import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Play, 
  Save, 
  Search, 
  Settings2, 
  ChevronRight, 
  History, 
  PlusCircle, 
  BarChart2, 
  Table as TableIcon,
  PieChart as PieIcon,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  Download,
  Loader2,
  Trash2,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { InsightsBuilder } from '../../components/insights/InsightsBuilder';
import { InsightsFilterBuilder } from '../../components/insights/InsightsFilterBuilder';
import { InsightsResultsChart } from '../../components/insights/InsightsResultsChart';
import { InsightsResultsTable } from '../../components/insights/InsightsResultsTable';
import type { 
  CatalogField, 
  ReportDefinition, 
  RunResult, 
  SavedView, 
  ChartType,
  ReportFilter
} from '../../types/insights';

const InsightsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState<CatalogField[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  
  // State for the current report definition
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [chartType, setChartType] = useState<ChartType>('table');
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState<{ field: string; dir: 'ASC' | 'DESC' } | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showBuilder, setShowBuilder] = useState(true);
  const [smartSearch, setSmartSearch] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [viewName, setViewName] = useState('');

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/reports/insights/catalog');
      setCatalog(res.data.catalog);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchViews = async () => {
    try {
      const res = await api.get('/reports/insights/views');
      setSavedViews(res.data);
    } catch (err) {
      console.error('Error fetching views:', err);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchViews();
  }, []);

  const handleRun = async () => {
    if (dimensions.length === 0 && metrics.length === 0) return;
    
    setLoading(true);
    try {
      const definition: ReportDefinition = {
        dimensions,
        metrics,
        filters,
        sort: sortBy ? [{ field: sortBy.field, dir: sortBy.dir }] : [],
        limit,
        view_id: currentViewId || undefined
      };
      const res = await api.post('/reports/insights/run', definition);
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error ejecutando el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const name = viewName || prompt('Nombre para esta vista:');
    if (!name) return;

    try {
      const payload = {
        name,
        definition: { dimensions, metrics, filters, sort: [], limit },
        chart_type: chartType,
        is_public: 1
      };

      if (currentViewId) {
        await api.put(`/reports/insights/views/${currentViewId}`, payload);
      } else {
        const res = await api.post('/reports/insights/views', payload);
        setCurrentViewId(res.data.id);
      }
      setViewName(name);
      fetchViews();
    } catch (err) {
      console.error('Error saving view:', err);
    }
  };

  const loadView = (view: SavedView) => {
    setCurrentViewId(view.id);
    setDimensions(view.definition.dimensions);
    setMetrics(view.definition.metrics);
    setFilters(view.definition.filters);
    setChartType(view.chart_type);
    setLimit(view.definition.limit);
    setViewName(view.name);
    setResult(null);
  };

  const deleteView = async (id: number) => {
    if (!confirm('¿Eliminar esta vista?')) return;
    try {
      await api.delete(`/reports/insights/views/${id}`);
      if (currentViewId === id) {
        setCurrentViewId(null);
        setViewName('');
      }
      fetchViews();
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  };

  const handleExport = () => {
    if (!result || !result.data.length) return;

    const headers = Object.keys(result.data[0]);
    const csvContent = [
      headers.join(','),
      ...result.data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI-Powered Smart Assist (Matching successful Predictive pattern)
  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartSearch.trim() || isAiLoading) return;

    console.log("AI Assist: Iniciando...", smartSearch);
    setIsAiLoading(true);
    try {
      const apiKey = "AIzaSyClU9zAJqF04WR2XRx58_zp6LatkFAndIg";
      const ai = new GoogleGenAI({ apiKey });

      const catalogContext = catalog.map(f => `${f.key}: ${i18n.language.startsWith('en') ? f.label_en : f.label_es}`).join(", ");
      const today = new Date();
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

      const dbSchema = `
      -- 1. ESTRUCTURA DE TENANTS
      CREATE TABLE IF NOT EXISTS tenants (id int, name varchar, domain varchar, status enum, created_at timestamp);
      -- 2. CONFIGURACIÓN DE SISTEMA
      CREATE TABLE IF NOT EXISTS system_config (id int, tenant_id int, company_name varchar, logo_url mediumtext, primary_color varchar, currency varchar);
      -- 3. USUARIOS
      CREATE TABLE IF NOT EXISTS users (id int, tenant_id int, name varchar, email varchar, password varchar, role_id int, role varchar, position_id int, seniority_id int, seniority varchar, hourly_cost decimal, weekly_capacity decimal, language varchar, is_super_admin tinyint, created_at timestamp);
      -- 4. ROLES Y PERMISOS
      CREATE TABLE IF NOT EXISTS roles (id int, tenant_id int, name varchar, financial_access tinyint, system_config_access tinyint);
      CREATE TABLE IF NOT EXISTS permissions (id int, tenant_id int, role_id int, feature varchar, can_access tinyint);
      -- 5. CLIENTES Y PROYECTOS
      CREATE TABLE IF NOT EXISTS clients (id int, tenant_id int, name varchar, legal_name varchar, tax_id varchar, contact_name varchar, contact_email varchar, address text, created_at timestamp);
      CREATE TABLE IF NOT EXISTS projects (id int, tenant_id int, client_id int, name varchar, budget_hours decimal, budget_money decimal, status enum, created_at timestamp);
      -- 6. REGISTROS DE TIEMPO
      CREATE TABLE IF NOT EXISTS time_entries (id int, tenant_id int, user_id int, project_id int, task_id int, description text, hours decimal, date date, status enum, created_at timestamp);
      -- 7. AUDITORÍA Y LOGS
      CREATE TABLE IF NOT EXISTS audit_logs (id int, tenant_id int, user_id int, entity_type varchar, entity_id int, action varchar, old_values longtext, new_values longtext, created_at timestamp);
      -- 8. MAESTROS Y METADATA
      CREATE TABLE IF NOT EXISTS tasks_master (id int, tenant_id int, name varchar);
      CREATE TABLE IF NOT EXISTS positions (id int, tenant_id int, name varchar);
      -- 9. CONFIGURACIÓN DE COSTOS
      CREATE TABLE IF NOT EXISTS position_costs (id int, tenant_id int, position_id int, seniority varchar, hourly_cost decimal);
      -- 10. KANBAN Y TAREAS
      CREATE TABLE IF NOT EXISTS kanban_tasks (id int, tenant_id int, project_id int, user_id int, description text, priority varchar, task_type_id int, estimated_hours decimal, status varchar, started_at datetime, completed_at datetime, created_by int, created_at timestamp);
      -- 11. NOTIFICACIONES
      CREATE TABLE IF NOT EXISTS notifications (id int, user_id int, message text, type varchar, is_read tinyint, created_at timestamp);
      `;

      const prompt = `Sos un experto en BI, SQL y lenguaje natural. Tu tarea es convertir una frase de usuario en un JSON de configuración de reporte.
      
      ESQUEMA DE BASE DE DATOS: ${dbSchema}
      CATALOGO DE CAMPOS (KEYS REQUERIDAS): ${catalogContext}
      
      REGLAS DE ORO:
      1. Responde UNICAMENTE el objeto JSON puro.
      2. Usa "op" para el operador del filtro (NO "operator").
      3. Operadores validos: eq, neq, gt, lt, gte, lte, between, like, in.
      4. Interpreta fechas y convertilas en Desde y Hasta (formato AAAA-MM-DD) usando el operador "between".
      5. HOY ES: ${today.toISOString().split('T')[0]}. Mes pasado: ${lastMonthStart} a ${lastMonthEnd}.
      
      ESTRUCTURA DE SALIDA:
      {
        "dimensions": ["key1"],
        "metrics": ["key2"],
        "filters": [{ "field": "key3", "op": "op", "value": "val" }],
        "chart_type": "table|bar|pie"
      }
      
      PETICION DEL USUARIO: ${smartSearch}`;

      console.log("AI Assist: Enviando prompt mejorado...");
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt
      });

      console.log("AI Assist: Respuesta recibida.");
      const text = result?.response?.text ? result.response.text() : 
                   (result?.candidates?.[0]?.content?.parts?.[0]?.text || "");

      console.log("AI Raw Response:", text);

      if (!text) throw new Error("Google retorno una respuesta vacia.");
      
      const cleanText = text.replace(/```json|```/gi, '').trim();
      const def = JSON.parse(cleanText);

      if (def) {
        const cleanDims = Array.isArray(def.dimensions) ? def.dimensions.filter((d: any) => typeof d === 'string') : [];
        const cleanMets = Array.isArray(def.metrics) ? def.metrics.filter((m: any) => typeof m === 'string') : [];
        const cleanFils = Array.isArray(def.filters) ? def.filters.filter((f: any) => f && typeof f.field === 'string') : [];

        setDimensions(cleanDims);
        setMetrics(cleanMets);
        setFilters(cleanFils);
        
        if (def.sort_by && typeof def.sort_by.field === 'string') {
          setSortBy({ 
            field: def.sort_by.field, 
            dir: (def.sort_by.order || def.sort_by.dir || 'DESC').toUpperCase() as 'ASC' | 'DESC' 
          });
        }

        if (def.chart_type) setChartType(def.chart_type);
        setSmartSearch('');
      }
    } catch (err: any) {
      console.error("AI Assist Error:", err);
      alert("Error interpretando la solicitud con IA. Verifique su conexión o intente nuevamente.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetBuilder = () => {
    setCurrentViewId(null);
    setDimensions([]);
    setMetrics([]);
    setFilters([]);
    setChartType('table');
    setResult(null);
    setViewName('');
  };

  if (loadingCatalog) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 relative min-h-[calc(100vh-140px)]">
      
      {/* ── SIDEBAR (Saved Views) ── */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <button 
          onClick={resetBuilder}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5" /> {t('reports.insights_new')}
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3.5 h-3.5" /> {t('reports.insights_saved_views')}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {savedViews.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-8 px-4 italic">{t('reports.insights_no_views')}</p>
            ) : (
              savedViews.map(view => (
                <div 
                  key={view.id}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentViewId === view.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}
                  onClick={() => loadView(view)}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${currentViewId === view.id ? 'text-indigo-700' : 'text-gray-700'}`}>{view.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{t('common.by')} {view.creator_name}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteView(view.id); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 space-y-6">
        
        {/* Header & Smart Search */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              {currentViewId && (
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {viewName}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowBuilder(!showBuilder)}
                className={`p-2 rounded-xl border transition-all ${showBuilder ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                title={t('menu.config')}
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSave}
                disabled={dimensions.length === 0 && metrics.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5 text-indigo-500" /> {t('reports.insights_save')}
              </button>
              <button 
                onClick={handleRun}
                disabled={loading || (dimensions.length === 0 && metrics.length === 0)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                {t('reports.insights_run')}
              </button>
            </div>
          </div>

          {/* Smart Search Bar ("Escriba lo que quiere") */}
          <form onSubmit={handleSmartSearch} className="relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isAiLoading ? 'text-primary animate-pulse' : 'text-gray-400 group-focus-within:text-primary'}`} />
            <input 
              type="text" 
              placeholder={isAiLoading ? "Interpretando con IA..." : t('reports.insights_smart_placeholder')}
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-gray-700 disabled:opacity-50"
              value={smartSearch}
              onChange={e => setSmartSearch(e.target.value)}
              disabled={isAiLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
               <button 
                 type="submit"
                 disabled={isAiLoading}
                 className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
               >
                 {isAiLoading ? '...' : t('reports.insights_smart_assist')}
               </button>
            </div>
          </form>
        </div>

        {/* Builder Panel (Toggleable) */}
        {showBuilder && (
          <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
            <InsightsBuilder 
              catalog={catalog}
              dimensions={dimensions}
              metrics={metrics}
              onDimensionsChange={setDimensions}
              onMetricsChange={setMetrics}
              lang={i18n.language}
              t={t}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InsightsFilterBuilder 
                filters={filters}
                catalog={catalog}
                onChange={setFilters}
                lang={i18n.language}
                t={t}
              />
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> {t('reports.insights_visualization')}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'table', icon: TableIcon },
                    { id: 'bar', icon: BarChart2 },
                    { id: 'line', icon: LineIcon },
                    { id: 'area', icon: AreaIcon },
                    { id: 'pie', icon: PieIcon },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id as ChartType)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${chartType === type.id ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-gray-200'}`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-[8px] font-bold uppercase">{type.id}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-2">
                   <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('reports.insights_limit')}</p>
                      <select 
                        value={limit} 
                        onChange={e => setLimit(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                        <option value={5000}>5000</option>
                      </select>
                   </div>
                   <div className="flex-[2]">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('common.order_by', 'Ordenar por')}</p>
                      <div className="flex gap-2">
                        <select
                          value={sortBy?.field || ''}
                          onChange={(e) => setSortBy(e.target.value ? { field: e.target.value, dir: sortBy?.dir || 'DESC' } : null)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">{t('common.none', 'Ninguno')}</option>
                          {[...dimensions, ...metrics].map(key => {
                            const f = catalog.find(c => c.key === key);
                            return (
                              <option key={key} value={key}>
                                {f ? (i18n.language.startsWith('en') ? f.label_en : f.label_es) : key}
                              </option>
                            );
                          })}
                        </select>
                        {sortBy && (
                          <select
                            value={sortBy.dir}
                            onChange={(e) => setSortBy({ ...sortBy, dir: e.target.value as 'ASC' | 'DESC' })}
                            className="w-[85px] bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="ASC">ASC</option>
                            <option value="DESC">DESC</option>
                          </select>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS AREA */}
        <div className="space-y-6">
          {result ? (
            <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
              
              {/* Chart (if not table) */}
              {chartType !== 'table' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <InsightsResultsChart 
                    result={result}
                    chartType={chartType}
                    dimensions={dimensions}
                    metrics={metrics}
                    catalog={catalog}
                    lang={i18n.language}
                  />
                </div>
              )}

              {/* Table */}
              <InsightsResultsTable 
                result={result}
                dimensions={dimensions}
                metrics={metrics}
                catalog={catalog}
                lang={i18n.language}
                onExport={handleExport}
              />

              <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                <span>Ejecutado en {result.exec_ms}ms</span>
                <span>•</span>
                <span>{result.total} registros encontrados</span>
              </div>
            </div>
          ) : !loading && (
            <div className="py-24 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-gray-200" />
              </div>
              <div>
                <p className="text-gray-400 font-medium">Configurá tu reporte y hacé clic en EJECUTAR</p>
                <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Podés arrastrar bloques o escribir en la barra de búsqueda</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InsightsPage;
