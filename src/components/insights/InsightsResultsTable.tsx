import React from 'react';
import { Download } from 'lucide-react';
import type { RunResult, CatalogField } from '../../types/insights';

interface Props {
  result: RunResult;
  dimensions: string[];
  metrics: string[];
  catalog: CatalogField[];
  lang: string;
  onExport: () => void;
}

export const InsightsResultsTable: React.FC<Props> = ({
  result,
  dimensions,
  metrics,
  catalog,
  lang,
  onExport
}) => {
  if (!result.data.length) return (
    <div className="py-12 text-center">
      <p className="text-gray-400 italic">No hay datos para mostrar con esta configuración.</p>
    </div>
  );

  const getLabel = (key: string) => {
    const f = catalog.find(c => c.key === key);
    const label = f ? (lang.startsWith('en') ? f.label_en : f.label_es) : key;
    return typeof label === 'string' ? label : String(label || '');
  };

  const toAlias = (key: string) => {
    if (typeof key !== 'string') return '';
    return key.replace('.', '_');
  };

  const allColumns = [
    ...dimensions.map(d => ({ key: toAlias(d), label: getLabel(d), type: 'dimension' })),
    ...metrics.map(m => ({ key: toAlias(m), label: getLabel(m), type: 'metric' }))
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
        <h3 className="text-sm font-bold text-gray-700">Resultados ({result.total} filas)</h3>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {allColumns.map(col => (
                <th key={col.key} className={`px-6 py-3 ${col.type === 'metric' ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {allColumns.map(col => (
                  <td key={col.key} className={`px-6 py-4 text-sm ${col.type === 'metric' ? 'text-right font-medium text-gray-900' : 'text-gray-600'}`}>
                    {typeof row[col.key] === 'number' 
                      ? row[col.key].toLocaleString((lang || 'es-ES').replace('_', '-'), { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                      : row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
