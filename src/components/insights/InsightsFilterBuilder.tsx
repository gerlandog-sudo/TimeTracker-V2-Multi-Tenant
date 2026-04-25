import React from 'react';
import { Calendar, X, Plus } from 'lucide-react';
import type { CatalogField, ReportFilter, FilterOp } from '../../types/insights';

interface Props {
  filters: ReportFilter[];
  catalog: CatalogField[];
  onChange: (filters: ReportFilter[]) => void;
  lang: string;
  t: any;
}



export const InsightsFilterBuilder: React.FC<Props> = ({ filters, catalog, onChange, lang, t }) => {
  const label = (f: CatalogField) => lang.startsWith('en') ? f.label_en : f.label_es;

  const OPS: { value: FilterOp; label: string }[] = [
    { value: 'eq',      label: '=' },
    { value: 'neq',     label: '≠' },
    { value: 'gt',      label: '>' },
    { value: 'lt',      label: '<' },
    { value: 'gte',     label: '>=' },
    { value: 'lte',     label: '<=' },
    { value: 'between', label: t('dashboard.from') },
    { value: 'like',    label: t('common.search') },
  ];

  const addFilter = () => {
    const firstField = catalog[0];
    if (!firstField) return;
    onChange([...filters, { field: firstField.key, op: 'eq', value: '' }]);
  };

  const updateFilter = (i: number, patch: Partial<ReportFilter>) => {
    const next = filters.map((f, idx) => idx === i ? { ...f, ...patch } : f);
    onChange(next);
  };

  const removeFilter = (i: number) => {
    onChange(filters.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> {t('reports.insights_filters')}
        </p>
        <button
          onClick={addFilter}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {t('common.all_clients').includes('Toda') ? 'Añadir' : 'Add'}
        </button>
      </div>

      {filters.length === 0 && (
        <p className="text-xs text-gray-400 italic">{t('reports.no_logs')}</p>
      )}

      <div className="space-y-2">
        {filters.map((filter, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            {/* Campo */}
            <select
              value={filter.field}
              onChange={e => updateFilter(i, { field: e.target.value, value: '' })}
              className="flex-1 min-w-[140px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {catalog.map(f => (
                <option key={f.key} value={f.key}>{label(f)}</option>
              ))}
            </select>

            {/* Operador */}
            <select
              value={filter.op}
              onChange={e => updateFilter(i, { op: e.target.value as FilterOp })}
              className="w-[90px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {OPS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>

            {/* Valor */}
            {filter.op === 'between' ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder={t('dashboard.from')}
                  value={Array.isArray(filter.value) ? filter.value[0] : ''}
                  onChange={e => updateFilter(i, { value: [e.target.value, Array.isArray(filter.value) ? filter.value[1] : ''] })}
                  className="w-[100px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-gray-400 text-xs">{t('dashboard.to').toLowerCase()}</span>
                <input
                  type="text"
                  placeholder={t('dashboard.to')}
                  value={Array.isArray(filter.value) ? filter.value[1] : ''}
                  onChange={e => updateFilter(i, { value: [Array.isArray(filter.value) ? filter.value[0] : '', e.target.value] })}
                  className="w-[100px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ) : (
              <input
                type="text"
                placeholder={t('common.search')}
                value={Array.isArray(filter.value) ? filter.value.join(',') : filter.value}
                onChange={e => updateFilter(i, { value: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}

            {/* Eliminar */}
            <button
              onClick={() => removeFilter(i)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
