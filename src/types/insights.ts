// Tipos compartidos del módulo Reportes Insights

export type ChartType = 'table' | 'bar' | 'line' | 'pie' | 'area';

export type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in' | 'like';

export interface ReportFilter {
  field: string;
  op: FilterOp;
  value: string | string[];
}

export interface ReportSort {
  field: string;
  dir: 'asc' | 'desc';
}

export interface ReportDefinition {
  dimensions: string[];
  metrics: string[];
  filters: ReportFilter[];
  sort: ReportSort[];
  grouping: string[]; // NEW: For control breaks (hierarchical grouping)
  limit: number;
  description?: string;
  page?: number;
  view_id?: number;
}

export interface CatalogField {
  key: string;
  type: 'dimension' | 'metric';
  label_es: string;
  label_en: string;
  financial: boolean;
}

export interface SavedView {
  id: number;
  tenant_id: number;
  created_by: number;
  creator_name: string;
  name: string;
  description: string | null;
  definition: ReportDefinition;
  chart_type: ChartType;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface RunResult {
  data: Record<string, any>[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  exec_ms: number;
}
