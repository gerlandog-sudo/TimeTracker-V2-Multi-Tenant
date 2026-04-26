import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  Loader2,
  Trash2,
  Sparkles,
  Layout,
  Filter,
  Columns,
  Layers,
  Wand2,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { HierarchicalTable } from '../../components/insights/HierarchicalTable';
import { InsightsFilterBuilder } from '../../components/insights/InsightsFilterBuilder';
import { GoogleGenAI } from "@google/genai";
import type { 
  CatalogField, 
  ReportDefinition, 
  RunResult, 
  SavedView, 
  ChartType,
  ReportFilter
} from '../../types/insights';

const ReportStudio: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState<CatalogField[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  
  // State for the current report definition
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [limit, setLimit] = useState(500);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [result, setResult] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'filters' | 'preview'>('config');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [viewName, setViewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    if (dimensions.length === 0 && metrics.length === 0 && grouping.length === 0) return;
    
    setLoading(true);
    setActiveTab('preview');
    try {
      const definition: ReportDefinition = {
        dimensions,
        metrics,
        grouping,
        filters,
        sort: [],
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
        definition: { dimensions, metrics, grouping, filters, sort: [], limit },
        chart_type: 'table',
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
    setDimensions(view.definition.dimensions || []);
    setMetrics(view.definition.metrics || []);
    setGrouping(view.definition.grouping || []);
    setFilters(view.definition.filters || []);
    setLimit(view.definition.limit || 500);
    setViewName(view.name);
    setResult(null);
    setActiveTab('config');
  };

  const deleteView = async (id: number) => {
    if (!confirm('¿Eliminar esta vista?')) return;
    try {
      await api.delete(`/reports/insights/views/${id}`);
      if (currentViewId === id) resetStudio();
      fetchViews();
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  };

  const resetStudio = () => {
    setCurrentViewId(null);
    setDimensions([]);
    setMetrics([]);
    setGrouping([]);
    setFilters([]);
    setResult(null);
    setViewName('');
    setActiveTab('config');
  };

  const getLabel = (key: string) => {
    const f = catalog.find(c => c.key === key);
    return f ? (i18n.language.startsWith('en') ? f.label_en : f.label_es) : key;
  };

  const filteredCatalog = catalog.filter(f => 
    getLabel(f.key).toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleField = (key: string, type: 'dimension' | 'metric') => {
    if (type === 'dimension') {
      if (dimensions.includes(key)) setDimensions(prev => prev.filter(k => k !== key));
      else setDimensions(prev => [...prev, key]);
    } else {
      if (metrics.includes(key)) setMetrics(prev => prev.filter(k => k !== key));
      else setMetrics(prev => [...prev, key]);
    }
  };

  const toggleGrouping = (key: string) => {
    if (grouping.includes(key)) setGrouping(prev => prev.filter(k => k !== key));
    else setGrouping(prev => [...prev, key]);
  };

  // AI Suggestions
  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key de Gemini no configurada.");
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

      const catalogKeys = catalog.map(f => `${f.key} (${f.type}): ${getLabel(f.key)}`).join(', ');
      
      const prompt = `Como experto en BI y analítica para plataformas de TimeTracking, sugiereme el reporte más valioso que puedo generar con estos campos: ${catalogKeys}.
      REGLA: Responde ÚNICAMENTE un JSON con esta estructura:
      {
        "name": "Nombre sugerido",
        "dimensions": ["key1"],
        "metrics": ["key2"],
        "grouping": ["key1"],
        "description": "Explicación breve de por qué este reporte es útil"
      }`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const cleanJson = text.replace(/```json|```/gi, '').trim();
      const suggestion = JSON.parse(cleanJson);

      setDimensions(suggestion.dimensions || []);
      setMetrics(suggestion.metrics || []);
      setGrouping(suggestion.grouping || []);
      setViewName(suggestion.name);
      setActiveTab('config');
    } catch (err) {
      console.error('AI Suggest Error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Cargando Motor Relacional...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)]">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {viewName || 'Report Studio'}
            </h1>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Generador de Reportes Insights v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={resetStudio}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Nuevo Reporte"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
          
          <div className="h-8 w-px bg-gray-100 mx-2" />

          <button 
            onClick={handleAiSuggest}
            disabled={isAiLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 hover:scale-105 transition-all disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            IA Suggest
          </button>

          <button 
            onClick={handleSave}
            disabled={dimensions.length === 0 && metrics.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Save className="w-5 h-5 text-indigo-500" /> Guardar
          </button>

          <button 
            onClick={handleRun}
            disabled={loading || (dimensions.length === 0 && metrics.length === 0 && grouping.length === 0)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            EJECUTAR
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1">
        
        {/* ── SIDEBAR (Saved Views) ── */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Mis Vistas Guardadas
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedViews.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-gray-200" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">No tenés vistas guardadas</p>
                </div>
              ) : (
                savedViews.map(view => (
                  <div 
                    key={view.id}
                    className={`group relative p-4 rounded-2xl cursor-pointer transition-all border ${currentViewId === view.id ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                    onClick={() => loadView(view)}
                  >
                    <div className="flex flex-col gap-1 pr-6">
                      <p className={`text-sm font-bold truncate ${currentViewId === view.id ? 'text-white' : 'text-gray-900'}`}>{view.name}</p>
                      <p className={`text-[10px] font-medium ${currentViewId === view.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {view.definition.dimensions?.length || 0} dim • {view.definition.metrics?.length || 0} met
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteView(view.id); }}
                      className={`absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${currentViewId === view.id ? 'text-indigo-300 hover:bg-white/10 hover:text-white' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN WORKSPACE ── */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* TABS */}
          <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-2xl w-fit">
            {[
              { id: 'config', label: 'Estructura', icon: Layout },
              { id: 'filters', label: 'Filtros', icon: Filter },
              { id: 'preview', label: 'Resultados', icon: BarChart2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-white/50'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex-1">
            
            {/* CONFIG TAB */}
            {activeTab === 'config' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Field Selector */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-[600px]">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Columns className="w-4 h-4" /> Selector de Campos
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Buscar campo (ej: Cliente, Costo...)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Groups by category */}
                    {['client', 'project', 'user', 'entry', 'kanban', 'hours', 'cost', 'budget'].map(cat => {
                      const fields = filteredCatalog.filter(f => f.key.startsWith(cat) || (cat === 'budget' && f.key.includes('budget')));
                      if (fields.length === 0) return null;
                      return (
                        <div key={cat} className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-2">{cat}</p>
                          <div className="grid grid-cols-1 gap-1">
                            {fields.map(f => (
                              <div 
                                key={f.key}
                                onClick={() => toggleField(f.key, f.type)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${dimensions.includes(f.key) || metrics.includes(f.key) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-transparent hover:bg-gray-50'}`}
                              >
                                <div className="flex flex-col">
                                  <span className={`text-sm font-bold ${dimensions.includes(f.key) || metrics.includes(f.key) ? 'text-indigo-700' : 'text-gray-700'}`}>
                                    {getLabel(f.key)}
                                  </span>
                                  <span className="text-[9px] text-gray-400 uppercase font-medium">{f.type}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${dimensions.includes(f.key) || metrics.includes(f.key) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200'}`}>
                                  {(dimensions.includes(f.key) || metrics.includes(f.key)) && <ChevronRight className="w-3 h-3" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Building Zones */}
                <div className="space-y-6">
                  
                  {/* Cortes de Control (Grouping) */}
                  <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col gap-4 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 opacity-80">
                        <Layers className="w-4 h-4" /> Cortes de Control (Subtotales)
                      </h3>
                      <Layers className="w-5 h-5 opacity-20" />
                    </div>
                    <p className="text-[10px] opacity-60 font-medium">Arrastrá campos acá para crear agrupaciones jerárquicas.</p>
                    
                    <div className="flex flex-wrap gap-2 min-h-[60px] bg-white/10 rounded-2xl p-3 border border-white/10">
                      {grouping.length === 0 ? (
                        <p className="text-[10px] font-bold text-white/30 uppercase m-auto">Sin Agrupación Activa</p>
                      ) : (
                        grouping.map((key, i) => (
                          <div key={key} className="flex items-center gap-2 bg-white text-indigo-700 px-3 py-2 rounded-xl text-xs font-black shadow-sm">
                            <span className="opacity-40">{i + 1}.</span>
                            {getLabel(key)}
                            <button onClick={() => toggleGrouping(key)} className="hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 mt-2">
                       <p className="w-full text-[9px] font-bold opacity-40 uppercase">Campos rápidos para agrupar:</p>
                       {['client.name', 'project.name', 'user.name', 'user.role', 'entry.status'].map(k => (
                         <button 
                           key={k} 
                           onClick={() => toggleGrouping(k)}
                           className={`text-[9px] font-bold px-2 py-1 rounded-lg border border-white/20 transition-all ${grouping.includes(k) ? 'bg-white text-indigo-600' : 'hover:bg-white/10'}`}
                         >
                           {getLabel(k)}
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Summary of Selection */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Columns className="w-4 h-4" /> Columnas de Datos
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {dimensions.filter(d => !grouping.includes(d)).map(d => (
                          <span key={d} className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100 flex items-center gap-2">
                            {getLabel(d)}
                            <button onClick={() => toggleField(d, 'dimension')}><X className="w-3 h-3 text-gray-300 hover:text-red-500" /></button>
                          </span>
                        ))}
                        {dimensions.length === 0 && <p className="text-xs text-gray-300 italic">No hay dimensiones seleccionadas</p>}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> Métricas (Cálculos)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {metrics.map(m => (
                          <span key={m} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
                            {getLabel(m)}
                            <button onClick={() => toggleField(m, 'metric')}><X className="w-3 h-3 text-emerald-300 hover:text-red-500" /></button>
                          </span>
                        ))}
                        {metrics.length === 0 && <p className="text-xs text-gray-300 italic">No hay métricas seleccionadas</p>}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                       <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase">Límite de Filas</p>
                         <select 
                           value={limit}
                           onChange={e => setLimit(Number(e.target.value))}
                           className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                         >
                           <option value={100}>100</option>
                           <option value={500}>500</option>
                           <option value={1000}>1000</option>
                           <option value={5000}>5000</option>
                         </select>
                       </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* FILTERS TAB */}
            {activeTab === 'filters' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <InsightsFilterBuilder 
                  filters={filters}
                  catalog={catalog}
                  onChange={setFilters}
                  lang={i18n.language}
                  t={t}
                />
              </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === 'preview' && (
              <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
                {loading ? (
                  <div className="py-48 flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Generando Reporte Relacional...</p>
                  </div>
                ) : result ? (
                  <HierarchicalTable 
                    result={result}
                    dimensions={dimensions}
                    metrics={metrics}
                    grouping={grouping}
                    catalog={catalog}
                    lang={i18n.language}
                    onExport={() => {}}
                  />
                ) : (
                  <div className="py-48 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Play className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-medium">Hacé clic en EJECUTAR para ver los resultados</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportStudio;
