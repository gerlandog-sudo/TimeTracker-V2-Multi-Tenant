import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Table as TableIcon,
  Download,
  FolderOpen,
  FileText
} from 'lucide-react';
import type { RunResult, CatalogField } from '../../types/insights';

interface Props {
  result: RunResult;
  dimensions: string[];
  metrics: string[];
  grouping: string[];
  catalog: CatalogField[];
  lang: string;
  onExport: () => void;
}

interface GroupNode {
  key: string;
  value: any;
  level: number;
  label: string;
  subRows: any[];
  children: GroupNode[];
  subtotals: Record<string, number>;
  isExpanded: boolean;
}

export const HierarchicalTable: React.FC<Props> = ({
  result,
  dimensions,
  metrics,
  grouping,
  catalog,
  lang,
  onExport
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toAlias = (key: string) => key.replace('.', '_');

  const getLabel = (key: string) => {
    const f = catalog.find(c => c.key === key);
    return f ? (lang.startsWith('en') ? f.label_en : f.label_es) : key;
  };

  // Process data into a tree structure
  const treeData = useMemo(() => {
    if (!result.data.length) return [];
    if (grouping.length === 0) return null;

    const root: GroupNode[] = [];

    const findOrCreateNode = (parentList: GroupNode[], level: number, row: any): GroupNode => {
      const groupKey = grouping[level];
      const alias = toAlias(groupKey);
      const val = row[alias];
      const nodeId = grouping.slice(0, level + 1).map(k => row[toAlias(k)]).join('|');

      let node = parentList.find(n => n.value === val);
      if (!node) {
        node = {
          key: nodeId,
          value: val,
          level,
          label: getLabel(groupKey),
          subRows: [],
          children: [],
          subtotals: {},
          isExpanded: expandedGroups[nodeId] ?? true
        };
        parentList.push(node);
      }
      return node;
    };

    result.data.forEach(row => {
      let currentList = root;
      let currentNode: GroupNode | null = null;

      for (let i = 0; i < grouping.length; i++) {
        currentNode = findOrCreateNode(currentList, i, row);
        currentList = currentNode.children;
        
        // Accumulate subtotals
        metrics.forEach(m => {
          const mAlias = toAlias(m);
          currentNode!.subtotals[mAlias] = (currentNode!.subtotals[mAlias] || 0) + (Number(row[mAlias]) || 0);
        });
      }
      
      if (currentNode) {
        currentNode.subRows.push(row);
      }
    });

    return root;
  }, [result.data, grouping, metrics, expandedGroups, lang]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !(prev[id] ?? true)
    }));
  };

  const renderRow = (row: any, i: number, depth: number) => (
    <tr key={`${depth}-${i}`} className="hover:bg-gray-50/50 transition-colors border-l-2 border-transparent">
      {/* Indentation cells for hierarchy */}
      {grouping.map((_, idx) => (
        <td key={idx} className="w-8 border-r border-gray-50"></td>
      ))}
      
      {/* Regular Dimension Columns (those not used in grouping) */}
      {dimensions.filter(d => !grouping.includes(d)).map(d => (
        <td key={d} className="px-6 py-3 text-sm text-gray-600">
          {row[toAlias(d)] ?? '-'}
        </td>
      ))}

      {/* Metrics */}
      {metrics.map(m => (
        <td key={m} className="px-6 py-3 text-sm text-right font-medium text-gray-900">
          {typeof row[toAlias(m)] === 'number' 
            ? row[toAlias(m)].toLocaleString(lang.replace('_', '-'), { minimumFractionDigits: 0, maximumFractionDigits: 2 })
            : row[toAlias(m)] ?? '-'}
        </td>
      ))}
    </tr>
  );

  const renderNode = (node: GroupNode) => {
    const isExpanded = expandedGroups[node.key] ?? true;
    const hasChildren = node.children.length > 0;
    const hasRows = node.subRows.length > 0;

    return (
      <React.Fragment key={node.key}>
        <tr 
          className={`group transition-all ${node.level === 0 ? 'bg-gray-100/50' : 'bg-gray-50/30'} cursor-pointer hover:bg-indigo-50/50`}
          onClick={() => toggleGroup(node.key)}
        >
          {/* Indentation for level */}
          {Array.from({ length: node.level }).map((_, i) => (
            <td key={i} className="w-8 border-r border-gray-100/50"></td>
          ))}

          {/* Group Toggle & Label */}
          <td colSpan={grouping.length - node.level + dimensions.filter(d => !grouping.includes(d)).length} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-gray-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{node.label}:</span>
              <span className="text-sm font-bold text-gray-800">{node.value ?? 'N/A'}</span>
              <span className="text-[10px] text-gray-400 ml-2 font-medium">({node.subRows.length + node.children.length} items)</span>
            </div>
          </td>

          {/* Subtotals for Metrics */}
          {metrics.map(m => (
            <td key={m} className="px-6 py-3 text-sm text-right font-black text-indigo-600 bg-indigo-50/20">
              {node.subtotals[toAlias(m)]?.toLocaleString(lang.replace('_', '-'), { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </td>
          ))}
        </tr>

        {isExpanded && (
          <>
            {node.children.map(child => renderNode(child))}
            {node.subRows.map((row, i) => renderRow(row, i, node.level + 1))}
          </>
        )}
      </React.Fragment>
    );
  };

  if (!result.data.length) return null;

  const visibleDimensions = dimensions.filter(d => !grouping.includes(d));

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-indigo-500" />
            Resultados del Análisis
          </h3>
          <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">
            {result.total} Registros Encontrados • {result.exec_ms}ms de procesamiento
          </p>
        </div>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
        >
          <Download className="w-4 h-4" /> Exportar Reporte
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
              {/* Hierarchical indentation headers */}
              {grouping.map((g, i) => (
                <th key={g} className="px-4 py-4 w-8 bg-gray-100/20"></th>
              ))}
              
              {/* Other dimensions */}
              {visibleDimensions.map(d => (
                <th key={d} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {getLabel(d)}
                </th>
              ))}

              {/* Metrics */}
              {metrics.map(m => (
                <th key={m} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  {getLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grouping.length > 0 ? (
              treeData?.map(node => renderNode(node))
            ) : (
              result.data.map((row, i) => renderRow(row, i, 0))
            )}
          </tbody>
        </table>
      </div>

      {grouping.length > 0 && (
        <div className="p-4 bg-indigo-50/30 border-t border-indigo-50 flex items-center justify-center gap-2">
           <FolderOpen className="w-4 h-4 text-indigo-400" />
           <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
             Cortes de Control Activos: {grouping.map(g => getLabel(g)).join(' > ')}
           </p>
        </div>
      )}
    </div>
  );
};
