import React, { useState, useCallback } from 'react';
import { GripVertical, X, DollarSign } from 'lucide-react';
import type { CatalogField } from '../../types/insights';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';

interface Props {
  catalog: CatalogField[];
  dimensions: string[];
  metrics: string[];
  onDimensionsChange: (dims: string[]) => void;
  onMetricsChange: (mets: string[]) => void;
  lang: string;
  t: any;
}

export const InsightsBuilder: React.FC<Props> = ({
  catalog,
  dimensions,
  metrics,
  onDimensionsChange,
  onMetricsChange,
  lang,
  t,
}) => {
  const [search, setSearch] = useState('');

  const catalogDimensions = catalog.filter(f => f.type === 'dimension');
  const catalogMetrics    = catalog.filter(f => f.type === 'metric');

  const label = (f: CatalogField) => lang.startsWith('en') ? f.label_en : f.label_es;

  const filteredDims = catalogDimensions.filter(f =>
    label(f).toLowerCase().includes(search.toLowerCase())
  );
  const filteredMets = catalogMetrics.filter(f =>
    label(f).toLowerCase().includes(search.toLowerCase())
  );

  const isUsed = (key: string) => dimensions.includes(key) || metrics.includes(key);

  const addField = (field: CatalogField) => {
    if (isUsed(field.key)) return;
    if (field.type === 'dimension') {
      onDimensionsChange([...dimensions, field.key]);
    } else {
      onMetricsChange([...metrics, field.key]);
    }
  };

  const removeField = (key: string, type: 'dimension' | 'metric') => {
    if (type === 'dimension') onDimensionsChange(dimensions.filter(d => d !== key));
    else onMetricsChange(metrics.filter(m => m !== key));
  };

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Reordering within dimensions
    if (source.droppableId === 'zone-dims' && destination.droppableId === 'zone-dims') {
      const next = Array.from(dimensions);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      onDimensionsChange(next);
      return;
    }

    // Reordering within metrics
    if (source.droppableId === 'zone-mets' && destination.droppableId === 'zone-mets') {
      const next = Array.from(metrics);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      onMetricsChange(next);
      return;
    }

    // Dragging from catalog panel to zones
    if (source.droppableId === 'catalog-dims' && destination.droppableId === 'zone-dims') {
      const field = catalog.find(f => f.key === draggableId);
      if (field && !isUsed(field.key)) onDimensionsChange([...dimensions, field.key]);
    }
    if (source.droppableId === 'catalog-mets' && destination.droppableId === 'zone-mets') {
      const field = catalog.find(f => f.key === draggableId);
      if (field && !isUsed(field.key)) onMetricsChange([...metrics, field.key]);
    }
  }, [dimensions, metrics, catalog, onDimensionsChange, onMetricsChange]);

  const getFieldLabel = (key: string) => {
    const f = catalog.find(c => c.key === key);
    return f ? label(f) : key;
  };

  const getFieldFinancial = (key: string) => {
    return catalog.find(c => c.key === key)?.financial ?? false;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── PANEL IZQUIERDO: Catálogo ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('reports.insights_available_fields')}</h3>

          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
            {/* Dimensiones del catálogo */}
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase mb-2">{t('reports.insights_dimensions')}</p>
              <Droppable droppableId="catalog-dims" isDropDisabled={true}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                    {filteredDims.map((f, i) => (
                      <Draggable key={f.key} draggableId={f.key} index={i} isDragDisabled={isUsed(f.key)}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => addField(f)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all
                              ${isUsed(f.key)
                                ? 'bg-indigo-50 text-indigo-300 cursor-default'
                                : snap.isDragging
                                  ? 'bg-indigo-100 text-indigo-800 shadow-md rotate-1'
                                  : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                              }`}
                          >
                            <GripVertical className="w-3 h-3 shrink-0 text-gray-300" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-gray-400 uppercase font-bold leading-tight">
                                {f.key.split('.')[0]}
                              </span>
                              <span className="truncate leading-normal">{label(f)}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Métricas del catálogo */}
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase mb-2">{t('reports.insights_metrics')}</p>
              <Droppable droppableId="catalog-mets" isDropDisabled={true}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                    {filteredMets.map((f, i) => (
                      <Draggable key={f.key} draggableId={f.key} index={i} isDragDisabled={isUsed(f.key)}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => addField(f)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all
                              ${isUsed(f.key)
                                ? 'bg-emerald-50 text-emerald-300 cursor-default'
                                : snap.isDragging
                                  ? 'bg-emerald-100 text-emerald-800 shadow-md rotate-1'
                                  : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                          >
                            <GripVertical className="w-3 h-3 shrink-0 text-gray-300" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[10px] text-gray-400 uppercase font-bold leading-tight">
                                {f.key.split('.')[0]}
                              </span>
                              <span className="truncate leading-normal">{label(f)}</span>
                            </div>
                            {f.financial && <DollarSign className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: Canvas de construcción ── */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Drop Zone: Dimensiones */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-4 flex flex-col gap-2 min-h-[200px]">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
              {t('reports.insights_dimensions')}
            </p>
            <Droppable droppableId="zone-dims">
              {(provided, snap) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 rounded-xl p-2 transition-colors min-h-[120px]
                    ${snap.isDraggingOver ? 'bg-indigo-50' : ''}`}
                >
                  {dimensions.length === 0 && !snap.isDraggingOver && (
                    <p className="text-xs text-gray-400 text-center mt-6">
                      {t('reports.insights_drop_here')}
                    </p>
                  )}
                  {dimensions.map((key, i) => (
                    <Draggable key={key} draggableId={`zone-dim-${key}`} index={i}>
                      {(prov, s) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`flex items-center justify-between px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm
                            ${s.isDragging ? 'shadow-lg rotate-1' : ''}`}
                        >
                          <span className="text-indigo-700 font-medium truncate">{getFieldLabel(key)}</span>
                          <button onClick={() => removeField(key, 'dimension')} className="ml-2 text-indigo-400 hover:text-red-500 transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Drop Zone: Métricas */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 p-4 flex flex-col gap-2 min-h-[200px]">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">
              {t('reports.insights_metrics')}
            </p>
            <Droppable droppableId="zone-mets">
              {(provided, snap) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 rounded-xl p-2 transition-colors min-h-[120px]
                    ${snap.isDraggingOver ? 'bg-emerald-50' : ''}`}
                >
                  {metrics.length === 0 && !snap.isDraggingOver && (
                    <p className="text-xs text-gray-400 text-center mt-6">
                      {t('reports.insights_drop_here')}
                    </p>
                  )}
                  {metrics.map((key, i) => (
                    <Draggable key={key} draggableId={`zone-met-${key}`} index={i}>
                      {(prov, s) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm
                            ${s.isDragging ? 'shadow-lg rotate-1' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-emerald-700 font-medium truncate">{getFieldLabel(key)}</span>
                            {getFieldFinancial(key) && <DollarSign className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <button onClick={() => removeField(key, 'metric')} className="ml-2 text-emerald-400 hover:text-red-500 transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

        </div>
      </div>
    </DragDropContext>
  );
};
